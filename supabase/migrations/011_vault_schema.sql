-- ============================================================================
-- 011_vault_schema.sql — HonuVibe Vault Feature Schema
-- Adds Vault columns to content_items, creates supporting tables for series,
-- downloads, bookmarks, notes, feedback, views, and content requests.
-- ============================================================================

-- ============================================================================
-- 1. ALTER content_items — add Vault columns
-- ============================================================================

ALTER TABLE content_items ADD COLUMN IF NOT EXISTS slug text UNIQUE;
ALTER TABLE content_items ADD COLUMN IF NOT EXISTS freshness_status text DEFAULT 'current'
  CHECK (freshness_status IN ('current', 'review_needed', 'outdated'));
ALTER TABLE content_items ADD COLUMN IF NOT EXISTS freshness_reviewed_at timestamptz;
ALTER TABLE content_items ADD COLUMN IF NOT EXISTS helpful_count integer DEFAULT 0;
ALTER TABLE content_items ADD COLUMN IF NOT EXISTS not_helpful_count integer DEFAULT 0;
ALTER TABLE content_items ADD COLUMN IF NOT EXISTS series_order integer;
ALTER TABLE content_items ADD COLUMN IF NOT EXISTS related_item_ids uuid[] DEFAULT '{}';
ALTER TABLE content_items ADD COLUMN IF NOT EXISTS embed_url text;

CREATE INDEX IF NOT EXISTS idx_content_items_slug ON content_items (slug);

-- ============================================================================
-- 2. CREATE vault_series
-- ============================================================================

CREATE TABLE vault_series (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  slug text UNIQUE NOT NULL,
  title_en text NOT NULL,
  title_jp text,
  description_en text,
  description_jp text,
  thumbnail_url text,
  difficulty_level text DEFAULT 'beginner'
    CHECK (difficulty_level IN ('beginner', 'intermediate', 'advanced')),
  tags jsonb DEFAULT '[]',
  item_count integer DEFAULT 0,
  total_duration_minutes integer DEFAULT 0,
  is_published boolean DEFAULT false,
  is_featured boolean DEFAULT false,
  created_at timestamptz DEFAULT now(),
  updated_at timestamptz DEFAULT now()
);

CREATE INDEX idx_vault_series_published ON vault_series (is_published);
CREATE INDEX idx_vault_series_slug ON vault_series (slug);

-- ============================================================================
-- 3. ADD FK content_items.series_id -> vault_series
-- ============================================================================

ALTER TABLE content_items ADD COLUMN IF NOT EXISTS series_id uuid
  REFERENCES vault_series(id) ON DELETE SET NULL;

CREATE INDEX idx_content_items_series ON content_items (series_id, series_order);

-- ============================================================================
-- 4. CREATE vault_downloads
-- ============================================================================

CREATE TABLE vault_downloads (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  content_item_id uuid NOT NULL REFERENCES content_items(id) ON DELETE CASCADE,
  file_name text NOT NULL,
  file_url text NOT NULL,
  file_size_bytes bigint,
  file_type text NOT NULL
    CHECK (file_type IN ('pdf', 'zip', 'xlsx', 'docx', 'csv', 'json', 'md', 'other')),
  description_en text,
  description_jp text,
  access_tier text DEFAULT 'free'
    CHECK (access_tier IN ('free', 'premium')),
  download_count integer DEFAULT 0,
  display_order integer DEFAULT 0,
  created_at timestamptz DEFAULT now()
);

CREATE INDEX idx_vault_downloads_content_item ON vault_downloads (content_item_id);

-- ============================================================================
-- 5. CREATE vault_bookmarks
-- ============================================================================

CREATE TABLE vault_bookmarks (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id uuid NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  content_item_id uuid NOT NULL REFERENCES content_items(id) ON DELETE CASCADE,
  bookmark_type text NOT NULL DEFAULT 'bookmark'
    CHECK (bookmark_type IN ('bookmark', 'watch_later')),
  created_at timestamptz DEFAULT now(),
  UNIQUE (user_id, content_item_id, bookmark_type)
);

CREATE INDEX idx_vault_bookmarks_user ON vault_bookmarks (user_id, bookmark_type);
CREATE INDEX idx_vault_bookmarks_content ON vault_bookmarks (content_item_id);

-- ============================================================================
-- 6. CREATE vault_notes
-- ============================================================================

CREATE TABLE vault_notes (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id uuid NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  content_item_id uuid NOT NULL REFERENCES content_items(id) ON DELETE CASCADE,
  note_text text NOT NULL,
  timestamp_seconds integer,
  created_at timestamptz DEFAULT now(),
  updated_at timestamptz DEFAULT now()
);

CREATE INDEX idx_vault_notes_user_content ON vault_notes (user_id, content_item_id);

-- ============================================================================
-- 7. CREATE vault_feedback
-- ============================================================================

CREATE TABLE vault_feedback (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id uuid NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  content_item_id uuid NOT NULL REFERENCES content_items(id) ON DELETE CASCADE,
  feedback_type text NOT NULL
    CHECK (feedback_type IN ('helpful', 'not_helpful')),
  created_at timestamptz DEFAULT now(),
  UNIQUE (user_id, content_item_id)
);

CREATE INDEX idx_vault_feedback_content ON vault_feedback (content_item_id);

-- ============================================================================
-- 8. CREATE vault_views
-- ============================================================================

CREATE TABLE vault_views (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  content_item_id uuid NOT NULL REFERENCES content_items(id) ON DELETE CASCADE,
  viewer_hash text NOT NULL,
  viewed_at timestamptz DEFAULT now()
);

-- Dedup index: one view per viewer per content item per day
CREATE UNIQUE INDEX idx_vault_views_dedup
  ON vault_views (content_item_id, viewer_hash, (viewed_at::date));

-- ============================================================================
-- 9. CREATE vault_content_requests
-- ============================================================================

CREATE TABLE vault_content_requests (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id uuid REFERENCES auth.users(id) ON DELETE SET NULL,
  topic_text text NOT NULL,
  tags jsonb DEFAULT '[]',
  status text DEFAULT 'pending'
    CHECK (status IN ('pending', 'reviewed', 'planned', 'completed')),
  created_at timestamptz DEFAULT now()
);

-- ============================================================================
-- 10. RLS Policies
-- ============================================================================

-- Helper: admin check expression used across policies
-- EXISTS (SELECT 1 FROM public.users WHERE id = auth.uid() AND role = 'admin')

-- --- vault_series -----------------------------------------------------------

ALTER TABLE vault_series ENABLE ROW LEVEL SECURITY;

CREATE POLICY "vault_series_public_read" ON vault_series
  FOR SELECT USING (is_published = true);

CREATE POLICY "vault_series_admin_all" ON vault_series
  FOR ALL USING (
    EXISTS (SELECT 1 FROM public.users WHERE id = auth.uid() AND role = 'admin')
  )
  WITH CHECK (
    EXISTS (SELECT 1 FROM public.users WHERE id = auth.uid() AND role = 'admin')
  );

-- --- vault_downloads --------------------------------------------------------

ALTER TABLE vault_downloads ENABLE ROW LEVEL SECURITY;

CREATE POLICY "vault_downloads_public_read" ON vault_downloads
  FOR SELECT USING (
    EXISTS (
      SELECT 1 FROM content_items
      WHERE content_items.id = vault_downloads.content_item_id
        AND content_items.is_published = true
    )
  );

CREATE POLICY "vault_downloads_admin_all" ON vault_downloads
  FOR ALL USING (
    EXISTS (SELECT 1 FROM public.users WHERE id = auth.uid() AND role = 'admin')
  )
  WITH CHECK (
    EXISTS (SELECT 1 FROM public.users WHERE id = auth.uid() AND role = 'admin')
  );

-- --- vault_bookmarks --------------------------------------------------------

ALTER TABLE vault_bookmarks ENABLE ROW LEVEL SECURITY;

CREATE POLICY "vault_bookmarks_own" ON vault_bookmarks
  FOR ALL USING (auth.uid() = user_id)
  WITH CHECK (auth.uid() = user_id);

-- --- vault_notes ------------------------------------------------------------

ALTER TABLE vault_notes ENABLE ROW LEVEL SECURITY;

CREATE POLICY "vault_notes_own" ON vault_notes
  FOR ALL USING (auth.uid() = user_id)
  WITH CHECK (auth.uid() = user_id);

-- --- vault_feedback ---------------------------------------------------------

ALTER TABLE vault_feedback ENABLE ROW LEVEL SECURITY;

CREATE POLICY "vault_feedback_public_read" ON vault_feedback
  FOR SELECT USING (true);

CREATE POLICY "vault_feedback_insert_own" ON vault_feedback
  FOR INSERT WITH CHECK (auth.uid() = user_id);

CREATE POLICY "vault_feedback_update_own" ON vault_feedback
  FOR UPDATE USING (auth.uid() = user_id)
  WITH CHECK (auth.uid() = user_id);

CREATE POLICY "vault_feedback_delete_own" ON vault_feedback
  FOR DELETE USING (auth.uid() = user_id);

-- --- vault_views ------------------------------------------------------------

ALTER TABLE vault_views ENABLE ROW LEVEL SECURITY;

CREATE POLICY "vault_views_insert_all" ON vault_views
  FOR INSERT WITH CHECK (true);

-- --- vault_content_requests -------------------------------------------------

ALTER TABLE vault_content_requests ENABLE ROW LEVEL SECURITY;

CREATE POLICY "vault_content_requests_insert_auth" ON vault_content_requests
  FOR INSERT WITH CHECK (auth.uid() IS NOT NULL);

CREATE POLICY "vault_content_requests_select_own" ON vault_content_requests
  FOR SELECT USING (auth.uid() = user_id);

CREATE POLICY "vault_content_requests_admin_select" ON vault_content_requests
  FOR SELECT USING (
    EXISTS (SELECT 1 FROM public.users WHERE id = auth.uid() AND role = 'admin')
  );

-- ============================================================================
-- 11. Feedback Count Sync Trigger
-- ============================================================================

CREATE OR REPLACE FUNCTION sync_vault_feedback_counts()
RETURNS trigger AS $$
DECLARE
  target_content_id uuid;
BEGIN
  -- Determine the affected content_item_id
  IF TG_OP = 'DELETE' THEN
    target_content_id := OLD.content_item_id;
  ELSE
    target_content_id := NEW.content_item_id;
  END IF;

  -- Also handle the old row on UPDATE if content_item_id changed
  IF TG_OP = 'UPDATE' AND OLD.content_item_id IS DISTINCT FROM NEW.content_item_id THEN
    UPDATE content_items SET
      helpful_count = (
        SELECT count(*) FROM vault_feedback
        WHERE content_item_id = OLD.content_item_id AND feedback_type = 'helpful'
      ),
      not_helpful_count = (
        SELECT count(*) FROM vault_feedback
        WHERE content_item_id = OLD.content_item_id AND feedback_type = 'not_helpful'
      )
    WHERE id = OLD.content_item_id;
  END IF;

  -- Update counts for the target content item
  UPDATE content_items SET
    helpful_count = (
      SELECT count(*) FROM vault_feedback
      WHERE content_item_id = target_content_id AND feedback_type = 'helpful'
    ),
    not_helpful_count = (
      SELECT count(*) FROM vault_feedback
      WHERE content_item_id = target_content_id AND feedback_type = 'not_helpful'
    )
  WHERE id = target_content_id;

  IF TG_OP = 'DELETE' THEN
    RETURN OLD;
  END IF;
  RETURN NEW;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

CREATE TRIGGER trg_sync_vault_feedback_counts
  AFTER INSERT OR UPDATE OR DELETE ON vault_feedback
  FOR EACH ROW
  EXECUTE FUNCTION sync_vault_feedback_counts();

-- ============================================================================
-- 12. Freshness Auto-Flag Function
-- ============================================================================

CREATE OR REPLACE FUNCTION auto_flag_stale_content()
RETURNS void AS $$
BEGIN
  UPDATE content_items
  SET freshness_status = 'review_needed'
  WHERE freshness_status = 'current'
    AND is_published = true
    AND (
      (freshness_reviewed_at IS NOT NULL AND freshness_reviewed_at < NOW() - INTERVAL '6 months')
      OR (freshness_reviewed_at IS NULL AND created_at < NOW() - INTERVAL '6 months')
    );
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;
