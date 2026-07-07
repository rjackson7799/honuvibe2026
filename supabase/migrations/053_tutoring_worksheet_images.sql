-- ============================================================================
-- 053_tutoring_worksheet_images.sql — Worksheet photo upload for 1v1 reports
-- Follow-on to 052_tutoring_1v1.sql.
--
-- Lets a session report be generated from photos of a handwritten worksheet the
-- student completed at home (e.g. sent via LINE), in ADDITION to — or INSTEAD
-- of — a pasted transcript. Photos are stored in the SAME private
-- `tutoring-private` bucket as the transcript; this migration only records the
-- storage paths on the instructor-only child row.
--
-- No new bucket or storage policies: the tutoring-private policies from
-- 052_tutoring_1v1.sql are bucket-scoped (bucket_id = 'tutoring-private' AND
-- public.is_admin()), so admin writes to {course_id}/{report_id}/images/* are
-- already permitted, and reads go through service-role signed URLs (no SELECT
-- policy exists, by design).
--
-- Apply MANUALLY in the Supabase dashboard SQL editor on zvfwtndbxshrtpwcwynw
-- BEFORE deploying code that reads source_image_refs — the Vercel deploy does
-- not run migrations, and the code 500s ahead of its schema.
-- ============================================================================

BEGIN;

-- Array of { path, media_type } objects; each path points into tutoring-private.
ALTER TABLE public.session_report_private
  ADD COLUMN IF NOT EXISTS source_image_refs jsonb NOT NULL DEFAULT '[]'::jsonb;

-- Defensive: keep source_image_refs a JSON array (never an object/scalar).
ALTER TABLE public.session_report_private
  DROP CONSTRAINT IF EXISTS session_report_private_source_image_refs_is_array;
ALTER TABLE public.session_report_private
  ADD CONSTRAINT session_report_private_source_image_refs_is_array
  CHECK (jsonb_typeof(source_image_refs) = 'array');

COMMIT;
