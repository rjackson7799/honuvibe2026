-- ============================================================================
-- 061_prospects.sql — Prospect Finder (Studio lead engine, phase 4)
-- ============================================================================
-- One row per Google Places result we have seen. Repeat searches upsert the
-- Places data on place_id but never clobber a converted/dismissed status.
-- Status lifecycle:
--   new          (inserted, scoring not yet started — transient)
--   scoring      (background job is fetching + scoring the website)
--   scored       (score + breakdown written)
--   score_failed (website unreachable/invalid, or scoring went stale — still convertible)
--   no_website   (Places returned no websiteUri — highest opportunity, score 95)
--   converted    (a lead was created; converted_lead_id points at it)
--   dismissed    (admin ruled it out; survives re-searches; dismissed_from
--                 remembers the prior status so restore is lossless)
-- Admin-only; the background job writes via the service role. Conversion is a
-- single-transaction RPC (convert_prospect) so a prospect can never end up
-- converted without a lead, or spawn two leads under a double-click race.
--
-- Apply MANUALLY in the Supabase dashboard SQL editor on project
-- zvfwtndbxshrtpwcwynw in the same window as the deploy.
-- ============================================================================

BEGIN;

CREATE TABLE IF NOT EXISTS public.prospects (
  id                 uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  created_at         timestamptz NOT NULL DEFAULT now(),
  place_id           text NOT NULL UNIQUE,
  name               text NOT NULL,
  website            text,                -- normalized URL or NULL
  phone              text,
  address            text,                -- may be NULL for service-area businesses
  rating             numeric(2,1),
  review_count       int,
  industry           text NOT NULL,       -- what the admin searched
  location           text NOT NULL,       -- what the admin searched
  search_query       text NOT NULL,       -- the literal textQuery sent to Places
  status             text NOT NULL DEFAULT 'new'
                       CHECK (status IN ('new','scoring','scored','score_failed',
                                         'no_website','converted','dismissed')),
  score              int,                 -- 0-100; worse site = higher opportunity
  score_breakdown    jsonb,               -- [ { id, label, points } ]
  tech               jsonb,               -- { cms, generator, socialAsWebsite, ... }
  converted_lead_id  uuid REFERENCES public.leads(id) ON DELETE SET NULL,
  dismissed_from     text,                -- status before dismissal (for restore)
  scored_at          timestamptz,
  scoring_started_at timestamptz,         -- staleness anchor for the on-read flip

  -- A row claimed for scoring must carry its staleness anchor, or a malformed
  -- 'scoring' row with a NULL timestamp could never go stale.
  CONSTRAINT prospects_scoring_needs_anchor_ck
    CHECK (status <> 'scoring' OR scoring_started_at IS NOT NULL)
);

CREATE INDEX IF NOT EXISTS idx_prospects_status_score
  ON public.prospects (status, score DESC NULLS LAST);

ALTER TABLE public.prospects ENABLE ROW LEVEL SECURITY;
DROP POLICY IF EXISTS "prospects_admin_all" ON public.prospects;
CREATE POLICY "prospects_admin_all" ON public.prospects
  FOR ALL USING (public.is_admin()) WITH CHECK (public.is_admin());
-- No anon/member policy: the background job reads/writes via the service role only.

-- Transactional, idempotent conversion (hardened per 057's bump_preview_access):
-- row-lock the prospect; return the existing lead when already converted; else
-- insert the lead and mark the prospect converted in the same transaction.
CREATE OR REPLACE FUNCTION public.convert_prospect(p_prospect_id uuid)
RETURNS TABLE (lead_id uuid, already_converted boolean)
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = ''
AS $$
DECLARE
  v_p    public.prospects%ROWTYPE;
  v_lead uuid;
BEGIN
  SELECT * INTO v_p FROM public.prospects WHERE id = p_prospect_id FOR UPDATE;
  IF NOT FOUND THEN
    RAISE EXCEPTION 'prospect_not_found';
  END IF;
  IF v_p.converted_lead_id IS NOT NULL THEN
    RETURN QUERY SELECT v_p.converted_lead_id, true;
    RETURN;
  END IF;
  INSERT INTO public.leads
    (business_name, existing_url, phone, industry, source, lifecycle, sales_stage)
  VALUES
    (v_p.name, v_p.website, v_p.phone, v_p.industry, 'prospecting', 'new', 'new')
  RETURNING id INTO v_lead;
  UPDATE public.prospects
  SET status = 'converted', converted_lead_id = v_lead, dismissed_from = NULL
  WHERE id = p_prospect_id;
  RETURN QUERY SELECT v_lead, false;
END;
$$;
REVOKE ALL ON FUNCTION public.convert_prospect(uuid) FROM PUBLIC, anon, authenticated;
GRANT EXECUTE ON FUNCTION public.convert_prospect(uuid) TO service_role;

COMMIT;

-- ----------------------------------------------------------------------------
-- Post-migration verification (run as anon / ordinary authenticated):
--   select * from public.prospects;                       -- 0 rows / denied
--   select public.convert_prospect(gen_random_uuid());    -- permission denied
-- ----------------------------------------------------------------------------
