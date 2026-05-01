-- ============================================================
-- REVENUE SPLIT - Per-enrollment instructor/partner/HonuVibe snapshot.
-- Feeds manual CSV payouts (INS-3); Stripe Connect comes later.
-- ============================================================

ALTER TABLE courses
  ADD COLUMN IF NOT EXISTS instructor_revenue_share_pct numeric(5,2) DEFAULT 0;

ALTER TABLE course_instructors
  ADD COLUMN IF NOT EXISTS revenue_share_pct numeric(5,2) DEFAULT 0;

ALTER TABLE enrollments
  ADD COLUMN IF NOT EXISTS partner_share_amount integer DEFAULT 0,
  ADD COLUMN IF NOT EXISTS instructor_share_amount integer DEFAULT 0,
  ADD COLUMN IF NOT EXISTS honuvibe_share_amount integer DEFAULT 0,
  ADD COLUMN IF NOT EXISTS refunded_at timestamptz;

CREATE TABLE IF NOT EXISTS enrollment_instructor_shares (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  enrollment_id uuid NOT NULL REFERENCES enrollments(id) ON DELETE CASCADE,
  instructor_id uuid NOT NULL REFERENCES instructor_profiles(id),
  amount integer NOT NULL,
  currency text NOT NULL,
  status text NOT NULL DEFAULT 'pending'
    CHECK (status IN ('pending', 'paid', 'clawed_back')),
  paid_at timestamptz,
  payout_reference text,
  created_at timestamptz NOT NULL DEFAULT now(),
  UNIQUE(enrollment_id, instructor_id)
);

CREATE INDEX IF NOT EXISTS idx_eis_instructor_status
  ON enrollment_instructor_shares(instructor_id, status);
CREATE INDEX IF NOT EXISTS idx_eis_enrollment
  ON enrollment_instructor_shares(enrollment_id);
CREATE INDEX IF NOT EXISTS idx_eis_status_created
  ON enrollment_instructor_shares(status, created_at DESC);

ALTER TABLE enrollment_instructor_shares ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "eis_admin_all" ON enrollment_instructor_shares;
CREATE POLICY "eis_admin_all" ON enrollment_instructor_shares
  FOR ALL USING (public.is_admin());

DROP POLICY IF EXISTS "eis_own_read" ON enrollment_instructor_shares;
CREATE POLICY "eis_own_read" ON enrollment_instructor_shares
  FOR SELECT USING (
    EXISTS (
      SELECT 1 FROM instructor_profiles ip
      WHERE ip.id = enrollment_instructor_shares.instructor_id
        AND ip.user_id = auth.uid()
    )
  );
