-- ============================================================
-- FEEDBACK — In-app feedback from the member-area top bar.
-- Authenticated members insert their own rows (user_id must equal auth.uid());
-- members can read their own; admins read/triage all via is_admin().
-- The API route uses the authenticated server client, so RLS applies directly.
-- ============================================================

CREATE TABLE IF NOT EXISTS feedback (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  created_at timestamptz NOT NULL DEFAULT now(),
  -- References public.users (id mirrors auth.uid()) so the admin inbox can embed
  -- the submitter's name/email via PostgREST, and RLS auth.uid() = user_id holds.
  user_id uuid REFERENCES users(id) ON DELETE SET NULL,
  category text NOT NULL DEFAULT 'general'
    CHECK (category IN ('general','idea','problem')),
  message text NOT NULL,
  page_path text,
  status text NOT NULL DEFAULT 'new'
    CHECK (status IN ('new','reviewing','resolved','archived')),
  reviewed_by uuid REFERENCES users(id),
  reviewed_at timestamptz
);

CREATE INDEX IF NOT EXISTS idx_feedback_status_created
  ON feedback(status, created_at DESC);

ALTER TABLE feedback ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "feedback_admin_all" ON feedback;
CREATE POLICY "feedback_admin_all" ON feedback
  FOR ALL USING (public.is_admin());

DROP POLICY IF EXISTS "feedback_insert_own" ON feedback;
CREATE POLICY "feedback_insert_own" ON feedback
  FOR INSERT TO authenticated WITH CHECK (auth.uid() = user_id);

DROP POLICY IF EXISTS "feedback_select_own" ON feedback;
CREATE POLICY "feedback_select_own" ON feedback
  FOR SELECT USING (auth.uid() = user_id);
