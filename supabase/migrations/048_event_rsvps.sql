-- ============================================================================
-- 048_event_rsvps.sql — Public (free) event registrations (confirm-to-hold)
-- ============================================================================
-- See docs/plans/2026-06-21-public-event-registration.md (v3).
--
-- Captures RSVPs for the code-defined PUBLIC events in lib/events/public-events.ts
-- (NOT the invite-only live_events table in 044). Double opt-in: a row is created
-- `pending` on submit and consumes a seat ONLY once the registrant confirms via
-- an emailed link. Seat enforcement is atomic via claim_event_seat() under an
-- advisory lock. Writes go through the service-role API (no anon policy).
-- ============================================================================

BEGIN;

CREATE TABLE IF NOT EXISTS public.event_rsvps (
  id                   uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  created_at           timestamptz NOT NULL DEFAULT now(),
  -- Slug of the PublicEvent in lib/events/public-events.ts (no FK — code-defined).
  event_slug           text NOT NULL,
  full_name            text NOT NULL,
  email                text NOT NULL,
  -- "How did you hear?" — one of the form chips, or null.
  referral_source      text
                         CHECK (referral_source IN (
                           'newsletter', 'linkedin', 'friend', 'twitter_x', 'search', 'website'
                         )),
  locale               text NOT NULL DEFAULT 'en' CHECK (locale IN ('en', 'ja')),
  -- Seat is consumed only by confirmed/attended/no_show. pending/cancelled never count.
  status               text NOT NULL DEFAULT 'pending'
                         CHECK (status IN ('pending', 'confirmed', 'attended', 'no_show', 'cancelled')),
  confirmed_at         timestamptz,
  -- Single-use-ish token for the email confirm link (rotated on re-submit).
  confirm_token        uuid NOT NULL UNIQUE DEFAULT gen_random_uuid(),
  -- Confirmation cutoff (= event start). Enforced inside claim_event_seat.
  confirm_deadline     timestamptz NOT NULL,
  -- Denormalized event end, for the retention job.
  event_ends_at        timestamptz,
  newsletter_opt_in    boolean NOT NULL DEFAULT false,
  -- Email delivery observability (recovery is resubmission; see plan).
  last_email_status    text CHECK (last_email_status IN ('sent', 'failed')),
  last_email_error     text,
  last_confirm_email_at timestamptz
);

-- One RSVP per email per event (idempotent re-submits; case-insensitive).
CREATE UNIQUE INDEX IF NOT EXISTS uq_event_rsvps_event_email
  ON public.event_rsvps (event_slug, lower(email));

-- Capacity counts + retention jobs.
CREATE INDEX IF NOT EXISTS idx_event_rsvps_event_status
  ON public.event_rsvps (event_slug, status);
CREATE INDEX IF NOT EXISTS idx_event_rsvps_status_ends_at
  ON public.event_rsvps (status, event_ends_at);
CREATE INDEX IF NOT EXISTS idx_event_rsvps_status_created
  ON public.event_rsvps (status, created_at);

-- ----------------------------------------------------------------------------
-- RLS — admins manage; everyone else denied. The API uses the service role
-- (bypasses RLS) and the SECURITY DEFINER function below for confirmation.
-- ----------------------------------------------------------------------------
ALTER TABLE public.event_rsvps ENABLE ROW LEVEL SECURITY;

CREATE POLICY "event_rsvps_admin_all" ON public.event_rsvps
  FOR ALL USING (public.is_admin()) WITH CHECK (public.is_admin());

-- ----------------------------------------------------------------------------
-- Atomic seat claim. Advisory lock serializes confirms per event, so concurrent
-- final-seat requests cannot oversubscribe. Idempotent for already-confirmed
-- rows (returns 'confirmed' without recount). Hardened: fixed search_path,
-- positive-capacity check, token-must-match-slug, execute granted to service_role
-- only.
-- ----------------------------------------------------------------------------
CREATE OR REPLACE FUNCTION public.claim_event_seat(p_slug text, p_token uuid, p_capacity int)
RETURNS text
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = ''
AS $$
DECLARE
  r public.event_rsvps;
  n int;
BEGIN
  IF p_capacity <= 0 THEN
    RAISE EXCEPTION 'capacity must be positive';
  END IF;

  -- Serialize all confirms for this event before reading counts.
  PERFORM pg_catalog.pg_advisory_xact_lock(pg_catalog.hashtext(p_slug));

  -- Token must belong to the route's event slug (rejects cross-event tokens).
  SELECT * INTO r FROM public.event_rsvps
    WHERE confirm_token = p_token AND event_slug = p_slug
    FOR UPDATE;
  IF NOT FOUND THEN
    RETURN 'not_found';
  END IF;

  -- Idempotent: already holds a seat. Distinct from a first-time confirm so the
  -- caller only sends the "you're in" email once (a page refresh returns 'already').
  IF r.status IN ('confirmed', 'attended', 'no_show') THEN
    RETURN 'already';
  END IF;
  IF r.status = 'cancelled' THEN
    RETURN 'cancelled';
  END IF;
  IF pg_catalog.now() > r.confirm_deadline THEN
    RETURN 'expired';
  END IF;

  SELECT pg_catalog.count(*) INTO n FROM public.event_rsvps
    WHERE event_slug = p_slug AND status IN ('confirmed', 'attended', 'no_show');
  IF n >= p_capacity THEN
    RETURN 'full';
  END IF;

  UPDATE public.event_rsvps
    SET status = 'confirmed', confirmed_at = pg_catalog.now()
    WHERE id = r.id;
  RETURN 'confirmed';
END;
$$;

REVOKE ALL ON FUNCTION public.claim_event_seat(text, uuid, int) FROM PUBLIC, anon, authenticated;
GRANT EXECUTE ON FUNCTION public.claim_event_seat(text, uuid, int) TO service_role;

COMMIT;

-- ----------------------------------------------------------------------------
-- Retention (pg_cron). Confirmed PII deleted 90 days after the event ends;
-- abandoned pending pruned after 7 days. Scheduled only if pg_cron is enabled
-- (Supabase: Database > Extensions) — otherwise apply the cron.schedule below
-- manually after enabling it.
-- ----------------------------------------------------------------------------
DO $$
BEGIN
  IF EXISTS (SELECT 1 FROM pg_namespace WHERE nspname = 'cron') THEN
    PERFORM cron.schedule(
      'event_rsvps_cleanup',
      '0 3 * * *',
      $cleanup$
      DELETE FROM public.event_rsvps WHERE event_ends_at < now() - interval '90 days';
      DELETE FROM public.event_rsvps WHERE status = 'pending' AND created_at < now() - interval '7 days';
      $cleanup$
    );
  ELSE
    RAISE NOTICE 'pg_cron not enabled — enable it, then schedule event_rsvps_cleanup manually.';
  END IF;
END;
$$;
