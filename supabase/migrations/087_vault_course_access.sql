-- ============================================================================
-- 087_vault_course_access.sql — B3: Vault members read Vault-included courses
-- ============================================================================
--
-- Plan: docs/plans/2026-10-18-b3-vault-course-access.md (D1, D2, D3).
--
-- 1. can_read_course_materials() gains a Vault clause: an active Vault member
--    (064 has_vault_access) may read a PUBLISHED course with
--    vault_included = true, with no enrollment. Every 085/086 policy and view
--    that calls it inherits the change (weeks, sessions, assignments,
--    vocabulary, resources, course_instructors, the 4 course_*_catalog views).
-- 2. can_access_course_esl() gains the same clause, but only where the course
--    already has esl_included = true (ESL comes with course access). Without
--    esl_included, ESL stays an add-on purchase even for Vault members.
-- 3. The instructor self-flag hole is closed: the 032 proposal INSERT/UPDATE
--    policies are dropped (proposal writes go through the service role), and
--    a CHECK limits vault_included to self-study courses.
--
-- This is NOT auto-enrollment: no enrollments rows are written. Anon is
-- unchanged (auth.uid() IS NULL short-circuits the new clause).
--
-- APPLY ORDER (prod has no migration history; paste by hand):
--   apply BEFORE pushing the B3 code. Additive for readers, restrictive only
--   for direct instructor writes, which no app path uses. No prod course has
--   vault_included = true, so nothing becomes readable until an admin flips a
--   self-study course on purpose.
--
-- Re-runnable: CREATE OR REPLACE, DROP ... IF EXISTS, then ADD.
--
-- Post-apply verification (read-only): see plan §7. In short —
--   select proname, prosecdef, position('vault_included' in pg_get_functiondef(oid)) > 0
--     from pg_proc where pronamespace = 'public'::regnamespace
--     and proname in ('can_read_course_materials','can_access_course_esl');   -- 2 rows, t, t
--   select routine_name, grantee, privilege_type from information_schema.routine_privileges
--     where routine_schema = 'public'
--     and routine_name in ('can_read_course_materials','can_access_course_esl') order by 1, 2;
--     -- EXECUTE for anon, authenticated, service_role, postgres; no PUBLIC
--   select policyname from pg_policies where tablename = 'courses'
--     and policyname like 'courses_own_proposals_%';                         -- only _read
--   select conname from pg_constraint where conname = 'courses_vault_included_self_study';
--
-- Rollback: re-run 085's two function bodies (can_read_course_materials,
-- can_access_course_esl) with their REVOKE/GRANT lines, re-run 032's two
-- write policies (courses_own_proposals_insert / _update), and
-- ALTER TABLE public.courses DROP CONSTRAINT courses_vault_included_self_study.
-- ============================================================================

BEGIN;

CREATE OR REPLACE FUNCTION public.can_read_course_materials(p_course uuid) RETURNS boolean
LANGUAGE sql STABLE SECURITY DEFINER SET search_path = public, pg_temp AS $$
 SELECT public.can_manage_course(p_course) OR EXISTS (
   SELECT 1 FROM public.enrollments e WHERE e.course_id = p_course AND e.user_id = auth.uid()
   AND e.status IN ('active', 'completed'))
 OR (auth.uid() IS NOT NULL
   AND EXISTS (SELECT 1 FROM public.courses c WHERE c.id = p_course AND c.is_published AND c.vault_included)
   AND public.has_vault_access(auth.uid()));
$$;

-- ESL is paid course material too.
CREATE OR REPLACE FUNCTION public.can_access_course_esl(p_course uuid) RETURNS boolean
LANGUAGE sql STABLE SECURITY DEFINER SET search_path = public, pg_temp AS $$
 SELECT public.can_manage_course(p_course) OR EXISTS (
   SELECT 1 FROM public.courses c WHERE c.id = p_course AND c.esl_enabled AND (
     (c.esl_included AND EXISTS (SELECT 1 FROM public.enrollments e WHERE e.course_id = c.id
       AND e.user_id = auth.uid() AND e.status IN ('active','completed')))
     OR EXISTS (SELECT 1 FROM public.esl_purchases p WHERE p.course_id = c.id AND p.user_id = auth.uid())
     OR (c.esl_included AND c.is_published AND c.vault_included AND auth.uid() IS NOT NULL
       AND public.has_vault_access(auth.uid()))
   )
 );
$$;

-- D3.1: instructors no longer write course rows directly. Proposal create/edit
-- uses the service role (lib/instructor-portal/actions.ts); admins keep
-- courses_admin_all. courses_own_proposals_read stays.
DROP POLICY IF EXISTS "courses_own_proposals_insert" ON public.courses;
DROP POLICY IF EXISTS "courses_own_proposals_update" ON public.courses;

-- D3.3: only self-study courses can be included in the Vault (never a cohort,
-- whose Zoom/community links and max_enrollment a flag would bypass, nor 1v1).
ALTER TABLE public.courses DROP CONSTRAINT IF EXISTS courses_vault_included_self_study;
ALTER TABLE public.courses ADD CONSTRAINT courses_vault_included_self_study
  CHECK (NOT vault_included OR course_type = 'self-study');

REVOKE ALL ON FUNCTION public.can_read_course_materials(uuid) FROM PUBLIC;
GRANT EXECUTE ON FUNCTION public.can_read_course_materials(uuid) TO anon, authenticated, service_role;
REVOKE ALL ON FUNCTION public.can_access_course_esl(uuid) FROM PUBLIC;
GRANT EXECUTE ON FUNCTION public.can_access_course_esl(uuid) TO anon, authenticated, service_role;

NOTIFY pgrst, 'reload schema';
COMMIT;
