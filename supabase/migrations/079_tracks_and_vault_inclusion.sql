-- ============================================================================
-- 079_tracks_and_vault_inclusion.sql — tracks + Vault inclusion flag
-- ============================================================================
--
-- Locked decision #6 (2026-10-04): tracks are a `track` text column with a
-- CHECK on content_items and courses. Locked decision #5: courses are included
-- in the Vault through `courses.vault_included` (the access predicate that
-- reads it is B3 / migration 081, not this file).
-- Plan: docs/plans/2026-10-10-b2-tracks-vault-inclusion.md.
--
-- APPLY TO PROD BEFORE PUSHING THE B2 CODE. Expand-first is safe: two nullable
-- columns and one defaulted boolean; no existing reader changes.
--
-- Deliberately NOT here (plan D1): the course_catalog view. It is created by
-- 071_course_material_access.sql, which is not applied on prod yet. Whoever
-- lands 071 must include c.track and c.vault_included in its course_catalog.
--
-- No RLS change: content_public_read (041) already covers new columns on
-- published rows, and the courses policies are column-agnostic. Keep
-- TRACK_IDS in lib/tracks.ts in sync with both CHECKs (a unit test parses
-- this file).
--
-- Rollback: drop the index, then the three columns (their CHECKs go with them).
-- ============================================================================

BEGIN;

ALTER TABLE public.content_items
  ADD COLUMN IF NOT EXISTS track text NULL;
ALTER TABLE public.content_items
  DROP CONSTRAINT IF EXISTS content_items_track_check;
ALTER TABLE public.content_items
  ADD CONSTRAINT content_items_track_check CHECK (
    track IS NULL OR track IN ('ai_essentials', 'marketing_growth', 'build_with_ai', 'research_insights', 'workflow_automation')
  );

ALTER TABLE public.courses
  ADD COLUMN IF NOT EXISTS track text NULL;
ALTER TABLE public.courses
  DROP CONSTRAINT IF EXISTS courses_track_check;
ALTER TABLE public.courses
  ADD CONSTRAINT courses_track_check CHECK (
    track IS NULL OR track IN ('ai_essentials', 'marketing_growth', 'build_with_ai', 'research_insights', 'workflow_automation')
  );

ALTER TABLE public.courses
  ADD COLUMN IF NOT EXISTS vault_included boolean NOT NULL DEFAULT false;

CREATE INDEX IF NOT EXISTS content_items_track_published_idx
  ON public.content_items(track) WHERE is_published;

COMMENT ON COLUMN public.content_items.track IS
  'Learning track (decision #6, migration 079). NULL = untracked; shown only under "All".';
COMMENT ON COLUMN public.courses.track IS
  'Learning track (decision #6, migration 079). NULL = untracked.';
COMMENT ON COLUMN public.courses.vault_included IS
  'Course is included in the Vault (decision #5, migration 079). Read by the '
  'B3 access predicate; admin-set per course, no default flip.';

NOTIFY pgrst, 'reload schema';

COMMIT;

-- ----------------------------------------------------------------------------
-- Post-apply verification (run separately; read-only):
--
--   select table_name, column_name, data_type, is_nullable, column_default
--     from information_schema.columns
--    where table_schema = 'public'
--      and (table_name, column_name) in (('content_items','track'), ('courses','track'), ('courses','vault_included'));
--   select conname, pg_get_constraintdef(oid) from pg_constraint
--    where conname in ('content_items_track_check', 'courses_track_check');
--   select indexname from pg_indexes where indexname = 'content_items_track_published_idx';
--   select table_name, column_name, grantee, privilege_type
--     from information_schema.column_privileges
--    where table_schema = 'public' and table_name in ('content_items', 'courses')
--      and grantee in ('anon', 'authenticated') and column_name in ('track', 'vault_included');
-- ----------------------------------------------------------------------------
