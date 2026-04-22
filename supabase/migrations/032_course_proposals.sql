-- ============================================================
-- COURSE PROPOSALS — Instructor-authored course drafts.
-- Companion to instructor_applications (031) and multi-instructor (004).
-- ============================================================

-- Extend status to include 'proposal' (instructor-authored, awaiting admin review)
-- and 'rejected' (admin rejected with feedback).
ALTER TABLE courses DROP CONSTRAINT IF EXISTS courses_status_check;
ALTER TABLE courses ADD CONSTRAINT courses_status_check
  CHECK (status IN (
    'draft',
    'proposal',
    'published',
    'in-progress',
    'completed',
    'archived',
    'rejected'
  ));

ALTER TABLE courses
  ADD COLUMN IF NOT EXISTS proposed_by_instructor_id uuid
    REFERENCES instructor_profiles(id) ON DELETE SET NULL,
  ADD COLUMN IF NOT EXISTS proposal_submitted_at timestamptz,
  ADD COLUMN IF NOT EXISTS proposal_review_notes text;

CREATE INDEX IF NOT EXISTS idx_courses_proposal_status
  ON courses(status, proposal_submitted_at DESC)
  WHERE status IN ('proposal', 'rejected');
CREATE INDEX IF NOT EXISTS idx_courses_proposed_by
  ON courses(proposed_by_instructor_id)
  WHERE proposed_by_instructor_id IS NOT NULL;

-- RLS: instructors CRUD their own proposals. Admin bypasses via existing is_admin() policy.
-- Writes still route through the API using the service-role client; these policies are defensive.
DROP POLICY IF EXISTS "courses_own_proposals_read" ON courses;
CREATE POLICY "courses_own_proposals_read" ON courses
  FOR SELECT
  USING (
    proposed_by_instructor_id IN (
      SELECT id FROM instructor_profiles WHERE user_id = auth.uid()
    )
  );

DROP POLICY IF EXISTS "courses_own_proposals_insert" ON courses;
CREATE POLICY "courses_own_proposals_insert" ON courses
  FOR INSERT
  WITH CHECK (
    status = 'proposal'
    AND proposed_by_instructor_id IN (
      SELECT id FROM instructor_profiles WHERE user_id = auth.uid()
    )
  );

DROP POLICY IF EXISTS "courses_own_proposals_update" ON courses;
CREATE POLICY "courses_own_proposals_update" ON courses
  FOR UPDATE
  USING (
    status = 'proposal'
    AND proposed_by_instructor_id IN (
      SELECT id FROM instructor_profiles WHERE user_id = auth.uid()
    )
  )
  WITH CHECK (status = 'proposal');
