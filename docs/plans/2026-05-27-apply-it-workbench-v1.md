# Apply-It Workbench - v1 Design + Implementation Plan

**Source brief:** `docs/ApplyItWorkbench_ProjectDetail.md`
**Status:** Revised after review feedback. Ready to execute.
**Revision notes:** Attempt-centric API flow, concrete RLS using `public.has_vault_access`, server-only quota mutation via SECURITY DEFINER RPC, complete personal-library CRUD, model registry, CI/live-eval separation, plain-ASCII formatting to avoid mojibake.

---

## Context

The Vault today is overwhelmingly the "Learn" half of HonuVibe's "Learn AI. Apply It. Move Forward." slogan: videos, articles, prompt packs, tools. There is no native surface where members actually practice prompting with feedback. The Apply-It Workbench fills that gap: pick a scenario, write a prompt, run it against a real LLM, get scored on a named rubric, compare against an expert version, revise.

Strategically it is the strongest retention play available to Vault and a defensible differentiator -- no rubric-driven, bilingual prompting practice tool exists at scale in JP. Most foundational work (Vault tier gating, bilingual content modeling, Claude API patterns, admin authoring UI, interactive widget registry, SQL `has_vault_access` helper) already exists in the codebase, so this is mostly composition.

---

## Decisions locked in brainstorming

| Decision | Choice |
|---|---|
| Placement | Vault sub-section at `/learn/vault/workbench`; appears in `VaultSubNav`. Rationale below. |
| Schema strategy | Dedicated `workbench_*` tables, not piggybacked on `content_items` |
| Evaluator | Claude Sonnet (one call per Score) |
| Executor | Student picks the model per run from a dropdown: Claude Haiku, GPT-4o-mini, Gemini Flash |
| Daily caps | 25 runs/day/user, 10 evaluations/day/user, **enforced atomically server-side; failed provider calls do not consume quota** |
| Domains (5 scenarios each, 15 total) | Marketing & Content / Business Operations / Professional Communication |
| Languages | EN + JP at launch; both required for publish |
| API shape | **Attempt-centric**: `/run` creates the attempt, `/attempts/[id]/score` updates it |
| v1 enhancement carry-overs | Per-user daily run cap only |
| Deferred to v1.5 / v2 | Public gallery, weekly featured surface, score-gated progression, adversarial scenarios, multi-turn, embed-in-series, member-instructor authoring UI, leaderboards |

**Placement rationale (clarifying the source brief's "standalone LMS pillar" framing):** The brief positions Workbench as a fourth pillar alongside Cohorts/Community/Vault. We start under Vault because (a) access gating is identical, (b) Vault is where members spend time, so adoption is highest there, (c) we can promote to a top-level `StudentNav` entry post-launch once usage justifies it without changing routes (Next.js redirects from `/learn/vault/workbench` are trivial later). The brief's positioning is preserved; only the surfacing is conservative.

**Admin authoring vs deferred "instructor authoring UI" (clarifying scope conflict):** Admin CRUD for scenarios IS in v1. "Instructor authoring" being deferred refers to *member-instructors / non-admin contributors creating scenarios via a public UI*. HonuVibe staff (admin role) need to seed and maintain the curated 15 scenarios; that is a launch requirement.

---

## Data model

All tables RLS-enabled. Bilingual fields use `_en` / `_jp` per project convention. Helper `public.has_vault_access(auth.uid())` already exists ([supabase/migrations/041_vault_access_boundary.sql:40-71](supabase/migrations/041_vault_access_boundary.sql#L40-L71)) and is reused throughout.

### `workbench_scenarios`
- `id uuid primary key default gen_random_uuid()`
- `slug text unique not null`
- `title_en text not null`, `title_jp text` -- nullable at column level; publish validation requires both
- `domain text not null check (domain in ('marketing','operations','communication'))`
- `difficulty text not null check (difficulty in ('beginner','intermediate','advanced'))`
- `brief_en text not null`, `brief_jp text`
- `applicable_dimensions text[] not null check (cardinality(applicable_dimensions) > 0)` -- subset of `{'role','context','task','constraints','format','examples'}`; values validated in application code
- `expert_prompt_en text not null`, `expert_prompt_jp text`
- `expert_output_en text not null`, `expert_output_jp text`
- `why_this_works_en text`, `why_this_works_jp text`
- `is_published boolean not null default false`
- `is_featured boolean not null default false`
- `created_at timestamptz not null default now()`
- `updated_at timestamptz not null default now()` -- maintained by trigger (clone of `sync_vault_article_bodies_updated_at`)

**Publish-time validation (application code, not column constraint):** when admin flips `is_published = true`, server action verifies all `_en` AND `_jp` companion fields are non-null and non-empty. Returns a friendly error listing missing fields.

### `workbench_attempts`
- `id uuid primary key default gen_random_uuid()`
- `user_id uuid not null references public.users(id) on delete cascade`
- `scenario_id uuid not null references workbench_scenarios(id) on delete cascade`
- `version int not null` -- monotonic per `(user_id, scenario_id)`; assigned inside the run RPC
- `language text not null check (language in ('en','ja'))`
- `executor_model text not null check (executor_model in ('claude-haiku','gpt-4o-mini','gemini-flash'))`
- `prompt_text text not null`
- `output_text text not null` -- written on run; never null after row exists
- `scores_json jsonb` -- null until scored; shape validated by Zod in app code
- `overall_score int check (overall_score between 0 and 100)` -- denormalized for query/sort
- `strengths text[]`, `improvements text[]`
- `expert_revealed_at timestamptz` -- nullable; set when user reveals expert content
- `created_at timestamptz not null default now()`
- `scored_at timestamptz`
- **Constraints:**
  - `unique (user_id, scenario_id, version)`
  - Index `(user_id, scenario_id, version desc)` for version-history reads
  - Index `(user_id, created_at desc)` for "my recent attempts" reads

### `workbench_saved_prompts`
- `id uuid primary key default gen_random_uuid()`
- `user_id uuid not null references public.users(id) on delete cascade`
- `prompt_text text not null`
- `language text not null check (language in ('en','ja'))`
- `source text not null check (source in ('own','expert'))`
- `source_scenario_id uuid references workbench_scenarios(id) on delete set null`
- `source_attempt_id uuid references workbench_attempts(id) on delete set null` -- nullable; links a saved prompt back to the attempt it came from
- `tags text[] not null default '{}'`
- `note text`
- `created_at timestamptz not null default now()`
- `updated_at timestamptz not null default now()`
- Index `(user_id, created_at desc)`; GIN index on `tags` for tag filtering

### `workbench_daily_usage`
- `user_id uuid not null references public.users(id) on delete cascade`
- `usage_date date not null`
- `runs_count int not null default 0`
- `evaluations_count int not null default 0`
- Primary key `(user_id, usage_date)`
- **Never written from client RLS** -- all mutations go through SECURITY DEFINER RPCs (see below)

### RLS policies (concrete)

```sql
-- workbench_scenarios
ALTER TABLE workbench_scenarios ENABLE ROW LEVEL SECURITY;

CREATE POLICY workbench_scenarios_read ON workbench_scenarios
  FOR SELECT USING (
    is_published = true AND public.has_vault_access(auth.uid())
  );

CREATE POLICY workbench_scenarios_admin_all ON workbench_scenarios
  FOR ALL USING (public.is_admin()) WITH CHECK (public.is_admin());

-- workbench_attempts (user owns own; no client writes -- writes via RPC)
ALTER TABLE workbench_attempts ENABLE ROW LEVEL SECURITY;

CREATE POLICY workbench_attempts_own_read ON workbench_attempts
  FOR SELECT USING (user_id = auth.uid());

CREATE POLICY workbench_attempts_admin_read ON workbench_attempts
  FOR SELECT USING (public.is_admin());

-- No INSERT/UPDATE/DELETE policies for end users -- mutations only via
-- workbench_create_attempt() / score-update server-side using service role.

-- workbench_saved_prompts (user owns own; client writes OK)
ALTER TABLE workbench_saved_prompts ENABLE ROW LEVEL SECURITY;

CREATE POLICY workbench_saved_prompts_own_all ON workbench_saved_prompts
  FOR ALL USING (user_id = auth.uid()) WITH CHECK (user_id = auth.uid());

-- workbench_daily_usage (user can read own; NO client writes)
ALTER TABLE workbench_daily_usage ENABLE ROW LEVEL SECURITY;

CREATE POLICY workbench_daily_usage_own_read ON workbench_daily_usage
  FOR SELECT USING (user_id = auth.uid());

-- No INSERT/UPDATE/DELETE policies. All mutations via RPC below.
```

### Atomic quota RPC (the concurrency strategy)

A single SECURITY DEFINER function does the upsert + guarded increment in one statement. The route handler calls it; if it returns false the route returns 429 without calling the provider.

```sql
CREATE OR REPLACE FUNCTION public.workbench_consume_quota(
  p_user_id uuid,
  p_kind text  -- 'run' or 'score'
)
RETURNS boolean AS $$
DECLARE
  v_runs_cap constant int := 25;
  v_scores_cap constant int := 10;
  v_today date := (now() at time zone 'UTC')::date;
  v_runs int;
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

-- Refund function for failed provider calls (called only by server routes).
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
```

**Quota policy:** consume before provider call; refund on provider failure (network error, timeout, JSON parse failure after retry). Quota is NOT refunded on user-side failures (e.g., empty prompt rejected upstream of the call) because those are caught before consume. End result: 4xx-level user errors never touch quota; 5xx-level provider failures refund.

### Attempt-creation RPC

The run flow assigns a monotonic version per `(user_id, scenario_id)`. Do it server-side to avoid races:

```sql
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
```

`unique (user_id, scenario_id, version)` plus assignment inside this function makes concurrent runs safe: the second one retries with the next version number on conflict (caller wraps in a 1-retry loop).

---

## API routes (attempt-centric)

All routes call `requireVaultAccess()` first. All quota-touching routes use the RPCs above.

| Method + Route | Purpose |
|---|---|
| `POST /api/workbench/run` | Body: `{ scenarioId, promptText, language, model }`. Validates input (length cap below), consumes `run` quota, calls executor for chosen provider, calls `workbench_create_attempt` RPC, returns `{ attemptId, outputText, version, model }`. On provider failure: refunds quota, returns 502 with friendly error. |
| `POST /api/workbench/attempts/[id]/score` | Validates user owns attempt and `scored_at IS NULL`. Consumes `score` quota. Calls evaluator. Updates the attempt row with `scores_json`, `overall_score`, `strengths`, `improvements`, `scored_at`. Returns the scoring result. On provider failure: refunds quota, returns 502. Re-scoring is forbidden (one score per attempt; revise = new attempt). |
| `POST /api/workbench/attempts/[id]/reveal-expert` | Sets `expert_revealed_at = now()` on the attempt (idempotent). Returns scenario expert content. **Reveal is gated by attempt existence** -- there is no way to reveal without at least one run, because attempts only exist after a successful run. |
| `GET /api/workbench/attempts?scenarioId=` | Returns user's attempts for a scenario, newest first; for version history dropdown. |
| `GET /api/workbench/scenarios` | Browse, filter by `domain`, `difficulty`. **No language filter** -- locale drives content language. |
| `GET /api/workbench/scenarios/[slug]` | Returns scenario brief, applicable dimensions, and locale-appropriate copy. **Expert fields (`expert_prompt`, `expert_output`, `why_this_works`) are returned only if the requesting user has at least one attempt with `expert_revealed_at IS NOT NULL` for this scenario.** Until then they are stripped server-side. |
| `GET /api/workbench/saved-prompts?search=&tag=` | List, filter by search (ILIKE on prompt_text + note) and tag (array contains). |
| `POST /api/workbench/saved-prompts` | Create. |
| `PATCH /api/workbench/saved-prompts/[id]` | Edit tags, note, prompt_text. |
| `DELETE /api/workbench/saved-prompts/[id]` | Delete. |
| `GET /api/workbench/usage` | Returns today's `{ runs_count, evaluations_count, runs_cap, scores_cap }` so the UI can render the remaining budget. |

### Provider safety details
- **Prompt length limit:** 4,000 characters input (rejected client- and server-side; UI shows a counter).
- **Output token cap:** 1,200 tokens per executor call; 1,500 per evaluator call.
- **Timeout:** 25 s per provider call (AbortController, like `lib/survey/summarize.ts:175-193`).
- **Retries:** zero for the executor (return error, refund quota); one for the evaluator JSON parse only.
- **Privacy notice:** workspace renders a small disclosure under the editor: "Your prompt is sent to the selected AI provider (Anthropic / OpenAI / Google) for processing. Do not include sensitive personal data." Linked to a `/legal/ai-usage` blurb (one paragraph addition to existing legal page).

### Model registry (single source of truth)

`lib/workbench/models.ts`:

```ts
export const EXECUTOR_MODELS = {
  'claude-haiku':  { provider: 'anthropic', apiId: 'claude-haiku-4-5-20251001', label: 'Claude Haiku', envVar: 'ANTHROPIC_API_KEY',  maxTokens: 1200, temperature: 0.7, timeoutMs: 25_000 },
  'gpt-4o-mini':   { provider: 'openai',    apiId: 'gpt-4o-mini',              label: 'GPT-4o mini',  envVar: 'OPENAI_API_KEY',     maxTokens: 1200, temperature: 0.7, timeoutMs: 25_000 },
  'gemini-flash':  { provider: 'google',    apiId: 'gemini-2.0-flash',         label: 'Gemini Flash', envVar: 'GOOGLE_GENAI_API_KEY', maxTokens: 1200, temperature: 0.7, timeoutMs: 25_000 },
} as const;

export const EVALUATOR_MODEL = {
  provider: 'anthropic', apiId: 'claude-sonnet-4-6', envVar: 'ANTHROPIC_API_KEY',
  maxTokens: 1500, temperature: 0.3, timeoutMs: 25_000,
};

export function getAvailableExecutorModels(): Array<keyof typeof EXECUTOR_MODELS>;
//   returns keys whose envVar is set; server-side only
```

The dropdown in the workspace renders only models returned by `getAvailableExecutorModels()` (server-resolved). If Gemini's key isn't configured, the option doesn't appear.

---

## Pages and components

### Routes
- `app/[locale]/learn/vault/workbench/page.tsx` - scenario library (browse + filter by domain/difficulty)
- `app/[locale]/learn/vault/workbench/[slug]/page.tsx` - workspace
- `app/[locale]/learn/vault/workbench/library/page.tsx` - personal saved prompts (with search + tag filter)
- `app/[locale]/admin/workbench/page.tsx` + `[id]/page.tsx` - scenario authoring

### Components under `components/workbench/`
- `WorkbenchScenarioGrid.tsx` -- clones `components/vault/VaultBrowseGrid.tsx`
- `WorkbenchFilters.tsx` -- domain + difficulty only (no language; driven by locale)
- `WorkbenchScenarioCard.tsx`
- `WorkbenchWorkspace.tsx` -- the hero piece. Reads `attemptId` from local state after Run; passes it to Score/Reveal calls; renders rubric panel from server response on Score
- `WorkbenchVersionHistory.tsx`
- `WorkbenchRubricPanel.tsx`
- `WorkbenchCompareReveal.tsx`
- `WorkbenchSavedPromptsList.tsx` -- list + tag chips + search box + inline edit modal
- `WorkbenchSavedPromptEditor.tsx`
- `WorkbenchUsageMeter.tsx` -- small badge "12 of 25 runs left today"
- `AdminWorkbenchScenarioForm.tsx` -- bilingual form

### VaultSubNav addition
`components/vault/VaultSubNav.tsx` uses `useTranslations('vault')`. Add:
```ts
{ href: '/learn/vault/workbench', key: 'nav_workbench', icon: Sparkles, exact: false }
```
i18n key is `vault.nav_workbench` (NOT `nav.workbench` as in the prior draft).

---

## Scoring math

- Per-dimension score: integer 0-5, emitted by Sonnet, validated by Zod
- Overall: average of applicable dimensions only x 20, rounded to int 0-100. Stored in `overall_score`.
- Improvements list: at most top 3, sorted by largest score gap (5 - dim_score)
- Strengths list: at most top 3, dimensions scoring 4 or 5

---

## Evaluator engineering plan

Treat the evaluator as a deliverable, not an afterthought.

1. **Schema-first.** Zod schema defined before the system prompt; embedded as the literal target in the system prompt.
2. **Few-shot.** 2 worked examples per dimension (weak + strong), authored in both EN and JP; lives in `lib/workbench/evaluator-exemplars.ts`.
3. **JSON discipline.** Strip code fences, one retry on parse fail with error appended, second fail returns a graceful error and refunds quota.
4. **Language fidelity.** Evaluator responds in the prompt's language. Few-shot in both languages enforces this.
5. **Regression set, isolated from CI.**
   - Deterministic unit tests of evaluator code (prompt construction, JSON parsing, schema validation, fence stripping) run in normal `pnpm test:run` against a stubbed fetch.
   - **Live model calibration** runs in a separate vitest project `evaluator-live` (analogous to existing `rls` project in `package.json:13`). 20 hand-graded prompts in `__tests__/workbench/evaluator-regression.json`. Requires `ANTHROPIC_API_KEY` and an opt-in env flag (`RUN_LIVE_EVAL=1`). Manually run before any model bump or evaluator-prompt change; **never** in PR CI. Drift budget: +/-0.5 per dimension average.
   - Add `pnpm test:eval` script to `package.json`.

---

## Critical files to create / modify

**Create:**
- `supabase/migrations/0NN_workbench.sql` -- four tables, RLS policies, RPCs (`workbench_consume_quota`, `workbench_refund_quota`, `workbench_create_attempt`), `updated_at` trigger
- `lib/workbench/types.ts` -- Zod schemas + TS types
- `lib/workbench/models.ts` -- executor + evaluator registry
- `lib/workbench/executors.ts` -- multi-provider executor abstraction reading from registry
- `lib/workbench/evaluator.ts` -- Claude Sonnet evaluator
- `lib/workbench/evaluator-exemplars.ts` -- few-shot examples per dimension, EN + JP
- `lib/workbench/queries.ts` -- typed Supabase access helpers (mirrors `lib/vault/queries.ts`)
- `lib/workbench/actions.ts` -- server actions for admin scenario CRUD + publish validation
- `app/api/workbench/run/route.ts`
- `app/api/workbench/attempts/[id]/score/route.ts`
- `app/api/workbench/attempts/[id]/reveal-expert/route.ts`
- `app/api/workbench/attempts/route.ts` (GET only)
- `app/api/workbench/scenarios/route.ts` + `[slug]/route.ts`
- `app/api/workbench/saved-prompts/route.ts` + `[id]/route.ts`
- `app/api/workbench/usage/route.ts`
- `app/[locale]/learn/vault/workbench/page.tsx`
- `app/[locale]/learn/vault/workbench/[slug]/page.tsx`
- `app/[locale]/learn/vault/workbench/library/page.tsx`
- `app/[locale]/admin/workbench/page.tsx` + `[id]/page.tsx`
- `components/workbench/*` (full list above)
- `messages/en.json` + `messages/ja.json` -- new `workbench.*` namespace + `vault.nav_workbench` key
- `__tests__/workbench/` -- unit tests (always) + `evaluator-regression.json` + live calibration harness
- `vitest.config.ts` -- add `evaluator-live` project (analogous to `rls`)

**Modify:**
- `components/vault/VaultSubNav.tsx` -- add Workbench tab
- `messages/en.json` + `messages/ja.json` -- add `vault.nav_workbench`
- `app/[locale]/legal/ai-usage/page.tsx` -- short third-party AI disclosure page (or append to existing legal page if one exists)
- `.env.example` -- add `OPENAI_API_KEY`, `GOOGLE_GENAI_API_KEY` placeholders
- `package.json` -- add `test:eval` script

**Reuse without modification:**
- `lib/vault/access.ts` -- `requireVaultAccess`
- `lib/supabase/server.ts` -- `createClient`, `createAdminClient`
- `public.has_vault_access(uuid)` + `public.is_admin()` SQL helpers from migration 041

---

## Build sequence

1. **Migration + RPCs + types** (1 day) -- table SQL, RLS, three RPCs, Zod/TS types
2. **Model registry + executor abstraction + run route** (1 day) -- attempt-centric `/run` end-to-end with quota
3. **Evaluator + score route + exemplars + unit tests** (3-4 days) -- heaviest single piece, includes deterministic test scaffolding
4. **Live-eval calibration project + regression set** (1 day) -- separate vitest project, opt-in script
5. **Admin scenario CRUD** (2 days) -- bilingual form, applicable-dims checkboxes, publish validation
6. **Scenario library page** (1 day) -- clone Vault browse
7. **Workspace page** (4-5 days) -- editor + run + output + score + reveal + version history + usage meter
8. **Personal saved-prompts library (GET/POST/PATCH/DELETE + search/tags)** (1.5 days)
9. **Reveal gating + privacy disclosure page + VaultSubNav + i18n sweep** (1 day)
10. **Content authoring (parallel track, starts week 1)** -- 15 bilingual scenarios; 30-60 hours of writing time. NOT engineering work but blocks launch.
11. **Verification** -- see below

**Revised estimate: 3.5-4 weeks single-engineer for v1**, plus content authoring on a parallel track. Prior 3-week estimate was light; multi-provider execution, evaluator calibration, full library CRUD, and admin CRUD together push this. If schedule is tight, the highest-leverage cut is **drop admin CRUD from v1** and seed scenarios via SQL migration -- buys ~2 days but means non-engineer scenario edits require a developer.

---

## Verification

Before claiming v1 is done:

1. **CI green.** `pnpm verify` (type-check + tests + build) clean. Unit tests cover: prompt construction, JSON parse + retry, schema validation, quota consume/refund, attempt creation race (concurrent runs assign distinct versions).
2. **Live evaluator calibration.** `pnpm test:eval` against `__tests__/workbench/evaluator-regression.json`; 20 prompts within +/-0.5 per dimension of hand-graded baseline.
3. **Manual smoke (both languages).** As a Vault member:
   - Browse `/learn/vault/workbench`, pick a scenario
   - Write a deliberately weak prompt, run it on each available executor model, confirm distinct outputs and that each run creates a new attempt version
   - Score the latest attempt, confirm rubric panel shows per-dim scores with rationale + fix in active language; confirm `overall_score` matches the displayed value
   - Confirm re-scoring the same attempt returns an error (one-score-per-attempt rule)
   - Revise the prompt twice, confirm version history shows v1/v2/v3 with score deltas
   - Reveal expert prompt, confirm it appears only after at least one attempt exists; confirm side-by-side compare renders
   - Save expert prompt to library; edit tags + note; search by tag; delete; confirm soft tag filter ignores capitalization
   - Repeat full loop in `/ja/learn/vault/workbench` with JP scenario content and JP prompt
4. **Quota correctness.**
   - Hit 26th run, confirm 429 + UI surface and that quota counter shows 0 remaining
   - Trigger a provider failure (e.g. invalid `ANTHROPIC_API_KEY` in dev), confirm quota is refunded
   - Concurrent stress: two parallel runs from same user near the cap -- only one succeeds, no over-cap row
5. **RLS correctness.**
   - Unauthenticated `select` from `workbench_scenarios` returns 0 rows (no Vault access)
   - Free-tier user `select` returns 0 rows
   - Authenticated Vault user `select` returns published scenarios only
   - Authenticated user A cannot read user B's `workbench_attempts` or `workbench_saved_prompts`
   - Authenticated user cannot `insert`/`update` `workbench_daily_usage` directly via PostgREST
   - Add an `rls` vitest test mirroring patterns in existing `community_rls.test.ts`
6. **Reveal gate.** `GET /api/workbench/scenarios/[slug]` for a scenario with no user attempts returns scenario brief but `expert_prompt = null`, `expert_output = null`, `why_this_works = null`. After one run + reveal call, all three populate.
7. **Tier gating.** Logged out -> redirected to Vault paywall. Free user -> paywall. Vault user -> access. Admin -> access regardless of subscription.
8. **Performance.** Workspace LCP < 2.5s mobile per project budget; total page weight < 800KB initial.
9. **Accessibility.** Editor 16px font minimum (prevents iOS zoom); all interactive controls 44x44 minimum; WCAG AA contrast on rubric bars in both themes.

---

## Open items intentionally left for execution time

- Sort default on scenario library (newest vs featured first)
- Exact icon for the VaultSubNav tab
- Whether to log Plausible events per Run / Score / Reveal (recommend yes: `workbench_run`, `workbench_score`, `workbench_expert_reveal`)
- Whether `executor_model` selection persists across sessions (recommend yes -- cheap localStorage)
