-- ============================================================
-- COURSE SYLLABI STORAGE + CACHE COLUMNS
-- ============================================================
-- Adds cached syllabus PDF URLs to courses table and creates
-- a public storage bucket for generated syllabus PDFs.
--
-- Storage path convention:
--   course-syllabi/{courseId}/syllabus-en.pdf
--   course-syllabi/{courseId}/syllabus-ja.pdf
-- ============================================================

-- Add cached syllabus URL columns to courses
ALTER TABLE courses
  ADD COLUMN IF NOT EXISTS syllabus_url_en TEXT,
  ADD COLUMN IF NOT EXISTS syllabus_url_jp TEXT;

-- Create the storage bucket (public for direct URL serving)
INSERT INTO storage.buckets (id, name, public)
VALUES ('course-syllabi', 'course-syllabi', true);

-- Anyone can view/download syllabi (public downloads, no login required)
CREATE POLICY "course_syllabi_public_read"
ON storage.objects FOR SELECT
USING (bucket_id = 'course-syllabi');

-- Only admins can upload syllabi
CREATE POLICY "course_syllabi_admin_insert"
ON storage.objects FOR INSERT
WITH CHECK (
  bucket_id = 'course-syllabi'
  AND public.is_admin()
);

-- Only admins can replace syllabi
CREATE POLICY "course_syllabi_admin_update"
ON storage.objects FOR UPDATE
USING (
  bucket_id = 'course-syllabi'
  AND public.is_admin()
);

-- Only admins can delete syllabi
CREATE POLICY "course_syllabi_admin_delete"
ON storage.objects FOR DELETE
USING (
  bucket_id = 'course-syllabi'
  AND public.is_admin()
);
