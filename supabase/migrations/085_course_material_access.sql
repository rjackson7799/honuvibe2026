-- ============================================================================
-- 085_course_material_access.sql — paid course material + ESL: ADDITIVE half
-- ============================================================================
--
-- Slice E of the 068–073 landing. Plan: docs/plans/2026-10-17-land-e-071-073.md
-- (D1–D4). The unshipped 071_course_material_access.sql and
-- 073_esl_material_access.sql were split into this file (additive) and
-- 086_course_material_enforce.sql (restrictive), so 071 and 073 stay as gaps
-- in the numbering. This file fulfils 079's request: course_catalog includes
-- c.track and c.vault_included (appended last, so a later CREATE OR REPLACE
-- VIEW stays legal).
--
-- APPLY ORDER (prod has no migration history; everything is pasted by hand):
--   1. 085 (this file)  — BEFORE pushing the Slice E code.
--   2. push Slice E; wait for the Vercel deploy of that sha to be Ready; smoke.
--   3. 086              — AFTER the deploy is Ready and smoked, the same day.
--
-- Strictly additive and compatible with the pre-E code: it creates helpers,
-- views and ONE permissive storage SELECT policy. No table policy changes, no
-- grant is narrowed, the esl-audio bucket stays public. Re-runnable (every
-- object is CREATE OR REPLACE / DROP IF EXISTS + CREATE).
--
-- Views use owner permissions with explicit eligibility and column lists.
-- Never add SELECT * to these projections: future columns must be classified
-- first. Three of the four views are single-table and therefore auto-updatable;
-- the REVOKE ALL below is load-bearing (Supabase default privileges would
-- otherwise grant anon INSERT/UPDATE/DELETE, and a write through an
-- owner-privileged view bypasses the base table's RLS).
--
-- Post-apply verification (expect: 9 rows prosecdef = t; 4 views; only SELECT
-- for anon/authenticated on the views; 1 storage policy; course_catalog has
-- track + vault_included):
--   select proname, prosecdef from pg_proc where pronamespace = 'public'::regnamespace
--     and proname in ('can_manage_course','can_read_course_materials','course_is_published',
--       'session_course_id','can_read_session_materials','resource_course_id',
--       'can_read_course_resource','can_access_course_esl','can_read_esl_lesson');
--   select table_name, grantee, privilege_type from information_schema.role_table_grants
--     where table_schema = 'public' and grantee in ('anon','authenticated')
--     and table_name like 'course%catalog' order by 1, 2, 3;
--   select policyname from pg_policies where schemaname = 'storage'
--     and policyname like 'esl_audio_storage_%';
--   select column_name from information_schema.columns where table_schema = 'public'
--     and table_name = 'course_catalog' and column_name in ('track','vault_included');
--
-- Rollback (only before 086; after 086 the views are load-bearing — fix
-- forward): drop the storage policy, the 4 views, then the 9 functions.
-- ============================================================================

BEGIN;

CREATE OR REPLACE FUNCTION public.can_manage_course(p_course uuid) RETURNS boolean
LANGUAGE sql STABLE SECURITY DEFINER SET search_path = public, pg_temp AS $$
 SELECT public.is_admin() OR EXISTS (
   SELECT 1 FROM public.instructor_profiles ip JOIN public.users u ON u.id = ip.user_id
   JOIN public.courses c ON c.id = p_course
   WHERE ip.user_id = auth.uid() AND u.role = 'instructor' AND ip.is_active = true
     AND (c.instructor_id = ip.id OR c.proposed_by_instructor_id = ip.id OR EXISTS (
       SELECT 1 FROM public.course_instructors ci WHERE ci.course_id = c.id AND ci.instructor_id = ip.id))
 );
$$;
CREATE OR REPLACE FUNCTION public.can_read_course_materials(p_course uuid) RETURNS boolean
LANGUAGE sql STABLE SECURITY DEFINER SET search_path = public, pg_temp AS $$
 SELECT public.can_manage_course(p_course) OR EXISTS (
   SELECT 1 FROM public.enrollments e WHERE e.course_id = p_course AND e.user_id = auth.uid()
   AND e.status IN ('active', 'completed'));
$$;
CREATE OR REPLACE FUNCTION public.course_is_published(p_course uuid) RETURNS boolean
LANGUAGE sql STABLE SECURITY DEFINER SET search_path = public, pg_temp AS $$
 SELECT EXISTS (SELECT 1 FROM public.courses WHERE id = p_course AND is_published = true);
$$;
CREATE OR REPLACE FUNCTION public.session_course_id(p_session uuid) RETURNS uuid
LANGUAGE sql STABLE SECURITY DEFINER SET search_path = public, pg_temp AS $$
 SELECT CASE WHEN s.week_id IS NOT NULL AND s.course_id IS NOT NULL AND w.course_id IS DISTINCT FROM s.course_id
   THEN NULL ELSE COALESCE(w.course_id, s.course_id) END
 FROM public.course_sessions s LEFT JOIN public.course_weeks w ON w.id = s.week_id WHERE s.id = p_session;
$$;
CREATE OR REPLACE FUNCTION public.can_read_session_materials(p_session uuid) RETURNS boolean
LANGUAGE sql STABLE SECURITY DEFINER SET search_path = public, pg_temp AS $$
 SELECT public.session_course_id(p_session) IS NOT NULL AND (
   public.can_read_course_materials(public.session_course_id(p_session)) OR (
     auth.uid() IS NOT NULL AND EXISTS (
       SELECT 1 FROM (
         SELECT s.id, c.free_preview_count,
           row_number() OVER (PARTITION BY c.id ORDER BY w.week_number, s.session_number, s.id) AS position
         FROM public.course_sessions s JOIN public.course_weeks w ON w.id = s.week_id
         JOIN public.courses c ON c.id = w.course_id
         WHERE c.id = public.session_course_id(p_session) AND c.is_published AND s.is_bonus = false
           AND (s.course_id IS NULL OR s.course_id = c.id)
       ) preview WHERE preview.id = p_session AND preview.position <= preview.free_preview_count
     )
   )
 );
$$;
CREATE OR REPLACE FUNCTION public.resource_course_id(p_week uuid, p_session uuid) RETURNS uuid
LANGUAGE sql STABLE SECURITY DEFINER SET search_path = public, pg_temp AS $$
 SELECT CASE
   WHEN p_session IS NOT NULL AND public.session_course_id(p_session) IS NULL THEN NULL
   WHEN p_week IS NOT NULL AND p_session IS NOT NULL AND
     (SELECT course_id FROM public.course_weeks WHERE id = p_week) IS DISTINCT FROM public.session_course_id(p_session) THEN NULL
   ELSE COALESCE((SELECT course_id FROM public.course_weeks WHERE id = p_week), public.session_course_id(p_session)) END;
$$;
CREATE OR REPLACE FUNCTION public.can_read_course_resource(p_week uuid, p_session uuid, p_public boolean) RETURNS boolean
LANGUAGE sql STABLE SECURITY DEFINER SET search_path = public, pg_temp AS $$
 SELECT public.resource_course_id(p_week, p_session) IS NOT NULL AND (
   public.can_read_course_materials(public.resource_course_id(p_week, p_session)) OR
   (p_public = true AND public.course_is_published(public.resource_course_id(p_week, p_session))));
$$;
-- ESL is paid course material too.
CREATE OR REPLACE FUNCTION public.can_access_course_esl(p_course uuid) RETURNS boolean
LANGUAGE sql STABLE SECURITY DEFINER SET search_path = public, pg_temp AS $$
 SELECT public.can_manage_course(p_course) OR EXISTS (
   SELECT 1 FROM public.courses c WHERE c.id = p_course AND c.esl_enabled AND (
     (c.esl_included AND EXISTS (SELECT 1 FROM public.enrollments e WHERE e.course_id = c.id
       AND e.user_id = auth.uid() AND e.status IN ('active','completed')))
     OR EXISTS (SELECT 1 FROM public.esl_purchases p WHERE p.course_id = c.id AND p.user_id = auth.uid())
   )
 );
$$;
CREATE OR REPLACE FUNCTION public.can_read_esl_lesson(p_lesson uuid) RETURNS boolean
LANGUAGE sql STABLE SECURITY DEFINER SET search_path = public, pg_temp AS $$
 SELECT EXISTS (SELECT 1 FROM public.esl_lessons l JOIN public.course_weeks w ON w.id = l.week_id
 WHERE l.id = p_lesson AND w.course_id = l.course_id AND (
   public.can_manage_course(l.course_id) OR (l.status = 'published' AND public.can_access_course_esl(l.course_id))));
$$;

CREATE OR REPLACE VIEW public.course_catalog WITH (security_barrier = true) AS SELECT
 c.id,
 c.slug,
 c.course_id_code,
 c.course_type,
 c.title_en,
 c.title_jp,
 c.description_en,
 c.description_jp,
 c.instructor_name,
 c.price_usd,
 c.price_jpy,
 c.language,
 c.subtitle_language,
 c.level,
 c.format,
 c.start_date,
 c.end_date,
 c.total_weeks,
 c.live_sessions_count,
 c.recorded_lessons_count,
 c.max_enrollment,
 c.current_enrollment,
 c.learning_outcomes_en,
 c.learning_outcomes_jp,
 c.prerequisites_en,
 c.prerequisites_jp,
 c.who_is_for_en,
 c.who_is_for_jp,
 c.tools_covered,
 c.community_platform,
 c.community_duration_months,
 CASE WHEN public.can_read_course_materials(c.id) THEN c.community_link ELSE NULL END AS community_link,
 CASE WHEN public.can_read_course_materials(c.id) THEN c.zoom_link ELSE NULL END AS zoom_link,
 c.schedule_notes_en,
 c.schedule_notes_jp,
 c.cancellation_policy_en,
 c.cancellation_policy_jp,
 c.completion_requirements_en,
 c.completion_requirements_jp,
 c.materials_summary_en,
 c.materials_summary_jp,
 c.thumbnail_url,
 c.hero_image_url,
 c.tags,
 c.is_published,
 c.status,
 c.created_at,
 c.updated_at,
 c.instructor_id,
 c.is_featured,
 c.esl_enabled,
 c.esl_included,
 c.esl_price_usd,
 c.esl_price_jpy,
 CASE WHEN public.can_manage_course(c.id) THEN c.esl_settings_json ELSE NULL END AS esl_settings_json,
 c.syllabus_url_en,
 c.syllabus_url_jp,
 c.free_preview_count,
 c.is_private,
 CASE WHEN public.can_manage_course(c.id) THEN c.proposed_by_instructor_id ELSE NULL END AS proposed_by_instructor_id,
 CASE WHEN public.can_manage_course(c.id) THEN c.proposal_submitted_at ELSE NULL END AS proposal_submitted_at,
 CASE WHEN public.can_manage_course(c.id) THEN c.proposal_review_notes ELSE NULL END AS proposal_review_notes,
 CASE WHEN public.can_manage_course(c.id) THEN c.instructor_revenue_share_pct ELSE NULL END AS instructor_revenue_share_pct,
 c.partner_id,
 -- 079: public catalog metadata (track filters; vault_included feeds the B3 predicate).
 c.track,
 c.vault_included
FROM public.courses c WHERE c.is_published OR public.can_read_course_materials(c.id);
CREATE OR REPLACE VIEW public.course_session_catalog WITH (security_barrier = true) AS SELECT
 s.id,
 s.week_id,
 s.session_number,
 s.title_en,
 s.title_jp,
 s.format,
 s.duration_minutes,
 s.scheduled_at,
 CASE WHEN public.can_read_session_materials(s.id) THEN s.materials_en ELSE NULL END AS materials_en,
 CASE WHEN public.can_read_session_materials(s.id) THEN s.materials_jp ELSE NULL END AS materials_jp,
 s.topics_en,
 s.topics_jp,
 CASE WHEN public.can_read_session_materials(s.id) THEN s.zoom_link ELSE NULL END AS zoom_link,
 CASE WHEN public.can_read_session_materials(s.id) THEN s.replay_url ELSE NULL END AS replay_url,
 CASE WHEN public.can_read_session_materials(s.id) THEN s.transcript_url ELSE NULL END AS transcript_url,
 CASE WHEN public.can_read_session_materials(s.id) THEN s.slide_deck_url ELSE NULL END AS slide_deck_url,
 s.status,
 s.created_at,
 s.instructor_id,
 s.course_id,
 s.is_bonus,
 s.bonus_type,
 s.description_en,
 s.description_jp
FROM public.course_sessions s WHERE public.session_course_id(s.id) IS NOT NULL AND
 (public.course_is_published(public.session_course_id(s.id)) OR public.can_read_course_materials(public.session_course_id(s.id)));
CREATE OR REPLACE VIEW public.course_assignment_catalog WITH (security_barrier = true) AS SELECT
 a.id, a.week_id, a.sort_order, a.title_en, a.title_jp,
 CASE WHEN public.can_read_course_materials(w.course_id) THEN a.description_en ELSE '' END AS description_en,
 CASE WHEN public.can_read_course_materials(w.course_id) THEN a.description_jp ELSE NULL END AS description_jp,
 a.assignment_type, a.due_date, a.created_at
 FROM public.course_assignments a JOIN public.course_weeks w ON w.id = a.week_id
 WHERE public.course_is_published(w.course_id) OR public.can_read_course_materials(w.course_id);
CREATE OR REPLACE VIEW public.course_resource_catalog WITH (security_barrier = true) AS SELECT
 r.id, r.week_id, r.session_id,
 CASE WHEN public.can_read_course_resource(r.week_id,r.session_id,r.is_public) THEN r.content_item_id ELSE NULL END AS content_item_id,
 r.sort_order, r.title_en, r.title_jp,
 CASE WHEN public.can_read_course_resource(r.week_id,r.session_id,r.is_public) THEN r.url ELSE NULL END AS url,
 r.resource_type,
 CASE WHEN public.can_read_course_resource(r.week_id,r.session_id,r.is_public) THEN r.description_en ELSE NULL END AS description_en,
 CASE WHEN public.can_read_course_resource(r.week_id,r.session_id,r.is_public) THEN r.description_jp ELSE NULL END AS description_jp,
 r.is_public, r.created_at, public.resource_course_id(r.week_id,r.session_id) AS course_id
 FROM public.course_resources r WHERE public.resource_course_id(r.week_id,r.session_id) IS NOT NULL AND (
 public.course_is_published(public.resource_course_id(r.week_id,r.session_id)) OR
 public.can_read_course_materials(public.resource_course_id(r.week_id,r.session_id)));

REVOKE ALL ON public.course_catalog, public.course_session_catalog, public.course_assignment_catalog, public.course_resource_catalog FROM PUBLIC, anon, authenticated;
GRANT SELECT ON public.course_catalog, public.course_session_catalog, public.course_assignment_catalog, public.course_resource_catalog TO anon, authenticated, service_role;

REVOKE ALL ON FUNCTION public.can_manage_course(uuid) FROM PUBLIC;
GRANT EXECUTE ON FUNCTION public.can_manage_course(uuid) TO anon, authenticated, service_role;
REVOKE ALL ON FUNCTION public.can_read_course_materials(uuid) FROM PUBLIC;
GRANT EXECUTE ON FUNCTION public.can_read_course_materials(uuid) TO anon, authenticated, service_role;
REVOKE ALL ON FUNCTION public.course_is_published(uuid) FROM PUBLIC;
GRANT EXECUTE ON FUNCTION public.course_is_published(uuid) TO anon, authenticated, service_role;
REVOKE ALL ON FUNCTION public.session_course_id(uuid) FROM PUBLIC;
GRANT EXECUTE ON FUNCTION public.session_course_id(uuid) TO anon, authenticated, service_role;
REVOKE ALL ON FUNCTION public.can_read_session_materials(uuid) FROM PUBLIC;
GRANT EXECUTE ON FUNCTION public.can_read_session_materials(uuid) TO anon, authenticated, service_role;
REVOKE ALL ON FUNCTION public.resource_course_id(uuid,uuid) FROM PUBLIC;
GRANT EXECUTE ON FUNCTION public.resource_course_id(uuid,uuid) TO anon, authenticated, service_role;
REVOKE ALL ON FUNCTION public.can_read_course_resource(uuid,uuid,boolean) FROM PUBLIC;
GRANT EXECUTE ON FUNCTION public.can_read_course_resource(uuid,uuid,boolean) TO anon, authenticated, service_role;
REVOKE ALL ON FUNCTION public.can_access_course_esl(uuid), public.can_read_esl_lesson(uuid) FROM PUBLIC;
GRANT EXECUTE ON FUNCTION public.can_access_course_esl(uuid), public.can_read_esl_lesson(uuid) TO anon, authenticated, service_role;

-- lib/esl/audio-access.ts signs with the caller's client (createSignedUrls),
-- which needs a SELECT policy on storage.objects; a public bucket does not
-- help with signing. Added here (not in 086) so the Slice E code can sign
-- between the deploy and 086. Visibility-only: entitled users can sign/list
-- their own lesson's objects; pre-E code never signs.
DROP POLICY IF EXISTS esl_audio_storage_entitled_read ON storage.objects;
CREATE POLICY esl_audio_storage_entitled_read ON storage.objects FOR SELECT TO authenticated USING (
 bucket_id = 'esl-audio' AND EXISTS (SELECT 1 FROM public.esl_audio a JOIN public.esl_lessons l ON l.id = a.esl_lesson_id
   WHERE a.storage_path = storage.objects.name AND public.can_read_esl_lesson(l.id)
     AND split_part(a.storage_path, '/', 1) = l.course_id::text
     AND split_part(a.storage_path, '/', 2) = l.week_id::text));

NOTIFY pgrst, 'reload schema';
COMMIT;
