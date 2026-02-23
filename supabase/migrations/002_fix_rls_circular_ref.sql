-- Fix: Replace inline admin RLS checks with SECURITY DEFINER function
-- Resolves PostgreSQL error 42P17 (circular RLS reference on public.users)

-- Helper function bypasses RLS on public.users table
CREATE OR REPLACE FUNCTION public.is_admin()
RETURNS boolean AS $$
  SELECT EXISTS (
    SELECT 1 FROM public.users
    WHERE id = auth.uid() AND role = 'admin'
  );
$$ LANGUAGE sql SECURITY DEFINER STABLE;

-- Drop and recreate all admin policies using the helper function

-- public.users
DROP POLICY IF EXISTS "users_admin_all" ON public.users;
CREATE POLICY "users_admin_all" ON public.users
  FOR ALL USING (public.is_admin());

-- courses
DROP POLICY IF EXISTS "courses_admin_all" ON courses;
CREATE POLICY "courses_admin_all" ON courses
  FOR ALL USING (public.is_admin());

-- course_weeks
DROP POLICY IF EXISTS "weeks_admin_all" ON course_weeks;
CREATE POLICY "weeks_admin_all" ON course_weeks
  FOR ALL USING (public.is_admin());

-- course_sessions
DROP POLICY IF EXISTS "sessions_admin_all" ON course_sessions;
CREATE POLICY "sessions_admin_all" ON course_sessions
  FOR ALL USING (public.is_admin());

-- course_assignments
DROP POLICY IF EXISTS "assignments_admin_all" ON course_assignments;
CREATE POLICY "assignments_admin_all" ON course_assignments
  FOR ALL USING (public.is_admin());

-- course_vocabulary
DROP POLICY IF EXISTS "vocabulary_admin_all" ON course_vocabulary;
CREATE POLICY "vocabulary_admin_all" ON course_vocabulary
  FOR ALL USING (public.is_admin());

-- course_resources
DROP POLICY IF EXISTS "resources_admin_all" ON course_resources;
CREATE POLICY "resources_admin_all" ON course_resources
  FOR ALL USING (public.is_admin());

-- enrollments
DROP POLICY IF EXISTS "enrollments_admin_all" ON enrollments;
CREATE POLICY "enrollments_admin_all" ON enrollments
  FOR ALL USING (public.is_admin());

-- course_uploads
DROP POLICY IF EXISTS "uploads_admin_only" ON course_uploads;
CREATE POLICY "uploads_admin_only" ON course_uploads
  FOR ALL USING (public.is_admin());

-- applications
DROP POLICY IF EXISTS "applications_admin_only" ON applications;
CREATE POLICY "applications_admin_only" ON applications
  FOR ALL USING (public.is_admin());

-- content_items
DROP POLICY IF EXISTS "content_admin_all" ON content_items;
CREATE POLICY "content_admin_all" ON content_items
  FOR ALL USING (public.is_admin());

-- tags
DROP POLICY IF EXISTS "tags_admin_all" ON tags;
CREATE POLICY "tags_admin_all" ON tags
  FOR ALL USING (public.is_admin());

-- content_collections
DROP POLICY IF EXISTS "collections_admin_all" ON content_collections;
CREATE POLICY "collections_admin_all" ON content_collections
  FOR ALL USING (public.is_admin());

-- content_collection_items
DROP POLICY IF EXISTS "collection_items_admin_all" ON content_collection_items;
CREATE POLICY "collection_items_admin_all" ON content_collection_items
  FOR ALL USING (public.is_admin());

-- study_paths
DROP POLICY IF EXISTS "paths_admin_read" ON study_paths;
CREATE POLICY "paths_admin_read" ON study_paths
  FOR SELECT USING (public.is_admin());

-- study_path_items
DROP POLICY IF EXISTS "path_items_admin_read" ON study_path_items;
CREATE POLICY "path_items_admin_read" ON study_path_items
  FOR SELECT USING (public.is_admin());

-- path_generation_logs
DROP POLICY IF EXISTS "gen_logs_admin" ON path_generation_logs;
CREATE POLICY "gen_logs_admin" ON path_generation_logs
  FOR SELECT USING (public.is_admin());
