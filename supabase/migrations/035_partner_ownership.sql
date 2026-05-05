-- 035_partner_ownership.sql
-- Adds partner_id ownership columns to courses, content_items, and vault_series.
-- Source spec: docs/plans/2026-05-04-partner-owned-content-phase1-design.md
-- All columns nullable, no defaults => zero row rewrites on existing data.

-- Course-level partner ownership (1:1; null = HonuVibe-owned)
ALTER TABLE courses
  ADD COLUMN IF NOT EXISTS partner_id uuid REFERENCES partners(id) ON DELETE SET NULL;
CREATE INDEX IF NOT EXISTS courses_partner_id_idx ON courses(partner_id) WHERE partner_id IS NOT NULL;

-- Vault item-level partner ownership (source of truth)
ALTER TABLE content_items
  ADD COLUMN IF NOT EXISTS partner_id uuid REFERENCES partners(id) ON DELETE SET NULL;
CREATE INDEX IF NOT EXISTS content_items_partner_id_idx ON content_items(partner_id) WHERE partner_id IS NOT NULL;

-- Vault series-level partner ownership (admin UX sugar; defaults onto items)
ALTER TABLE vault_series
  ADD COLUMN IF NOT EXISTS partner_id uuid REFERENCES partners(id) ON DELETE SET NULL;

-- ============================================================
-- Down migration (manual — Supabase doesn't run these automatically):
--
-- DROP INDEX IF EXISTS courses_partner_id_idx;
-- DROP INDEX IF EXISTS content_items_partner_id_idx;
-- ALTER TABLE courses        DROP COLUMN IF EXISTS partner_id;
-- ALTER TABLE content_items  DROP COLUMN IF EXISTS partner_id;
-- ALTER TABLE vault_series   DROP COLUMN IF EXISTS partner_id;
-- ============================================================
