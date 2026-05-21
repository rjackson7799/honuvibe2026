-- ============================================================================
-- 040_vault_content_v2.sql — Vault content taxonomy v2 + new type fields
-- ============================================================================
-- Consolidates content_type values, adds body/workshop/tool columns to
-- content_items, and creates the vault_prompts child table for Prompt Pack
-- content. See docs/plans/2026-05-20-vault-content-model-and-admin-design.md
--
-- Taxonomy changes:
--   video_youtube, video_custom   -> video
--   course_recording              -> workshop
--   guide                         -> article (with format:guide tag preserved)
--   (new) prompt_pack
--
-- Existing 27 seeded items keep working; tags are augmented to preserve the
-- "guide" distinction as a format tag.
--
-- IMPORTANT: The old check constraint must be dropped BEFORE renaming
-- content_type values, otherwise the UPDATE statements themselves violate the
-- old constraint (e.g. setting content_type='video' is rejected because the
-- old constraint only allows 'video_youtube'/'video_custom'). All statements
-- run inside a single transaction so a failure mid-way rolls back cleanly.
-- ============================================================================

BEGIN;

-- ----------------------------------------------------------------------------
-- 1. Add new columns to content_items (idempotent)
-- ----------------------------------------------------------------------------

ALTER TABLE content_items ADD COLUMN IF NOT EXISTS body_en text;
ALTER TABLE content_items ADD COLUMN IF NOT EXISTS body_jp text;
ALTER TABLE content_items ADD COLUMN IF NOT EXISTS event_date timestamptz;
ALTER TABLE content_items ADD COLUMN IF NOT EXISTS event_signup_url text;
ALTER TABLE content_items ADD COLUMN IF NOT EXISTS presenter_name text;
ALTER TABLE content_items ADD COLUMN IF NOT EXISTS tool_widget_key text;
ALTER TABLE content_items ADD COLUMN IF NOT EXISTS tool_widget_config jsonb;

-- ----------------------------------------------------------------------------
-- 2. Drop the old content_type check constraint FIRST
-- ----------------------------------------------------------------------------
-- Must happen before the UPDATEs below, otherwise setting content_type to a
-- value that's only in the NEW allowed list (e.g. 'video', 'workshop',
-- 'prompt_pack') will fail the old constraint.
-- ----------------------------------------------------------------------------

ALTER TABLE content_items DROP CONSTRAINT IF EXISTS content_items_content_type_check;

-- ----------------------------------------------------------------------------
-- 3. Migrate existing content_type values
-- ----------------------------------------------------------------------------
-- Tag former 'guide' rows with format:guide so the distinction survives the
-- merge into 'article'. Append-only — preserves any existing tags.
-- Idempotency: skip rows that already carry the tag (defends against partial
-- re-runs; `@>` is the jsonb-array containment operator).
UPDATE content_items
SET tags = COALESCE(tags, '[]'::jsonb) || '["format:guide"]'::jsonb
WHERE content_type = 'guide'
  AND NOT (COALESCE(tags, '[]'::jsonb) @> '["format:guide"]'::jsonb);

UPDATE content_items SET content_type = 'video'    WHERE content_type IN ('video_youtube', 'video_custom');
UPDATE content_items SET content_type = 'workshop' WHERE content_type = 'course_recording';
UPDATE content_items SET content_type = 'article'  WHERE content_type = 'guide';

-- ----------------------------------------------------------------------------
-- 4. Add the new content_type check constraint
-- ----------------------------------------------------------------------------

ALTER TABLE content_items ADD CONSTRAINT content_items_content_type_check
  CHECK (content_type IN ('video', 'workshop', 'article', 'template', 'tool', 'prompt_pack'));

-- ----------------------------------------------------------------------------
-- 5. Create vault_prompts (child table for Prompt Pack content)
-- ----------------------------------------------------------------------------

CREATE TABLE IF NOT EXISTS vault_prompts (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  content_item_id uuid NOT NULL REFERENCES content_items(id) ON DELETE CASCADE,
  display_order integer NOT NULL DEFAULT 0,
  title_en text NOT NULL,
  title_jp text,
  prompt_text_en text NOT NULL,
  prompt_text_jp text,
  use_case_en text,
  use_case_jp text,
  recommended_model text
    CHECK (recommended_model IS NULL OR recommended_model IN ('gpt-4', 'claude', 'gemini', 'any')),
  created_at timestamptz DEFAULT now()
);

CREATE INDEX IF NOT EXISTS idx_vault_prompts_content_item
  ON vault_prompts (content_item_id, display_order);

-- ----------------------------------------------------------------------------
-- 6. RLS policies for vault_prompts (parent-only check; tightened in 041)
-- ----------------------------------------------------------------------------
-- NOTE: This policy only checks is_published on the parent and does NOT yet
-- enforce access_tier-aware gating. Migration 041 replaces it with proper
-- free/premium policies. Until 041 is applied, do not author premium
-- Prompt Pack content.
-- ----------------------------------------------------------------------------

ALTER TABLE vault_prompts ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "vault_prompts_public_read" ON vault_prompts;
CREATE POLICY "vault_prompts_public_read" ON vault_prompts
  FOR SELECT USING (
    EXISTS (
      SELECT 1 FROM content_items
      WHERE content_items.id = vault_prompts.content_item_id
        AND content_items.is_published = true
    )
  );

DROP POLICY IF EXISTS "vault_prompts_admin_all" ON vault_prompts;
CREATE POLICY "vault_prompts_admin_all" ON vault_prompts
  FOR ALL USING (
    EXISTS (SELECT 1 FROM public.users WHERE id = auth.uid() AND role = 'admin')
  )
  WITH CHECK (
    EXISTS (SELECT 1 FROM public.users WHERE id = auth.uid() AND role = 'admin')
  );

COMMIT;
