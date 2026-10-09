-- ============================================================================
-- 078_community_free.sql — Honu Community is free for any signed-in account
-- ============================================================================
--
-- Locked decision #2 (2026-10-04): Honu Community is free for every signed-in
-- user; The Vault ($99/mo) is the only paid tier; the $29 Community price is
-- retired. Plan: docs/plans/2026-10-07-b1-community-free.md.
--
-- APPLY TO PROD BEFORE PUSHING THE B1 CODE. Expand-first is safe: the function
-- only widens access, and the new app code also works against the old function.
--
-- What this does:
--   1. has_community_access(uuid) → true for any user with a public.users row.
--      Every 042 policy (cp_*, cc_*, cr_*) and community_scope_for() are
--      unchanged and inherit it: partner members still land in their partner
--      scope, everyone else in the HonuVibe main feed. Bans still apply.
--   2. A posting throttle (D2): BEFORE INSERT triggers on community_posts and
--      community_comments cap each author at 10 posts / 60 comments per rolling
--      hour. Admins, partner moderators of the target scope, and service-role
--      writes (no auth.uid()) are exempt. Raises SQLSTATE 'PT429' (PostgREST
--      turns PTxyz into HTTP xyz) with message 'community_rate_limited', which
--      the app maps to translated copy.
--
-- Grants: CREATE OR REPLACE keeps the function's existing ACL, so this file
-- does not touch it. 042/064 never set explicit grants, and the RLS policies
-- call the function as the caller's role (anon included), so a blind
-- REVOKE ... FROM PUBLIC could turn anon reads into permission errors. Verify
-- after applying with the queries at the bottom of this file.
--
-- users_subscription_tier_check (036) is deliberately NOT tightened: legacy
-- 'community' rows stay valid until the last $29 subscription ends.
--
-- Rollback: re-run the has_community_access body from
-- 064_partner_membership_spine.sql (CREATE OR REPLACE FUNCTION
-- public.has_community_access ...), and drop the two throttle triggers.
-- ============================================================================

BEGIN;

-- ----------------------------------------------------------------------------
-- 1. Community access = any account
-- ----------------------------------------------------------------------------

CREATE OR REPLACE FUNCTION public.has_community_access(p_user_id uuid)
RETURNS boolean
LANGUAGE sql SECURITY DEFINER STABLE
SET search_path = pg_catalog, public
AS $$
  SELECT p_user_id IS NOT NULL
     AND EXISTS (SELECT 1 FROM public.users u WHERE u.id = p_user_id);
$$;

COMMENT ON FUNCTION public.has_community_access(uuid) IS
  'True for any signed-in account with a public.users row. Honu Community is '
  'free (locked decision #2, 2026-10-04; migration 078). Feed scope still comes '
  'from community_scope_for(); bans are enforced by the insert policies.';

-- ----------------------------------------------------------------------------
-- 2. Posting throttle (D2)
-- ----------------------------------------------------------------------------

CREATE INDEX IF NOT EXISTS community_comments_author_created_idx
  ON public.community_comments(author_id, created_at);
CREATE INDEX IF NOT EXISTS community_posts_author_created_idx
  ON public.community_posts(author_id, created_at);

CREATE OR REPLACE FUNCTION public.community_insert_throttle()
RETURNS trigger
LANGUAGE plpgsql SECURITY DEFINER
SET search_path = ''
AS $$
DECLARE
  recent integer;
  cap integer;
BEGIN
  -- Service-role / internal writes carry no JWT subject: trusted, not throttled.
  IF auth.uid() IS NULL THEN
    RETURN NEW;
  END IF;

  IF public.is_admin() OR public.is_partner_for(NEW.partner_id) THEN
    RETURN NEW;
  END IF;

  IF TG_TABLE_NAME = 'community_posts' THEN
    cap := 10;
    SELECT count(*) INTO recent
    FROM public.community_posts
    WHERE author_id = NEW.author_id
      AND created_at > pg_catalog.now() - interval '1 hour';
  ELSE
    cap := 60;
    SELECT count(*) INTO recent
    FROM public.community_comments
    WHERE author_id = NEW.author_id
      AND created_at > pg_catalog.now() - interval '1 hour';
  END IF;

  IF recent >= cap THEN
    RAISE EXCEPTION 'community_rate_limited'
      USING ERRCODE = 'PT429',
            HINT = pg_catalog.format('%s per hour', cap);
  END IF;

  RETURN NEW;
END;
$$;

COMMENT ON FUNCTION public.community_insert_throttle() IS
  'BEFORE INSERT throttle for community posts (10/h) and comments (60/h) per '
  'author. Exempt: admins, partner moderators of the row''s scope, service role. '
  'Raises SQLSTATE PT429 / community_rate_limited (migration 078, decision D2).';

REVOKE ALL ON FUNCTION public.community_insert_throttle() FROM PUBLIC, anon, authenticated;

DROP TRIGGER IF EXISTS community_posts_throttle ON public.community_posts;
CREATE TRIGGER community_posts_throttle
  BEFORE INSERT ON public.community_posts
  FOR EACH ROW EXECUTE FUNCTION public.community_insert_throttle();

-- Named to sort AFTER community_comments_partner_sync (BEFORE triggers fire in
-- name order) so NEW.partner_id is already populated for the moderator check.
DROP TRIGGER IF EXISTS community_comments_throttle ON public.community_comments;
CREATE TRIGGER community_comments_throttle
  BEFORE INSERT ON public.community_comments
  FOR EACH ROW EXECUTE FUNCTION public.community_insert_throttle();

NOTIFY pgrst, 'reload schema';

COMMIT;

-- ----------------------------------------------------------------------------
-- Post-apply verification (run separately; read-only):
--
--   select pg_get_functiondef('public.has_community_access(uuid)'::regprocedure);
--   select proacl from pg_proc where oid = 'public.has_community_access(uuid)'::regprocedure;
--   select tgname, tgrelid::regclass from pg_trigger
--    where tgname in ('community_posts_throttle', 'community_comments_throttle');
-- ----------------------------------------------------------------------------
