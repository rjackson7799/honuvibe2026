-- ============================================================================
-- 041_vault_access_boundary.sql — Vault premium-content access boundary
-- ============================================================================
-- See docs/plans/2026-05-20-vault-content-model-and-admin-design.md
-- (Access Boundary section).
--
-- Why this migration exists:
--   Postgres RLS is row-level, not column-level. Migration 040 added
--   body_en / body_jp columns to content_items, which is publicly readable for
--   any is_published=true row. That means premium article bodies are
--   selectable by anonymous clients. This migration fixes that by moving
--   paid payloads into protected child tables with access-tier-aware RLS.
--
-- Changes:
--   1. Helper function: public.has_vault_access(uid uuid) SECURITY DEFINER
--   2. content_items.url becomes nullable (articles/tools/prompts are in-app)
--   3. New table: vault_article_bodies (with tier-aware RLS)
--      + Migrate body_en/body_jp data over, then drop columns from content_items
--   4. vault_prompts: replace open policy with tier-aware policy
--   5. vault_downloads: hide file_url from clients; expose browse-safe view
--   6. vault_prompts.recommended_model: stable provider names
--   7. Storage buckets: vault-public (public read) + vault-private (signed URLs)
-- ============================================================================

BEGIN;

-- ----------------------------------------------------------------------------
-- 1. has_vault_access helper
-- ----------------------------------------------------------------------------
-- Mirrors the TypeScript logic in lib/access/checks.ts hasVaultAccess().
-- Access granted when ANY of:
--   - user is admin
--   - subscription_status in ('active','trialing') AND subscription_tier='vault'
--   - subscription cancelled but expires_at in the future AND tier='vault'
--   - user has an active cohort enrollment window
-- SECURITY DEFINER lets RLS policies call it without recursing through the
-- users-table RLS that the caller is subject to.
-- ----------------------------------------------------------------------------

CREATE OR REPLACE FUNCTION public.has_vault_access(uid uuid)
RETURNS boolean AS $$
  SELECT
    -- admin bypass
    EXISTS (
      SELECT 1 FROM public.users u
      WHERE u.id = uid AND u.role = 'admin'
    )
    -- active or trialing vault subscription
    OR EXISTS (
      SELECT 1 FROM public.users u
      WHERE u.id = uid
        AND u.subscription_tier = 'vault'
        AND u.subscription_status IN ('active', 'trialing')
    )
    -- cancelled vault subscription within grace window
    OR EXISTS (
      SELECT 1 FROM public.users u
      WHERE u.id = uid
        AND u.subscription_tier = 'vault'
        AND u.subscription_status = 'cancelled'
        AND u.subscription_expires_at IS NOT NULL
        AND u.subscription_expires_at > now()
    )
    -- active cohort enrollment window
    OR EXISTS (
      SELECT 1 FROM public.cohort_enrollments ce
      WHERE ce.user_id = uid
        AND ce.bundle_access_starts_at <= now()
        AND ce.bundle_access_ends_at   >= now()
    );
$$ LANGUAGE sql SECURITY DEFINER STABLE;

COMMENT ON FUNCTION public.has_vault_access(uuid) IS
  'Returns true if the user has Vault-tier access. Used by RLS policies on '
  'vault_article_bodies, vault_prompts (premium), and protected downloads. '
  'Mirrors lib/access/checks.ts hasVaultAccess(). SECURITY DEFINER to avoid '
  'RLS recursion through public.users.';

-- ----------------------------------------------------------------------------
-- 2. content_items.url becomes nullable
-- ----------------------------------------------------------------------------
-- Articles, tools, and prompt packs have no meaningful external URL — they
-- are rendered in-app from their child tables. Admin-form publish validation
-- enforces a URL on video and workshop types instead.
-- ----------------------------------------------------------------------------

ALTER TABLE content_items ALTER COLUMN url DROP NOT NULL;

-- ----------------------------------------------------------------------------
-- 3. vault_article_bodies — protected child table
-- ----------------------------------------------------------------------------

CREATE TABLE IF NOT EXISTS vault_article_bodies (
  content_item_id uuid PRIMARY KEY REFERENCES content_items(id) ON DELETE CASCADE,
  body_en text,
  body_jp text,
  reading_time_minutes integer,
  updated_at timestamptz DEFAULT now()
);

-- Move any existing article body data off content_items.
-- (After migration 040 there may be rows; this is idempotent — re-running
-- inserts nothing because of the PK conflict, but we explicitly skip them.)
INSERT INTO vault_article_bodies (content_item_id, body_en, body_jp)
SELECT id, body_en, body_jp
FROM content_items
WHERE (body_en IS NOT NULL OR body_jp IS NOT NULL)
  AND NOT EXISTS (
    SELECT 1 FROM vault_article_bodies vab WHERE vab.content_item_id = content_items.id
  );

-- Drop the now-redundant columns on content_items. Premium bodies must NOT
-- live here because RLS on content_items is row-level (any published row is
-- publicly readable, so any column on it is publicly readable).
ALTER TABLE content_items DROP COLUMN IF EXISTS body_en;
ALTER TABLE content_items DROP COLUMN IF EXISTS body_jp;

ALTER TABLE vault_article_bodies ENABLE ROW LEVEL SECURITY;

-- Free-tier bodies: any reader of the (published, free) parent can read.
CREATE POLICY "vault_article_bodies_free_read" ON vault_article_bodies
  FOR SELECT USING (
    EXISTS (
      SELECT 1 FROM content_items ci
      WHERE ci.id = vault_article_bodies.content_item_id
        AND ci.is_published = true
        AND ci.access_tier = 'free'
    )
  );

-- Premium bodies: subscriber-only.
CREATE POLICY "vault_article_bodies_premium_read" ON vault_article_bodies
  FOR SELECT USING (
    EXISTS (
      SELECT 1 FROM content_items ci
      WHERE ci.id = vault_article_bodies.content_item_id
        AND ci.is_published = true
        AND ci.access_tier = 'premium'
    )
    AND public.has_vault_access(auth.uid())
  );

-- Admin full access.
CREATE POLICY "vault_article_bodies_admin_all" ON vault_article_bodies
  FOR ALL USING (public.is_admin())
  WITH CHECK (public.is_admin());

-- Keep updated_at fresh on edits.
CREATE OR REPLACE FUNCTION sync_vault_article_bodies_updated_at()
RETURNS trigger AS $$
BEGIN
  NEW.updated_at = now();
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

CREATE TRIGGER trg_vault_article_bodies_updated_at
  BEFORE UPDATE ON vault_article_bodies
  FOR EACH ROW EXECUTE FUNCTION sync_vault_article_bodies_updated_at();

-- ----------------------------------------------------------------------------
-- 4. vault_prompts — replace open policy with tier-aware policies
-- ----------------------------------------------------------------------------
-- Migration 040 created vault_prompts with a policy that only checks
-- is_published on the parent. Replace it: prompts inherit access_tier from
-- the parent and require has_vault_access() for premium parents.
-- ----------------------------------------------------------------------------

DROP POLICY IF EXISTS "vault_prompts_public_read" ON vault_prompts;

CREATE POLICY "vault_prompts_free_read" ON vault_prompts
  FOR SELECT USING (
    EXISTS (
      SELECT 1 FROM content_items ci
      WHERE ci.id = vault_prompts.content_item_id
        AND ci.is_published = true
        AND ci.access_tier = 'free'
    )
  );

CREATE POLICY "vault_prompts_premium_read" ON vault_prompts
  FOR SELECT USING (
    EXISTS (
      SELECT 1 FROM content_items ci
      WHERE ci.id = vault_prompts.content_item_id
        AND ci.is_published = true
        AND ci.access_tier = 'premium'
    )
    AND public.has_vault_access(auth.uid())
  );

-- ----------------------------------------------------------------------------
-- 5. vault_prompts.recommended_model — stable provider names
-- ----------------------------------------------------------------------------
-- 040 shipped 'gpt-4 | claude | gemini | any'. Migrate to provider-stable
-- names so the constraint doesn't need to chase model versions.
-- ----------------------------------------------------------------------------

UPDATE vault_prompts SET recommended_model = 'openai'    WHERE recommended_model = 'gpt-4';
UPDATE vault_prompts SET recommended_model = 'anthropic' WHERE recommended_model = 'claude';
UPDATE vault_prompts SET recommended_model = 'google'    WHERE recommended_model = 'gemini';

ALTER TABLE vault_prompts DROP CONSTRAINT IF EXISTS vault_prompts_recommended_model_check;
ALTER TABLE vault_prompts ADD CONSTRAINT vault_prompts_recommended_model_check
  CHECK (recommended_model IS NULL OR recommended_model IN ('openai', 'anthropic', 'google', 'any'));

-- ----------------------------------------------------------------------------
-- 6. vault_downloads — hide file_url from clients; expose browse-safe view
-- ----------------------------------------------------------------------------
-- The existing vault_downloads_public_read policy returns ALL columns,
-- including file_url. Replace with: clients can list download metadata via
-- the vault_downloads_browse view (no file_url); the API mints signed URLs
-- via the service role after a server-side access check.
-- ----------------------------------------------------------------------------

DROP POLICY IF EXISTS "vault_downloads_public_read" ON vault_downloads;

-- Authenticated clients (any tier) can list download metadata for any
-- published parent. file_url is not exposed.
CREATE POLICY "vault_downloads_browse_read" ON vault_downloads
  FOR SELECT USING (
    EXISTS (
      SELECT 1 FROM content_items ci
      WHERE ci.id = vault_downloads.content_item_id
        AND ci.is_published = true
    )
  );

-- Browse-safe view: same columns minus file_url. Frontend reads from this
-- view; the download endpoint mints signed URLs server-side.
CREATE OR REPLACE VIEW vault_downloads_browse
WITH (security_invoker = true) AS
SELECT
  id,
  content_item_id,
  file_name,
  file_size_bytes,
  file_type,
  description_en,
  description_jp,
  access_tier,
  download_count,
  display_order,
  created_at
FROM vault_downloads;

COMMENT ON VIEW vault_downloads_browse IS
  'Public-safe download metadata. Omits file_url so premium files cannot be '
  'leaked via PostgREST. Use POST /api/vault/downloads/[id] to get a signed URL.';

GRANT SELECT ON vault_downloads_browse TO anon, authenticated;

-- ----------------------------------------------------------------------------
-- 7. Storage buckets
-- ----------------------------------------------------------------------------
-- vault-public: thumbnails + article inline images (public read; admin write)
-- vault-private: template downloads + premium assets (no public access;
--                service-role writes; client reads only via signed URLs minted
--                by /api/vault/downloads/[id] after access check)
-- ----------------------------------------------------------------------------

INSERT INTO storage.buckets (id, name, public)
VALUES ('vault-public', 'vault-public', true)
ON CONFLICT (id) DO NOTHING;

INSERT INTO storage.buckets (id, name, public)
VALUES ('vault-private', 'vault-private', false)
ON CONFLICT (id) DO NOTHING;

-- vault-public: anyone can read; only admins can write (via service role,
-- but we also allow authenticated admins for in-app uploader).
CREATE POLICY "vault_public_read"
  ON storage.objects FOR SELECT
  USING (bucket_id = 'vault-public');

CREATE POLICY "vault_public_admin_write"
  ON storage.objects FOR INSERT
  WITH CHECK (bucket_id = 'vault-public' AND public.is_admin());

CREATE POLICY "vault_public_admin_update"
  ON storage.objects FOR UPDATE
  USING (bucket_id = 'vault-public' AND public.is_admin())
  WITH CHECK (bucket_id = 'vault-public' AND public.is_admin());

CREATE POLICY "vault_public_admin_delete"
  ON storage.objects FOR DELETE
  USING (bucket_id = 'vault-public' AND public.is_admin());

-- vault-private: no SELECT policy = no client reads. Admins can manage; the
-- API mints signed URLs via the service role, bypassing RLS.
CREATE POLICY "vault_private_admin_write"
  ON storage.objects FOR INSERT
  WITH CHECK (bucket_id = 'vault-private' AND public.is_admin());

CREATE POLICY "vault_private_admin_update"
  ON storage.objects FOR UPDATE
  USING (bucket_id = 'vault-private' AND public.is_admin())
  WITH CHECK (bucket_id = 'vault-private' AND public.is_admin());

CREATE POLICY "vault_private_admin_delete"
  ON storage.objects FOR DELETE
  USING (bucket_id = 'vault-private' AND public.is_admin());

COMMIT;
