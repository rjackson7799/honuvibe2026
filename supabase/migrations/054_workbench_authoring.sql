-- 054_workbench_authoring.sql — admin authoring support for the Apply-It Workbench.
--
-- jp_needs_review marks scenarios whose _jp fields were machine-translated by
-- the admin translate assist and not yet human-reviewed. It hard-blocks publish
-- (validateScenarioForPublish) until an admin marks the JP content reviewed,
-- per the project rule: never machine-translate without human review.

alter table public.workbench_scenarios
  add column if not exists jp_needs_review boolean not null default false;

comment on column public.workbench_scenarios.jp_needs_review is
  'True when _jp fields were machine-translated and not yet human-reviewed. Blocks publish until cleared.';
