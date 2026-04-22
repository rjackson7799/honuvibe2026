-- ============================================================
-- INSTRUCTOR APPLICATIONS — Public apply flow + admin review
-- Companion to partners (029) and multi-instructor (015).
-- ============================================================

CREATE TABLE IF NOT EXISTS instructor_applications (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),

  -- Applicant identity (logged-in user optional)
  applicant_user_id uuid REFERENCES public.users(id) ON DELETE SET NULL,
  applicant_email text NOT NULL,
  applicant_full_name text NOT NULL,
  applicant_locale text DEFAULT 'en' CHECK (applicant_locale IN ('en', 'ja')),

  -- Attribution (optional — set from hv_partner cookie at submit time)
  referred_by_partner_id uuid REFERENCES partners(id) ON DELETE SET NULL,

  -- Application content
  bio_short text NOT NULL,
  expertise_areas jsonb,                       -- array of tags/topics
  proposed_topic text,                         -- what they want to teach
  sample_material_url text,                    -- portfolio / video / socials
  linkedin_url text,
  website_url text,
  why_honuvibe text,

  -- Review
  status text NOT NULL DEFAULT 'pending'
    CHECK (status IN ('pending', 'approved', 'rejected', 'withdrawn')),
  reviewed_by_user_id uuid REFERENCES public.users(id) ON DELETE SET NULL,
  reviewed_at timestamptz,
  review_notes text,                           -- internal admin notes (never shown to applicant)
  rejection_reason text,                       -- shown to applicant in rejection email

  -- Outcome — links to the instructor profile if approved
  created_instructor_profile_id uuid REFERENCES instructor_profiles(id) ON DELETE SET NULL,

  submitted_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now()
);

CREATE INDEX IF NOT EXISTS idx_instructor_applications_status
  ON instructor_applications(status, submitted_at DESC);
CREATE INDEX IF NOT EXISTS idx_instructor_applications_applicant
  ON instructor_applications(applicant_user_id);
CREATE INDEX IF NOT EXISTS idx_instructor_applications_partner
  ON instructor_applications(referred_by_partner_id);

-- updated_at auto-refresh
CREATE OR REPLACE FUNCTION public.tg_set_updated_at()
RETURNS trigger AS $$
BEGIN
  NEW.updated_at = now();
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

DROP TRIGGER IF EXISTS trg_instructor_applications_updated
  ON instructor_applications;
CREATE TRIGGER trg_instructor_applications_updated
  BEFORE UPDATE ON instructor_applications
  FOR EACH ROW EXECUTE FUNCTION public.tg_set_updated_at();

-- RLS
ALTER TABLE instructor_applications ENABLE ROW LEVEL SECURITY;

-- Applicants can read their own application (if logged in at submit time)
DROP POLICY IF EXISTS "applications_own_read" ON instructor_applications;
CREATE POLICY "applications_own_read"
  ON instructor_applications
  FOR SELECT
  USING (applicant_user_id IS NOT NULL AND applicant_user_id = auth.uid());

-- Admin full access
DROP POLICY IF EXISTS "applications_admin_all" ON instructor_applications;
CREATE POLICY "applications_admin_all"
  ON instructor_applications
  FOR ALL
  USING (public.is_admin());

-- Inserts go through the API route using the service-role client, so
-- no public INSERT policy is needed here (service role bypasses RLS).
