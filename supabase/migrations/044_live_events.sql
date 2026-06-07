-- ============================================================================
-- 044_live_events.sql — Invite-only Live Training Events
-- ============================================================================
-- See docs/plans/2026-06-06-live-training-events.md
--
-- Three tables:
--   1. live_events            — the event row an invited, published-event
--                               viewer may read (meeting details included).
--   2. event_invitations      — the allowlist + RSVP + send-state.
--   3. live_event_recap_assets — sensitive recap URLs, in a SEPARATE table so
--                               they stay unreadable until recap_published.
--                               (Postgres RLS is row-level, not column-level —
--                               same boundary discipline as 041.)
--
-- Access helper is_event_invitee() matches on the trusted JWT email
-- (auth.jwt() ->> 'email'), NOT the user-editable public.users.email column,
-- so a profile-email rewrite cannot grant access.
-- ============================================================================

BEGIN;

-- ----------------------------------------------------------------------------
-- 1. live_events
-- ----------------------------------------------------------------------------
CREATE TABLE IF NOT EXISTS public.live_events (
  id              uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  slug            text UNIQUE NOT NULL,
  title_en        text NOT NULL,
  title_jp        text,
  description_en  text,
  description_jp  text,
  presenter_name  text,
  presenter_org   text,
  presenter_bio_en text,
  presenter_bio_jp text,
  starts_at       timestamptz NOT NULL,
  ends_at         timestamptz,
  timezone        text NOT NULL DEFAULT 'Pacific/Honolulu',
  meeting_url     text,
  meeting_notes_en text,
  meeting_notes_jp text,
  capacity        integer,
  cover_image_url text,
  status          text NOT NULL DEFAULT 'draft'
                    CHECK (status IN ('draft', 'scheduled', 'live', 'completed', 'cancelled')),
  is_published    boolean NOT NULL DEFAULT false,
  recap_published boolean NOT NULL DEFAULT false,
  created_at      timestamptz NOT NULL DEFAULT now(),
  updated_at      timestamptz NOT NULL DEFAULT now()
);

-- ----------------------------------------------------------------------------
-- 2. event_invitations (allowlist + RSVP + send-state)
-- ----------------------------------------------------------------------------
CREATE TABLE IF NOT EXISTS public.event_invitations (
  id                   uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  event_id             uuid NOT NULL REFERENCES public.live_events(id) ON DELETE CASCADE,
  email                text NOT NULL,
  user_id              uuid REFERENCES public.users(id) ON DELETE SET NULL,
  locale               text NOT NULL DEFAULT 'en' CHECK (locale IN ('en', 'ja')),
  status               text NOT NULL DEFAULT 'invited'
                         CHECK (status IN ('invited', 'going', 'not_going')),
  rsvp_at              timestamptz,
  attendance_status    text NOT NULL DEFAULT 'unknown'
                         CHECK (attendance_status IN ('unknown', 'attended', 'no_show')),
  attendance_marked_at timestamptz,
  invited_at           timestamptz NOT NULL DEFAULT now(),
  invite_sent_at       timestamptz,
  reminder_sent_at     timestamptz,
  recap_sent_at        timestamptz,
  last_email_status    text CHECK (last_email_status IN ('sent', 'failed')),
  last_email_error     text,
  UNIQUE (event_id, email)
);

CREATE INDEX IF NOT EXISTS idx_event_invitations_event ON public.event_invitations(event_id);
CREATE INDEX IF NOT EXISTS idx_event_invitations_user ON public.event_invitations(user_id);
CREATE INDEX IF NOT EXISTS idx_event_invitations_email ON public.event_invitations(lower(email));

-- ----------------------------------------------------------------------------
-- 3. live_event_recap_assets (protected payload — gated by recap_published)
-- ----------------------------------------------------------------------------
CREATE TABLE IF NOT EXISTS public.live_event_recap_assets (
  event_id        uuid PRIMARY KEY REFERENCES public.live_events(id) ON DELETE CASCADE,
  recording_url   text,
  slide_deck_url  text,
  transcript_url  text,
  recap_notes_en  text,
  recap_notes_jp  text,
  recap_resources jsonb NOT NULL DEFAULT '[]'::jsonb,
  updated_at      timestamptz NOT NULL DEFAULT now()
);

-- ----------------------------------------------------------------------------
-- 4. Access helper — trusted JWT email, not the editable profile column.
-- ----------------------------------------------------------------------------
-- SECURITY DEFINER so RLS policies can read event_invitations/users without
-- recursing through their own RLS. auth.uid()/auth.jwt() still reflect the
-- CALLING user (they read the per-request JWT GUC, not the definer).
CREATE OR REPLACE FUNCTION public.is_event_invitee(p_event_id uuid)
RETURNS boolean AS $$
  SELECT
    public.is_admin()
    OR EXISTS (
      SELECT 1 FROM public.event_invitations ei
      WHERE ei.event_id = p_event_id
        AND (
          ei.user_id = auth.uid()
          OR lower(ei.email) = lower(auth.jwt() ->> 'email')
        )
    );
$$ LANGUAGE sql SECURITY DEFINER STABLE;

COMMENT ON FUNCTION public.is_event_invitee(uuid) IS
  'True if the current user is an admin or holds an invitation to the event. '
  'Matches on the trusted JWT email (auth.jwt() email claim) rather than the '
  'user-editable public.users.email, so a profile-email rewrite cannot grant '
  'access. SECURITY DEFINER to avoid RLS recursion.';

-- ----------------------------------------------------------------------------
-- 5. RLS
-- ----------------------------------------------------------------------------
ALTER TABLE public.live_events ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.event_invitations ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.live_event_recap_assets ENABLE ROW LEVEL SECURITY;

-- live_events: admins manage; invitees read only PUBLISHED events.
CREATE POLICY "live_events_admin_all" ON public.live_events
  FOR ALL USING (public.is_admin()) WITH CHECK (public.is_admin());

CREATE POLICY "live_events_invitee_read" ON public.live_events
  FOR SELECT USING (is_published = true AND public.is_event_invitee(id));

-- event_invitations: admins manage (RSVP is performed by a service-role server
-- action with an ownership check); invitees may read only their OWN row.
CREATE POLICY "event_invitations_admin_all" ON public.event_invitations
  FOR ALL USING (public.is_admin()) WITH CHECK (public.is_admin());

CREATE POLICY "event_invitations_own_read" ON public.event_invitations
  FOR SELECT USING (
    user_id = auth.uid()
    OR lower(email) = lower(auth.jwt() ->> 'email')
  );

-- live_event_recap_assets: admins manage; invitees read ONLY once the parent
-- event is published AND recap_published. This is the column-leak fix — recap
-- URLs are unreadable before publish even by someone who can read the event.
CREATE POLICY "live_event_recap_assets_admin_all" ON public.live_event_recap_assets
  FOR ALL USING (public.is_admin()) WITH CHECK (public.is_admin());

CREATE POLICY "live_event_recap_assets_invitee_read" ON public.live_event_recap_assets
  FOR SELECT USING (
    public.is_event_invitee(event_id)
    AND EXISTS (
      SELECT 1 FROM public.live_events le
      WHERE le.id = live_event_recap_assets.event_id
        AND le.is_published = true
        AND le.recap_published = true
    )
  );

-- ----------------------------------------------------------------------------
-- 6. updated_at triggers
-- ----------------------------------------------------------------------------
CREATE OR REPLACE FUNCTION public.sync_live_events_updated_at()
RETURNS trigger AS $$
BEGIN
  NEW.updated_at = now();
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

CREATE TRIGGER trg_live_events_updated_at
  BEFORE UPDATE ON public.live_events
  FOR EACH ROW EXECUTE FUNCTION public.sync_live_events_updated_at();

CREATE TRIGGER trg_live_event_recap_assets_updated_at
  BEFORE UPDATE ON public.live_event_recap_assets
  FOR EACH ROW EXECUTE FUNCTION public.sync_live_events_updated_at();

COMMIT;
