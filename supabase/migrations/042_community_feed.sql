-- ============================================================================
-- 042_community_feed.sql — Community Feed MVP
-- ============================================================================
-- Spec: docs/plans/2026-05-20-community-feed-mvp-design.md
-- Plan: docs/plans/2026-05-20-community-feed-plan-1-migration.md
--
-- This migration ships:
--   1. partner_members table + idempotent backfill from is_vertice_member
--   2. partners.line_url column
--   3. community_scope_for(uid) + has_community_access(uid) helper functions
--   4. community_posts / community_comments / community_post_likes /
--      community_reports / community_bans / community_mod_actions tables
--   5. link_previews cache table (service-role-only)
--   6. All RLS policies for the above
--
-- All operations are idempotent (IF NOT EXISTS / DROP POLICY IF EXISTS / etc.)
-- so the migration is safe to re-apply against an environment where any
-- subset has already been applied.
-- ============================================================================

BEGIN;

-- ----------------------------------------------------------------------------
-- 1. partner_members — many-to-one user→partner membership
-- ----------------------------------------------------------------------------

CREATE TABLE IF NOT EXISTS partner_members (
  partner_id uuid NOT NULL REFERENCES partners(id) ON DELETE CASCADE,
  user_id    uuid NOT NULL REFERENCES public.users(id) ON DELETE CASCADE,
  joined_at  timestamptz NOT NULL DEFAULT now(),
  PRIMARY KEY (partner_id, user_id)
);
CREATE INDEX IF NOT EXISTS partner_members_user_idx ON partner_members(user_id);

COMMENT ON TABLE partner_members IS
  'Membership of a user in a partner community. MVP assumes 1 partner per user.';

-- Idempotent backfill from is_vertice_member.
-- Only runs if both the column and the vertice-society partner exist.
DO $$
BEGIN
  IF EXISTS (
    SELECT 1 FROM information_schema.columns
    WHERE table_schema = 'public' AND table_name = 'users' AND column_name = 'is_vertice_member'
  ) AND EXISTS (SELECT 1 FROM partners WHERE slug = 'vertice-society') THEN
    INSERT INTO partner_members (partner_id, user_id, joined_at)
    SELECT (SELECT id FROM partners WHERE slug = 'vertice-society'),
           u.id, COALESCE(u.created_at, now())
    FROM public.users u
    WHERE u.is_vertice_member = true
    ON CONFLICT (partner_id, user_id) DO NOTHING;
  END IF;
END $$;

-- ----------------------------------------------------------------------------
-- 2. partners.line_url
-- ----------------------------------------------------------------------------

ALTER TABLE partners ADD COLUMN IF NOT EXISTS line_url text;
COMMENT ON COLUMN partners.line_url IS
  'Optional LINE join URL for JP users in this partner community.';

-- ----------------------------------------------------------------------------
-- 3. Scope resolution helpers
-- ----------------------------------------------------------------------------

CREATE OR REPLACE FUNCTION public.community_scope_for(p_user_id uuid)
RETURNS uuid AS $$
  SELECT pm.partner_id
  FROM public.partner_members pm
  WHERE pm.user_id = p_user_id
  ORDER BY pm.joined_at ASC
  LIMIT 1
$$ LANGUAGE sql SECURITY DEFINER STABLE;

COMMENT ON FUNCTION public.community_scope_for(uuid) IS
  'Returns the partner_id the user is scoped to, or NULL for HonuVibe main. '
  'MVP: first joined partner wins.';

CREATE OR REPLACE FUNCTION public.has_community_access(p_user_id uuid)
RETURNS boolean AS $$
  SELECT
    -- partner membership always grants access
    EXISTS (SELECT 1 FROM public.partner_members WHERE user_id = p_user_id)
    -- admin bypass
    OR EXISTS (
      SELECT 1 FROM public.users u
      WHERE u.id = p_user_id AND u.role = 'admin'
    )
    -- active or trialing community/vault subscription
    OR EXISTS (
      SELECT 1 FROM public.users u
      WHERE u.id = p_user_id
        AND u.subscription_tier IN ('community','vault')
        AND u.subscription_status IN ('active','trialing')
    )
    -- cancelled community/vault subscription within grace window
    OR EXISTS (
      SELECT 1 FROM public.users u
      WHERE u.id = p_user_id
        AND u.subscription_tier IN ('community','vault')
        AND u.subscription_status = 'cancelled'
        AND u.subscription_expires_at IS NOT NULL
        AND u.subscription_expires_at > now()
    )
    -- active cohort enrollment window
    OR EXISTS (
      SELECT 1 FROM public.cohort_enrollments ce
      WHERE ce.user_id = p_user_id
        AND ce.bundle_access_starts_at <= now()
        AND ce.bundle_access_ends_at   >= now()
    )
$$ LANGUAGE sql SECURITY DEFINER STABLE;

COMMENT ON FUNCTION public.has_community_access(uuid) IS
  'Returns true if user qualifies for any community access. Mirrors '
  'has_vault_access status semantics (active/trialing/cancelled-grace + cohort window).';

-- ----------------------------------------------------------------------------
-- 4. partner_members RLS
-- ----------------------------------------------------------------------------

ALTER TABLE partner_members ENABLE ROW LEVEL SECURITY;
DROP POLICY IF EXISTS "pm_self_read"    ON partner_members;
DROP POLICY IF EXISTS "pm_admin_all"    ON partner_members;
DROP POLICY IF EXISTS "pm_partner_read" ON partner_members;
CREATE POLICY "pm_self_read"    ON partner_members FOR SELECT USING (user_id = auth.uid());
CREATE POLICY "pm_admin_all"    ON partner_members FOR ALL    USING (public.is_admin());
CREATE POLICY "pm_partner_read" ON partner_members FOR SELECT USING (public.is_partner_for(partner_id));

-- ----------------------------------------------------------------------------
-- 5. community_posts
-- ----------------------------------------------------------------------------

CREATE TABLE IF NOT EXISTS community_posts (
  id            uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  partner_id    uuid REFERENCES partners(id) ON DELETE CASCADE,  -- NULL = HonuVibe main
  author_id     uuid NOT NULL REFERENCES public.users(id) ON DELETE CASCADE,
  category      text NOT NULL CHECK (category IN ('general','show_and_tell','help','wins','announcements')),
  body_md       text NOT NULL CHECK (length(body_md) BETWEEN 1 AND 10000),
  link_preview  jsonb,
  status        text NOT NULL DEFAULT 'published' CHECK (status IN ('published','hidden','deleted')),
  pinned_at     timestamptz,
  like_count    int NOT NULL DEFAULT 0,
  comment_count int NOT NULL DEFAULT 0,
  created_at    timestamptz NOT NULL DEFAULT now(),
  updated_at    timestamptz NOT NULL DEFAULT now()
);
CREATE INDEX IF NOT EXISTS community_posts_feed_idx
  ON community_posts(partner_id, created_at DESC) WHERE status = 'published';
CREATE INDEX IF NOT EXISTS community_posts_pinned_idx
  ON community_posts(partner_id, pinned_at DESC) WHERE pinned_at IS NOT NULL;
CREATE INDEX IF NOT EXISTS community_posts_author_idx
  ON community_posts(author_id);

-- ----------------------------------------------------------------------------
-- 6. community_comments + triggers
-- ----------------------------------------------------------------------------

CREATE TABLE IF NOT EXISTS community_comments (
  id                uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  post_id           uuid NOT NULL REFERENCES community_posts(id) ON DELETE CASCADE,
  partner_id        uuid REFERENCES partners(id),  -- denormalized from post for RLS perf
  author_id         uuid NOT NULL REFERENCES public.users(id) ON DELETE CASCADE,
  body_md           text NOT NULL CHECK (length(body_md) BETWEEN 1 AND 4000),
  parent_comment_id uuid REFERENCES community_comments(id) ON DELETE CASCADE,
  status            text NOT NULL DEFAULT 'published' CHECK (status IN ('published','hidden','deleted')),
  created_at        timestamptz NOT NULL DEFAULT now()
);
CREATE INDEX IF NOT EXISTS community_comments_post_idx
  ON community_comments(post_id, created_at);

CREATE OR REPLACE FUNCTION sync_comment_partner_id() RETURNS TRIGGER AS $$
BEGIN
  SELECT partner_id INTO NEW.partner_id FROM community_posts WHERE id = NEW.post_id;
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

DROP TRIGGER IF EXISTS community_comments_partner_sync ON community_comments;
CREATE TRIGGER community_comments_partner_sync
  BEFORE INSERT ON community_comments
  FOR EACH ROW EXECUTE FUNCTION sync_comment_partner_id();

CREATE OR REPLACE FUNCTION bump_comment_count() RETURNS TRIGGER AS $$
BEGIN
  IF TG_OP = 'INSERT' THEN
    UPDATE community_posts SET comment_count = comment_count + 1 WHERE id = NEW.post_id;
  ELSIF TG_OP = 'DELETE' THEN
    UPDATE community_posts SET comment_count = GREATEST(comment_count - 1, 0) WHERE id = OLD.post_id;
  END IF;
  RETURN NULL;
END;
$$ LANGUAGE plpgsql;

DROP TRIGGER IF EXISTS community_comments_count ON community_comments;
CREATE TRIGGER community_comments_count
  AFTER INSERT OR DELETE ON community_comments
  FOR EACH ROW EXECUTE FUNCTION bump_comment_count();

-- ----------------------------------------------------------------------------
-- 7. community_post_likes + trigger
-- ----------------------------------------------------------------------------

CREATE TABLE IF NOT EXISTS community_post_likes (
  post_id    uuid NOT NULL REFERENCES community_posts(id) ON DELETE CASCADE,
  user_id    uuid NOT NULL REFERENCES public.users(id)  ON DELETE CASCADE,
  created_at timestamptz NOT NULL DEFAULT now(),
  PRIMARY KEY (post_id, user_id)
);

CREATE OR REPLACE FUNCTION bump_like_count() RETURNS TRIGGER AS $$
BEGIN
  IF TG_OP = 'INSERT' THEN
    UPDATE community_posts SET like_count = like_count + 1 WHERE id = NEW.post_id;
  ELSIF TG_OP = 'DELETE' THEN
    UPDATE community_posts SET like_count = GREATEST(like_count - 1, 0) WHERE id = OLD.post_id;
  END IF;
  RETURN NULL;
END;
$$ LANGUAGE plpgsql;

DROP TRIGGER IF EXISTS community_likes_count ON community_post_likes;
CREATE TRIGGER community_likes_count
  AFTER INSERT OR DELETE ON community_post_likes
  FOR EACH ROW EXECUTE FUNCTION bump_like_count();

-- ----------------------------------------------------------------------------
-- 8. community_reports
-- ----------------------------------------------------------------------------

CREATE TABLE IF NOT EXISTS community_reports (
  id          uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  partner_id  uuid REFERENCES partners(id),
  target_type text NOT NULL CHECK (target_type IN ('post','comment')),
  target_id   uuid NOT NULL,
  reporter_id uuid NOT NULL REFERENCES public.users(id) ON DELETE SET NULL,
  reason      text NOT NULL CHECK (reason IN ('spam','harassment','off_topic','other','auto_flag')),
  note        text CHECK (length(note) <= 200),
  status      text NOT NULL DEFAULT 'open' CHECK (status IN ('open','resolved')),
  resolved_by uuid REFERENCES public.users(id),
  resolved_at timestamptz,
  created_at  timestamptz NOT NULL DEFAULT now()
);
CREATE INDEX IF NOT EXISTS community_reports_queue_idx
  ON community_reports(partner_id, status, created_at DESC);

-- ----------------------------------------------------------------------------
-- 9. community_bans
-- ----------------------------------------------------------------------------

CREATE TABLE IF NOT EXISTS community_bans (
  partner_id uuid REFERENCES partners(id),  -- NULL = banned from HonuVibe main
  user_id    uuid NOT NULL REFERENCES public.users(id) ON DELETE CASCADE,
  banned_by  uuid NOT NULL REFERENCES public.users(id),
  reason     text,
  created_at timestamptz NOT NULL DEFAULT now(),
  PRIMARY KEY (partner_id, user_id)
);

-- ----------------------------------------------------------------------------
-- 10. community_mod_actions — audit log
-- ----------------------------------------------------------------------------

CREATE TABLE IF NOT EXISTS community_mod_actions (
  id          uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  actor_id    uuid NOT NULL REFERENCES public.users(id),
  action      text NOT NULL CHECK (action IN ('pin','unpin','hide','unhide','delete','resolve_report','ban','unban')),
  target_type text NOT NULL,
  target_id   uuid NOT NULL,
  partner_id  uuid REFERENCES partners(id),
  metadata    jsonb,
  created_at  timestamptz NOT NULL DEFAULT now()
);
CREATE INDEX IF NOT EXISTS community_mod_actions_recent_idx
  ON community_mod_actions(created_at DESC);

-- ----------------------------------------------------------------------------
-- 11. link_previews — service-role-only cache
-- ----------------------------------------------------------------------------

CREATE TABLE IF NOT EXISTS link_previews (
  url_hash   text PRIMARY KEY,
  url        text NOT NULL,
  preview    jsonb NOT NULL,
  fetched_at timestamptz NOT NULL DEFAULT now()
);
CREATE INDEX IF NOT EXISTS link_previews_fresh_idx ON link_previews(fetched_at);

-- ----------------------------------------------------------------------------
-- 12. RLS policies (defined here, after all tables exist, so inter-table
--     references in policy bodies resolve cleanly).
-- ----------------------------------------------------------------------------

-- community_posts
ALTER TABLE community_posts ENABLE ROW LEVEL SECURITY;
DROP POLICY IF EXISTS "cp_scope_read"    ON community_posts;
DROP POLICY IF EXISTS "cp_scope_insert"  ON community_posts;
DROP POLICY IF EXISTS "cp_author_update" ON community_posts;
DROP POLICY IF EXISTS "cp_admin_all"     ON community_posts;

CREATE POLICY "cp_scope_read" ON community_posts FOR SELECT USING (
  public.has_community_access(auth.uid())
  AND partner_id IS NOT DISTINCT FROM public.community_scope_for(auth.uid())
  AND status = 'published'
);

CREATE POLICY "cp_scope_insert" ON community_posts FOR INSERT WITH CHECK (
  author_id = auth.uid()
  AND public.has_community_access(auth.uid())
  AND partner_id IS NOT DISTINCT FROM public.community_scope_for(auth.uid())
  AND NOT EXISTS (
    SELECT 1 FROM community_bans
    WHERE user_id = auth.uid()
      AND partner_id IS NOT DISTINCT FROM community_posts.partner_id
  )
);

CREATE POLICY "cp_author_update" ON community_posts FOR UPDATE
  USING (author_id = auth.uid() AND status = 'published')
  WITH CHECK (author_id = auth.uid());

CREATE POLICY "cp_admin_all" ON community_posts FOR ALL
  USING (public.is_admin() OR public.is_partner_for(partner_id));

-- community_comments
ALTER TABLE community_comments ENABLE ROW LEVEL SECURITY;
DROP POLICY IF EXISTS "cc_scope_read"    ON community_comments;
DROP POLICY IF EXISTS "cc_scope_insert"  ON community_comments;
DROP POLICY IF EXISTS "cc_author_update" ON community_comments;
DROP POLICY IF EXISTS "cc_admin_all"     ON community_comments;

CREATE POLICY "cc_scope_read" ON community_comments FOR SELECT USING (
  public.has_community_access(auth.uid())
  AND partner_id IS NOT DISTINCT FROM public.community_scope_for(auth.uid())
  AND status = 'published'
);

CREATE POLICY "cc_scope_insert" ON community_comments FOR INSERT WITH CHECK (
  author_id = auth.uid()
  AND public.has_community_access(auth.uid())
  AND EXISTS (
    SELECT 1 FROM community_posts p
    WHERE p.id = community_comments.post_id
      AND p.partner_id IS NOT DISTINCT FROM public.community_scope_for(auth.uid())
      AND p.status = 'published'
  )
  AND NOT EXISTS (
    SELECT 1 FROM community_bans
    WHERE user_id = auth.uid()
      AND partner_id IS NOT DISTINCT FROM community_comments.partner_id
  )
);

CREATE POLICY "cc_author_update" ON community_comments FOR UPDATE
  USING (author_id = auth.uid() AND status = 'published');

CREATE POLICY "cc_admin_all" ON community_comments FOR ALL
  USING (public.is_admin() OR public.is_partner_for(partner_id));

-- community_post_likes
ALTER TABLE community_post_likes ENABLE ROW LEVEL SECURITY;
DROP POLICY IF EXISTS "cpl_scope_read"  ON community_post_likes;
DROP POLICY IF EXISTS "cpl_self_write"  ON community_post_likes;
DROP POLICY IF EXISTS "cpl_self_delete" ON community_post_likes;

CREATE POLICY "cpl_scope_read" ON community_post_likes FOR SELECT USING (
  EXISTS (
    SELECT 1 FROM community_posts p
    WHERE p.id = community_post_likes.post_id
      AND p.partner_id IS NOT DISTINCT FROM public.community_scope_for(auth.uid())
      AND p.status = 'published'
  )
);

CREATE POLICY "cpl_self_write" ON community_post_likes FOR INSERT WITH CHECK (
  user_id = auth.uid()
  AND EXISTS (
    SELECT 1 FROM community_posts p
    WHERE p.id = post_id
      AND p.partner_id IS NOT DISTINCT FROM public.community_scope_for(auth.uid())
  )
);

CREATE POLICY "cpl_self_delete" ON community_post_likes FOR DELETE
  USING (user_id = auth.uid());

-- community_reports
ALTER TABLE community_reports ENABLE ROW LEVEL SECURITY;
DROP POLICY IF EXISTS "cr_reporter_insert" ON community_reports;
DROP POLICY IF EXISTS "cr_mod_read"        ON community_reports;
DROP POLICY IF EXISTS "cr_mod_update"      ON community_reports;
CREATE POLICY "cr_reporter_insert" ON community_reports FOR INSERT WITH CHECK (
  reporter_id = auth.uid() AND public.has_community_access(auth.uid())
);
CREATE POLICY "cr_mod_read"   ON community_reports FOR SELECT
  USING (public.is_admin() OR public.is_partner_for(partner_id));
CREATE POLICY "cr_mod_update" ON community_reports FOR UPDATE
  USING (public.is_admin() OR public.is_partner_for(partner_id));

-- community_bans
ALTER TABLE community_bans ENABLE ROW LEVEL SECURITY;
DROP POLICY IF EXISTS "cb_self_read" ON community_bans;
DROP POLICY IF EXISTS "cb_mod_all"   ON community_bans;
CREATE POLICY "cb_self_read" ON community_bans FOR SELECT USING (user_id = auth.uid());
CREATE POLICY "cb_mod_all"   ON community_bans FOR ALL
  USING (public.is_admin() OR public.is_partner_for(partner_id));

-- community_mod_actions
ALTER TABLE community_mod_actions ENABLE ROW LEVEL SECURITY;
DROP POLICY IF EXISTS "cma_admin_read"   ON community_mod_actions;
DROP POLICY IF EXISTS "cma_actor_insert" ON community_mod_actions;
CREATE POLICY "cma_admin_read"   ON community_mod_actions FOR SELECT
  USING (public.is_admin());
CREATE POLICY "cma_actor_insert" ON community_mod_actions FOR INSERT WITH CHECK (
  actor_id = auth.uid()
);

-- link_previews — RLS enabled, no public policies. Service role only.
ALTER TABLE link_previews ENABLE ROW LEVEL SECURITY;

COMMIT;
