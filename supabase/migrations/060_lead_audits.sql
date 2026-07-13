-- ============================================================================
-- 060_lead_audits.sql — Website Audit Engine (Studio lead workspace, phase 3)
-- ============================================================================
-- One row per audit run against a lead's current website. Deterministic
-- heuristics + PageSpeed Insights are computed in code; the Claude narrative is
-- an optional value-add layer. Status lifecycle:
--   generating -> completed   (heuristics + narrative both succeeded)
--   generating -> partial     (heuristics succeeded, narrative failed — retryable)
--   generating -> failed      (fetch/heuristics could not produce a usable audit)
-- Admin-only (leads are admin-only); the background job writes via the service role.
--
-- NOTE ON NUMBERING: this file is 060, NOT the plan's provisional "059" —
-- 059_lead_audits was pre-empted by 059_feedback.sql (the in-app feedback
-- feature) landing first. The plan's own rule ("re-check the dir and take the
-- next free integer") resolves the collision to 060. Phase 4 (prospects) → 061.
--
-- Apply MANUALLY in the Supabase dashboard SQL editor on project
-- zvfwtndbxshrtpwcwynw BEFORE relying on the deployed code (prod migrations are
-- not run by the Vercel build — the audit route 500s until this is applied).
-- ============================================================================

BEGIN;

CREATE TABLE IF NOT EXISTS public.lead_audits (
  id            uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  lead_id       uuid NOT NULL REFERENCES public.leads(id) ON DELETE CASCADE,
  created_at    timestamptz NOT NULL DEFAULT now(),
  updated_at    timestamptz NOT NULL DEFAULT now(),
  status        text NOT NULL DEFAULT 'generating'
                  CHECK (status IN ('generating','completed','partial','failed')),
  audited_url   text NOT NULL,                       -- snapshot of existing_url at run time
  scores        jsonb,   -- { overall:int, categories:{ security:int, seo:int, mobile:int,
                         --   conversion:int, freshness:int, accessibility:int } }
  findings      jsonb,   -- [ { id, category, severity, title, evidence } ]
  tech          jsonb,   -- { generator, cms, builders:[], jquery, copyrightYear,
                         --   pagesFetched:int, finalUrl } (detection, not scored)
  psi           jsonb,   -- { strategy:'mobile', categories:{...}, metrics:{...} } | null
  narrative     jsonb,   -- { one_liner, current_state_md, opportunities_md,
                         --   competitive_md, next_steps_md } | null
  summary_md    text,    -- copy-paste artifact (built from heuristics ± narrative)
  model_id      text,
  generation_error text,  -- SAFE curated message only (never a raw exception/provider detail)
  completed_at  timestamptz,

  -- Terminal-state data invariants (mirrors surveys_kind_event_slug_ck, 049). A
  -- 'generating' row may hold partially-filled data; completed_at is set only at a
  -- terminal state. Prevents 'completed' w/o scores, 'failed' w/o an error, etc.
  CONSTRAINT lead_audits_terminal_shape_ck CHECK (
    status = 'generating'
    OR (status = 'completed' AND scores IS NOT NULL AND findings IS NOT NULL
        AND summary_md IS NOT NULL AND narrative IS NOT NULL AND completed_at IS NOT NULL)
    OR (status = 'partial'   AND scores IS NOT NULL AND findings IS NOT NULL
        AND summary_md IS NOT NULL AND completed_at IS NOT NULL)
    OR (status = 'failed'    AND generation_error IS NOT NULL AND completed_at IS NOT NULL)
  )
);

CREATE INDEX IF NOT EXISTS idx_lead_audits_lead_created
  ON public.lead_audits (lead_id, created_at DESC);

-- At most one in-flight run per lead. The POST route relies on this to make the
-- single-run guard ATOMIC: a concurrent double-POST fails the second INSERT with a
-- unique violation (23505) -> 409, instead of a check-then-act SELECT that both
-- racers can pass.
CREATE UNIQUE INDEX IF NOT EXISTS uq_lead_audits_one_generating
  ON public.lead_audits (lead_id) WHERE status = 'generating';

ALTER TABLE public.lead_audits ENABLE ROW LEVEL SECURITY;
DROP POLICY IF EXISTS "lead_audits_admin_all" ON public.lead_audits;
CREATE POLICY "lead_audits_admin_all" ON public.lead_audits
  FOR ALL USING (public.is_admin()) WITH CHECK (public.is_admin());
-- No anon/member policy: the background job reads/writes via the service role only.

COMMIT;

-- ----------------------------------------------------------------------------
-- Post-migration verification (run as anon / ordinary authenticated — all denied
-- or empty):
--   select * from public.lead_audits;   -- 0 rows / permission denied
-- ----------------------------------------------------------------------------
