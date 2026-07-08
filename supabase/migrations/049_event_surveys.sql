-- ============================================================================
-- 049_event_surveys.sql — Pre-event surveys (admin-built, per public event)
-- ============================================================================
-- Extends the survey registry (022) to a generic, admin-authored survey
-- attached to a code-defined PUBLIC event (lib/events/public-events.ts).
-- Questions are DB-stored (survey_questions); answers are JSONB with a per-
-- response snapshot (event_survey_responses). Private delivery config lives in
-- an ADMIN-ONLY table (event_survey_settings) — presenter_email never touches
-- the un-RLS'd surveys table. The AI summary + delivery state get their own
-- admin-only tables. Responses CASCADE from event_rsvps so the existing
-- APPI/GDPR erasure (deleteEventRsvp) and the 048 90-day retention reach
-- survey PII automatically.
--
-- Apply MANUALLY in the Supabase dashboard SQL editor BEFORE deploying the code
-- that reads these tables (prod migrations are not run by the Vercel build).
-- Everything ships inactive (surveys.is_active defaults false on new rows).
-- ============================================================================

BEGIN;

-- ----------------------------------------------------------------------------
-- 1. Extend the survey registry. kind partitions event surveys from the legacy
--    'ai-essentials' course row. presenter_email is intentionally NOT here.
-- ----------------------------------------------------------------------------
ALTER TABLE public.surveys
  ADD COLUMN IF NOT EXISTS kind text NOT NULL DEFAULT 'course'
    CHECK (kind IN ('course', 'event')),
  ADD COLUMN IF NOT EXISTS event_slug text,
  ADD COLUMN IF NOT EXISTS intro_en text,
  ADD COLUMN IF NOT EXISTS intro_jp text;

-- Event rows must carry a slug; course rows must not. (Guarded for re-runs.)
DO $$
BEGIN
  IF NOT EXISTS (SELECT 1 FROM pg_constraint WHERE conname = 'surveys_kind_event_slug_ck') THEN
    ALTER TABLE public.surveys
      ADD CONSTRAINT surveys_kind_event_slug_ck
      CHECK ((kind = 'event' AND event_slug IS NOT NULL)
          OR (kind = 'course' AND event_slug IS NULL));
  END IF;
END $$;

-- One event survey per event.
CREATE UNIQUE INDEX IF NOT EXISTS uq_surveys_event_slug
  ON public.surveys (event_slug) WHERE event_slug IS NOT NULL;

-- ----------------------------------------------------------------------------
-- 2. Question manifest. Stored answer keys are option.value (never labels).
-- ----------------------------------------------------------------------------
CREATE TABLE IF NOT EXISTS public.survey_questions (
  id          uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  survey_id   uuid NOT NULL REFERENCES public.surveys(id) ON DELETE CASCADE,
  position    integer NOT NULL DEFAULT 0 CHECK (position >= 0),
  qtype       text NOT NULL CHECK (qtype IN ('single', 'multi', 'text')),
  prompt_en   text NOT NULL,
  prompt_jp   text NOT NULL,
  help_en     text,
  help_jp     text,
  options     jsonb NOT NULL DEFAULT '[]'::jsonb CHECK (jsonb_typeof(options) = 'array'),
  required    boolean NOT NULL DEFAULT true,
  max_select  integer CHECK (max_select IS NULL OR max_select >= 1),
  created_at  timestamptz NOT NULL DEFAULT now(),
  updated_at  timestamptz NOT NULL DEFAULT now()
);

CREATE INDEX IF NOT EXISTS idx_survey_questions_survey_pos
  ON public.survey_questions (survey_id, position);

ALTER TABLE public.survey_questions ENABLE ROW LEVEL SECURITY;
-- Admin-only. The public form and admin builder both read via the service role.
CREATE POLICY "survey_questions_admin_all" ON public.survey_questions
  FOR ALL USING (public.is_admin()) WITH CHECK (public.is_admin());

-- Atomic, validated reorder. Rejects partial/duplicate/foreign id sets.
CREATE OR REPLACE FUNCTION public.reorder_survey_questions(p_survey_id uuid, p_ids uuid[])
RETURNS void
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = ''
AS $$
DECLARE
  n_total int;
  n_match int;
BEGIN
  SELECT pg_catalog.count(*) INTO n_total
    FROM public.survey_questions WHERE survey_id = p_survey_id;
  SELECT pg_catalog.count(*) INTO n_match
    FROM public.survey_questions
    WHERE survey_id = p_survey_id AND id = ANY(p_ids);

  -- Provided set must be exactly this survey's questions (no missing/extra/dup).
  IF n_total <> pg_catalog.array_length(p_ids, 1) OR n_match <> n_total THEN
    RAISE EXCEPTION 'reorder id set does not match survey %', p_survey_id;
  END IF;

  UPDATE public.survey_questions q
    SET position = t.ord - 1, updated_at = pg_catalog.now()
    FROM pg_catalog.unnest(p_ids) WITH ORDINALITY AS t(qid, ord)
    WHERE q.id = t.qid AND q.survey_id = p_survey_id;
END;
$$;

REVOKE ALL ON FUNCTION public.reorder_survey_questions(uuid, uuid[])
  FROM PUBLIC, anon, authenticated;
GRANT EXECUTE ON FUNCTION public.reorder_survey_questions(uuid, uuid[]) TO service_role;

-- ----------------------------------------------------------------------------
-- 3. Generic JSONB answers + per-response snapshot. rsvp_id CASCADEs so erasure
--    and retention remove survey PII. No email/event_slug duplication.
-- ----------------------------------------------------------------------------
CREATE TABLE IF NOT EXISTS public.event_survey_responses (
  id              uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  survey_id       uuid NOT NULL REFERENCES public.surveys(id) ON DELETE CASCADE,
  rsvp_id         uuid NOT NULL REFERENCES public.event_rsvps(id) ON DELETE CASCADE,
  locale          text NOT NULL DEFAULT 'en' CHECK (locale IN ('en', 'ja')),
  -- { question_id: string | string[] } — values are option.value / free text.
  answers         jsonb NOT NULL DEFAULT '{}'::jsonb,
  -- [{ question_id, prompt_en, prompt_jp, qtype, selected:[{value,label_en,label_jp}] | text }]
  -- captured at submit time so meaning survives later question edits.
  answer_snapshot jsonb NOT NULL DEFAULT '[]'::jsonb,
  submitted_at    timestamptz NOT NULL DEFAULT now(),
  updated_at      timestamptz NOT NULL DEFAULT now()
);

CREATE UNIQUE INDEX IF NOT EXISTS uq_event_survey_responses_survey_rsvp
  ON public.event_survey_responses (survey_id, rsvp_id);
CREATE INDEX IF NOT EXISTS idx_event_survey_responses_rsvp
  ON public.event_survey_responses (rsvp_id);

ALTER TABLE public.event_survey_responses ENABLE ROW LEVEL SECURITY;
CREATE POLICY "event_survey_responses_admin_all" ON public.event_survey_responses
  FOR ALL USING (public.is_admin()) WITH CHECK (public.is_admin());

-- ----------------------------------------------------------------------------
-- 4. Private delivery config + lifecycle window. Admin-only — keeps the
--    presenter address off any potentially public surface.
-- ----------------------------------------------------------------------------
CREATE TABLE IF NOT EXISTS public.event_survey_settings (
  survey_id        uuid PRIMARY KEY REFERENCES public.surveys(id) ON DELETE CASCADE,
  presenter_email  text,
  presenter_locale text NOT NULL DEFAULT 'en' CHECK (presenter_locale IN ('en', 'ja')),
  opens_at         timestamptz,
  closes_at        timestamptz,
  created_at       timestamptz NOT NULL DEFAULT now(),
  updated_at       timestamptz NOT NULL DEFAULT now()
);

ALTER TABLE public.event_survey_settings ENABLE ROW LEVEL SECURITY;
CREATE POLICY "event_survey_settings_admin_all" ON public.event_survey_settings
  FOR ALL USING (public.is_admin()) WITH CHECK (public.is_admin());

-- ----------------------------------------------------------------------------
-- 5. AI summary (admin-only). Dedicated table avoids the course-specific
--    survey_summaries column remap; schema_version allows safe evolution.
-- ----------------------------------------------------------------------------
CREATE TABLE IF NOT EXISTS public.event_survey_summaries (
  survey_id      uuid PRIMARY KEY REFERENCES public.surveys(id) ON DELETE CASCADE,
  schema_version integer NOT NULL DEFAULT 1,
  -- { summary_text, key_takeaways[], focus_topics, presenter_prep_notes }
  content        jsonb NOT NULL DEFAULT '{}'::jsonb,
  stats          jsonb NOT NULL DEFAULT '{}'::jsonb,
  response_count integer NOT NULL DEFAULT 0,
  generated_at   timestamptz NOT NULL DEFAULT now()
);

ALTER TABLE public.event_survey_summaries ENABLE ROW LEVEL SECURITY;
CREATE POLICY "event_survey_summaries_admin_all" ON public.event_survey_summaries
  FOR ALL USING (public.is_admin()) WITH CHECK (public.is_admin());

-- ----------------------------------------------------------------------------
-- 6. Presenter-summary delivery state (admin-only). One row per survey, keyed
--    by stable survey_id (survives slug reuse). sent_at is set only on a
--    provider-accepted send, so status is truthful and retryable.
-- ----------------------------------------------------------------------------
CREATE TABLE IF NOT EXISTS public.event_presenter_summary_delivery (
  survey_id           uuid PRIMARY KEY REFERENCES public.surveys(id) ON DELETE CASCADE,
  status              text NOT NULL DEFAULT 'pending'
                        CHECK (status IN ('pending', 'sending', 'sent', 'failed')),
  attempt_count       integer NOT NULL DEFAULT 0,
  last_attempt_at     timestamptz,
  sent_at             timestamptz,
  provider_message_id text,
  last_error          text,
  last_via            text CHECK (last_via IN ('manual', 'cron')),
  recipient_to        text,
  recipient_cc        text[],
  updated_at          timestamptz NOT NULL DEFAULT now()
);

ALTER TABLE public.event_presenter_summary_delivery ENABLE ROW LEVEL SECURITY;
CREATE POLICY "event_presenter_summary_delivery_admin_all"
  ON public.event_presenter_summary_delivery
  FOR ALL USING (public.is_admin()) WITH CHECK (public.is_admin());

COMMIT;

-- ----------------------------------------------------------------------------
-- Post-migration verification (run as anon / ordinary authenticated; all must
-- be denied or empty):
--   select presenter_email from public.event_survey_settings;        -- 0 rows / denied
--   select * from public.event_survey_responses;                     -- 0 rows / denied
--   select * from public.event_survey_summaries;                     -- 0 rows / denied
--   select * from public.event_presenter_summary_delivery;           -- 0 rows / denied
-- Also audit anon grants on legacy public.surveys / public.survey_summaries.
-- ----------------------------------------------------------------------------
