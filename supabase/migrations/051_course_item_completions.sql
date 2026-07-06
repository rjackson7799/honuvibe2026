-- 051_course_item_completions.sql
-- Per-user completion of course items (sessions + assignments).
-- Manual "mark complete" toggle: a row's presence = completed; delete = not completed.
--
-- NOTE: Prod is NOT migrated by the Vercel build. After deploying, run this file
-- in the Supabase dashboard SQL editor on project zvfwtndbxshrtpwcwynw, or the
-- app will 500 ahead of its schema.

CREATE TABLE IF NOT EXISTS public.course_item_completions (
  id           uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id      uuid NOT NULL REFERENCES public.users(id)   ON DELETE CASCADE,
  course_id    uuid NOT NULL REFERENCES public.courses(id) ON DELETE CASCADE,
  item_type    text NOT NULL CHECK (item_type IN ('session','assignment')),
  item_id      uuid NOT NULL,   -- course_sessions(id) or course_assignments(id) by type; no FK (polymorphic)
  completed_at timestamptz NOT NULL DEFAULT now(),
  UNIQUE (user_id, item_type, item_id)
);

CREATE INDEX IF NOT EXISTS course_item_completions_user_course_idx
  ON public.course_item_completions (user_id, course_id);

ALTER TABLE public.course_item_completions ENABLE ROW LEVEL SECURITY;

-- Owner can do everything to their own rows.
CREATE POLICY "course_item_completions_own"
  ON public.course_item_completions
  FOR ALL
  USING (auth.uid() = user_id)
  WITH CHECK (auth.uid() = user_id);

-- Admins can read all (mirrors enrollments_admin_all; read-only is enough here).
CREATE POLICY "course_item_completions_admin_read"
  ON public.course_item_completions
  FOR SELECT
  USING (public.is_admin());
