-- 062_course_session_opens.sql
-- Per-user record of opening a course session's external link (Zoom / replay).
-- Backs the dashboard's resume hero: the most recent open picks the course to resume.
--
-- "Opens", not "views": we record a click on an external link, not confirmed
-- consumption — the content itself lives on Zoom / the replay host. Do not call
-- this "viewed" in the UI, analytics, or copy.
--
-- Unlike course_item_completions.item_id, session_id is NOT polymorphic — it always
-- points at course_sessions — so it gets a real FK with ON DELETE CASCADE.
--
-- NOTE ON APPLY ORDER — this file INVERTS the repo default. Prod is still NOT
-- migrated by the Vercel build, but run this file in the Supabase dashboard SQL
-- editor on project zvfwtndbxshrtpwcwynw *BEFORE* deploying the code, not after.
-- This table is purely additive and nothing reads it until the dashboard ships, so
-- applying first is zero-risk and removes the window where code 500s ahead of its
-- schema. Rollback is then just reverting the code.

CREATE TABLE IF NOT EXISTS public.course_session_opens (
  user_id    uuid NOT NULL REFERENCES public.users(id)           ON DELETE CASCADE,
  course_id  uuid NOT NULL REFERENCES public.courses(id)         ON DELETE CASCADE,
  session_id uuid NOT NULL REFERENCES public.course_sessions(id) ON DELETE CASCADE,
  opened_at  timestamptz NOT NULL DEFAULT now(),
  PRIMARY KEY (user_id, session_id)
);

CREATE INDEX IF NOT EXISTS course_session_opens_user_recent_idx
  ON public.course_session_opens (user_id, opened_at DESC);

ALTER TABLE public.course_session_opens ENABLE ROW LEVEL SECURITY;

-- Owner can do everything to their own rows.
CREATE POLICY "course_session_opens_own"
  ON public.course_session_opens
  FOR ALL
  USING (auth.uid() = user_id)
  WITH CHECK (auth.uid() = user_id);

-- Admins can read all (mirrors course_item_completions_admin_read).
CREATE POLICY "course_session_opens_admin_read"
  ON public.course_session_opens
  FOR SELECT
  USING (public.is_admin());
