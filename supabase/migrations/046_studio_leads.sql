-- ============================================================
-- STUDIO LEADS — Inbound "Start a Project" inquiries from
-- studio.honuvibe.ai/contact (HonuVibe Studio storefront, Phase 1).
-- Anonymous insert (form is unauthenticated); admin-only read/update
-- via is_admin(). The API route uses the service-role client and bypasses
-- RLS; the anon-insert policy is belt-and-suspenders for direct posts.
-- This is the manual placeholder for the Phase 2 app.honuvibe.ai intake engine.
-- ============================================================

CREATE TABLE IF NOT EXISTS studio_leads (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  created_at timestamptz NOT NULL DEFAULT now(),
  full_name text NOT NULL,
  email text NOT NULL,
  company text NOT NULL,
  industry text CHECK (industry IS NULL OR industry IN (
    'creator','healthcare','service','professional','other'
  )),
  project_type text CHECK (project_type IS NULL OR project_type IN (
    'starter','pro','ai_native','not_sure'
  )),
  budget_range text CHECK (budget_range IS NULL OR budget_range IN (
    'under_1k','1k_3k','3k_7k','7k_15k','15k_plus'
  )),
  timeline text CHECK (timeline IS NULL OR timeline IN (
    'asap','1_month','1_3_months','flexible'
  )),
  message text NOT NULL,
  referral_source text,
  source_locale text NOT NULL DEFAULT 'en' CHECK (source_locale IN ('en','ja')),
  status text NOT NULL DEFAULT 'new'
    CHECK (status IN ('new','qualified','proposal','won','lost')),
  notes text,
  reviewed_by uuid REFERENCES users(id),
  reviewed_at timestamptz
);

CREATE INDEX IF NOT EXISTS idx_studio_leads_status_created
  ON studio_leads(status, created_at DESC);

ALTER TABLE studio_leads ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "studio_leads_admin_all" ON studio_leads;
CREATE POLICY "studio_leads_admin_all" ON studio_leads
  FOR ALL USING (public.is_admin());

DROP POLICY IF EXISTS "studio_leads_anon_insert" ON studio_leads;
CREATE POLICY "studio_leads_anon_insert" ON studio_leads
  FOR INSERT TO anon WITH CHECK (true);
