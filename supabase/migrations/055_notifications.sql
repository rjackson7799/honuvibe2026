-- ============================================================================
-- 055_notifications.sql — In-app notification center (Tier 0.2, Unit 3)
-- ============================================================================
-- Rows are inserted by the cron / service role ONLY (users never INSERT); a
-- user may read and mark-read their OWN rows. The community-reply trigger
-- writes a row for a DIFFERENT user (the post author), so an owner-only
-- WITH CHECK would forbid it — all inserts go through the service-role client
-- (bypasses RLS). Copy is rendered bilingually at display time from type+data;
-- no frozen strings are stored.
--
-- Apply MANUALLY in the Supabase dashboard SQL editor on zvfwtndbxshrtpwcwynw
-- AFTER deploy — the Vercel build does not run migrations; the code 500s ahead
-- of its schema until you do.
-- ============================================================================

BEGIN;

CREATE TABLE IF NOT EXISTS public.notifications (
  id         uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id    uuid NOT NULL REFERENCES public.users(id) ON DELETE CASCADE,
  type       text NOT NULL CHECK (type IN ('session_soon', 'assignment_due', 'community_reply')),
  entity_id  uuid NOT NULL,                       -- session/assignment/comment id (dedup + linking)
  data       jsonb NOT NULL DEFAULT '{}'::jsonb,  -- render params (titles, when, actor name, excerpt)
  href       text,                                -- deep link target
  read_at    timestamptz,                         -- NULL = unread
  created_at timestamptz NOT NULL DEFAULT now(),
  -- Idempotency: one notification per (user, type, entity). A repeat cron pass
  -- no-ops via upsert-ignore-duplicates.
  UNIQUE (user_id, type, entity_id)
);

CREATE INDEX IF NOT EXISTS notifications_user_created_idx
  ON public.notifications (user_id, created_at DESC);

ALTER TABLE public.notifications ENABLE ROW LEVEL SECURITY;

-- Owner may read and mark-read their own rows. NO owner INSERT policy — the
-- service role bypasses RLS to insert (incl. cross-user community-reply rows),
-- and users must not be able to forge notifications.
CREATE POLICY "notifications_own_select" ON public.notifications
  FOR SELECT USING (user_id = auth.uid());
CREATE POLICY "notifications_own_update" ON public.notifications
  FOR UPDATE USING (user_id = auth.uid()) WITH CHECK (user_id = auth.uid());
CREATE POLICY "notifications_admin_read" ON public.notifications
  FOR SELECT USING (public.is_admin());

COMMIT;

-- ----------------------------------------------------------------------------
-- Verification (run as anon / ordinary authenticated; must be denied/empty):
--   select * from public.notifications;                  -- 0 rows / denied
--   insert into public.notifications(user_id,type,entity_id)
--     values (auth.uid(),'community_reply',gen_random_uuid());  -- denied (no owner INSERT)
-- ----------------------------------------------------------------------------
