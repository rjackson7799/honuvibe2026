-- ============================================================================
-- 058_tutoring_multi_teacher.sql — instructor-scoped RLS for 1v1 engagements
-- ============================================================================
-- See docs/plans/2026-07-09-tutoring-multi-teacher.md (Phase 1, Changes §2).
--
-- Today session_reports / session_report_private / student_patterns (052) are
-- admin-only via is_admin(). This migration adds SELECT-only policies so an
-- ASSIGNED instructor (linked via the existing course_instructors join table,
-- 015_multi_instructor.sql) can read their own 1v1 engagements' data. All
-- tutoring WRITES already go through createAdminClient() (service role) after
-- a code-level gate (lib/tutoring/actions.ts, every app/api/tutoring/* route)
-- — see plan §9 — so this migration is deliberately additive and SELECT-only.
-- No instructor write policies are added; don't add policies nothing uses.
-- A later task in the same plan wires the code-level access gate
-- (lib/tutoring/auth.ts) on top of this.
--
-- Apply MANUALLY in the Supabase dashboard SQL editor on zvfwtndbxshrtpwcwynw
-- BEFORE deploying code that assigns/reads teacher-scoped data — the Vercel
-- deploy does not run migrations. Additive-policy-only: old code + new schema
-- is a no-op (nobody has course_instructors rows yet outside admin-created
-- ones), so this is safe to apply ahead of the deploy.
-- ============================================================================

BEGIN;

-- ----------------------------------------------------------------------------
-- 1. is_instructor_for_course(course_id) — SECURITY DEFINER STABLE, mirrors
--    is_admin() (001_phase2_schema.sql:525, hardened against RLS recursion by
--    002_fix_rls_circular_ref.sql) and is_partner_for() (029_partners.sql:75).
--    Bypasses RLS on course_instructors/instructor_profiles so the check works
--    regardless of the caller's own visibility into those tables.
-- ----------------------------------------------------------------------------
CREATE OR REPLACE FUNCTION public.is_instructor_for_course(p_course_id uuid)
RETURNS boolean
LANGUAGE sql STABLE SECURITY DEFINER SET search_path = public
AS $$
  SELECT EXISTS (
    SELECT 1
    FROM public.course_instructors ci
    JOIN public.instructor_profiles ip ON ip.id = ci.instructor_id
    WHERE ci.course_id = p_course_id
      AND ip.user_id = auth.uid()
  );
$$;
-- No REVOKE: policy-helper functions must stay executable by every role that
-- can query the tables whose policies call them (anon + authenticated), or
-- those queries error with "permission denied for function" instead of
-- filtering rows. Same treatment as is_admin() (001/002), is_partner_for()
-- (029), is_event_invitee() (044). Security lives in the auth.uid() gate
-- inside the function (false for anon), not in the ACL. The REVOKE-then-GRANT
-- pattern in 048/057 is for RPC-only functions with a single caller — a
-- different category.

-- ----------------------------------------------------------------------------
-- 2. is_instructor_of_student(student_id) — SECURITY DEFINER STABLE.
--
--    Investigation (per plan §2 / task brief): a naive `users` policy would
--    write its EXISTS(...) subquery directly against enrollments/courses.
--    That subquery is NOT wrapped in a SECURITY DEFINER function, so unlike
--    is_instructor_for_course() above it does NOT bypass RLS — it runs as the
--    calling instructor and is itself filtered by enrollments' and courses'
--    own policies.
--
--    Tracing it through: this migration's own "enrollments_1v1_instructor_read"
--    policy (below) already grants the assigned instructor SELECT on that
--    enrollment row (is_instructor_for_course() is DEFINER-safe there), and
--    courses_public_read (001:546) grants read on the joined course row
--    because 1v1 engagements are created with is_published = true
--    (lib/tutoring/actions.ts:91). So the naive version is NOT circular (no
--    cycle back through public.users — enrollments/courses never reference
--    it) and would in fact work today.
--
--    We still isolate the check in its own SECURITY DEFINER helper rather than
--    depend on that chain, for the same reason 029_partners.sql:75 wraps
--    is_partner_for() instead of inlining a raw EXISTS on partner_admins into
--    the `partners`/`partner_courses` policies: it decouples the `users`
--    policy from the *current* shape/ordering of enrollments' and courses'
--    other policies (e.g. a future change to courses_public_read's USING
--    clause, or to is_published defaults, would otherwise silently change who
--    can read student user rows). SECURITY DEFINER here also means one
--    consistent evaluation path independent of RLS on either joined table.
-- ----------------------------------------------------------------------------
CREATE OR REPLACE FUNCTION public.is_instructor_of_student(p_student_id uuid)
RETURNS boolean
LANGUAGE sql STABLE SECURITY DEFINER SET search_path = public
AS $$
  SELECT EXISTS (
    SELECT 1
    FROM public.enrollments e
    JOIN public.courses c ON c.id = e.course_id
    JOIN public.course_instructors ci ON ci.course_id = e.course_id
    JOIN public.instructor_profiles ip ON ip.id = ci.instructor_id
    WHERE e.user_id = p_student_id
      AND e.status = 'active'
      AND c.course_type = '1v1'
      AND ip.user_id = auth.uid()
  );
$$;
-- No REVOKE — same policy-helper rationale as is_instructor_for_course() above.

-- ----------------------------------------------------------------------------
-- 3. SELECT-only instructor policies (report pipeline, 052_tutoring_1v1.sql).
-- ----------------------------------------------------------------------------
CREATE POLICY "session_reports_instructor_read" ON public.session_reports
  FOR SELECT USING (public.is_instructor_for_course(course_id));

CREATE POLICY "session_report_private_instructor_read" ON public.session_report_private
  FOR SELECT USING (EXISTS (
    SELECT 1 FROM public.session_reports sr
    WHERE sr.id = session_report_private.report_id
      AND public.is_instructor_for_course(sr.course_id)
  ));

CREATE POLICY "student_patterns_instructor_read" ON public.student_patterns
  FOR SELECT USING (public.is_instructor_for_course(course_id));

-- ----------------------------------------------------------------------------
-- 4. enrollments — scoped to 1v1 only: a cohort instructor gains nothing here.
-- ----------------------------------------------------------------------------
CREATE POLICY "enrollments_1v1_instructor_read" ON public.enrollments
  FOR SELECT USING (
    public.is_instructor_for_course(course_id)
    AND EXISTS (SELECT 1 FROM public.courses c
                WHERE c.id = enrollments.course_id AND c.course_type = '1v1')
  );

-- ----------------------------------------------------------------------------
-- 5. users — teachers may read the users row of students actively enrolled in
--    THEIR 1v1 engagements (needed for the users!inner joins in
--    lib/tutoring/queries.ts). NOTE: row-level, not column-level — this
--    exposes the whole row, accepted for Phase 1 (see plan Risks). See the
--    is_instructor_of_student() comment above for why this is a helper call
--    rather than an inline join.
-- ----------------------------------------------------------------------------
CREATE POLICY "users_1v1_instructor_read" ON public.users
  FOR SELECT USING (public.is_instructor_of_student(id));

COMMIT;

-- ----------------------------------------------------------------------------
-- Verification (run as an authenticated instructor with no course_instructors
-- row; all must be denied/empty — proves this migration widens nothing for an
-- unassigned instructor, a student, or anon):
--   select * from public.session_reports;         -- 0 rows (unassigned)
--   select * from public.session_report_private;  -- 0 rows
--   select * from public.student_patterns;        -- 0 rows
--   select * from public.enrollments;              -- 0 rows
-- ----------------------------------------------------------------------------
