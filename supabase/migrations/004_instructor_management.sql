-- ============================================================
-- INSTRUCTOR MANAGEMENT
-- ============================================================
-- Adds instructor profiles, links courses to instructors,
-- and creates storage bucket for instructor photos.
-- ============================================================

-- 1. Instructor profiles table (1:1 extension of public.users for instructors)
CREATE TABLE instructor_profiles (
  id            uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id       uuid NOT NULL UNIQUE REFERENCES public.users(id) ON DELETE CASCADE,

  -- Display name (may differ from auth full_name)
  display_name  text NOT NULL,

  -- Professional title (bilingual)
  title_en      text,
  title_jp      text,

  -- Short bio (1-2 sentences, for compact cards)
  bio_short_en  text,
  bio_short_jp  text,

  -- Long bio (for course detail page)
  bio_long_en   text,
  bio_long_jp   text,

  -- Photo stored in Supabase Storage bucket "instructor-photos"
  photo_url     text,

  -- Optional links
  website_url   text,
  linkedin_url  text,
  twitter_url   text,

  -- Visibility control (soft-disable without breaking FK)
  is_active     boolean NOT NULL DEFAULT true,

  created_at    timestamptz DEFAULT now(),
  updated_at    timestamptz DEFAULT now()
);

CREATE INDEX idx_instructor_profiles_user ON instructor_profiles (user_id);
CREATE INDEX idx_instructor_profiles_active ON instructor_profiles (is_active);

-- 2. Add instructor_id FK to courses
ALTER TABLE courses
  ADD COLUMN instructor_id uuid REFERENCES instructor_profiles(id) ON DELETE SET NULL;

CREATE INDEX idx_courses_instructor ON courses (instructor_id);

-- 3. RLS policies for instructor_profiles
ALTER TABLE instructor_profiles ENABLE ROW LEVEL SECURITY;

-- Public can read active instructor profiles (needed for course detail pages)
CREATE POLICY "instructor_profiles_public_read" ON instructor_profiles
  FOR SELECT USING (is_active = true);

-- Admin can do everything
CREATE POLICY "instructor_profiles_admin_all" ON instructor_profiles
  FOR ALL USING (public.is_admin());

-- 4. Storage bucket for instructor photos
INSERT INTO storage.buckets (id, name, public)
VALUES ('instructor-photos', 'instructor-photos', true);

-- Anyone can view instructor photos (they appear on public pages)
CREATE POLICY "instructor_photos_public_read"
ON storage.objects FOR SELECT
USING (bucket_id = 'instructor-photos');

-- Only admins can upload photos
CREATE POLICY "instructor_photos_admin_insert"
ON storage.objects FOR INSERT
WITH CHECK (
  bucket_id = 'instructor-photos'
  AND public.is_admin()
);

-- Only admins can replace photos
CREATE POLICY "instructor_photos_admin_update"
ON storage.objects FOR UPDATE
USING (
  bucket_id = 'instructor-photos'
  AND public.is_admin()
);

-- Only admins can delete photos
CREATE POLICY "instructor_photos_admin_delete"
ON storage.objects FOR DELETE
USING (
  bucket_id = 'instructor-photos'
  AND public.is_admin()
);
