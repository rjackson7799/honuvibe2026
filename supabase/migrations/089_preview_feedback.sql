-- ============================================================================
-- 089_preview_feedback.sql — reviewer feedback on gated client previews
-- ============================================================================
-- See docs/plans/2026-10-22-preview-feedback.md.
--
-- Adds an opt-in feedback widget to gated previews (Studio, phase 2):
--   * client_previews.feedback_enabled — per-preview switch, default false, so
--     every existing preview serves byte-identical until Ryan turns it on.
--   * preview_feedback — one row per note a reviewer leaves (bug / improvement),
--     with a triage status the admin works through.
--
-- Access model: the feedback route writes with the SERVICE ROLE only, so there
-- is NO anon or member policy. The single policy is admin-all. Supabase default
-- privileges auto-GRANT ALL on new public tables to anon/authenticated, so the
-- grants are tightened here (house pattern: 064, 076):
--   * anon loses every privilege (a read/write gets 42501, not an empty set).
--   * authenticated keeps SELECT/INSERT/UPDATE/DELETE (RLS then limits it to
--     admins) but loses TRUNCATE/REFERENCES/TRIGGER — TRUNCATE is NOT filtered
--     by RLS.
--
-- PROD NOTE: Vercel does NOT auto-apply migrations. Apply this file in the
--   Supabase dashboard SQL editor (project zvfwtndbxshrtpwcwynw) BEFORE pushing
--   the code. The new code selects client_previews.feedback_enabled; without the
--   column every preview 404s.
--
-- VERIFY after applying (run on prod):
--   select column_name, data_type, column_default, is_nullable
--     from information_schema.columns
--    where table_name = 'client_previews' and column_name = 'feedback_enabled';
--     -- expect: boolean, false, NO
--   select grantee, privilege_type from information_schema.role_table_grants
--    where table_name = 'preview_feedback' and grantee in ('anon','authenticated');
--     -- expect: no anon rows; authenticated = SELECT, INSERT, UPDATE, DELETE only
--   select policyname from pg_policies where tablename = 'preview_feedback';
--     -- expect: preview_feedback_admin_all
--
-- ROLLBACK: deliberately NOT a bare DROP. Dropping schema while live code reads
--   it breaks previews. See the "Recovery" section of
--   docs/plans/2026-10-22-preview-feedback.md (switch the toggle off, roll back
--   the app only and leave 089 in place, and drop only after the code is gone).
-- ============================================================================

BEGIN;

ALTER TABLE public.client_previews
  ADD COLUMN IF NOT EXISTS feedback_enabled boolean NOT NULL DEFAULT false;

-- btrim() with no 2nd arg trims SPACES only, so a message of just tabs/newlines
-- would pass; trim the full ASCII whitespace set explicitly.
CREATE TABLE IF NOT EXISTS public.preview_feedback (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now(),
  preview_id uuid NOT NULL REFERENCES public.client_previews(id) ON DELETE CASCADE,
  page text NOT NULL CHECK (char_length(page) BETWEEN 1 AND 300),
  reviewer_name text NOT NULL CHECK (char_length(btrim(reviewer_name, E' \t\r\n')) BETWEEN 1 AND 80),
  kind text NOT NULL CHECK (kind IN ('bug','improvement')),
  message text NOT NULL CHECK (char_length(btrim(message, E' \t\r\n')) BETWEEN 1 AND 4000),
  viewport_w int CHECK (viewport_w BETWEEN 0 AND 20000),
  viewport_h int CHECK (viewport_h BETWEEN 0 AND 20000),
  user_agent text CHECK (char_length(user_agent) <= 500),
  status text NOT NULL DEFAULT 'new' CHECK (status IN ('new','planned','done','wont_do'))
);

CREATE INDEX IF NOT EXISTS idx_preview_feedback_preview_created
  ON public.preview_feedback (preview_id, created_at DESC);
CREATE INDEX IF NOT EXISTS idx_preview_feedback_preview_status
  ON public.preview_feedback (preview_id, status);

-- updated_at auto-refresh (function defined in 031_instructor_applications.sql)
DROP TRIGGER IF EXISTS trg_preview_feedback_updated ON public.preview_feedback;
CREATE TRIGGER trg_preview_feedback_updated
  BEFORE UPDATE ON public.preview_feedback
  FOR EACH ROW EXECUTE FUNCTION public.tg_set_updated_at();

ALTER TABLE public.preview_feedback ENABLE ROW LEVEL SECURITY;
DROP POLICY IF EXISTS "preview_feedback_admin_all" ON public.preview_feedback;
CREATE POLICY "preview_feedback_admin_all" ON public.preview_feedback
  FOR ALL USING (public.is_admin()) WITH CHECK (public.is_admin());
-- No anon/member policy: the feedback route writes via service role only.

REVOKE ALL ON public.preview_feedback FROM anon;
REVOKE TRUNCATE, REFERENCES, TRIGGER ON public.preview_feedback FROM authenticated;

COMMIT;
