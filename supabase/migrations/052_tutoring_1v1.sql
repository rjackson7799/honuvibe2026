-- ============================================================================
-- 052_tutoring_1v1.sql — Premium 1v1 tutoring "session companion" (Shiori pilot)
-- See docs/plans/2026-07-05-1v1-session-companion.md
--
-- The engagement itself is modelled as a private courses row
-- (course_type='1v1', is_private=true, max_enrollment=1) so it inherits
-- enrollment, dashboard, CourseHub, and the course-survey diagnostic with zero
-- survey/enrollment code changes. This migration adds only the report pipeline.
--
-- Privacy design (mirrors 041_vault_access_boundary):
--   Postgres RLS is row-level, not column-level. Instructor-only content
--   (homework answer keys, candid analysis, raw transcript path) therefore
--   CANNOT live on a student-readable row. One Claude generation is split into
--   student_json (session_reports, student-readable when published) and
--   instructor_json (session_report_private, admin-only RLS, NO student policy).
--
-- Apply MANUALLY in the Supabase dashboard SQL editor on zvfwtndbxshrtpwcwynw
-- BEFORE deploying code that reads these tables — the Vercel deploy does not
-- run migrations.
-- ============================================================================

BEGIN;

-- ----------------------------------------------------------------------------
-- 1. Widen course_type to include '1v1'
--    (001_phase2_schema.sql:52 auto-named the inline CHECK courses_course_type_check)
-- ----------------------------------------------------------------------------
ALTER TABLE public.courses DROP CONSTRAINT IF EXISTS courses_course_type_check;
ALTER TABLE public.courses ADD CONSTRAINT courses_course_type_check
  CHECK (course_type IN ('cohort', 'self-study', '1v1'));

-- ----------------------------------------------------------------------------
-- 2. session_reports — student-safe parent row.
--    Deliberately NOT unique on (course_id, student_id, session_date):
--    two sessions in one day are possible.
-- ----------------------------------------------------------------------------
CREATE TABLE IF NOT EXISTS public.session_reports (
  id                  uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  course_id           uuid NOT NULL REFERENCES public.courses(id) ON DELETE CASCADE,
  student_id          uuid NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  session_date        date NOT NULL,
  topic               text,
  duration_minutes    integer,
  status              text NOT NULL DEFAULT 'generating'
                        CHECK (status IN ('generating', 'review', 'published', 'failed')),
  student_json        jsonb,
  published_at        timestamptz,
  patterns_applied_at timestamptz,
  created_by          uuid REFERENCES auth.users(id) ON DELETE SET NULL,
  created_at          timestamptz NOT NULL DEFAULT now(),
  updated_at          timestamptz NOT NULL DEFAULT now()
);

CREATE INDEX IF NOT EXISTS idx_session_reports_course_date
  ON public.session_reports (course_id, session_date DESC);
CREATE INDEX IF NOT EXISTS idx_session_reports_student_status
  ON public.session_reports (student_id, status);

ALTER TABLE public.session_reports ENABLE ROW LEVEL SECURITY;

-- Student: read own PUBLISHED reports only. Never review/generating/failed.
CREATE POLICY "session_reports_student_read" ON public.session_reports
  FOR SELECT USING (
    status = 'published' AND student_id = auth.uid()
  );

-- Admin: full access.
CREATE POLICY "session_reports_admin_all" ON public.session_reports
  FOR ALL USING (public.is_admin()) WITH CHECK (public.is_admin());

-- ----------------------------------------------------------------------------
-- 3. session_report_private — instructor-only child (PK = report_id).
--    Admin-only RLS, NO student policy: the structural instructor-content
--    boundary. Holds the raw transcript bucket path, margin notes, the full
--    instructor_json (with answer keys + candid analysis), and generation meta.
-- ----------------------------------------------------------------------------
CREATE TABLE IF NOT EXISTS public.session_report_private (
  report_id        uuid PRIMARY KEY REFERENCES public.session_reports(id) ON DELETE CASCADE,
  transcript_ref   text,
  margin_notes     text,
  instructor_json  jsonb,
  generation_error text,
  model_id         text,
  reviewed_by      uuid REFERENCES auth.users(id) ON DELETE SET NULL,
  reviewed_at      timestamptz,
  updated_at       timestamptz NOT NULL DEFAULT now()
);

ALTER TABLE public.session_report_private ENABLE ROW LEVEL SECURITY;
CREATE POLICY "session_report_private_admin_all" ON public.session_report_private
  FOR ALL USING (public.is_admin()) WITH CHECK (public.is_admin());

-- ----------------------------------------------------------------------------
-- 4. student_patterns — longitudinal per-student accumulator (admin-only).
--    One row per (course, student, category). examples keeps the last 3
--    {quote, correction, session_date} entries. Claude NEVER writes this table;
--    it is upserted deterministically at publish (see lib/tutoring/patterns.ts).
-- ----------------------------------------------------------------------------
CREATE TABLE IF NOT EXISTS public.student_patterns (
  id               uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  course_id        uuid NOT NULL REFERENCES public.courses(id) ON DELETE CASCADE,
  student_id       uuid NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  category         text NOT NULL,
  label_en         text,
  label_jp         text,
  occurrence_count integer NOT NULL DEFAULT 0,
  last_seen_on     date,
  examples         jsonb NOT NULL DEFAULT '[]'::jsonb,
  created_at       timestamptz NOT NULL DEFAULT now(),
  updated_at       timestamptz NOT NULL DEFAULT now(),
  UNIQUE (course_id, student_id, category)
);

CREATE INDEX IF NOT EXISTS idx_student_patterns_course_student
  ON public.student_patterns (course_id, student_id);

ALTER TABLE public.student_patterns ENABLE ROW LEVEL SECURITY;
CREATE POLICY "student_patterns_admin_all" ON public.student_patterns
  FOR ALL USING (public.is_admin()) WITH CHECK (public.is_admin());

-- ----------------------------------------------------------------------------
-- 5. Storage: tutoring-private bucket for raw transcripts.
--    public=false + NO SELECT policy = no client reads. Admins can manage;
--    the app reads only via service-role signed URLs (bypasses RLS).
--    Path convention: {course_id}/{report_id}/transcript.txt
-- ----------------------------------------------------------------------------
INSERT INTO storage.buckets (id, name, public)
VALUES ('tutoring-private', 'tutoring-private', false)
ON CONFLICT (id) DO NOTHING;

CREATE POLICY "tutoring_private_admin_write"
  ON storage.objects FOR INSERT
  WITH CHECK (bucket_id = 'tutoring-private' AND public.is_admin());

CREATE POLICY "tutoring_private_admin_update"
  ON storage.objects FOR UPDATE
  USING (bucket_id = 'tutoring-private' AND public.is_admin())
  WITH CHECK (bucket_id = 'tutoring-private' AND public.is_admin());

CREATE POLICY "tutoring_private_admin_delete"
  ON storage.objects FOR DELETE
  USING (bucket_id = 'tutoring-private' AND public.is_admin());

COMMIT;

-- ----------------------------------------------------------------------------
-- Verification (run as anon / ordinary authenticated; all must be denied/empty):
--   select * from public.session_reports;         -- only own published rows
--   select * from public.session_report_private;  -- denied / 0 rows
--   select * from public.student_patterns;        -- denied / 0 rows
-- ----------------------------------------------------------------------------
