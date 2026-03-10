-- ============================================================================
-- 012_vault_completion.sql — Add 'completed' bookmark type for content completion tracking
-- ============================================================================

ALTER TABLE vault_bookmarks DROP CONSTRAINT IF EXISTS vault_bookmarks_bookmark_type_check;
ALTER TABLE vault_bookmarks ADD CONSTRAINT vault_bookmarks_bookmark_type_check
  CHECK (bookmark_type IN ('bookmark', 'watch_later', 'completed'));
