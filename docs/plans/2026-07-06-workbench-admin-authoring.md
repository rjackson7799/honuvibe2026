# Workbench Admin Authoring Overhaul + Reveal-Gate Tightening

> On approval, copy this plan to `docs/plans/2026-07-06-workbench-admin-authoring.md` (project convention) before executing.

## Context

The Apply-It Workbench (`docs/plans/2026-05-27-apply-it-workbench-v1.md`) is the strategy-designated "fourth pillar" and moat: members practice prompting on curated scenarios, run against real models, get Sonnet-evaluated rubric scores, and compare with an expert answer. The member side is well built; the **admin authoring side is the bottleneck** — one 351-line form where Ryan hand-types 7 bilingual field pairs with zero AI assistance, no live publish checklist, no preview, no duplication, and an info-poor list view. Scenario production speed directly caps the moat's growth.

Ryan approved: full admin overhaul with **all four AI assists** (draft-from-idea, EN→JP translate, generate expert output, evaluator sanity-check) plus **tightening the expert-reveal gate** to require a scored attempt (today any throwaway run unlocks the expert answer, short-circuiting the practice loop).

Member-side moat items (saved-prompt library, progress dashboard, public demo, persisting per-dimension coaching text) are explicitly **out of scope** — next plan.

## Key decisions

- **AI assists as admin API routes** under `app/api/admin/workbench/*` (not server actions) — mirrors the existing `app/api/admin/courses/translate/route.ts` pattern (inline admin gate, `export const maxDuration`), allowing long AI calls.
- **Conventions**: direct `fetch` to `api.anthropic.com` (anthropic-version `2023-06-01`), `parseJsonFromClaude` from `lib/courses/json-response` with one corrective retry, zod validation, typed errors — exactly like `lib/workbench/evaluator.ts`. **No Anthropic SDK / AI SDK.**
- **Machine-translation marker**: new `jp_needs_review boolean` column (migration **054** — highest existing is 053) set when JP fields are AI-filled; it **hard-blocks publish** until Ryan marks JP reviewed (CLAUDE.md: never machine-translate without human review).
- **Sanity-check is advisory only** (score shown next to Publish, not a gate) — evaluator variance makes a hard gate flaky; the human is the gate. Note: it scores the expert prompt against itself as reference — a low score is exactly the signal we want.
- **Reveal grandfathering**: attempts with `expert_revealed_at` already set keep expert access; the tightened gate applies to new reveals only.

## Phase 1 — Correctness fixes (no migration, commit green)

1. **attempt_count aggregate** — `lib/workbench/queries.ts` `getAdminWorkbenchScenarios()` (currently pulls ALL `workbench_attempts` rows into JS, lines ~91–98): switch to PostgREST embedded count `select('*, workbench_attempts(count)')`, map `attempt_count: row.workbench_attempts?.[0]?.count ?? 0`. Verify locally; fallback = small view/RPC folded into migration 054.
2. **Zod on admin writes** — add `createWorkbenchScenarioSchema` / `updateWorkbenchScenarioSchema` (partial) to `lib/workbench/types.ts` reusing existing `workbenchDomainSchema`/`workbenchDifficultySchema`/`workbenchDimensionSchema`; `.parse()` inputs in `createScenario`/`updateScenario` in `lib/workbench/actions.ts` (precedent: `lib/admin/course-survey-actions.ts:41`).
3. **Reveal-gate tightening**:
   - `lib/workbench/queries.ts`: `userHasScoredAttempt(scenarioId)` — session client (RLS-scoped), `.not('scored_at','is',null).limit(1)`.
   - `app/api/workbench/attempts/[id]/reveal-expert/route.ts`: if the attempt isn't scored and the user has no scored attempt for the scenario → 403.
   - `components/workbench/WorkbenchWorkspace.tsx:437`: `canReveal={attempts.some(a => a.scored_at != null)}` (local state updates after Score, so it flips live).
   - Copy: `messages/en.json:2254` + `ja.json:2254` `ws_reveal_hint` → "Score at least one attempt to compare with the expert version." / 「お手本と比較するには、まず1回スコアを取得してください。」

## Phase 2 — List overhaul + duplicate (commit green)

1. **`duplicateScenario(id)`** server action in `lib/workbench/actions.ts`: copy all content fields, `title_en + ' (copy)'`, unpublished/unfeatured, collision-safe slug via pure helper `nextCopySlug(baseSlug, takenSlugs)` (unit-tested).
2. **Rewrite `components/admin/AdminWorkbenchScenarioList.tsx`** as `'use client'`, mirroring `components/admin/AdminVaultList.tsx`:
   - Filter pills (All/Published/Draft/Featured) + domain/difficulty selects + title/slug search (client-side; scenario count small).
   - Status via existing `components/admin/StatusBadge.tsx` (`published`/`draft` styles exist); dimension **name chips** instead of a count.
   - Per-row quick actions: Publish/Unpublish, Feature/Unfeature, Duplicate (→ new scenario's edit page), via `useTransition` + `router.refresh()`, inline error text on publish-validation failure.

## Phase 3 — Migration 054, form restructure, member preview (commit green)

1. **`supabase/migrations/054_workbench_authoring.sql`**: `alter table workbench_scenarios add column jp_needs_review boolean not null default false;` (+ comment). Column-only; inherits existing RLS.
2. **Publish gate** — `lib/workbench/validation.ts` `validateScenarioForPublish`: when `jp_needs_review` is true, add error "Japanese content is machine-translated — review it and mark JP as reviewed." Extend `lib/workbench/validation.test.ts`.
3. **Form restructure** — split `components/admin/AdminWorkbenchScenarioForm.tsx` into an orchestrator (single `draft` state + JSON-snapshot dirty tracking + `beforeunload`/back-link guard) with sections **Basics / English content / Japanese content** (JP section: "Mark JP as reviewed" checkbox + per-field machine-translated tag until edited), plus:
4. **`components/admin/AdminWorkbenchPublishPanel.tsx`** — right-hand panel: **live publish checklist** (run pure `validateScenarioForPublish` client-side against form state; "save first" hint when dirty since server re-validates the saved row), status badges, Publish/Unpublish/Feature/Delete, sanity-check widget slot (Phase 4), Preview link.
5. **Member preview** — `app/[locale]/admin/workbench/[id]/preview/page.tsx` + `components/admin/AdminWorkbenchPreview.tsx`: banner "Preview — this is what members see", workspace-style header/brief/dimension chips, expert compare via **reusing `components/workbench/WorkbenchCompareReveal.tsx`** with `expert` pre-populated and no-op reveal. EN/JA toggle = link to `/ja/admin/...` counterpart.
6. **Prod note**: apply 054 in the Supabase SQL editor (`zvfwtndbxshrtpwcwynw`) at deploy time — saves write `jp_needs_review` and 500 until then.

## Phase 4 — AI assists (commit green)

1. **`AUTHORING_MODEL`** in `lib/workbench/models.ts`: anthropic `claude-sonnet-4-6`, maxTokens 4000, temp 0.7 (translate overrides to 0.2), 60s timeout.
2. **`lib/workbench/authoring.ts`** — mirrors `evaluator.ts` (typed `AuthoringError`: CONFIG/PROVIDER/PARSE/SCHEMA; `parseJsonFromClaude` + one retry; zod):
   - `buildDraftPrompt` / `generateScenarioDraft` → `{ title_en, slug, brief_en, expert_prompt_en, expert_output_en, why_this_works_en, applicable_dimensions }`. System prompt: author ONE scenario as raw JSON; brief is 2–4 sentences, second person, must NOT hint at prompt techniques; pick the 3–5 dimensions the scenario naturally exercises (beginner ≈3, advanced ≈5–6); expert prompt should score 5/5 on each chosen dimension; difficulty calibration guidance.
   - `buildTranslatePrompt` / `translateScenarioToJp` → all `_jp` fields. Adapt `TRANSLATION_SYSTEM_PROMPT` from `lib/courses/translator.ts` (です/ます form, katakana tech terms, natural not literal); `expert_prompt_jp` must read like a prompt a Japanese member would actually write.
3. **API routes** (each: inline admin gate per `app/api/admin/courses/create/route.ts`, zod body, `maxDuration = 120`, typed-error → 502):
   - `app/api/admin/workbench/draft/route.ts` — `{ idea, domain, difficulty }` → draft result.
   - `app/api/admin/workbench/translate/route.ts` — EN fields → JP fields.
   - `app/api/admin/workbench/expert-output/route.ts` — `{ promptText, model }` → `{ outputText }` via existing `runExecutor` (`lib/workbench/executors.ts`), `maxDuration = 60`.
   - `app/api/admin/workbench/sanity-check/route.ts` — form fields + language → real `evaluateAttempt` on a synthetic scenario/attempt; no persistence, no quota (admin-only, ~1 Sonnet call).
4. **Form integration**:
   - `components/admin/AdminWorkbenchDraftAssist.tsx` (create mode only): idea input → prefills EN fields/dimensions/slug (confirm before overwriting non-empty fields; never auto-saves; banner "AI draft — review everything before saving").
   - **Translate button** in JP section header (enabled once required EN fields present): fills JP fields, sets `jp_needs_review: true`.
   - **Generate-with-executor button** under expert output (EN; JP when `expert_prompt_jp` present): executor model select + confirm-overwrite.
   - **Sanity-check widget** in the publish panel: overall /100 + per-dimension chips + improvements; copy "Advisory — a strong expert prompt should score 90+. Does not block publish."

## Tests (vitest, existing patterns)

- Extend `lib/workbench/validation.test.ts`: `jp_needs_review` blocks/clears publish; `nextCopySlug` cases.
- New schema tests: create/update zod (bad slug, unknown domain/dimension, empty dimensions).
- `lib/workbench/authoring.test.ts` (pure): prompt builders contain idea/domain/JSON-shape instructions; result schemas accept/reject.
- `__tests__/workbench/authoring.test.ts` (fetch-mocked, mirrors `__tests__/workbench/evaluator.test.ts`): happy path, fenced-JSON recovery, retry-then-PARSE_ERROR, missing key → CONFIG_ERROR, SCHEMA_ERROR.

## Verification

1. `pnpm verify` green after **every phase** (note: 4 pre-existing marketing-routes.test.ts failures on main are not ours).
2. Phase 3 adds a migration → `pnpm test:rls` (temp-rename duplicate survey migrations 022/025 first, restore after).
3. Browser smoke EN + `/ja`:
   - Admin: list filters/search/quick actions/duplicate; draft assist → edit → create; translate → machine-translated tags + publish blocked → mark reviewed → publish; executor-generated expert output; sanity-check scores render; preview page both locales.
   - Member: Reveal disabled with new hint before scoring; enables right after Score; previously-revealed scenarios still show expert content.
4. Ship per workflow (adversarial review → commit to main → push); **apply 054 manually in prod Supabase SQL editor after deploy**.

## Risks / open items

- `jp_needs_review` as a **hard** publish gate adds one admin step — soft fallback (warning + confirm) is a one-line change later, no schema change.
- PostgREST embedded `count` is unused in this codebase so far — verify in Phase 1; fallback view in 054.
- Grandfathered reveals (revealed-but-never-scored) intentionally keep access.
- Executor/authoring env keys must be present in Vercel for the assist routes (already required by member runtime).
