-- ============================================================================
-- 090_preview_feedback_images.sql — optional screenshot per preview feedback note
-- ============================================================================
-- See docs/plans/2026-10-23-preview-feedback-screenshots.md.
--
--   * preview_feedback.image_path — nullable. When set it is
--     '<preview_id>/<submission_id>.jpg' in the private bucket below. The
--     thumbnail path ('.thumb.jpg') is derived from it, not stored.
--   * Storage bucket 'preview-feedback-images' — PRIVATE, 2 MB limit, JPEG only,
--     and NO storage.objects policies: only the service role touches it (the
--     feedback route uploads; an admin route signs short-lived URLs).
--
-- The bucket insert is an upsert that re-asserts public / file_size_limit /
-- allowed_mime_types, so a rerun CORRECTS a misconfigured bucket.
--
-- PROD NOTE: Vercel does NOT auto-apply migrations. Apply this file in the
--   Supabase dashboard SQL editor (project zvfwtndbxshrtpwcwynw) BEFORE pushing
--   the code. The new code selects preview_feedback.image_path; without the
--   column the feedback list and submit routes error.
--
-- VERIFY after applying (run on prod):
--   select column_name, data_type, is_nullable from information_schema.columns
--    where table_name = 'preview_feedback' and column_name = 'image_path';
--     -- expect: text, YES
--   select count(*) filter (where image_path is not null) as with_image
--     from public.preview_feedback;
--     -- expect: 0 right after applying
--   select id, name, public, file_size_limit, allowed_mime_types
--     from storage.buckets where id = 'preview-feedback-images';
--     -- expect exactly: public=false, file_size_limit=2097152,
--     --                 allowed_mime_types={image/jpeg}
--   select policyname from pg_policies
--    where schemaname = 'storage' and tablename = 'objects'
--      and (coalesce(qual, '') like '%preview-feedback-images%'
--           or coalesce(with_check, '') like '%preview-feedback-images%');
--     -- expect: zero rows
--
-- ROLLBACK: deliberately NOT a bare DROP. Dropping the column or bucket while
--   live code uses them breaks feedback. See the "Recovery" section of
--   docs/plans/2026-10-23-preview-feedback-screenshots.md#recovery (roll back
--   the app only, leave 090 in place, and remove objects/column only after the
--   code is gone).
-- ============================================================================

BEGIN;

ALTER TABLE public.preview_feedback
  ADD COLUMN IF NOT EXISTS image_path text
  CHECK (image_path IS NULL OR image_path ~ '^[0-9a-f-]{36}/[0-9a-f-]{36}\.jpg$');

INSERT INTO storage.buckets (id, name, public, file_size_limit, allowed_mime_types)
VALUES ('preview-feedback-images', 'preview-feedback-images', false, 2097152, ARRAY['image/jpeg'])
ON CONFLICT (id) DO UPDATE
  SET public = false,
      file_size_limit = 2097152,
      allowed_mime_types = ARRAY['image/jpeg'];

-- No storage.objects policies on purpose: service role only.

COMMIT;
