-- 065_workbench_building_domain.sql — add the "building" domain to the Apply-It Workbench.
--
-- The Workbench launched with three business domains (marketing, operations,
-- communication). "building" covers product/development prompting — PRD problem
-- statements, acceptance criteria, bug repro reports, code-review briefs, data
-- model briefs — serving the builder/Studio side of the ICP.
--
-- The six rubric dimensions and the evaluator exemplars are domain-agnostic, so
-- this is purely a widening of the allowed values. TypeScript's source of truth
-- is WORKBENCH_DOMAINS in lib/workbench/types.ts — keep the two in sync.
--
-- Idempotent: drop-then-add so re-running is safe.

alter table public.workbench_scenarios
  drop constraint if exists workbench_scenarios_domain_check;

alter table public.workbench_scenarios
  add constraint workbench_scenarios_domain_check
  check (domain in ('marketing', 'operations', 'communication', 'building'));

comment on column public.workbench_scenarios.domain is
  'Scenario domain. Mirrors WORKBENCH_DOMAINS in lib/workbench/types.ts.';

-- ---------------------------------------------------------------------------
-- Validate applicable_dimensions at the database boundary.
--
-- 043 only checks the array is non-empty; the six legal values were enforced
-- solely in TypeScript. validateScenarioForPublish() does reject unknown
-- dimensions, but only on the server-action path — a raw SQL INSERT (which is
-- how the scenario library is seeded) never touches it. A typo'd slug would
-- reach evaluator.ts and throw on EVALUATOR_EXEMPLARS[dimension] lookup,
-- surfacing to the member as a generic 500.
--
-- Named distinctly so it coexists with 043's inline cardinality check rather
-- than depending on an auto-generated constraint name.
--
-- Pre-flight before applying to prod — expect zero rows:
--   select slug, applicable_dimensions from public.workbench_scenarios
--   where not (applicable_dimensions <@ array[
--     'role','context','task','constraints','format','examples']::text[]);
-- ---------------------------------------------------------------------------

alter table public.workbench_scenarios
  drop constraint if exists workbench_scenarios_dimensions_valid;

alter table public.workbench_scenarios
  add constraint workbench_scenarios_dimensions_valid
  check (
    cardinality(applicable_dimensions) > 0
    and applicable_dimensions <@ array[
      'role', 'context', 'task', 'constraints', 'format', 'examples'
    ]::text[]
  );

comment on column public.workbench_scenarios.applicable_dimensions is
  'Non-empty subset of WORKBENCH_DIMENSIONS (lib/workbench/types.ts) the evaluator scores.';
