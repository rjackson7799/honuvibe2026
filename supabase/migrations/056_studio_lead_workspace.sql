-- ============================================================================
-- 056_studio_lead_workspace.sql — writable Studio leads + lead workspace (Phase 1)
-- ============================================================================
-- See docs/plans/2026-07-08-phase1-studio-leads-writable-workspace.md.
--
-- Adds the workspace columns the admin Studio-lead workspace needs (phone,
-- preview link + password, and the generated outreach email) to the existing
-- `leads` table (migration 047), and makes contact name/email nullable so a
-- manually-created or prospected lead can exist before those are known. Both
-- existing writers (the public studio form and the discovery intake) always
-- supply name + email, so dropping NOT NULL does not affect them.
--
-- `leads.source` has no CHECK constraint, so the new `manual` / `prospecting`
-- values need no DDL — the COMMENT below just documents the vocabulary
-- (including the `studio_form_migrated` value backfilled by 047, which stays
-- in prod data and is NOT normalized).
--
-- RLS is unchanged: `leads_admin_all` (047) already covers admin writes.
--
-- PROD NOTE: Vercel does NOT auto-apply migrations. After deploy, run this file
--   manually in the Supabase dashboard SQL editor (project zvfwtndbxshrtpwcwynw).
-- ============================================================================

BEGIN;

ALTER TABLE leads
  ADD COLUMN IF NOT EXISTS phone text,
  ADD COLUMN IF NOT EXISTS preview_url text,
  ADD COLUMN IF NOT EXISTS preview_password text,
  ADD COLUMN IF NOT EXISTS outreach_email_subject text,
  ADD COLUMN IF NOT EXISTS outreach_email_body text,
  ADD COLUMN IF NOT EXISTS outreach_email_generated_at timestamptz;

-- Manual/prospected leads may lack contact name/email at creation.
-- Both existing writers (studio form, discover) always supply them.
ALTER TABLE leads ALTER COLUMN name DROP NOT NULL;
ALTER TABLE leads ALTER COLUMN email DROP NOT NULL;

COMMENT ON COLUMN leads.source IS 'discover | studio_form | studio_form_migrated (047 backfill) | manual | prospecting';

COMMIT;
