-- ============================================================================
-- 066_blue_filler.sql — Blue Filler idea engine (admin-only think tank)
-- ============================================================================
-- Two tables behind /admin/blue-filler:
--   blue_filler_ideas    — one row per generated AI-SaaS opportunity, with the
--                          generation-time scores (gen_scores, conventionally
--                          immutable) and the current scores (current_scores,
--                          replaced wholesale by the latest completed research).
--   blue_filler_research — one row per deep-research run against an idea.
--                          Status lifecycle:
--                            generating -> completed  (web findings + structured
--                                                      report + >= 1 citation)
--                            generating -> partial    (usable findings, but the
--                                                      run could not finish)
--                            generating -> failed     (nothing usable)
--
-- Composite/grade are computed in SQL (blue_filler_composite_for +
-- blue_filler_grade_for) so the stored composite is mathematically tied to the
-- stored scores; the weights and bands mirror lib/blue-filler/scoring.ts and the
-- two implementations are pinned together by a shared test fixture
-- (__tests__ + supabase/tests/blue_filler_rls.test.ts).
--
-- Admin-only. The background research job reads/writes via the service role,
-- and finalization goes exclusively through finalize_blue_filler_research —
-- a SECURITY DEFINER RPC with service_role-only EXECUTE that performs the
-- compare-and-swap off status='generating' and the idea refresh in ONE
-- transaction.
--
-- NUMBERING: 065_workbench_building_domain.sql is the highest existing file, so
-- this is 066 (the plan's rule: re-check the dir, take the next free integer).
--
-- ROLLOUT (docs/plans/2026-08-08-blue-filler-idea-engine.md §0 — schema-first
-- AND commit-first): gates green -> commit locally -> apply THIS committed file
-- MANUALLY in the Supabase dashboard SQL editor on project zvfwtndbxshrtpwcwynw
-- and run the verification footer -> only then push (Vercel deploys on push).
-- Prod migrations are NOT run by the Vercel build; the Blue Filler routes 500
-- until this is applied.
-- ============================================================================

BEGIN;

-- ----------------------------------------------------------------------------
-- blue_filler_ideas
-- ----------------------------------------------------------------------------
CREATE TABLE IF NOT EXISTS public.blue_filler_ideas (
  id               uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  created_at       timestamptz NOT NULL DEFAULT now(),
  updated_at       timestamptz NOT NULL DEFAULT now(),  -- set explicitly per mutation; no trigger

  -- Idempotency key for POST /api/admin/blue-filler/generate. Row-level only:
  -- a pre-call lookup short-circuits a repeat submit with zero provider spend,
  -- and this UNIQUE makes a lost race resolve to the winner's row.
  request_id       uuid UNIQUE,

  title            text NOT NULL CHECK (char_length(title) BETWEEN 3 AND 120),
  -- Code-owned (slugified from title, collision-retried by the route). The model
  -- never emits it; the tool schema has no slug field.
  slug             text NOT NULL UNIQUE CHECK (slug ~ '^[a-z0-9-]{4,66}$'),

  industry_key     text NOT NULL,          -- key from lib/blue-filler/industry-map.ts
  origin           text NOT NULL DEFAULT 'cold'
                     CHECK (origin IN ('cold','seeded','acquirer')),
  source_excerpt   text CHECK (source_excerpt IS NULL OR char_length(source_excerpt) <= 2000),

  one_liner        text NOT NULL CHECK (char_length(one_liner) <= 200),
  summary_md       text NOT NULL CHECK (char_length(summary_md) <= 20000),

  -- { target_user, pain, ai_solution, service_attachment, adoption_blocker,
  --   moat_angle, mvp_scope, exit_assumptions, exit_math, exit_in_thesis_band,
  --   acquirer_hypothesis }
  -- exit_math / exit_in_thesis_band are code-computed. jsonb interiors are bounded
  -- by zod at the write sites (pg_column_size CHECKs are brittle); the DB bounds
  -- cover the text columns.
  thesis           jsonb NOT NULL,

  gen_scores       jsonb NOT NULL,   -- generation-time scores; conventionally immutable
  current_scores   jsonb NOT NULL,   -- replaced wholesale by the latest completed research

  composite        int  NOT NULL CHECK (composite BETWEEN 0 AND 100),
  grade            text NOT NULL CHECK (grade IN ('A','B','C','D','F')),

  status           text NOT NULL DEFAULT 'new'
                     CHECK (status IN ('new','shortlist','archived')),
  verdict          text CHECK (verdict IN ('interested','pass')),
  verdict_note     text CHECK (verdict_note IS NULL OR char_length(verdict_note) <= 500),

  kill_memo        jsonb,            -- success-only overwrite; zod-bounded interior

  model_id         text NOT NULL,
  pipeline_version text NOT NULL,
  -- process.env.VERCEL_GIT_COMMIT_SHA ?? null at insert. Null in local dev; in
  -- production it pins the row to the exact deployed commit, which a version
  -- string alone cannot do.
  build_sha        text
);

CREATE INDEX IF NOT EXISTS idx_blue_filler_ideas_rank
  ON public.blue_filler_ideas (status, composite DESC, created_at DESC);
CREATE INDEX IF NOT EXISTS idx_blue_filler_ideas_industry
  ON public.blue_filler_ideas (industry_key);

-- ----------------------------------------------------------------------------
-- blue_filler_research
-- ----------------------------------------------------------------------------
CREATE TABLE IF NOT EXISTS public.blue_filler_research (
  id               uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  idea_id          uuid NOT NULL REFERENCES public.blue_filler_ideas(id) ON DELETE CASCADE,
  created_at       timestamptz NOT NULL DEFAULT now(),
  updated_at       timestamptz NOT NULL DEFAULT now(),

  status           text NOT NULL DEFAULT 'generating'
                     CHECK (status IN ('generating','completed','partial','failed')),

  raw_findings_md  text CHECK (raw_findings_md IS NULL OR char_length(raw_findings_md) <= 200000),
  report           jsonb,
  summary_md       text CHECK (summary_md IS NULL OR char_length(summary_md) <= 20000),
  citations        jsonb,
  revised_scores   jsonb,

  search_count     int NOT NULL DEFAULT 0 CHECK (search_count >= 0),

  model_id         text,
  pipeline_version text,
  build_sha        text,

  -- Curated codes ONLY. The column CHECK means an arbitrary string can never be
  -- stored even by the service role — raw exceptions and provider bodies go to
  -- the server log, never to the DB and never to the client.
  generation_error text CHECK (
    generation_error IS NULL
    OR generation_error IN (
      'search_failed','no_citations','structuring_failed',
      'truncated','timeout','provider_error','internal'
    )
  ),

  completed_at     timestamptz,

  -- Terminal-state data invariants (mirrors lead_audits_terminal_shape_ck, 060).
  -- 'completed' and 'partial' additionally require versioned provenance, so any
  -- row carrying results is attributable to a model + pipeline version. 'failed'
  -- is exempt: the stale-flipper that writes it cannot know them.
  -- jsonb_typeof guards the array check so a non-array citations value is
  -- REJECTED by the constraint rather than raising from jsonb_array_length.
  CONSTRAINT blue_filler_research_terminal_shape_ck CHECK (
    status = 'generating'
    OR (status = 'completed'
        AND report IS NOT NULL
        AND summary_md IS NOT NULL
        AND revised_scores IS NOT NULL
        AND completed_at IS NOT NULL
        AND model_id IS NOT NULL
        AND pipeline_version IS NOT NULL
        AND citations IS NOT NULL
        AND jsonb_typeof(citations) = 'array'
        AND jsonb_array_length(citations) >= 1)
    OR (status = 'partial'
        AND raw_findings_md IS NOT NULL
        AND generation_error IS NOT NULL
        AND completed_at IS NOT NULL
        AND model_id IS NOT NULL
        AND pipeline_version IS NOT NULL)
    OR (status = 'failed'
        AND generation_error IS NOT NULL
        AND completed_at IS NOT NULL)
  )
);

CREATE INDEX IF NOT EXISTS idx_blue_filler_research_idea_created
  ON public.blue_filler_research (idea_id, created_at DESC);

-- At most one in-flight run per idea. The POST route relies on this to make the
-- single-run guard ATOMIC: a concurrent double-POST fails the second INSERT with
-- a unique violation (23505) -> 409, instead of a check-then-act SELECT race.
CREATE UNIQUE INDEX IF NOT EXISTS uq_blue_filler_research_one_generating
  ON public.blue_filler_research (idea_id) WHERE status = 'generating';

-- ----------------------------------------------------------------------------
-- RLS — admin-only on both tables. No anon/member policy: the background job
-- reads/writes via the service role only.
-- ----------------------------------------------------------------------------
ALTER TABLE public.blue_filler_ideas ENABLE ROW LEVEL SECURITY;
DROP POLICY IF EXISTS "blue_filler_ideas_admin_all" ON public.blue_filler_ideas;
CREATE POLICY "blue_filler_ideas_admin_all" ON public.blue_filler_ideas
  FOR ALL USING (public.is_admin()) WITH CHECK (public.is_admin());

ALTER TABLE public.blue_filler_research ENABLE ROW LEVEL SECURITY;
DROP POLICY IF EXISTS "blue_filler_research_admin_all" ON public.blue_filler_research;
CREATE POLICY "blue_filler_research_admin_all" ON public.blue_filler_research
  FOR ALL USING (public.is_admin()) WITH CHECK (public.is_admin());

-- ----------------------------------------------------------------------------
-- Scoring helpers — sources of truth, not lenient utilities: both RAISE outside
-- their domain rather than coercing. Weights and bands mirror
-- lib/blue-filler/scoring.ts; parity is pinned by a shared test fixture.
--
-- search_path = '' (every reference schema-qualified). NOTE: this is the
-- Supabase-recommended form and differs from 064's `pg_catalog, public`;
-- pg_catalog is implicitly searched either way, so built-ins still resolve.
-- ----------------------------------------------------------------------------
CREATE OR REPLACE FUNCTION public.blue_filler_composite_for(p_scores jsonb)
RETURNS int
LANGUAGE plpgsql
IMMUTABLE
SET search_path = ''
AS $$
DECLARE
  v_weights   jsonb := '{"gap":25,"market":15,"fit":15,"speed":15,"moat":15,"exit":15}'::jsonb;
  v_key       text;
  v_weight    int;
  v_raw       jsonb;
  v_val       numeric;
  v_weighted  int := 0;
  v_key_count int;
BEGIN
  IF p_scores IS NULL OR jsonb_typeof(p_scores) <> 'object' THEN
    RAISE EXCEPTION 'blue_filler_composite_for: p_scores must be a jsonb object (got %)',
      COALESCE(jsonb_typeof(p_scores), 'null');
  END IF;

  SELECT count(*) INTO v_key_count FROM jsonb_object_keys(p_scores);
  IF v_key_count <> 6 THEN
    RAISE EXCEPTION 'blue_filler_composite_for: expected exactly 6 score keys, got %', v_key_count;
  END IF;

  -- Every canonical key must be present; combined with the count check above,
  -- that also rejects any extra key.
  FOR v_key, v_weight IN SELECT key, value::int FROM jsonb_each_text(v_weights)
  LOOP
    v_raw := p_scores -> v_key;
    IF v_raw IS NULL THEN
      RAISE EXCEPTION 'blue_filler_composite_for: missing score key "%"', v_key;
    END IF;
    IF jsonb_typeof(v_raw) <> 'number' THEN
      RAISE EXCEPTION 'blue_filler_composite_for: score "%" must be a number (got %)',
        v_key, jsonb_typeof(v_raw);
    END IF;
    v_val := (v_raw #>> '{}')::numeric;
    IF v_val <> trunc(v_val) OR v_val < 1 OR v_val > 10 THEN
      RAISE EXCEPTION 'blue_filler_composite_for: score "%" must be an integer 1-10 (got %)',
        v_key, v_val;
    END IF;
    v_weighted := v_weighted + (v_val::int * v_weight);
  END LOOP;

  -- By construction 100..1000 before the divide, i.e. 10..100 — inside the
  -- ideas.composite 0-100 CHECK.
  RETURN round(v_weighted / 10.0)::int;
END;
$$;

CREATE OR REPLACE FUNCTION public.blue_filler_grade_for(p_composite int)
RETURNS text
LANGUAGE plpgsql
IMMUTABLE
SET search_path = ''
AS $$
BEGIN
  IF p_composite IS NULL OR p_composite < 0 OR p_composite > 100 THEN
    RAISE EXCEPTION 'blue_filler_grade_for: p_composite must be 0-100 (got %)',
      COALESCE(p_composite::text, 'null');
  END IF;
  RETURN CASE
    WHEN p_composite >= 80 THEN 'A'
    WHEN p_composite >= 65 THEN 'B'
    WHEN p_composite >= 50 THEN 'C'
    WHEN p_composite >= 35 THEN 'D'
    ELSE 'F'
  END;
END;
$$;

-- ----------------------------------------------------------------------------
-- finalize_blue_filler_research — the ONLY way a research row leaves
-- 'generating'. Compare-and-swap on status='generating' plus, on success, the
-- idea's score refresh, in a single transaction.
--
-- Composite and grade are computed HERE from p_revised_scores, so no
-- caller-supplied composite can disagree with the stored scores.
-- p_search_count NULL preserves whatever the last checkpoint wrote.
-- Every contract violation RAISEs; nothing is silently coerced.
-- ----------------------------------------------------------------------------
CREATE OR REPLACE FUNCTION public.finalize_blue_filler_research(
  p_research_id      uuid,
  p_status           text,
  p_report           jsonb DEFAULT NULL,
  p_summary_md       text  DEFAULT NULL,
  p_citations        jsonb DEFAULT NULL,
  p_revised_scores   jsonb DEFAULT NULL,
  p_search_count     int   DEFAULT NULL,
  p_generation_error text  DEFAULT NULL,
  p_model_id         text  DEFAULT NULL,
  p_pipeline_version text  DEFAULT NULL
)
RETURNS jsonb
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = ''
AS $$
DECLARE
  v_composite int;
  v_grade     text;
  v_idea_id   uuid;
  v_rows      int;
BEGIN
  IF p_status IS NULL OR p_status NOT IN ('completed','partial','failed') THEN
    RAISE EXCEPTION 'finalize_blue_filler_research: p_status must be completed|partial|failed (got %)',
      COALESCE(p_status, 'null');
  END IF;

  IF p_status = 'completed' THEN
    IF p_report IS NULL OR p_summary_md IS NULL OR p_revised_scores IS NULL
       OR p_model_id IS NULL OR p_pipeline_version IS NULL THEN
      RAISE EXCEPTION 'finalize_blue_filler_research: completed requires report, summary_md, revised_scores, model_id and pipeline_version';
    END IF;
    IF p_citations IS NULL OR jsonb_typeof(p_citations) <> 'array'
       OR jsonb_array_length(p_citations) < 1 THEN
      RAISE EXCEPTION 'finalize_blue_filler_research: completed requires a non-empty citations array';
    END IF;
    -- Also enforces the score shape (raises on anything malformed).
    v_composite := public.blue_filler_composite_for(p_revised_scores);
    v_grade     := public.blue_filler_grade_for(v_composite);

  ELSIF p_status = 'partial' THEN
    IF p_generation_error IS NULL OR p_model_id IS NULL OR p_pipeline_version IS NULL THEN
      RAISE EXCEPTION 'finalize_blue_filler_research: partial requires generation_error, model_id and pipeline_version';
    END IF;

  ELSE  -- failed
    IF p_generation_error IS NULL THEN
      RAISE EXCEPTION 'finalize_blue_filler_research: failed requires generation_error';
    END IF;
  END IF;

  IF p_status = 'completed' THEN
    UPDATE public.blue_filler_research
       SET status           = 'completed',
           report           = p_report,
           summary_md       = p_summary_md,
           citations        = p_citations,
           revised_scores   = p_revised_scores,
           search_count     = COALESCE(p_search_count, search_count),
           model_id         = p_model_id,
           pipeline_version = p_pipeline_version,
           generation_error = NULL,
           completed_at     = now(),
           updated_at       = now()
     WHERE id = p_research_id AND status = 'generating'
     RETURNING idea_id INTO v_idea_id;

  ELSIF p_status = 'partial' THEN
    UPDATE public.blue_filler_research
       SET status           = 'partial',
           generation_error = p_generation_error,
           search_count     = COALESCE(p_search_count, search_count),
           model_id         = p_model_id,
           pipeline_version = p_pipeline_version,
           completed_at     = now(),
           updated_at       = now()
     WHERE id = p_research_id AND status = 'generating'
     RETURNING idea_id INTO v_idea_id;

  ELSE
    UPDATE public.blue_filler_research
       SET status           = 'failed',
           generation_error = p_generation_error,
           search_count     = COALESCE(p_search_count, search_count),
           completed_at     = now(),
           updated_at       = now()
     WHERE id = p_research_id AND status = 'generating'
     RETURNING idea_id INTO v_idea_id;
  END IF;

  GET DIAGNOSTICS v_rows = ROW_COUNT;

  -- Already terminal (a stale flip, or a repeat finalization): no-op, and NO
  -- other write happens regardless of payload.
  IF v_rows = 0 THEN
    RETURN jsonb_build_object('applied', false);
  END IF;

  -- idea_id comes from the row we just updated, never from the caller.
  IF p_status = 'completed' THEN
    UPDATE public.blue_filler_ideas
       SET current_scores = p_revised_scores,
           composite      = v_composite,
           grade          = v_grade,
           updated_at     = now()
     WHERE id = v_idea_id;
    -- gen_scores is deliberately untouched.
  END IF;

  RETURN jsonb_build_object('applied', true);
END;
$$;

-- Service-role EXECUTE only (the after() job). The two helpers are IMMUTABLE and
-- side-effect-free, and RAISE on bad input either way, so they are left callable.
REVOKE ALL ON FUNCTION public.finalize_blue_filler_research(
  uuid, text, jsonb, text, jsonb, jsonb, int, text, text, text
) FROM PUBLIC, anon, authenticated;

GRANT EXECUTE ON FUNCTION public.finalize_blue_filler_research(
  uuid, text, jsonb, text, jsonb, jsonb, int, text, text, text
) TO service_role;

COMMIT;

-- ----------------------------------------------------------------------------
-- Post-migration verification (run in the SQL editor after applying):
--
-- 1. Tables exist and are RLS-protected (expect two rows, rowsecurity = true):
--      select tablename, rowsecurity from pg_tables
--       where schemaname = 'public' and tablename like 'blue_filler%';
--
-- 2. Admin-only policies exist (expect blue_filler_ideas_admin_all and
--    blue_filler_research_admin_all, and nothing else):
--      select tablename, policyname, cmd from pg_policies
--       where schemaname = 'public' and tablename like 'blue_filler%';
--
-- 3. Scoring helpers agree with lib/blue-filler/scoring.ts
--    (expect 100 / 'A', then 10 / 'F'):
--      select public.blue_filler_composite_for(
--               '{"gap":10,"market":10,"fit":10,"speed":10,"moat":10,"exit":10}'::jsonb) as composite,
--             public.blue_filler_grade_for(100) as grade;
--      select public.blue_filler_composite_for(
--               '{"gap":1,"market":1,"fit":1,"speed":1,"moat":1,"exit":1}'::jsonb) as composite,
--             public.blue_filler_grade_for(10) as grade;
--
-- 4. Helpers RAISE outside their domain (each should ERROR, not return):
--      select public.blue_filler_composite_for('{"gap":11,"market":5,"fit":5,"speed":5,"moat":5,"exit":5}'::jsonb);
--      select public.blue_filler_grade_for(101);
--
-- 5. The terminal-shape constraint exists. Both tables use CREATE TABLE IF NOT
--    EXISTS, so a re-run against a pre-existing table would silently skip the
--    CHECKs — this is the check that would catch that (expect 1 row):
--      select conname from pg_constraint
--       where conname = 'blue_filler_research_terminal_shape_ck';
--
-- 6. The RPC is service-role only. Expect exactly two rows: service_role and
--    postgres (the owner always retains EXECUTE). Crucially, NEITHER `anon`
--    NOR `authenticated` may appear:
--      select grantee, privilege_type from information_schema.routine_privileges
--       where routine_schema = 'public'
--         and routine_name = 'finalize_blue_filler_research';
--
-- 7. As anon / an ordinary authenticated user, both tables are empty or denied:
--      select * from public.blue_filler_ideas;     -- 0 rows / permission denied
--      select * from public.blue_filler_research;  -- 0 rows / permission denied
-- ----------------------------------------------------------------------------
