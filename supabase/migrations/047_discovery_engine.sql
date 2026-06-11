-- ============================================================================
-- 047_discovery_engine.sql — "Build It AI" (Reef) discovery engine, Increment 1
-- ============================================================================
-- See docs/HonuVibe_BuildItAI_v2.1_Spec.md (§5 data model, §10 pricing).
--
-- Why this migration exists:
--   Phase 1 captured Studio leads in a flat `studio_leads` table (046), read by
--   a placeholder admin. This migration stands up the normalized discovery model
--   that becomes the real lead pipeline: a `leads` table carrying TWO statuses
--   (system `lifecycle` + admin `sales_stage`), plus session/response/output/
--   asset/OTP tables for the conversational intake at app.honuvibe.ai/discover.
--
--   `studio_leads` is RETIRED, not dropped: its rows are backfilled into `leads`
--   (idempotently, keyed on legacy_studio_lead_id), the public form is rewired to
--   write `leads`, and the admin read moves to `leads` — so nothing reads the old
--   table after this increment. It is kept (frozen) only for rollback safety.
--
--   Increment 1 is a front-end vertical slice: the scraper, the 3 Claude calls,
--   real Resend OTP, artifact generation, and logo upload are all STUBBED. The
--   jsonb columns (context_brief, scrape_data, logo_analysis, *_profile, prd,
--   design_brief) and the assets/email_otps tables exist now but stay empty until
--   their increments. `discovery_followups` (Claude Call 2) is intentionally
--   deferred to a later migration.
--
--   Writes go through service-role API routes (which bypass RLS); there is NO
--   anon-insert policy on these tables. An owner-scoped self-read policy for
--   cross-device client resume is a deliberate follow-up (see plan Risks).
--
-- PROD NOTE: Vercel does NOT auto-apply migrations. After deploy, run this file
--   manually in the Supabase dashboard SQL editor (project zvfwtndbxshrtpwcwynw).
-- ============================================================================

BEGIN;

-- Shared updated_at trigger (defined in 031; CREATE OR REPLACE is a safe no-op).
CREATE OR REPLACE FUNCTION public.tg_set_updated_at()
RETURNS trigger AS $$
BEGIN
  NEW.updated_at = now();
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

-- ----------------------------------------------------------------------------
-- leads — the lead pipeline (source of truth). Dual status: lifecycle + sales_stage.
-- ----------------------------------------------------------------------------
CREATE TABLE IF NOT EXISTS leads (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now(),

  -- intake
  name text NOT NULL,
  email text NOT NULL,
  email_verified boolean NOT NULL DEFAULT false,
  business_name text NOT NULL,
  industry text,  -- free-text: studio enums + the broader discovery list both fit
  location_type text CHECK (location_type IS NULL OR location_type IN ('online','physical','both')),
  tier_interest text CHECK (tier_interest IS NULL OR tier_interest IN ('starter','pro','ai_native','not_sure')),
  existing_url text,
  logo_path text,

  -- pipeline (dual status; sales_stage vocab matches studio_leads.status exactly)
  lifecycle text NOT NULL DEFAULT 'new'
    CHECK (lifecycle IN ('new','in_progress','review','verified','completed','abandoned','booked_call')),
  sales_stage text NOT NULL DEFAULT 'new'
    CHECK (sales_stage IN ('new','qualified','proposal','won','lost')),
  qualification_score int NOT NULL DEFAULT 0,

  -- provenance + studio-form carryover (kept free-text: studio & discovery use
  -- different timeline/budget vocabularies)
  source text NOT NULL DEFAULT 'discover',
  source_locale text NOT NULL DEFAULT 'en' CHECK (source_locale IN ('en','ja')),
  message text,
  budget_range text,
  timeline text,
  referral_source text,
  notes text,

  -- admin review
  reviewed_by uuid REFERENCES users(id),
  reviewed_at timestamptz,

  -- migration dedupe key (studio_leads.id) — makes the backfill idempotent
  legacy_studio_lead_id uuid UNIQUE
);

CREATE INDEX IF NOT EXISTS idx_leads_lifecycle_created ON leads(lifecycle, created_at DESC);
CREATE INDEX IF NOT EXISTS idx_leads_sales_stage_created ON leads(sales_stage, created_at DESC);
CREATE INDEX IF NOT EXISTS idx_leads_email ON leads(email);

DROP TRIGGER IF EXISTS trg_leads_updated_at ON leads;
CREATE TRIGGER trg_leads_updated_at
  BEFORE UPDATE ON leads
  FOR EACH ROW EXECUTE FUNCTION public.tg_set_updated_at();

ALTER TABLE leads ENABLE ROW LEVEL SECURITY;
DROP POLICY IF EXISTS "leads_admin_all" ON leads;
CREATE POLICY "leads_admin_all" ON leads
  FOR ALL USING (public.is_admin()) WITH CHECK (public.is_admin());

-- ----------------------------------------------------------------------------
-- discovery_sessions — one per discovery run. session_secret_hash gates the
-- anonymous client (cookie holds the plaintext secret).
-- ----------------------------------------------------------------------------
CREATE TABLE IF NOT EXISTS discovery_sessions (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  lead_id uuid NOT NULL REFERENCES leads(id) ON DELETE CASCADE,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now(),
  completed_at timestamptz,
  session_secret_hash text NOT NULL,       -- sha256 of the resume secret
  context_brief jsonb NOT NULL DEFAULT '{}'::jsonb,  -- Claude Call 1 (stub: {})
  scrape_data jsonb,                        -- lean scrape (stub: null)
  logo_analysis jsonb,                      -- logo colors/style (stub: null)
  current_step int NOT NULL DEFAULT 1,      -- 3-step UX
  recommend_upgrade boolean NOT NULL DEFAULT false,
  computed_pricing jsonb,                   -- server-side price snapshot (audit)
  locale text NOT NULL DEFAULT 'en' CHECK (locale IN ('en','ja')),
  expires_at timestamptz                    -- retention (now()+30d)
);

CREATE INDEX IF NOT EXISTS idx_discovery_sessions_lead ON discovery_sessions(lead_id);

DROP TRIGGER IF EXISTS trg_discovery_sessions_updated_at ON discovery_sessions;
CREATE TRIGGER trg_discovery_sessions_updated_at
  BEFORE UPDATE ON discovery_sessions
  FOR EACH ROW EXECUTE FUNCTION public.tg_set_updated_at();

ALTER TABLE discovery_sessions ENABLE ROW LEVEL SECURITY;
DROP POLICY IF EXISTS "discovery_sessions_admin_all" ON discovery_sessions;
CREATE POLICY "discovery_sessions_admin_all" ON discovery_sessions
  FOR ALL USING (public.is_admin()) WITH CHECK (public.is_admin());

-- ----------------------------------------------------------------------------
-- discovery_responses — one row per answered question. UNIQUE(session, question)
-- is the upsert target that powers auto-save / resume without duplicate rows.
-- ----------------------------------------------------------------------------
CREATE TABLE IF NOT EXISTS discovery_responses (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  session_id uuid NOT NULL REFERENCES discovery_sessions(id) ON DELETE CASCADE,
  question_id text NOT NULL,
  answer jsonb NOT NULL,
  is_decide_for_me boolean NOT NULL DEFAULT false,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now(),
  UNIQUE (session_id, question_id)
);

CREATE INDEX IF NOT EXISTS idx_discovery_responses_session ON discovery_responses(session_id);

DROP TRIGGER IF EXISTS trg_discovery_responses_updated_at ON discovery_responses;
CREATE TRIGGER trg_discovery_responses_updated_at
  BEFORE UPDATE ON discovery_responses
  FOR EACH ROW EXECUTE FUNCTION public.tg_set_updated_at();

ALTER TABLE discovery_responses ENABLE ROW LEVEL SECURITY;
DROP POLICY IF EXISTS "discovery_responses_admin_all" ON discovery_responses;
CREATE POLICY "discovery_responses_admin_all" ON discovery_responses
  FOR ALL USING (public.is_admin()) WITH CHECK (public.is_admin());

-- ----------------------------------------------------------------------------
-- discovery_outputs — generated artifacts (Claude Call 3). This slice writes
-- only pricing_summary at /complete; the rest stay null until their increment.
-- ----------------------------------------------------------------------------
CREATE TABLE IF NOT EXISTS discovery_outputs (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  session_id uuid NOT NULL REFERENCES discovery_sessions(id) ON DELETE CASCADE,
  brand_voice_profile jsonb,
  prd jsonb,
  pricing_summary jsonb,
  design_brief jsonb,
  generated_at timestamptz NOT NULL DEFAULT now(),
  UNIQUE (session_id)
);

ALTER TABLE discovery_outputs ENABLE ROW LEVEL SECURITY;
DROP POLICY IF EXISTS "discovery_outputs_admin_all" ON discovery_outputs;
CREATE POLICY "discovery_outputs_admin_all" ON discovery_outputs
  FOR ALL USING (public.is_admin()) WITH CHECK (public.is_admin());

-- ----------------------------------------------------------------------------
-- assets — uploaded files (logo at intake, images in Q15). Empty this slice
-- (logo upload deferred). lead_id is set because a logo arrives before a session.
-- ----------------------------------------------------------------------------
CREATE TABLE IF NOT EXISTS assets (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  session_id uuid REFERENCES discovery_sessions(id) ON DELETE CASCADE,
  lead_id uuid REFERENCES leads(id) ON DELETE CASCADE,
  type text CHECK (type IS NULL OR type IN ('logo','image','document')),
  storage_path text NOT NULL,
  thumbnail_path text,
  filename text,
  size_bytes int,
  sanitized boolean NOT NULL DEFAULT false,  -- SVG safety flag (future)
  created_at timestamptz NOT NULL DEFAULT now()
);

CREATE INDEX IF NOT EXISTS idx_assets_session ON assets(session_id);
CREATE INDEX IF NOT EXISTS idx_assets_lead ON assets(lead_id);

ALTER TABLE assets ENABLE ROW LEVEL SECURITY;
DROP POLICY IF EXISTS "assets_admin_all" ON assets;
CREATE POLICY "assets_admin_all" ON assets
  FOR ALL USING (public.is_admin()) WITH CHECK (public.is_admin());

-- ----------------------------------------------------------------------------
-- email_otps — hashed, expiring, attempt-capped codes. Empty this slice
-- (verify is stubbed); real Resend OTP swaps in later via lib/otp.ts.
-- ----------------------------------------------------------------------------
CREATE TABLE IF NOT EXISTS email_otps (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  lead_id uuid NOT NULL REFERENCES leads(id) ON DELETE CASCADE,
  code_hash text NOT NULL,
  expires_at timestamptz NOT NULL,
  attempts int NOT NULL DEFAULT 0,
  created_at timestamptz NOT NULL DEFAULT now()
);

CREATE INDEX IF NOT EXISTS idx_email_otps_lead ON email_otps(lead_id);

ALTER TABLE email_otps ENABLE ROW LEVEL SECURITY;
DROP POLICY IF EXISTS "email_otps_admin_all" ON email_otps;
CREATE POLICY "email_otps_admin_all" ON email_otps
  FOR ALL USING (public.is_admin()) WITH CHECK (public.is_admin());

-- ----------------------------------------------------------------------------
-- Storage buckets — private (logos can be SVG → XSS; assets are pre-verify PII).
-- Created now for readiness; no upload route ships this slice. Admin-only writes;
-- no SELECT policy = no client reads (admin reads via service-role/signed URLs).
-- ----------------------------------------------------------------------------
INSERT INTO storage.buckets (id, name, public)
VALUES ('discovery-logos', 'discovery-logos', false)
ON CONFLICT (id) DO NOTHING;

INSERT INTO storage.buckets (id, name, public)
VALUES ('discovery-assets', 'discovery-assets', false)
ON CONFLICT (id) DO NOTHING;

DROP POLICY IF EXISTS "discovery_logos_admin_write" ON storage.objects;
CREATE POLICY "discovery_logos_admin_write" ON storage.objects
  FOR INSERT WITH CHECK (bucket_id = 'discovery-logos' AND public.is_admin());
DROP POLICY IF EXISTS "discovery_logos_admin_update" ON storage.objects;
CREATE POLICY "discovery_logos_admin_update" ON storage.objects
  FOR UPDATE USING (bucket_id = 'discovery-logos' AND public.is_admin())
  WITH CHECK (bucket_id = 'discovery-logos' AND public.is_admin());
DROP POLICY IF EXISTS "discovery_logos_admin_delete" ON storage.objects;
CREATE POLICY "discovery_logos_admin_delete" ON storage.objects
  FOR DELETE USING (bucket_id = 'discovery-logos' AND public.is_admin());

DROP POLICY IF EXISTS "discovery_assets_admin_write" ON storage.objects;
CREATE POLICY "discovery_assets_admin_write" ON storage.objects
  FOR INSERT WITH CHECK (bucket_id = 'discovery-assets' AND public.is_admin());
DROP POLICY IF EXISTS "discovery_assets_admin_update" ON storage.objects;
CREATE POLICY "discovery_assets_admin_update" ON storage.objects
  FOR UPDATE USING (bucket_id = 'discovery-assets' AND public.is_admin())
  WITH CHECK (bucket_id = 'discovery-assets' AND public.is_admin());
DROP POLICY IF EXISTS "discovery_assets_admin_delete" ON storage.objects;
CREATE POLICY "discovery_assets_admin_delete" ON storage.objects
  FOR DELETE USING (bucket_id = 'discovery-assets' AND public.is_admin());

-- ----------------------------------------------------------------------------
-- Backfill studio_leads → leads (idempotent via legacy_studio_lead_id).
-- full_name→name, company→business_name, project_type→tier_interest,
-- status→sales_stage. studio_leads is NOT dropped (frozen for rollback).
-- ----------------------------------------------------------------------------
INSERT INTO leads (
  legacy_studio_lead_id, created_at, name, email, business_name, industry,
  tier_interest, sales_stage, source, source_locale, message, budget_range,
  timeline, referral_source, notes, reviewed_by, reviewed_at
)
SELECT
  id, created_at, full_name, email, company, industry,
  project_type, status, 'studio_form_migrated', source_locale, message, budget_range,
  timeline, referral_source, notes, reviewed_by, reviewed_at
FROM studio_leads
ON CONFLICT (legacy_studio_lead_id) DO NOTHING;

COMMIT;
