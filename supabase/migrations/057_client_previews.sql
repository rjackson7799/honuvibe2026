-- ============================================================================
-- 057_client_previews.sql — password-gated client previews (Studio, phase 2)
-- ============================================================================
-- See docs/plans/2026-07-09-phase2-preview-delivery.md (unit 2 of the studio
-- lead engine master plan, docs/plans/2026-07-08-studio-lead-engine-master.md).
--
-- Ryan delivers design mockups two ways. QUICK mode drops an HTML export under
-- public/previews/<slug>/ behind an unguessable path (noindex header from
-- next.config.ts) — no DB row, no code here. GATED mode uploads the export to a
-- PRIVATE Storage bucket and serves it through a streaming API route behind an
-- HMAC cookie. This migration stands up the gated side:
--   * client_previews — one row per delivered preview (mode + optional password).
--   * bump_preview_access() — atomic access counter (supabase-js can't increment).
--   * client-previews — a private Storage bucket, admin-only writes.
--
-- The gate route (app/api/preview/...) reads via the service role only; there is
-- NO anon/member RLS read policy. `mode='gated'` rows require a plaintext
-- password (low-stakes mockups; admin re-sends it) — a one-function swap to a
-- hash later (passwordMatches in lib/previews/gate.ts). `mode='public'` rows
-- serve without one, mirroring quick mode inside the gate if we ever register
-- them.
--
-- PROD NOTE: Vercel does NOT auto-apply migrations. After deploy, run this file
--   manually in the Supabase dashboard SQL editor (project zvfwtndbxshrtpwcwynw).
--   Every gated preview 404s/errors until it is applied. Also add
--   PREVIEW_GATE_SECRET to the Vercel env (all environments) before sending a
--   gated link — the route 503s on gated flows without it.
-- ============================================================================

BEGIN;

-- One row per delivered preview. `mode='public'` rows exist only if we later
-- want quick previews registered too; the gate route serves them without a
-- password. Gated rows require one.
CREATE TABLE IF NOT EXISTS client_previews (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  created_at timestamptz NOT NULL DEFAULT now(),
  lead_id uuid REFERENCES leads(id) ON DELETE SET NULL,
  slug text NOT NULL UNIQUE CHECK (slug ~ '^[a-z0-9-]{8,80}$'),
  title text,
  mode text NOT NULL DEFAULT 'gated' CHECK (mode IN ('public','gated')),
  -- Plaintext by design: low-stakes mockups, admin must re-send it to the
  -- client. One-function swap to a hash later (passwordMatches in gate.ts).
  password text,
  storage_prefix text NOT NULL,          -- object prefix inside the bucket (= slug)
  -- Basename only (no slashes): the redirect + access-count logic assume a
  -- depth-1 entry. Nested entries (dist/index.html) are out of scope.
  entry_file text NOT NULL DEFAULT 'index.html'
    CHECK (entry_file ~ '^[A-Za-z0-9][A-Za-z0-9._-]{0,120}$'),
  expires_at timestamptz,
  access_count int NOT NULL DEFAULT 0,
  last_accessed_at timestamptz,
  CONSTRAINT client_previews_gated_needs_password
    CHECK (mode <> 'gated' OR password IS NOT NULL)
);

CREATE INDEX IF NOT EXISTS idx_client_previews_lead ON client_previews(lead_id);

ALTER TABLE client_previews ENABLE ROW LEVEL SECURITY;
DROP POLICY IF EXISTS "client_previews_admin_all" ON client_previews;
CREATE POLICY "client_previews_admin_all" ON client_previews
  FOR ALL USING (public.is_admin()) WITH CHECK (public.is_admin());
-- No anon/member policy: the gate route reads via service role only.

-- Atomic access-count bump for the gate route (supabase-js can't increment).
-- Hardened per the 048/049 RPC pattern: empty search_path + fully qualified
-- refs, REVOKE ALL then explicit GRANT to service_role (the only caller).
CREATE OR REPLACE FUNCTION public.bump_preview_access(p_slug text)
RETURNS void
LANGUAGE sql
SECURITY DEFINER
SET search_path = ''
AS $$
  UPDATE public.client_previews
  SET access_count = access_count + 1, last_accessed_at = now()
  WHERE slug = p_slug;
$$;
REVOKE ALL ON FUNCTION public.bump_preview_access(text) FROM PUBLIC, anon, authenticated;
GRANT EXECUTE ON FUNCTION public.bump_preview_access(text) TO service_role;

-- Private bucket. No SELECT policy = no client reads; service role streams.
INSERT INTO storage.buckets (id, name, public)
VALUES ('client-previews', 'client-previews', false)
ON CONFLICT (id) DO NOTHING;

DROP POLICY IF EXISTS "client_previews_admin_write" ON storage.objects;
CREATE POLICY "client_previews_admin_write" ON storage.objects
  FOR INSERT WITH CHECK (bucket_id = 'client-previews' AND public.is_admin());
DROP POLICY IF EXISTS "client_previews_admin_update" ON storage.objects;
CREATE POLICY "client_previews_admin_update" ON storage.objects
  FOR UPDATE USING (bucket_id = 'client-previews' AND public.is_admin())
  WITH CHECK (bucket_id = 'client-previews' AND public.is_admin());
DROP POLICY IF EXISTS "client_previews_admin_delete" ON storage.objects;
CREATE POLICY "client_previews_admin_delete" ON storage.objects
  FOR DELETE USING (bucket_id = 'client-previews' AND public.is_admin());

COMMIT;
