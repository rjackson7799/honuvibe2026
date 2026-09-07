-- 076_business_upgrade_plans.sql
-- Business Upgrade Plans foundation. Apply before deploying dependent code.
-- Review-time production base: migrations 067 + 074; 068-073 pending and 075 reserved/applied separately.
-- Reconfirm the live ledger and rename this migration if 076 is occupied.

ALTER TABLE public.site_settings
  ADD COLUMN IF NOT EXISTS business_upgrades_enabled boolean NOT NULL DEFAULT false;

CREATE TABLE public.business_upgrade_profiles (
  user_id uuid PRIMARY KEY REFERENCES public.users(id) ON DELETE CASCADE,
  business_name text CHECK (business_name IS NULL OR char_length(business_name) BETWEEN 1 AND 160),
  work_model_code text NOT NULL CHECK (work_model_code IN ('small_business','solopreneur','employed_professional','team_leader')),
  industry_code text CHECK (industry_code IS NULL OR industry_code IN ('professional_services','retail_ecommerce','hospitality','health_wellness','real_estate','creative','technology','other')),
  offer_summary text CHECK (offer_summary IS NULL OR char_length(offer_summary) BETWEEN 1 AND 600),
  customer_summary text CHECK (customer_summary IS NULL OR char_length(customer_summary) BETWEEN 1 AND 600),
  primary_goal_code text NOT NULL CHECK (primary_goal_code IN ('increase_revenue','save_time','improve_customer_experience','build_visibility','strengthen_career')),
  ai_confidence text NOT NULL CHECK (ai_confidence IN ('beginner','comfortable','advanced')),
  weekly_time_minutes integer NOT NULL CHECK (weekly_time_minutes BETWEEN 15 AND 1200),
  current_tools text[] NOT NULL DEFAULT '{}',
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now(),
  CHECK (cardinality(current_tools) <= 20)
);

CREATE TABLE public.business_upgrade_assessments (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id uuid NOT NULL REFERENCES public.users(id) ON DELETE CASCADE,
  assessment_version integer NOT NULL DEFAULT 1 CHECK (assessment_version > 0),
  locale text NOT NULL CHECK (locale IN ('en','ja')),
  goal_code text NOT NULL CHECK (goal_code IN ('increase_revenue','save_time','improve_customer_experience','build_visibility','strengthen_career')),
  work_model_code text NOT NULL CHECK (work_model_code IN ('small_business','solopreneur','employed_professional','team_leader')),
  industry_code text CHECK (industry_code IS NULL OR industry_code IN ('professional_services','retail_ecommerce','hospitality','health_wellness','real_estate','creative','technology','other')),
  ai_confidence text NOT NULL CHECK (ai_confidence IN ('beginner','comfortable','advanced')),
  weekly_time_minutes integer NOT NULL CHECK (weekly_time_minutes BETWEEN 15 AND 1200),
  current_tools text[] NOT NULL DEFAULT '{}',
  answer_snapshot jsonb NOT NULL DEFAULT '{}'::jsonb CHECK (jsonb_typeof(answer_snapshot) = 'object'),
  recommendation_engine_version text NOT NULL CHECK (char_length(recommendation_engine_version) BETWEEN 1 AND 40),
  created_at timestamptz NOT NULL DEFAULT now(),
  expires_at timestamptz NOT NULL DEFAULT (now() + interval '14 days'),
  CHECK (expires_at > created_at),
  CHECK (cardinality(current_tools) <= 20)
);

CREATE INDEX business_upgrade_assessments_user_created_idx
  ON public.business_upgrade_assessments(user_id, created_at DESC);

CREATE TABLE public.business_upgrade_projects (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  slug text NOT NULL UNIQUE CHECK (slug ~ '^[a-z0-9]+(-[a-z0-9]+)*$' AND char_length(slug) <= 100),
  title_en text NOT NULL CHECK (char_length(title_en) BETWEEN 1 AND 200),
  title_ja text NOT NULL CHECK (char_length(title_ja) BETWEEN 1 AND 200),
  description_en text NOT NULL CHECK (char_length(description_en) BETWEEN 1 AND 1000),
  description_ja text NOT NULL CHECK (char_length(description_ja) BETWEEN 1 AND 1000),
  outcome_en text NOT NULL CHECK (char_length(outcome_en) BETWEEN 1 AND 600),
  outcome_ja text NOT NULL CHECK (char_length(outcome_ja) BETWEEN 1 AND 600),
  deliverable_en text NOT NULL CHECK (char_length(deliverable_en) BETWEEN 1 AND 600),
  deliverable_ja text NOT NULL CHECK (char_length(deliverable_ja) BETWEEN 1 AND 600),
  metric_label_en text NOT NULL CHECK (char_length(metric_label_en) BETWEEN 1 AND 160),
  metric_label_ja text NOT NULL CHECK (char_length(metric_label_ja) BETWEEN 1 AND 160),
  metric_unit text NOT NULL CHECK (char_length(metric_unit) BETWEEN 1 AND 40),
  metric_value_type text NOT NULL CHECK (metric_value_type IN ('number','minutes','percentage','currency')),
  metric_min numeric NOT NULL DEFAULT 0,
  metric_max numeric NOT NULL DEFAULT 1000000,
  improvement_direction text NOT NULL CHECK (improvement_direction IN ('increase','decrease')),
  status text NOT NULL DEFAULT 'draft' CHECK (status IN ('draft','published','archived')),
  goal_codes text[] NOT NULL CHECK (cardinality(goal_codes) > 0 AND goal_codes <@ ARRAY['increase_revenue','save_time','improve_customer_experience','build_visibility','strengthen_career']::text[]),
  work_model_codes text[] CHECK (work_model_codes IS NULL OR work_model_codes <@ ARRAY['small_business','solopreneur','employed_professional','team_leader']::text[]),
  industry_codes text[] CHECK (industry_codes IS NULL OR industry_codes <@ ARRAY['professional_services','retail_ecommerce','hospitality','health_wellness','real_estate','creative','technology','other']::text[]),
  min_confidence text NOT NULL DEFAULT 'beginner' CHECK (min_confidence IN ('beginner','comfortable','advanced')),
  max_confidence text NOT NULL DEFAULT 'advanced' CHECK (max_confidence IN ('beginner','comfortable','advanced')),
  estimated_days integer NOT NULL CHECK (estimated_days BETWEEN 1 AND 90),
  total_minutes integer NOT NULL CHECK (total_minutes BETWEEN 15 AND 10000),
  template_version integer NOT NULL DEFAULT 1 CHECK (template_version > 0),
  featured boolean NOT NULL DEFAULT false,
  jp_needs_review boolean NOT NULL DEFAULT true,
  created_by uuid REFERENCES public.users(id) ON DELETE SET NULL,
  published_at timestamptz,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now(),
  CHECK (metric_min < metric_max)
);

CREATE INDEX business_upgrade_projects_status_idx ON public.business_upgrade_projects(status, featured DESC, slug);

CREATE TABLE public.business_upgrade_project_steps (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  project_id uuid NOT NULL REFERENCES public.business_upgrade_projects(id) ON DELETE CASCADE,
  sort_order integer NOT NULL CHECK (sort_order BETWEEN 1 AND 100),
  step_type text NOT NULL CHECK (step_type IN ('vault','workbench','action','measurement')),
  measurement_kind text CHECK (measurement_kind IS NULL OR measurement_kind IN ('baseline','result')),
  title_en text NOT NULL CHECK (char_length(title_en) BETWEEN 1 AND 200),
  title_ja text NOT NULL CHECK (char_length(title_ja) BETWEEN 1 AND 200),
  instructions_en text NOT NULL CHECK (char_length(instructions_en) BETWEEN 1 AND 4000),
  instructions_ja text NOT NULL CHECK (char_length(instructions_ja) BETWEEN 1 AND 4000),
  content_item_id uuid REFERENCES public.content_items(id) ON DELETE SET NULL,
  workbench_scenario_id uuid REFERENCES public.workbench_scenarios(id) ON DELETE SET NULL,
  estimated_minutes integer NOT NULL CHECK (estimated_minutes BETWEEN 1 AND 1440),
  required boolean NOT NULL DEFAULT true,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now(),
  UNIQUE (project_id, sort_order),
  CHECK (
    (step_type = 'vault' AND content_item_id IS NOT NULL AND workbench_scenario_id IS NULL AND measurement_kind IS NULL) OR
    (step_type = 'workbench' AND workbench_scenario_id IS NOT NULL AND content_item_id IS NULL AND measurement_kind IS NULL) OR
    (step_type = 'action' AND content_item_id IS NULL AND workbench_scenario_id IS NULL AND measurement_kind IS NULL) OR
    (step_type = 'measurement' AND content_item_id IS NULL AND workbench_scenario_id IS NULL AND measurement_kind IS NOT NULL)
  )
);

CREATE INDEX business_upgrade_project_steps_project_idx ON public.business_upgrade_project_steps(project_id, sort_order);

CREATE TABLE public.business_upgrade_recommendations (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  assessment_id uuid NOT NULL REFERENCES public.business_upgrade_assessments(id) ON DELETE CASCADE,
  project_id uuid NOT NULL REFERENCES public.business_upgrade_projects(id) ON DELETE RESTRICT,
  project_template_version integer NOT NULL CHECK (project_template_version > 0),
  rank integer NOT NULL CHECK (rank BETWEEN 1 AND 3),
  score integer NOT NULL CHECK (score BETWEEN 50 AND 100),
  reason_codes text[] NOT NULL CHECK (reason_codes <@ ARRAY['goal_match','work_model_match','industry_match','confidence_fit','time_fit']::text[]),
  recommendation_engine_version text NOT NULL CHECK (char_length(recommendation_engine_version) BETWEEN 1 AND 40),
  created_at timestamptz NOT NULL DEFAULT now(),
  expires_at timestamptz NOT NULL,
  UNIQUE (assessment_id, project_id),
  UNIQUE (assessment_id, rank),
  CHECK (expires_at > created_at)
);

CREATE TABLE public.business_upgrade_plans (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id uuid NOT NULL REFERENCES public.users(id) ON DELETE CASCADE,
  source_assessment_id uuid NOT NULL REFERENCES public.business_upgrade_assessments(id) ON DELETE RESTRICT,
  project_id uuid NOT NULL REFERENCES public.business_upgrade_projects(id) ON DELETE RESTRICT,
  project_template_version integer NOT NULL CHECK (project_template_version > 0),
  project_slug_snapshot text NOT NULL,
  title_en text NOT NULL,
  title_ja text NOT NULL,
  outcome_en text NOT NULL,
  outcome_ja text NOT NULL,
  deliverable_en text NOT NULL,
  deliverable_ja text NOT NULL,
  metric_label_en text NOT NULL,
  metric_label_ja text NOT NULL,
  metric_unit text NOT NULL,
  metric_value_type text NOT NULL CHECK (metric_value_type IN ('number','minutes','percentage','currency')),
  metric_min numeric NOT NULL,
  metric_max numeric NOT NULL,
  improvement_direction text NOT NULL CHECK (improvement_direction IN ('increase','decrease')),
  recommendation_reason_codes text[] NOT NULL DEFAULT '{}',
  baseline_value numeric,
  result_value numeric,
  status text NOT NULL DEFAULT 'active' CHECK (status IN ('active','completed','archived')),
  started_at timestamptz NOT NULL DEFAULT now(),
  completed_at timestamptz,
  archived_at timestamptz,
  updated_at timestamptz NOT NULL DEFAULT now(),
  UNIQUE (user_id, source_assessment_id),
  CHECK (metric_min < metric_max),
  CHECK (baseline_value IS NULL OR baseline_value BETWEEN metric_min AND metric_max),
  CHECK (result_value IS NULL OR result_value BETWEEN metric_min AND metric_max),
  CHECK ((status = 'completed' AND completed_at IS NOT NULL AND result_value IS NOT NULL) OR status <> 'completed'),
  CHECK ((status = 'archived' AND archived_at IS NOT NULL) OR status <> 'archived')
);

CREATE UNIQUE INDEX business_upgrade_plans_one_active
  ON public.business_upgrade_plans(user_id) WHERE status = 'active';
CREATE INDEX business_upgrade_plans_user_started_idx ON public.business_upgrade_plans(user_id, started_at DESC);

CREATE TABLE public.business_upgrade_plan_steps (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  plan_id uuid NOT NULL REFERENCES public.business_upgrade_plans(id) ON DELETE CASCADE,
  source_project_step_id uuid REFERENCES public.business_upgrade_project_steps(id) ON DELETE SET NULL,
  sort_order integer NOT NULL,
  step_type text NOT NULL CHECK (step_type IN ('vault','workbench','action','measurement')),
  measurement_kind text CHECK (measurement_kind IS NULL OR measurement_kind IN ('baseline','result')),
  title_en text NOT NULL,
  title_ja text NOT NULL,
  instructions_en text NOT NULL,
  instructions_ja text NOT NULL,
  content_item_id uuid REFERENCES public.content_items(id) ON DELETE SET NULL,
  content_slug_snapshot text,
  content_title_en_snapshot text,
  content_title_ja_snapshot text,
  workbench_scenario_id uuid REFERENCES public.workbench_scenarios(id) ON DELETE SET NULL,
  workbench_slug_snapshot text,
  workbench_title_en_snapshot text,
  workbench_title_ja_snapshot text,
  estimated_minutes integer NOT NULL,
  required boolean NOT NULL DEFAULT true,
  status text NOT NULL DEFAULT 'pending' CHECK (status IN ('pending','completed')),
  user_confirmed boolean NOT NULL DEFAULT false,
  workbench_attempt_id uuid REFERENCES public.workbench_attempts(id) ON DELETE SET NULL,
  completed_at timestamptz,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now(),
  UNIQUE (plan_id, sort_order),
  CHECK ((status = 'completed' AND completed_at IS NOT NULL) OR (status = 'pending' AND completed_at IS NULL))
);

CREATE INDEX business_upgrade_plan_steps_plan_idx ON public.business_upgrade_plan_steps(plan_id, sort_order);

CREATE TABLE public.business_upgrade_daily_usage (
  user_id uuid NOT NULL REFERENCES public.users(id) ON DELETE CASCADE,
  usage_date date NOT NULL,
  attempts integer NOT NULL CHECK (attempts BETWEEN 1 AND 5),
  PRIMARY KEY (user_id, usage_date)
);

CREATE OR REPLACE FUNCTION public.validate_business_upgrade_project_publish()
RETURNS trigger
LANGUAGE plpgsql
SECURITY INVOKER
SET search_path = ''
AS $$
DECLARE
  step_count integer;
  baseline_count integer;
  result_count integer;
  baseline_order integer;
  result_order integer;
  broken_count integer;
BEGIN
  IF NEW.status <> 'published' OR
     (TG_OP = 'UPDATE' AND OLD.status = 'published' AND NEW.template_version = OLD.template_version) THEN
    RETURN NEW;
  END IF;

  SELECT count(*),
         count(*) FILTER (WHERE step_type = 'measurement' AND measurement_kind = 'baseline' AND required),
         count(*) FILTER (WHERE step_type = 'measurement' AND measurement_kind = 'result' AND required),
         min(sort_order) FILTER (WHERE step_type = 'measurement' AND measurement_kind = 'baseline'),
         min(sort_order) FILTER (WHERE step_type = 'measurement' AND measurement_kind = 'result')
    INTO step_count, baseline_count, result_count, baseline_order, result_order
    FROM public.business_upgrade_project_steps WHERE project_id = NEW.id;

  IF step_count NOT BETWEEN 3 AND 10 THEN RAISE EXCEPTION 'project_step_count_invalid'; END IF;
  IF baseline_count <> 1 OR result_count <> 1 OR baseline_order >= result_order THEN
    RAISE EXCEPTION 'project_measurements_invalid';
  END IF;

  SELECT count(*) INTO broken_count
  FROM public.business_upgrade_project_steps s
  LEFT JOIN public.content_items c ON c.id = s.content_item_id
  LEFT JOIN public.workbench_scenarios w ON w.id = s.workbench_scenario_id
  WHERE s.project_id = NEW.id AND (
    (s.step_type = 'vault' AND (c.id IS NULL OR c.is_published IS NOT TRUE)) OR
    (s.step_type = 'workbench' AND (w.id IS NULL OR w.is_published IS NOT TRUE))
  );
  IF broken_count > 0 THEN RAISE EXCEPTION 'project_references_invalid'; END IF;
  IF NEW.jp_needs_review THEN RAISE EXCEPTION 'project_japanese_review_required'; END IF;
  NEW.published_at := COALESCE(NEW.published_at, now());
  RETURN NEW;
END;
$$;

CREATE TRIGGER trg_business_upgrade_projects_publish
  BEFORE UPDATE OF status ON public.business_upgrade_projects
  FOR EACH ROW EXECUTE FUNCTION public.validate_business_upgrade_project_publish();
CREATE TRIGGER trg_business_upgrade_projects_publish_insert
  BEFORE INSERT ON public.business_upgrade_projects
  FOR EACH ROW WHEN (NEW.status = 'published')
  EXECUTE FUNCTION public.validate_business_upgrade_project_publish();

CREATE TRIGGER trg_business_upgrade_profiles_updated
  BEFORE UPDATE ON public.business_upgrade_profiles
  FOR EACH ROW EXECUTE FUNCTION public.tg_set_updated_at();
CREATE TRIGGER trg_business_upgrade_projects_updated
  BEFORE UPDATE ON public.business_upgrade_projects
  FOR EACH ROW EXECUTE FUNCTION public.tg_set_updated_at();
CREATE TRIGGER trg_business_upgrade_project_steps_updated
  BEFORE UPDATE ON public.business_upgrade_project_steps
  FOR EACH ROW EXECUTE FUNCTION public.tg_set_updated_at();
CREATE TRIGGER trg_business_upgrade_plans_updated
  BEFORE UPDATE ON public.business_upgrade_plans
  FOR EACH ROW EXECUTE FUNCTION public.tg_set_updated_at();
CREATE TRIGGER trg_business_upgrade_plan_steps_updated
  BEFORE UPDATE ON public.business_upgrade_plan_steps
  FOR EACH ROW EXECUTE FUNCTION public.tg_set_updated_at();

CREATE OR REPLACE FUNCTION public.reserve_business_upgrade_assessment(p_user_id uuid)
RETURNS boolean
LANGUAGE plpgsql
SECURITY INVOKER
SET search_path = ''
AS $$
DECLARE reserved boolean;
BEGIN
  INSERT INTO public.business_upgrade_daily_usage(user_id, usage_date, attempts)
  VALUES (p_user_id, (now() AT TIME ZONE 'UTC')::date, 1)
  ON CONFLICT (user_id, usage_date) DO UPDATE
    SET attempts = public.business_upgrade_daily_usage.attempts + 1
    WHERE public.business_upgrade_daily_usage.attempts < 5
  RETURNING true INTO reserved;
  RETURN COALESCE(reserved, false);
END;
$$;

CREATE OR REPLACE FUNCTION public.create_business_upgrade_assessment(
  p_user_id uuid,
  p_goal_code text,
  p_work_model_code text,
  p_industry_code text,
  p_ai_confidence text,
  p_weekly_time_minutes integer,
  p_current_tools text[],
  p_business_name text,
  p_offer_summary text,
  p_customer_summary text,
  p_locale text,
  p_engine_version text,
  p_recommendations jsonb
)
RETURNS uuid
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = ''
AS $$
DECLARE
  assessment_id uuid;
  rec jsonb;
BEGIN
  IF NOT EXISTS (SELECT 1 FROM public.users WHERE id = p_user_id) THEN RAISE EXCEPTION 'user_not_found'; END IF;

  INSERT INTO public.business_upgrade_profiles(
    user_id, business_name, work_model_code, industry_code, offer_summary, customer_summary,
    primary_goal_code, ai_confidence, weekly_time_minutes, current_tools
  ) VALUES (
    p_user_id, nullif(btrim(p_business_name), ''), p_work_model_code, p_industry_code,
    nullif(btrim(p_offer_summary), ''), nullif(btrim(p_customer_summary), ''),
    p_goal_code, p_ai_confidence, p_weekly_time_minutes, COALESCE(p_current_tools, '{}')
  ) ON CONFLICT (user_id) DO UPDATE SET
    business_name = EXCLUDED.business_name, work_model_code = EXCLUDED.work_model_code,
    industry_code = EXCLUDED.industry_code, offer_summary = EXCLUDED.offer_summary,
    customer_summary = EXCLUDED.customer_summary, primary_goal_code = EXCLUDED.primary_goal_code,
    ai_confidence = EXCLUDED.ai_confidence, weekly_time_minutes = EXCLUDED.weekly_time_minutes,
    current_tools = EXCLUDED.current_tools;

  INSERT INTO public.business_upgrade_assessments(
    user_id, locale, goal_code, work_model_code, industry_code, ai_confidence,
    weekly_time_minutes, current_tools, answer_snapshot, recommendation_engine_version
  ) VALUES (
    p_user_id, p_locale, p_goal_code, p_work_model_code, p_industry_code, p_ai_confidence,
    p_weekly_time_minutes, COALESCE(p_current_tools, '{}'),
    jsonb_build_object('goal', p_goal_code, 'workModel', p_work_model_code, 'industry', p_industry_code,
      'aiConfidence', p_ai_confidence, 'weeklyTimeMinutes', p_weekly_time_minutes, 'currentTools', COALESCE(p_current_tools, '{}')),
    p_engine_version
  ) RETURNING id INTO assessment_id;

  FOR rec IN SELECT value FROM jsonb_array_elements(COALESCE(p_recommendations, '[]'::jsonb)) LOOP
    INSERT INTO public.business_upgrade_recommendations(
      assessment_id, project_id, project_template_version, rank, score, reason_codes,
      recommendation_engine_version, expires_at
    ) VALUES (
      assessment_id, (rec->>'projectId')::uuid, (rec->>'projectVersion')::integer,
      (rec->>'rank')::integer, (rec->>'score')::integer,
      ARRAY(SELECT jsonb_array_elements_text(rec->'reasonCodes')),
      p_engine_version, now() + interval '14 days'
    );
  END LOOP;
  RETURN assessment_id;
END;
$$;

CREATE OR REPLACE FUNCTION public.create_business_upgrade_plan(
  p_user_id uuid,
  p_assessment_id uuid,
  p_project_id uuid,
  p_workbench_allowed boolean
)
RETURNS uuid
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = ''
AS $$
DECLARE
  existing_id uuid;
  new_plan_id uuid;
  project_row public.business_upgrade_projects%ROWTYPE;
  recommendation_row public.business_upgrade_recommendations%ROWTYPE;
BEGIN
  IF NOT EXISTS (SELECT 1 FROM public.business_upgrade_assessments WHERE id = p_assessment_id AND user_id = p_user_id) THEN
    RAISE EXCEPTION 'assessment_not_owned';
  END IF;

  SELECT id INTO existing_id FROM public.business_upgrade_plans
    WHERE user_id = p_user_id AND source_assessment_id = p_assessment_id;
  IF existing_id IS NOT NULL THEN RETURN existing_id; END IF;

  PERFORM 1 FROM public.business_upgrade_plans WHERE user_id = p_user_id AND status = 'active' FOR UPDATE;
  IF FOUND THEN RAISE EXCEPTION 'active_plan_exists'; END IF;

  SELECT * INTO recommendation_row FROM public.business_upgrade_recommendations
    WHERE assessment_id = p_assessment_id AND project_id = p_project_id FOR UPDATE;
  IF NOT FOUND OR recommendation_row.expires_at <= now() THEN RAISE EXCEPTION 'recommendation_expired'; END IF;

  SELECT * INTO project_row FROM public.business_upgrade_projects WHERE id = p_project_id FOR UPDATE;
  IF NOT FOUND OR project_row.status <> 'published' OR project_row.template_version <> recommendation_row.project_template_version THEN
    RAISE EXCEPTION 'recommendation_stale';
  END IF;
  IF NOT p_workbench_allowed AND EXISTS (
    SELECT 1 FROM public.business_upgrade_project_steps WHERE project_id = p_project_id AND step_type = 'workbench'
  ) THEN RAISE EXCEPTION 'workbench_not_available'; END IF;

  INSERT INTO public.business_upgrade_plans(
    user_id, source_assessment_id, project_id, project_template_version, project_slug_snapshot,
    title_en, title_ja, outcome_en, outcome_ja, deliverable_en, deliverable_ja,
    metric_label_en, metric_label_ja, metric_unit, metric_value_type, metric_min, metric_max,
    improvement_direction, recommendation_reason_codes
  ) VALUES (
    p_user_id, p_assessment_id, project_row.id, project_row.template_version, project_row.slug,
    project_row.title_en, project_row.title_ja, project_row.outcome_en, project_row.outcome_ja,
    project_row.deliverable_en, project_row.deliverable_ja, project_row.metric_label_en,
    project_row.metric_label_ja, project_row.metric_unit, project_row.metric_value_type,
    project_row.metric_min, project_row.metric_max, project_row.improvement_direction,
    recommendation_row.reason_codes
  ) RETURNING id INTO new_plan_id;

  INSERT INTO public.business_upgrade_plan_steps(
    plan_id, source_project_step_id, sort_order, step_type, measurement_kind,
    title_en, title_ja, instructions_en, instructions_ja,
    content_item_id, content_slug_snapshot, content_title_en_snapshot, content_title_ja_snapshot,
    workbench_scenario_id, workbench_slug_snapshot, workbench_title_en_snapshot, workbench_title_ja_snapshot,
    estimated_minutes, required
  )
  SELECT new_plan_id, s.id, s.sort_order, s.step_type, s.measurement_kind,
    s.title_en, s.title_ja, s.instructions_en, s.instructions_ja,
    s.content_item_id, c.slug, c.title_en, c.title_jp,
    s.workbench_scenario_id, w.slug, w.title_en, w.title_jp,
    s.estimated_minutes, s.required
  FROM public.business_upgrade_project_steps s
  LEFT JOIN public.content_items c ON c.id = s.content_item_id
  LEFT JOIN public.workbench_scenarios w ON w.id = s.workbench_scenario_id
  WHERE s.project_id = p_project_id ORDER BY s.sort_order;

  RETURN new_plan_id;
EXCEPTION WHEN unique_violation THEN
  SELECT id INTO existing_id FROM public.business_upgrade_plans
    WHERE user_id = p_user_id AND source_assessment_id = p_assessment_id;
  IF existing_id IS NOT NULL THEN RETURN existing_id; END IF;
  RAISE EXCEPTION 'active_plan_exists';
END;
$$;

CREATE OR REPLACE FUNCTION public.set_business_upgrade_step_status(
  p_user_id uuid,
  p_plan_id uuid,
  p_step_id uuid,
  p_completed boolean,
  p_measurement_value numeric DEFAULT NULL
)
RETURNS text
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = ''
AS $$
DECLARE
  plan_row public.business_upgrade_plans%ROWTYPE;
  step_row public.business_upgrade_plan_steps%ROWTYPE;
  attempt_id uuid;
  remaining integer;
BEGIN
  SELECT * INTO plan_row FROM public.business_upgrade_plans WHERE id = p_plan_id AND user_id = p_user_id FOR UPDATE;
  IF NOT FOUND THEN RAISE EXCEPTION 'plan_not_owned'; END IF;
  SELECT * INTO step_row FROM public.business_upgrade_plan_steps WHERE id = p_step_id AND plan_id = p_plan_id FOR UPDATE;
  IF NOT FOUND THEN RAISE EXCEPTION 'step_not_found'; END IF;
  IF plan_row.status = 'archived' THEN RAISE EXCEPTION 'plan_archived'; END IF;

  IF NOT p_completed THEN
    IF plan_row.status = 'completed' AND EXISTS (
      SELECT 1 FROM public.business_upgrade_plans WHERE user_id = p_user_id AND status = 'active' AND id <> p_plan_id
    ) THEN RAISE EXCEPTION 'another_plan_active'; END IF;
    UPDATE public.business_upgrade_plan_steps SET status = 'pending', completed_at = NULL,
      user_confirmed = false, workbench_attempt_id = NULL WHERE id = p_step_id;
    IF step_row.measurement_kind = 'baseline' THEN
      UPDATE public.business_upgrade_plans SET baseline_value = NULL, result_value = NULL, status = 'active', completed_at = NULL WHERE id = p_plan_id;
    ELSIF step_row.measurement_kind = 'result' THEN
      UPDATE public.business_upgrade_plans SET result_value = NULL, status = 'active', completed_at = NULL WHERE id = p_plan_id;
    ELSE
      UPDATE public.business_upgrade_plans SET status = 'active', completed_at = NULL WHERE id = p_plan_id;
    END IF;
    RETURN 'active';
  END IF;

  IF step_row.step_type = 'workbench' THEN
    SELECT id INTO attempt_id FROM public.workbench_attempts
      WHERE user_id = p_user_id AND scenario_id = step_row.workbench_scenario_id AND scored_at IS NOT NULL
      ORDER BY scored_at DESC LIMIT 1;
    IF attempt_id IS NULL THEN RAISE EXCEPTION 'scored_attempt_required'; END IF;
  ELSIF step_row.step_type = 'measurement' THEN
    IF p_measurement_value IS NULL OR p_measurement_value < plan_row.metric_min OR p_measurement_value > plan_row.metric_max THEN
      RAISE EXCEPTION 'measurement_invalid';
    END IF;
    IF step_row.measurement_kind = 'result' AND plan_row.baseline_value IS NULL THEN RAISE EXCEPTION 'baseline_required'; END IF;
  END IF;

  UPDATE public.business_upgrade_plan_steps SET status = 'completed', completed_at = now(),
    user_confirmed = step_row.step_type IN ('vault','action','measurement'), workbench_attempt_id = attempt_id
    WHERE id = p_step_id;
  IF step_row.measurement_kind = 'baseline' THEN
    UPDATE public.business_upgrade_plans SET baseline_value = p_measurement_value WHERE id = p_plan_id;
  ELSIF step_row.measurement_kind = 'result' THEN
    UPDATE public.business_upgrade_plans SET result_value = p_measurement_value WHERE id = p_plan_id;
  END IF;

  SELECT count(*) INTO remaining FROM public.business_upgrade_plan_steps
    WHERE plan_id = p_plan_id AND required AND status <> 'completed';
  IF remaining = 0 AND (SELECT result_value FROM public.business_upgrade_plans WHERE id = p_plan_id) IS NOT NULL THEN
    UPDATE public.business_upgrade_plans SET status = 'completed', completed_at = COALESCE(completed_at, now()) WHERE id = p_plan_id;
    RETURN 'completed';
  END IF;
  RETURN 'active';
END;
$$;

CREATE OR REPLACE FUNCTION public.set_business_upgrade_plan_lifecycle(
  p_user_id uuid,
  p_plan_id uuid,
  p_action text
)
RETURNS text
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = ''
AS $$
DECLARE plan_row public.business_upgrade_plans%ROWTYPE;
BEGIN
  SELECT * INTO plan_row FROM public.business_upgrade_plans WHERE id = p_plan_id AND user_id = p_user_id FOR UPDATE;
  IF NOT FOUND THEN RAISE EXCEPTION 'plan_not_owned'; END IF;
  IF p_action = 'archive' THEN
    UPDATE public.business_upgrade_plans SET status = 'archived', archived_at = now() WHERE id = p_plan_id;
    RETURN 'archived';
  ELSIF p_action = 'reactivate' THEN
    IF EXISTS (SELECT 1 FROM public.business_upgrade_plans WHERE user_id = p_user_id AND status = 'active' AND id <> p_plan_id) THEN
      RAISE EXCEPTION 'another_plan_active';
    END IF;
    UPDATE public.business_upgrade_plans SET status = 'active', archived_at = NULL, completed_at = NULL WHERE id = p_plan_id;
    RETURN 'active';
  END IF;
  RAISE EXCEPTION 'invalid_lifecycle_action';
END;
$$;

CREATE OR REPLACE FUNCTION public.save_business_upgrade_project(
  p_actor_id uuid,
  p_project jsonb,
  p_steps jsonb
)
RETURNS uuid
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = ''
AS $$
DECLARE
  v_project_id uuid;
  project_row public.business_upgrade_projects%ROWTYPE;
  step jsonb;
BEGIN
  IF NOT EXISTS (SELECT 1 FROM public.users WHERE id = p_actor_id AND role = 'admin') THEN
    RAISE EXCEPTION 'admin_required';
  END IF;
  v_project_id := nullif(p_project->>'id', '')::uuid;
  IF v_project_id IS NULL THEN
    INSERT INTO public.business_upgrade_projects(
      slug,title_en,title_ja,description_en,description_ja,outcome_en,outcome_ja,
      deliverable_en,deliverable_ja,metric_label_en,metric_label_ja,metric_unit,
      metric_value_type,metric_min,metric_max,improvement_direction,goal_codes,
      work_model_codes,industry_codes,min_confidence,max_confidence,estimated_days,
      total_minutes,featured,jp_needs_review,created_by
    ) VALUES (
      p_project->>'slug',p_project->>'titleEn',p_project->>'titleJa',p_project->>'descriptionEn',p_project->>'descriptionJa',
      p_project->>'outcomeEn',p_project->>'outcomeJa',p_project->>'deliverableEn',p_project->>'deliverableJa',
      p_project->>'metricLabelEn',p_project->>'metricLabelJa',p_project->>'metricUnit',p_project->>'metricValueType',
      (p_project->>'metricMin')::numeric,(p_project->>'metricMax')::numeric,p_project->>'improvementDirection',
      ARRAY(SELECT jsonb_array_elements_text(p_project->'goalCodes')),
      CASE WHEN p_project->'workModelCodes' = 'null'::jsonb THEN NULL ELSE ARRAY(SELECT jsonb_array_elements_text(p_project->'workModelCodes')) END,
      CASE WHEN p_project->'industryCodes' = 'null'::jsonb THEN NULL ELSE ARRAY(SELECT jsonb_array_elements_text(p_project->'industryCodes')) END,
      p_project->>'minConfidence',p_project->>'maxConfidence',(p_project->>'estimatedDays')::integer,
      (p_project->>'totalMinutes')::integer,(p_project->>'featured')::boolean,(p_project->>'jpNeedsReview')::boolean,p_actor_id
    ) RETURNING id INTO v_project_id;
  ELSE
    SELECT * INTO project_row FROM public.business_upgrade_projects WHERE id = v_project_id FOR UPDATE;
    IF NOT FOUND THEN RAISE EXCEPTION 'project_not_found'; END IF;
    UPDATE public.business_upgrade_projects SET
      slug=p_project->>'slug',title_en=p_project->>'titleEn',title_ja=p_project->>'titleJa',
      description_en=p_project->>'descriptionEn',description_ja=p_project->>'descriptionJa',
      outcome_en=p_project->>'outcomeEn',outcome_ja=p_project->>'outcomeJa',
      deliverable_en=p_project->>'deliverableEn',deliverable_ja=p_project->>'deliverableJa',
      metric_label_en=p_project->>'metricLabelEn',metric_label_ja=p_project->>'metricLabelJa',
      metric_unit=p_project->>'metricUnit',metric_value_type=p_project->>'metricValueType',
      metric_min=(p_project->>'metricMin')::numeric,metric_max=(p_project->>'metricMax')::numeric,
      improvement_direction=p_project->>'improvementDirection',
      goal_codes=ARRAY(SELECT jsonb_array_elements_text(p_project->'goalCodes')),
      work_model_codes=CASE WHEN p_project->'workModelCodes' = 'null'::jsonb THEN NULL ELSE ARRAY(SELECT jsonb_array_elements_text(p_project->'workModelCodes')) END,
      industry_codes=CASE WHEN p_project->'industryCodes' = 'null'::jsonb THEN NULL ELSE ARRAY(SELECT jsonb_array_elements_text(p_project->'industryCodes')) END,
      min_confidence=p_project->>'minConfidence',max_confidence=p_project->>'maxConfidence',
      estimated_days=(p_project->>'estimatedDays')::integer,total_minutes=(p_project->>'totalMinutes')::integer,
      featured=(p_project->>'featured')::boolean,jp_needs_review=(p_project->>'jpNeedsReview')::boolean,
      status='draft',published_at=NULL,
      template_version=CASE WHEN project_row.status='published' THEN project_row.template_version+1 ELSE project_row.template_version END
    WHERE id=v_project_id;
    DELETE FROM public.business_upgrade_project_steps s WHERE s.project_id=v_project_id;
  END IF;

  FOR step IN SELECT value FROM jsonb_array_elements(p_steps) LOOP
    INSERT INTO public.business_upgrade_project_steps(
      project_id,sort_order,step_type,measurement_kind,title_en,title_ja,instructions_en,instructions_ja,
      content_item_id,workbench_scenario_id,estimated_minutes,required
    ) VALUES (
      v_project_id,(step->>'sortOrder')::integer,step->>'stepType',nullif(step->>'measurementKind',''),
      step->>'titleEn',step->>'titleJa',step->>'instructionsEn',step->>'instructionsJa',
      nullif(step->>'contentItemId','')::uuid,nullif(step->>'workbenchScenarioId','')::uuid,
      (step->>'estimatedMinutes')::integer,(step->>'required')::boolean
    );
  END LOOP;
  RETURN v_project_id;
END;
$$;

CREATE OR REPLACE FUNCTION public.set_business_upgrade_project_status(
  p_actor_id uuid,
  p_project_id uuid,
  p_status text
)
RETURNS text
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = ''
AS $$
BEGIN
  IF NOT EXISTS (SELECT 1 FROM public.users WHERE id = p_actor_id AND role = 'admin') THEN RAISE EXCEPTION 'admin_required'; END IF;
  IF p_status NOT IN ('draft','published','archived') THEN RAISE EXCEPTION 'invalid_project_status'; END IF;
  UPDATE public.business_upgrade_projects SET status=p_status,
    published_at=CASE WHEN p_status='published' THEN COALESCE(published_at,now()) ELSE published_at END
    WHERE id=p_project_id;
  IF NOT FOUND THEN RAISE EXCEPTION 'project_not_found'; END IF;
  RETURN p_status;
END;
$$;

ALTER TABLE public.business_upgrade_profiles ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.business_upgrade_assessments ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.business_upgrade_projects ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.business_upgrade_project_steps ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.business_upgrade_recommendations ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.business_upgrade_plans ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.business_upgrade_plan_steps ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.business_upgrade_daily_usage ENABLE ROW LEVEL SECURITY;

CREATE POLICY business_upgrade_profiles_owner_read ON public.business_upgrade_profiles FOR SELECT TO authenticated USING (user_id = auth.uid() OR public.is_admin());
CREATE POLICY business_upgrade_assessments_owner_read ON public.business_upgrade_assessments FOR SELECT TO authenticated USING (user_id = auth.uid() OR public.is_admin());
CREATE POLICY business_upgrade_projects_admin_read ON public.business_upgrade_projects FOR SELECT TO authenticated USING (public.is_admin());
CREATE POLICY business_upgrade_project_steps_admin_read ON public.business_upgrade_project_steps FOR SELECT TO authenticated USING (public.is_admin());
CREATE POLICY business_upgrade_recommendations_owner_read ON public.business_upgrade_recommendations FOR SELECT TO authenticated USING (
  public.is_admin() OR EXISTS (SELECT 1 FROM public.business_upgrade_assessments a WHERE a.id = assessment_id AND a.user_id = auth.uid())
);
CREATE POLICY business_upgrade_plans_owner_read ON public.business_upgrade_plans FOR SELECT TO authenticated USING (user_id = auth.uid() OR public.is_admin());
CREATE POLICY business_upgrade_plan_steps_owner_read ON public.business_upgrade_plan_steps FOR SELECT TO authenticated USING (
  public.is_admin() OR EXISTS (SELECT 1 FROM public.business_upgrade_plans p WHERE p.id = plan_id AND p.user_id = auth.uid())
);
CREATE POLICY business_upgrade_usage_admin_read ON public.business_upgrade_daily_usage FOR SELECT TO authenticated USING (public.is_admin());

GRANT SELECT ON public.business_upgrade_profiles, public.business_upgrade_assessments,
  public.business_upgrade_recommendations, public.business_upgrade_plans,
  public.business_upgrade_plan_steps TO authenticated;
REVOKE INSERT, UPDATE, DELETE ON public.business_upgrade_profiles, public.business_upgrade_assessments,
  public.business_upgrade_recommendations, public.business_upgrade_plans,
  public.business_upgrade_plan_steps, public.business_upgrade_daily_usage FROM anon, authenticated;
REVOKE ALL ON public.business_upgrade_projects, public.business_upgrade_project_steps FROM anon;
REVOKE INSERT, UPDATE, DELETE ON public.business_upgrade_projects, public.business_upgrade_project_steps FROM authenticated;

REVOKE ALL ON FUNCTION public.reserve_business_upgrade_assessment(uuid) FROM PUBLIC, anon, authenticated;
GRANT EXECUTE ON FUNCTION public.reserve_business_upgrade_assessment(uuid) TO service_role;
REVOKE ALL ON FUNCTION public.create_business_upgrade_assessment(uuid,text,text,text,text,integer,text[],text,text,text,text,text,jsonb) FROM PUBLIC, anon, authenticated;
GRANT EXECUTE ON FUNCTION public.create_business_upgrade_assessment(uuid,text,text,text,text,integer,text[],text,text,text,text,text,jsonb) TO service_role;
REVOKE ALL ON FUNCTION public.create_business_upgrade_plan(uuid,uuid,uuid,boolean) FROM PUBLIC, anon, authenticated;
GRANT EXECUTE ON FUNCTION public.create_business_upgrade_plan(uuid,uuid,uuid,boolean) TO service_role;
REVOKE ALL ON FUNCTION public.set_business_upgrade_step_status(uuid,uuid,uuid,boolean,numeric) FROM PUBLIC, anon, authenticated;
GRANT EXECUTE ON FUNCTION public.set_business_upgrade_step_status(uuid,uuid,uuid,boolean,numeric) TO service_role;
REVOKE ALL ON FUNCTION public.set_business_upgrade_plan_lifecycle(uuid,uuid,text) FROM PUBLIC, anon, authenticated;
GRANT EXECUTE ON FUNCTION public.set_business_upgrade_plan_lifecycle(uuid,uuid,text) TO service_role;
REVOKE ALL ON FUNCTION public.save_business_upgrade_project(uuid,jsonb,jsonb) FROM PUBLIC, anon, authenticated;
GRANT EXECUTE ON FUNCTION public.save_business_upgrade_project(uuid,jsonb,jsonb) TO service_role;
REVOKE ALL ON FUNCTION public.set_business_upgrade_project_status(uuid,uuid,text) FROM PUBLIC, anon, authenticated;
GRANT EXECUTE ON FUNCTION public.set_business_upgrade_project_status(uuid,uuid,text) TO service_role;

COMMENT ON TABLE public.business_upgrade_projects IS 'Admin-authored templates; member plans store immutable bilingual snapshots.';
COMMENT ON FUNCTION public.create_business_upgrade_plan(uuid,uuid,uuid,boolean) IS 'Service-only transactional plan creation; p_user_id and capability come from authenticated server code.';
