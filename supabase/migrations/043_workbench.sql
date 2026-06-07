-- ============================================================================
-- 043_workbench.sql — Apply-It Workbench (v1 foundation)
-- ============================================================================
-- Spec: docs/plans/2026-05-27-apply-it-workbench-v1.md (Build sequence step 1)
--
-- The Apply-It Workbench is a Vault sub-feature where members practice prompting
-- against real LLMs and get rubric-scored feedback. This migration ships the
-- data foundation everything else composes on:
--
--   1. workbench_scenarios     — curated, bilingual practice scenarios (admin-authored)
--   2. workbench_attempts      — a member's run of a scenario (prompt + output + score)
--   3. workbench_saved_prompts — personal prompt library (own + revealed-expert prompts)
--   4. workbench_daily_usage   — per-user/day run + evaluation counters (RPC-only writes)
--   5. updated_at trigger (clone of sync_vault_article_bodies_updated_at, migration 041)
--   6. RLS policies for all four tables (reuse has_vault_access() + is_admin())
--   7. SECURITY DEFINER RPCs for server-only mutation:
--        - workbench_consume_quota  (atomic guarded increment; returns false at cap)
--        - workbench_refund_quota   (decrement on provider failure)
--        - workbench_create_attempt (server-assigned monotonic version, race-safe)
--      Hardened: EXECUTE revoked from PUBLIC, granted only to service_role, so the
--      RPCs are not a PostgREST attack surface for authenticated users (they take an
--      arbitrary p_user_id and mutate, so anon/authenticated must not call them).
--
-- All operations are idempotent (IF NOT EXISTS / DROP POLICY IF EXISTS / CREATE OR
-- REPLACE) so the migration is safe to re-apply.
-- ============================================================================

BEGIN;

-- ----------------------------------------------------------------------------
-- 1. workbench_scenarios — curated bilingual practice scenarios
-- ----------------------------------------------------------------------------
-- Bilingual _en / _jp fields per project convention. _jp companions are
-- nullable at the column level; publish-time validation (application code)
-- enforces that both languages are present before is_published flips true.
-- applicable_dimensions is a subset of the six prompting dimensions
-- {role, context, task, constraints, format, examples}; values are validated in
-- application code, only non-emptiness is enforced here.
-- ----------------------------------------------------------------------------

CREATE TABLE IF NOT EXISTS workbench_scenarios (
  id                    uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  slug                  text NOT NULL UNIQUE,
  title_en              text NOT NULL,
  title_jp              text,
  domain                text NOT NULL CHECK (domain IN ('marketing','operations','communication')),
  difficulty            text NOT NULL CHECK (difficulty IN ('beginner','intermediate','advanced')),
  brief_en              text NOT NULL,
  brief_jp              text,
  applicable_dimensions text[] NOT NULL CHECK (cardinality(applicable_dimensions) > 0),
  expert_prompt_en      text NOT NULL,
  expert_prompt_jp      text,
  expert_output_en      text NOT NULL,
  expert_output_jp      text,
  why_this_works_en     text,
  why_this_works_jp     text,
  is_published          boolean NOT NULL DEFAULT false,
  is_featured           boolean NOT NULL DEFAULT false,
  created_at            timestamptz NOT NULL DEFAULT now(),
  updated_at            timestamptz NOT NULL DEFAULT now()
);

COMMENT ON TABLE workbench_scenarios IS
  'Curated bilingual prompting-practice scenarios. _jp fields nullable at column '
  'level; publish validation (app code) requires both languages before is_published.';

-- ----------------------------------------------------------------------------
-- 2. workbench_attempts — a member''s run of a scenario
-- ----------------------------------------------------------------------------
-- version is monotonic per (user_id, scenario_id), assigned inside
-- workbench_create_attempt() to stay race-safe. output_text is written on run
-- (never null once the row exists). scores_json / overall_score / strengths /
-- improvements / scored_at stay null until the attempt is scored. No end-user
-- write policies — all writes go through the RPC / service role.
-- ----------------------------------------------------------------------------

CREATE TABLE IF NOT EXISTS workbench_attempts (
  id                uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id           uuid NOT NULL REFERENCES public.users(id) ON DELETE CASCADE,
  scenario_id       uuid NOT NULL REFERENCES workbench_scenarios(id) ON DELETE CASCADE,
  version           int  NOT NULL,
  language          text NOT NULL CHECK (language IN ('en','ja')),
  executor_model    text NOT NULL CHECK (executor_model IN ('claude-haiku','gpt-4o-mini','gemini-flash')),
  prompt_text       text NOT NULL,
  output_text       text NOT NULL,
  scores_json       jsonb,
  overall_score     int CHECK (overall_score BETWEEN 0 AND 100),
  strengths         text[],
  improvements      text[],
  expert_revealed_at timestamptz,
  created_at        timestamptz NOT NULL DEFAULT now(),
  scored_at         timestamptz,
  UNIQUE (user_id, scenario_id, version)
);

CREATE INDEX IF NOT EXISTS workbench_attempts_version_idx
  ON workbench_attempts(user_id, scenario_id, version DESC);
CREATE INDEX IF NOT EXISTS workbench_attempts_recent_idx
  ON workbench_attempts(user_id, created_at DESC);

COMMENT ON TABLE workbench_attempts IS
  'A member''s run of a scenario (prompt + output, optionally scored). version is '
  'monotonic per (user_id, scenario_id), assigned server-side in workbench_create_attempt.';

-- ----------------------------------------------------------------------------
-- 3. workbench_saved_prompts — personal prompt library
-- ----------------------------------------------------------------------------
-- Holds a member''s own saved prompts and revealed expert prompts. Source links
-- (scenario / attempt) use ON DELETE SET NULL so a deleted scenario or attempt
-- does not remove the saved prompt itself.
-- ----------------------------------------------------------------------------

CREATE TABLE IF NOT EXISTS workbench_saved_prompts (
  id                 uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id            uuid NOT NULL REFERENCES public.users(id) ON DELETE CASCADE,
  prompt_text        text NOT NULL,
  language           text NOT NULL CHECK (language IN ('en','ja')),
  source             text NOT NULL CHECK (source IN ('own','expert')),
  source_scenario_id uuid REFERENCES workbench_scenarios(id) ON DELETE SET NULL,
  source_attempt_id  uuid REFERENCES workbench_attempts(id) ON DELETE SET NULL,
  tags               text[] NOT NULL DEFAULT '{}',
  note               text,
  created_at         timestamptz NOT NULL DEFAULT now(),
  updated_at         timestamptz NOT NULL DEFAULT now()
);

CREATE INDEX IF NOT EXISTS workbench_saved_prompts_recent_idx
  ON workbench_saved_prompts(user_id, created_at DESC);
CREATE INDEX IF NOT EXISTS workbench_saved_prompts_tags_idx
  ON workbench_saved_prompts USING gin (tags);

COMMENT ON TABLE workbench_saved_prompts IS
  'Member''s personal prompt library: own prompts and revealed expert prompts. '
  'source_* links use ON DELETE SET NULL so the saved prompt survives source deletion.';

-- ----------------------------------------------------------------------------
-- 4. workbench_daily_usage — per-user/day quota counters
-- ----------------------------------------------------------------------------
-- Never written from client RLS. All mutations go through the SECURITY DEFINER
-- RPCs below (consume / refund). Users may read their own row to render budget.
-- ----------------------------------------------------------------------------

CREATE TABLE IF NOT EXISTS workbench_daily_usage (
  user_id           uuid NOT NULL REFERENCES public.users(id) ON DELETE CASCADE,
  usage_date        date NOT NULL,
  runs_count        int NOT NULL DEFAULT 0,
  evaluations_count int NOT NULL DEFAULT 0,
  PRIMARY KEY (user_id, usage_date)
);

COMMENT ON TABLE workbench_daily_usage IS
  'Per-user/day run + evaluation counters. Writes only via workbench_consume_quota '
  '/ workbench_refund_quota RPCs (service role); clients may read their own row.';

-- ----------------------------------------------------------------------------
-- 5. updated_at trigger (clone of sync_vault_article_bodies_updated_at, 041)
-- ----------------------------------------------------------------------------
-- Shared trigger function reused by both tables that carry an updated_at column.
-- ----------------------------------------------------------------------------

CREATE OR REPLACE FUNCTION sync_workbench_updated_at()
RETURNS trigger AS $$
BEGIN
  NEW.updated_at = now();
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

DROP TRIGGER IF EXISTS trg_workbench_scenarios_updated_at ON workbench_scenarios;
CREATE TRIGGER trg_workbench_scenarios_updated_at
  BEFORE UPDATE ON workbench_scenarios
  FOR EACH ROW EXECUTE FUNCTION sync_workbench_updated_at();

DROP TRIGGER IF EXISTS trg_workbench_saved_prompts_updated_at ON workbench_saved_prompts;
CREATE TRIGGER trg_workbench_saved_prompts_updated_at
  BEFORE UPDATE ON workbench_saved_prompts
  FOR EACH ROW EXECUTE FUNCTION sync_workbench_updated_at();

-- ----------------------------------------------------------------------------
-- 6. RLS policies
-- ----------------------------------------------------------------------------

-- workbench_scenarios: published scenarios readable by Vault members; admins manage.
ALTER TABLE workbench_scenarios ENABLE ROW LEVEL SECURITY;
DROP POLICY IF EXISTS "workbench_scenarios_read"      ON workbench_scenarios;
DROP POLICY IF EXISTS "workbench_scenarios_admin_all" ON workbench_scenarios;

CREATE POLICY "workbench_scenarios_read" ON workbench_scenarios
  FOR SELECT USING (
    is_published = true AND public.has_vault_access(auth.uid())
  );

CREATE POLICY "workbench_scenarios_admin_all" ON workbench_scenarios
  FOR ALL USING (public.is_admin()) WITH CHECK (public.is_admin());

-- workbench_attempts: user reads own; admin reads all. No client writes — all
-- mutations go through workbench_create_attempt() / score update via service role.
ALTER TABLE workbench_attempts ENABLE ROW LEVEL SECURITY;
DROP POLICY IF EXISTS "workbench_attempts_own_read"   ON workbench_attempts;
DROP POLICY IF EXISTS "workbench_attempts_admin_read" ON workbench_attempts;

CREATE POLICY "workbench_attempts_own_read" ON workbench_attempts
  FOR SELECT USING (user_id = auth.uid());

CREATE POLICY "workbench_attempts_admin_read" ON workbench_attempts
  FOR SELECT USING (public.is_admin());

-- workbench_saved_prompts: user fully owns own rows (client writes OK).
ALTER TABLE workbench_saved_prompts ENABLE ROW LEVEL SECURITY;
DROP POLICY IF EXISTS "workbench_saved_prompts_own_all" ON workbench_saved_prompts;

CREATE POLICY "workbench_saved_prompts_own_all" ON workbench_saved_prompts
  FOR ALL USING (user_id = auth.uid()) WITH CHECK (user_id = auth.uid());

-- workbench_daily_usage: user reads own; NO client writes (RPC-only).
ALTER TABLE workbench_daily_usage ENABLE ROW LEVEL SECURITY;
DROP POLICY IF EXISTS "workbench_daily_usage_own_read" ON workbench_daily_usage;

CREATE POLICY "workbench_daily_usage_own_read" ON workbench_daily_usage
  FOR SELECT USING (user_id = auth.uid());

-- ----------------------------------------------------------------------------
-- 7. Server-only mutation RPCs (SECURITY DEFINER, hardened to service_role)
-- ----------------------------------------------------------------------------

-- Atomic quota consume: upsert today's row, then guarded increment in one
-- statement. Returns true if it incremented, false if already at cap. The route
-- handler calls this BEFORE the provider call; false -> 429, no provider call.
CREATE OR REPLACE FUNCTION public.workbench_consume_quota(
  p_user_id uuid,
  p_kind text  -- 'run' or 'score'
)
RETURNS boolean AS $$
DECLARE
  v_runs_cap   constant int := 25;
  v_scores_cap constant int := 10;
  v_today      date := (now() at time zone 'UTC')::date;
  v_runs   int;
  v_scores int;
BEGIN
  IF p_kind NOT IN ('run','score') THEN
    RAISE EXCEPTION 'invalid kind %', p_kind;
  END IF;

  INSERT INTO workbench_daily_usage (user_id, usage_date)
  VALUES (p_user_id, v_today)
  ON CONFLICT (user_id, usage_date) DO NOTHING;

  IF p_kind = 'run' THEN
    UPDATE workbench_daily_usage
       SET runs_count = runs_count + 1
     WHERE user_id = p_user_id
       AND usage_date = v_today
       AND runs_count < v_runs_cap
     RETURNING runs_count INTO v_runs;
    RETURN v_runs IS NOT NULL;
  ELSE
    UPDATE workbench_daily_usage
       SET evaluations_count = evaluations_count + 1
     WHERE user_id = p_user_id
       AND usage_date = v_today
       AND evaluations_count < v_scores_cap
     RETURNING evaluations_count INTO v_scores;
    RETURN v_scores IS NOT NULL;
  END IF;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

COMMENT ON FUNCTION public.workbench_consume_quota(uuid, text) IS
  'Atomically consumes one run/score quota unit for the user/day; returns false '
  'at cap (caller returns 429 without calling the provider). Service-role only.';

REVOKE EXECUTE ON FUNCTION public.workbench_consume_quota(uuid, text) FROM PUBLIC;
GRANT  EXECUTE ON FUNCTION public.workbench_consume_quota(uuid, text) TO service_role;

-- Refund a consumed unit when the provider call fails (network error, timeout,
-- JSON parse failure after retry). Called only by server routes.
CREATE OR REPLACE FUNCTION public.workbench_refund_quota(
  p_user_id uuid,
  p_kind text
)
RETURNS void AS $$
DECLARE
  v_today date := (now() at time zone 'UTC')::date;
BEGIN
  IF p_kind = 'run' THEN
    UPDATE workbench_daily_usage
       SET runs_count = greatest(runs_count - 1, 0)
     WHERE user_id = p_user_id AND usage_date = v_today;
  ELSIF p_kind = 'score' THEN
    UPDATE workbench_daily_usage
       SET evaluations_count = greatest(evaluations_count - 1, 0)
     WHERE user_id = p_user_id AND usage_date = v_today;
  END IF;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

COMMENT ON FUNCTION public.workbench_refund_quota(uuid, text) IS
  'Refunds one consumed run/score unit after a provider failure. Service-role only.';

REVOKE EXECUTE ON FUNCTION public.workbench_refund_quota(uuid, text) FROM PUBLIC;
GRANT  EXECUTE ON FUNCTION public.workbench_refund_quota(uuid, text) TO service_role;

-- Create an attempt with a server-assigned monotonic version per
-- (user_id, scenario_id). UNIQUE (user_id, scenario_id, version) plus
-- assignment here makes concurrent runs safe: the loser hits the unique
-- constraint and the caller retries with the next version (1-retry loop).
CREATE OR REPLACE FUNCTION public.workbench_create_attempt(
  p_user_id uuid,
  p_scenario_id uuid,
  p_language text,
  p_executor_model text,
  p_prompt_text text,
  p_output_text text
)
RETURNS uuid AS $$
DECLARE
  v_next_version int;
  v_attempt_id uuid;
BEGIN
  SELECT coalesce(max(version), 0) + 1
    INTO v_next_version
    FROM workbench_attempts
   WHERE user_id = p_user_id AND scenario_id = p_scenario_id;

  INSERT INTO workbench_attempts (
    user_id, scenario_id, version, language,
    executor_model, prompt_text, output_text
  )
  VALUES (
    p_user_id, p_scenario_id, v_next_version, p_language,
    p_executor_model, p_prompt_text, p_output_text
  )
  RETURNING id INTO v_attempt_id;

  RETURN v_attempt_id;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

COMMENT ON FUNCTION public.workbench_create_attempt(uuid, uuid, text, text, text, text) IS
  'Inserts a workbench attempt with a server-assigned monotonic version per '
  '(user_id, scenario_id); returns the new attempt id. Service-role only.';

REVOKE EXECUTE ON FUNCTION public.workbench_create_attempt(uuid, uuid, text, text, text, text) FROM PUBLIC;
GRANT  EXECUTE ON FUNCTION public.workbench_create_attempt(uuid, uuid, text, text, text, text) TO service_role;

COMMIT;
