-- ============================================================
-- AVATARS STORAGE BUCKET
-- ============================================================
-- Creates a public Supabase Storage bucket for user profile
-- pictures, with user-owned write access via RLS.
--
-- Storage path convention:
--   avatars/{userId}/avatar.{ext}
--
-- Size limit: 2 MB. Allowed types: jpeg, png, webp.
-- ============================================================

INSERT INTO storage.buckets (id, name, public, file_size_limit, allowed_mime_types)
VALUES (
  'avatars',
  'avatars',
  true,
  2 * 1024 * 1024,
  ARRAY['image/jpeg', 'image/png', 'image/webp']
);

-- Public read so <Image> can render without signed URLs
CREATE POLICY "avatars_public_read"
ON storage.objects FOR SELECT
USING (bucket_id = 'avatars');

-- Authenticated users can upload only to their own folder
CREATE POLICY "avatars_owner_insert"
ON storage.objects FOR INSERT
WITH CHECK (
  bucket_id = 'avatars'
  AND auth.uid()::text = (storage.foldername(name))[1]
);

CREATE POLICY "avatars_owner_update"
ON storage.objects FOR UPDATE
USING (
  bucket_id = 'avatars'
  AND auth.uid()::text = (storage.foldername(name))[1]
);

CREATE POLICY "avatars_owner_delete"
ON storage.objects FOR DELETE
USING (
  bucket_id = 'avatars'
  AND auth.uid()::text = (storage.foldername(name))[1]
);
