-- 013_path_items_urls.sql — Add denormalized URL fields to study_path_items
-- Enables ContentViewer to embed YouTube/Vimeo videos and link to external content
-- without a separate content_items lookup at render time.

ALTER TABLE study_path_items ADD COLUMN IF NOT EXISTS item_url text;
ALTER TABLE study_path_items ADD COLUMN IF NOT EXISTS item_embed_url text;
