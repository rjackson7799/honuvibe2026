-- 035_partner_ownership.sql
-- Adds partner_id ownership columns to courses, content_items, and vault_series.
-- Source spec: docs/plans/2026-05-04-partner-owned-content-phase1-design.md
-- All columns nullable, no defaults => zero row rewrites on existing data.

-- Course-level partner ownership (1:1; null = HonuVibe-owned)
alter table courses
  add column partner_id uuid references partners(id) on delete set null;
create index courses_partner_id_idx on courses(partner_id) where partner_id is not null;

-- Vault item-level partner ownership (source of truth)
alter table content_items
  add column partner_id uuid references partners(id) on delete set null;
create index content_items_partner_id_idx on content_items(partner_id) where partner_id is not null;

-- Vault series-level partner ownership (admin UX sugar; defaults onto items)
alter table vault_series
  add column partner_id uuid references partners(id) on delete set null;

-- ============================================================
-- Down migration (manual — Supabase doesn't run these automatically):
--
-- drop index if exists courses_partner_id_idx;
-- drop index if exists content_items_partner_id_idx;
-- alter table courses        drop column if exists partner_id;
-- alter table content_items  drop column if exists partner_id;
-- alter table vault_series   drop column if exists partner_id;
-- ============================================================
