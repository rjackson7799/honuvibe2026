-- ============================================================
-- COURSE IMAGES STORAGE BUCKET
-- ============================================================
-- Creates a public Supabase Storage bucket for course thumbnails
-- and hero images, with admin-only write access via RLS.
--
-- Storage path convention:
--   course-images/{courseId}/thumbnail.{ext}
--   course-images/{courseId}/hero.{ext}
-- ============================================================

-- Create the storage bucket (public for direct URL serving)
INSERT INTO storage.buckets (id, name, public)
VALUES ('course-images', 'course-images', true);

-- Anyone can view/download course images (they appear on public pages)
CREATE POLICY "course_images_public_read"
ON storage.objects FOR SELECT
USING (bucket_id = 'course-images');

-- Only admins can upload images
CREATE POLICY "course_images_admin_insert"
ON storage.objects FOR INSERT
WITH CHECK (
  bucket_id = 'course-images'
  AND public.is_admin()
);

-- Only admins can replace images
CREATE POLICY "course_images_admin_update"
ON storage.objects FOR UPDATE
USING (
  bucket_id = 'course-images'
  AND public.is_admin()
);

-- Only admins can delete images
CREATE POLICY "course_images_admin_delete"
ON storage.objects FOR DELETE
USING (
  bucket_id = 'course-images'
  AND public.is_admin()
);
