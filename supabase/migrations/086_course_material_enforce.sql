-- ============================================================================
-- 086_course_material_enforce.sql — paid course material + ESL: RESTRICTIVE half
-- ============================================================================
--
-- Slice E of the 068–073 landing. Plan: docs/plans/2026-10-17-land-e-071-073.md
-- (D1, D3, D4). Second half of the unshipped 071/073 split (071 and 073 stay as
-- gaps); requires 085's helpers.
--
-- APPLY ORDER:
--   1. 085 — before pushing the Slice E code.
--   2. push Slice E; wait for the Vercel deploy of that sha to be Ready; smoke.
--   3. 086 (this file) — AFTER the deploy is Ready and smoked, the same day.
--      Applying it while pre-E code is serving empties /learn and the course
--      pages (they read raw `courses`, which becomes invisible to anon).
--
-- What it does:
--   * Replaces the 8 raw-table *_public_read policies: course rows are
--     staff-only on the raw table (the public reads course_catalog & co.), and
--     sessions / assignments / vocabulary / resources need entitlement.
--   * Replaces the 9 old ESL policies. Their "Service role …" names never
--     restricted roles: they applied to `public` with USING (true), so anyone
--     could read/write esl_lessons and esl_audio and forge esl_purchases.
--   * Revokes INSERT/UPDATE/DELETE on esl_purchases and esl_audio from
--     anon/authenticated (only service_role writes them).
--   * Ensures the esl-audio bucket exists and is PRIVATE (old public URLs stop
--     working; readers re-sign) and adds 4 RESTRICTIVE storage guards.
-- Re-runnable: every CREATE POLICY is preceded by DROP POLICY IF EXISTS.
--
-- Post-apply verification (expect: 0 rows; 12 rows; public = f; 5 rows; 0 rows):
--   select tablename, policyname from pg_policies where schemaname = 'public'
--     and policyname like '%public_read' and tablename in ('courses','course_weeks',
--     'course_sessions','course_assignments','course_vocabulary','course_resources',
--     'course_instructors','partner_courses');
--   select tablename, policyname from pg_policies where schemaname = 'public'
--     and policyname in ('courses_staff_read','weeks_catalog_read','sessions_material_read',
--     'assignments_material_read','vocabulary_material_read','resources_material_read',
--     'course_instructors_catalog_read','partner_courses_catalog_read','esl_lesson_read',
--     'esl_lesson_staff_insert','esl_lesson_staff_update','esl_audio_read');
--   select public from storage.buckets where id = 'esl-audio';
--   select policyname from pg_policies where schemaname = 'storage'
--     and policyname like 'esl_audio_storage_%';
--   select table_name, grantee, privilege_type from information_schema.role_table_grants
--     where table_schema = 'public' and table_name in ('esl_purchases','esl_audio')
--     and grantee in ('anon','authenticated') and privilege_type in ('INSERT','UPDATE','DELETE');
--
-- Rollback: FIX FORWARD. Restoring the old policies reopens paid data; the
-- plan's Appendix A has them for an emergency only, with Ryan's explicit OK.
-- Never Vercel-rollback to a pre-E deployment after this file is applied.
-- ============================================================================

BEGIN;

DROP POLICY IF EXISTS courses_public_read ON public.courses;
DROP POLICY IF EXISTS courses_staff_read ON public.courses;
CREATE POLICY courses_staff_read ON public.courses FOR SELECT TO authenticated USING (public.can_manage_course(id));
DROP POLICY IF EXISTS weeks_public_read ON public.course_weeks;
DROP POLICY IF EXISTS weeks_catalog_read ON public.course_weeks;
CREATE POLICY weeks_catalog_read ON public.course_weeks FOR SELECT USING (
 public.course_is_published(course_id) OR public.can_read_course_materials(course_id));
DROP POLICY IF EXISTS sessions_public_read ON public.course_sessions;
DROP POLICY IF EXISTS sessions_material_read ON public.course_sessions;
CREATE POLICY sessions_material_read ON public.course_sessions FOR SELECT USING (public.can_read_session_materials(id));
DROP POLICY IF EXISTS assignments_public_read ON public.course_assignments;
DROP POLICY IF EXISTS assignments_material_read ON public.course_assignments;
CREATE POLICY assignments_material_read ON public.course_assignments FOR SELECT USING (
 public.can_read_course_materials((SELECT course_id FROM public.course_weeks WHERE id = week_id)));
DROP POLICY IF EXISTS vocabulary_public_read ON public.course_vocabulary;
DROP POLICY IF EXISTS vocabulary_material_read ON public.course_vocabulary;
CREATE POLICY vocabulary_material_read ON public.course_vocabulary FOR SELECT USING (
 public.can_read_course_materials((SELECT course_id FROM public.course_weeks WHERE id = week_id)));
DROP POLICY IF EXISTS resources_public_read ON public.course_resources;
DROP POLICY IF EXISTS resources_material_read ON public.course_resources;
CREATE POLICY resources_material_read ON public.course_resources FOR SELECT USING (
 public.can_read_course_resource(week_id, session_id, is_public));
-- These join tables previously relied on public raw course visibility.
DROP POLICY IF EXISTS course_instructors_public_read ON public.course_instructors;
DROP POLICY IF EXISTS course_instructors_catalog_read ON public.course_instructors;
CREATE POLICY course_instructors_catalog_read ON public.course_instructors FOR SELECT USING (
 public.course_is_published(course_id) OR public.can_read_course_materials(course_id));
DROP POLICY IF EXISTS partner_courses_public_read ON public.partner_courses;
DROP POLICY IF EXISTS partner_courses_catalog_read ON public.partner_courses;
CREATE POLICY partner_courses_catalog_read ON public.partner_courses FOR SELECT USING (public.course_is_published(course_id));

-- ESL. Policy names do not restrict roles.
DROP POLICY IF EXISTS "Service role can manage ESL lessons" ON public.esl_lessons;
DROP POLICY IF EXISTS "Service role can manage ESL audio" ON public.esl_audio;
DROP POLICY IF EXISTS "Service role can insert ESL purchases" ON public.esl_purchases;
DROP POLICY IF EXISTS "Published ESL lessons readable by enrolled students" ON public.esl_lessons;
DROP POLICY IF EXISTS "Admin can view all ESL lessons" ON public.esl_lessons;
DROP POLICY IF EXISTS "Admin can insert ESL lessons" ON public.esl_lessons;
DROP POLICY IF EXISTS "Admin can update ESL lessons" ON public.esl_lessons;
DROP POLICY IF EXISTS "ESL audio readable when lesson is published" ON public.esl_audio;
DROP POLICY IF EXISTS "Admin can manage ESL audio" ON public.esl_audio;
DROP POLICY IF EXISTS esl_lesson_read ON public.esl_lessons;
CREATE POLICY esl_lesson_read ON public.esl_lessons FOR SELECT USING (public.can_read_esl_lesson(id));
DROP POLICY IF EXISTS esl_lesson_staff_insert ON public.esl_lessons;
CREATE POLICY esl_lesson_staff_insert ON public.esl_lessons FOR INSERT TO authenticated WITH CHECK (
 public.can_manage_course(course_id) AND EXISTS (SELECT 1 FROM public.course_weeks w WHERE w.id = week_id AND w.course_id = esl_lessons.course_id));
DROP POLICY IF EXISTS esl_lesson_staff_update ON public.esl_lessons;
CREATE POLICY esl_lesson_staff_update ON public.esl_lessons FOR UPDATE TO authenticated
 USING (public.can_manage_course(course_id)) WITH CHECK (
 public.can_manage_course(course_id) AND EXISTS (SELECT 1 FROM public.course_weeks w WHERE w.id = week_id AND w.course_id = esl_lessons.course_id));
DROP POLICY IF EXISTS esl_audio_read ON public.esl_audio;
CREATE POLICY esl_audio_read ON public.esl_audio FOR SELECT USING (public.can_read_esl_lesson(esl_lesson_id));
-- Only the service-role webhook/generator creates purchases or bypasses these policies.
REVOKE INSERT, UPDATE, DELETE ON public.esl_purchases FROM anon, authenticated;
-- Audio metadata is generated by service_role. Staff must not forge a readable
-- lesson's metadata to obtain signatures for a different course's object.
REVOKE INSERT, UPDATE, DELETE ON public.esl_audio FROM anon, authenticated;

-- Audio paths contain public course/week identifiers, so hiding DB URLs alone
-- cannot protect them. Old public URLs must stop working after this rollout.
-- Ensure the bucket exists and is private even where it did not exist.
INSERT INTO storage.buckets (id, name, public) VALUES ('esl-audio', 'esl-audio', false)
 ON CONFLICT (id) DO UPDATE SET public = false;
DROP POLICY IF EXISTS esl_audio_storage_read_guard ON storage.objects;
CREATE POLICY esl_audio_storage_read_guard ON storage.objects AS RESTRICTIVE FOR SELECT TO anon, authenticated USING (
 bucket_id <> 'esl-audio' OR EXISTS (SELECT 1 FROM public.esl_audio a JOIN public.esl_lessons l ON l.id = a.esl_lesson_id
   WHERE a.storage_path = storage.objects.name AND public.can_read_esl_lesson(l.id)
     AND split_part(a.storage_path, '/', 1) = l.course_id::text
     AND split_part(a.storage_path, '/', 2) = l.week_id::text));
-- esl_audio_storage_entitled_read (the permissive half) is created by 085.
-- The generator uploads through service_role. Block arbitrary browser uploads,
-- replacement and deletion even if a broader storage policy also exists.
DROP POLICY IF EXISTS esl_audio_storage_insert_guard ON storage.objects;
CREATE POLICY esl_audio_storage_insert_guard ON storage.objects AS RESTRICTIVE FOR INSERT TO anon, authenticated
 WITH CHECK (bucket_id <> 'esl-audio');
DROP POLICY IF EXISTS esl_audio_storage_update_guard ON storage.objects;
CREATE POLICY esl_audio_storage_update_guard ON storage.objects AS RESTRICTIVE FOR UPDATE TO anon, authenticated
 USING (bucket_id <> 'esl-audio') WITH CHECK (bucket_id <> 'esl-audio');
DROP POLICY IF EXISTS esl_audio_storage_delete_guard ON storage.objects;
CREATE POLICY esl_audio_storage_delete_guard ON storage.objects AS RESTRICTIVE FOR DELETE TO anon, authenticated
 USING (bucket_id <> 'esl-audio');

NOTIFY pgrst, 'reload schema';
COMMIT;
