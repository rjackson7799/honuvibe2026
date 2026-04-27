-- ============================================================
-- PARTNERSHIP INQUIRIES — Inbound leads from /partnerships form.
-- Anonymous insert (form is unauthenticated); admin-only read/update via is_admin().
-- API route uses service-role client and bypasses RLS; the anon-insert
-- policy is belt-and-suspenders for any future direct-to-Supabase posts.
-- ============================================================

CREATE TABLE IF NOT EXISTS partnership_inquiries (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  created_at timestamptz NOT NULL DEFAULT now(),
  full_name text NOT NULL,
  email text NOT NULL,
  organization text NOT NULL,
  website text,
  org_type text NOT NULL CHECK (org_type IN (
    'professional_network','creative_community','nonprofit','company','accelerator','other'
  )),
  community_description text NOT NULL,
  program_description text NOT NULL,
  audience_size text CHECK (audience_size IN (
    'under_10','10_25','25_50','50_100','100_plus'
  )),
  language text CHECK (language IN ('en','ja','bilingual')),
  timeline text CHECK (timeline IN ('ready_now','1_3_months','3_6_months','exploring')),
  referral_source text CHECK (referral_source IN (
    'web_search','social_media','referral','vertice','smashhaus','conference','other'
  )),
  source_locale text NOT NULL DEFAULT 'en' CHECK (source_locale IN ('en','ja')),
  status text NOT NULL DEFAULT 'received'
    CHECK (status IN ('received','reviewing','responded','archived')),
  notes text,
  reviewed_by uuid REFERENCES users(id),
  reviewed_at timestamptz
);

CREATE INDEX IF NOT EXISTS idx_partnership_inquiries_status_created
  ON partnership_inquiries(status, created_at DESC);

ALTER TABLE partnership_inquiries ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "partnership_inquiries_admin_all" ON partnership_inquiries;
CREATE POLICY "partnership_inquiries_admin_all" ON partnership_inquiries
  FOR ALL USING (public.is_admin());

DROP POLICY IF EXISTS "partnership_inquiries_anon_insert" ON partnership_inquiries;
CREATE POLICY "partnership_inquiries_anon_insert" ON partnership_inquiries
  FOR INSERT TO anon WITH CHECK (true);
