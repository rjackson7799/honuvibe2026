-- ============================================================================
-- 050_course_surveys.sql — Admin-built surveys bound to a COURSE, assigned to
-- enrolled students (generalizes the AI-Essentials path; that legacy survey is
-- left untouched). Mirrors the event-survey design (049): generic
-- survey_questions manifest + JSONB answers, a dedicated summary table, and a
-- truthful delivery-state row. Per-student identity reuses survey_assignments.
--
-- Apply MANUALLY in the Supabase dashboard SQL editor BEFORE deploying code
-- that reads these tables. Everything ships inactive (surveys.is_active=false
-- on new rows).
-- ============================================================================

BEGIN;

-- ----------------------------------------------------------------------------
-- 1. Bind a survey to a course. Nullable — the legacy ai-essentials row has no
--    course_id. The existing kind/event_slug CHECK (049) still holds (course
--    surveys keep event_slug NULL). One survey per course.
-- ----------------------------------------------------------------------------
ALTER TABLE public.surveys
  ADD COLUMN IF NOT EXISTS course_id uuid REFERENCES public.courses(id) ON DELETE SET NULL;

CREATE UNIQUE INDEX IF NOT EXISTS uq_surveys_course_id
  ON public.surveys (course_id) WHERE course_id IS NOT NULL;

-- ----------------------------------------------------------------------------
-- 2. Generic JSONB answers + per-response snapshot. Per-student identity
--    (user_id + assignment_id). CASCADE on user delete covers erasure.
-- ----------------------------------------------------------------------------
CREATE TABLE IF NOT EXISTS public.course_survey_responses (
  id              uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  survey_id       uuid NOT NULL REFERENCES public.surveys(id) ON DELETE CASCADE,
  user_id         uuid NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  assignment_id   uuid REFERENCES public.survey_assignments(id) ON DELETE SET NULL,
  locale          text NOT NULL DEFAULT 'en' CHECK (locale IN ('en', 'ja')),
  answers         jsonb NOT NULL DEFAULT '{}'::jsonb,
  answer_snapshot jsonb NOT NULL DEFAULT '[]'::jsonb,
  submitted_at    timestamptz NOT NULL DEFAULT now(),
  updated_at      timestamptz NOT NULL DEFAULT now()
);

CREATE UNIQUE INDEX IF NOT EXISTS uq_course_survey_responses_survey_user
  ON public.course_survey_responses (survey_id, user_id);
CREATE INDEX IF NOT EXISTS idx_course_survey_responses_user
  ON public.course_survey_responses (user_id);

ALTER TABLE public.course_survey_responses ENABLE ROW LEVEL SECURITY;
CREATE POLICY "course_survey_responses_admin_all" ON public.course_survey_responses
  FOR ALL USING (public.is_admin()) WITH CHECK (public.is_admin());

-- ----------------------------------------------------------------------------
-- 3. Private settings + lifecycle window (admin-only).
-- ----------------------------------------------------------------------------
CREATE TABLE IF NOT EXISTS public.course_survey_settings (
  survey_id               uuid PRIMARY KEY REFERENCES public.surveys(id) ON DELETE CASCADE,
  generate_student_profile boolean NOT NULL DEFAULT false,
  opens_at                timestamptz,
  closes_at               timestamptz,
  created_at              timestamptz NOT NULL DEFAULT now(),
  updated_at              timestamptz NOT NULL DEFAULT now()
);

ALTER TABLE public.course_survey_settings ENABLE ROW LEVEL SECURITY;
CREATE POLICY "course_survey_settings_admin_all" ON public.course_survey_settings
  FOR ALL USING (public.is_admin()) WITH CHECK (public.is_admin());

-- ----------------------------------------------------------------------------
-- 4. Instructor-facing AI summary (admin-only, dedicated — generic content).
-- ----------------------------------------------------------------------------
CREATE TABLE IF NOT EXISTS public.course_survey_summaries (
  survey_id      uuid PRIMARY KEY REFERENCES public.surveys(id) ON DELETE CASCADE,
  schema_version integer NOT NULL DEFAULT 1,
  -- { summary_text, key_takeaways[], teaching_focus, instructor_notes }
  content        jsonb NOT NULL DEFAULT '{}'::jsonb,
  stats          jsonb NOT NULL DEFAULT '{}'::jsonb,
  response_count integer NOT NULL DEFAULT 0,
  generated_at   timestamptz NOT NULL DEFAULT now()
);

ALTER TABLE public.course_survey_summaries ENABLE ROW LEVEL SECURITY;
CREATE POLICY "course_survey_summaries_admin_all" ON public.course_survey_summaries
  FOR ALL USING (public.is_admin()) WITH CHECK (public.is_admin());

-- ----------------------------------------------------------------------------
-- 5. Summary delivery state (admin-only). To = course instructors. sent_at set
--    only on a provider-accepted send, so status is truthful and retryable.
-- ----------------------------------------------------------------------------
CREATE TABLE IF NOT EXISTS public.course_survey_summary_delivery (
  survey_id           uuid PRIMARY KEY REFERENCES public.surveys(id) ON DELETE CASCADE,
  status              text NOT NULL DEFAULT 'pending'
                        CHECK (status IN ('pending', 'sending', 'sent', 'failed')),
  attempt_count       integer NOT NULL DEFAULT 0,
  last_attempt_at     timestamptz,
  sent_at             timestamptz,
  provider_message_id text,
  last_error          text,
  last_via            text CHECK (last_via IN ('manual', 'cron')),
  recipient_to        text[],
  recipient_cc        text[],
  updated_at          timestamptz NOT NULL DEFAULT now()
);

ALTER TABLE public.course_survey_summary_delivery ENABLE ROW LEVEL SECURITY;
CREATE POLICY "course_survey_summary_delivery_admin_all"
  ON public.course_survey_summary_delivery
  FOR ALL USING (public.is_admin()) WITH CHECK (public.is_admin());

COMMIT;

-- ----------------------------------------------------------------------------
-- Verification (run as anon / ordinary authenticated; all must be denied/empty):
--   select * from public.course_survey_responses;          -- denied / 0 rows
--   select * from public.course_survey_settings;           -- denied / 0 rows
--   select * from public.course_survey_summaries;          -- denied / 0 rows
--   select * from public.course_survey_summary_delivery;   -- denied / 0 rows
-- ----------------------------------------------------------------------------
