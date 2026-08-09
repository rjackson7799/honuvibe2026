# Blue Filler — AI Opportunity Idea Engine (admin module)

**Status:** rev 5 (2026-08-08) — incorporates external review rounds 1–4. Round-4 changes: ledger corrected and re-issued as rev 2 (A1 re-attributed to Anthropic's "Measuring AI agent autonomy in practice" Fig. 6, verified live; three-layer provenance labels [T]/[V]/[H]; scope `'unknown'` where sources don't state it, `'US'` where article prose does; consulting chart↔prose discrepancy recorded; per-source limitations); field renamed `anthropicAgentToolCallSharePct` (tool-call share, NOT an adoption rate); nullable `build_sha` stored per row (exact-commit reconstruction alongside `pipeline_version`); checkpoint rule refined (citations/search_count always, findings only when non-empty; partial requires the floor); duplicate-spend wording corrected to a true bound (~$0.15 worst case). NOT built; awaiting consensus sign-off. Execute in a fresh session; the **Execution contract** (§0) supersedes `_EXECUTION_TEMPLATE.md` wherever they conflict.

**Suggested commit message:** `feat(admin): Blue Filler idea engine — generator, scoring, kill memo, web-grounded research (066)`

## Context

Ryan met with an advisor (transcript retained by Ryan outside the repo; this section is its canonical summary) whose playbook: build AI-driven SaaS in "blue filler" spaces — industries where AI's theoretical capability far exceeds observed adoption (Anthropic Economic Index) — with a light "services as software" attachment (Sequoia thesis), owned outright (no VC), built to exit at $20–30M in 2–5 years to corporate M&A teams buying tuck-ins. This module is an internal think tank at `/admin/blue-filler`: generate ideas, score them, adversarially test them, deep-research them with live web data, and learn Ryan's taste over time.

**Locked decisions (Ryan, 2026-08-08):** grade + sub-scores · web-grounded async deep research · admin-only · curated industry map. **V1 add-ons:** Kill Memo, Taste Memory, Seed from Source, Acquirer Radar. **Roadmap:** pipeline board, advisory board sim, window tracker.

**Rev 4 changes (review round 3):** source data made concrete — every industry-map figure now transcribed in **`docs/blue-filler-sources.md`** (committed ledger; executor never re-derives numbers) · skill-availability fallback defined (no fragile hard-stop) · RPC computes **both** composite and grade in SQL from `p_revised_scores` (composite↔scores now mathematically tied; `p_composite`/`p_grade` params removed) · `p_search_count` null = preserve checkpointed value (COALESCE) · `generation_error` column CHECK against the curated code list · phase-1 checkpoints after **every** response (making mid-phase-1 failure recovery real) · truncation floor rule (no-usable-text truncation → `failed 'truncated'`) · SQL helpers RAISE outside their domain · reproducibility stance stated (pipeline_version + git history of the constants file) · route-level concurrency race test with barriers · URL-normalization spec completed · harvester specified for **nested** result blocks under dynamic filtering (`caller` field) with a fixture test · terminal rows require model_id + pipeline_version (completed/partial) · text-column length CHECKs · live-run cost confirmation in the ship checklist.

---

## 0. Execution contract (supersedes `_EXECUTION_TEMPLATE.md` where they conflict)

- **New-feature build.** Creating every file in §9 is authorized; unlisted files require flagging in the completion report.
- **Data source:** `docs/blue-filler-sources.md` (rev 2) is the **canonical project input** for the industry map — direct transcriptions [T], visual estimates [V], and project-derived heuristics [H] are explicitly labeled, and the executor transcribes from it rather than re-deriving anything from memory. Values marked [V]/[H] are the project's readings/rules, not source publications' claims. Load `supabase:supabase-postgres-best-practices` before writing the migration **if available** (fallback below). API facts herein were verified against live Anthropic docs 2026-08-08.
- **Verification = §10** (template's browser walk applies only to the two new admin pages).
- **Adversarial review before commit — with fallback (round-3 fix):** preferred path is the `superpowers:requesting-code-review` sub-agent triaged with `superpowers:receiving-code-review` (installed in Ryan's CLI environment; verified in the planning session — note that other environments, e.g. the external reviewer's, may lack them). If those skills are unavailable at execution time, run the fallback: dispatch a general-purpose sub-agent over the full diff with this prompt — *"You are an adversarial reviewer. Try to refute this diff: find correctness bugs, broken repo conventions, RLS/security gaps, schema/TS drift, unhandled error paths, and missing JP-locale handling. Report every finding with file:line, severity, and a concrete failure scenario. Do not compliment; your job is to find what is wrong."* — then verify each finding against the code before acting, and record in the completion report which review path ran and every finding's disposition. **Hard-stop only if no independent review sub-agent can be dispatched at all.** Supabase-skill fallback: this plan's §1 plus migrations `060`/`064` as templates are the authority.
- **Failure/recovery:** on any §10 gate failure — stop, leave the tree uncommitted, report failing step + exact error + hypothesis, wait for Ryan. No destructive resets.
- **Rollout order (schema-first AND commit-first):** (1) all gates green → (2) `git commit` locally, **no push** → (3) apply the exact committed `066_blue_filler.sql` to prod (Supabase dashboard, project `zvfwtndbxshrtpwcwynw`); run its verification footer → (4) `git push` (Vercel deploys on push). Prod SQL traceable to an immutable commit; schema exists before code; no 500 window.
- pnpm only, main-only, hooks must pass.

---

## 1. Migration — `supabase/migrations/066_blue_filler.sql`

Style: mirror `060_lead_audits.sql` (header comment incl. §0 rollout note, `BEGIN/COMMIT`, `IF NOT EXISTS`, RLS `"<table>_admin_all"` via `public.is_admin()` USING+WITH CHECK after `DROP POLICY IF EXISTS`, no anon/member policies). Re-check the migrations dir; take the next free integer.

### `blue_filler_ideas`
- `id uuid PK gen_random_uuid()` · `created_at/updated_at timestamptz NOT NULL DEFAULT now()` (explicit updated_at per mutation; no trigger)
- `request_id uuid UNIQUE` (nullable) — idempotency key (§4; row-level only)
- `title text NOT NULL CHECK (char_length(title) BETWEEN 3 AND 120)`
- `slug text NOT NULL UNIQUE CHECK (slug ~ '^[a-z0-9-]{4,66}$')` — code-owned; the model never emits it
- `industry_key text NOT NULL` · `origin text NOT NULL DEFAULT 'cold' CHECK (origin IN ('cold','seeded','acquirer'))`
- `source_excerpt text CHECK (source_excerpt IS NULL OR char_length(source_excerpt) <= 2000)`
- `one_liner text NOT NULL CHECK (char_length(one_liner) <= 200)` · `summary_md text NOT NULL CHECK (char_length(summary_md) <= 20000)`
- `thesis jsonb NOT NULL` — `{ target_user, pain, ai_solution, service_attachment, adoption_blocker, moat_angle, mvp_scope, exit_assumptions, exit_math, exit_in_thesis_band, acquirer_hypothesis }` (exit_math/exit_in_thesis_band code-computed; jsonb field bounds enforced by zod — pg_column_size checks are brittle, so DB bounds cover text columns and zod covers jsonb interiors)
- `gen_scores jsonb NOT NULL` (conventionally immutable; test-asserted) · `current_scores jsonb NOT NULL`
- `composite int NOT NULL CHECK (composite BETWEEN 0 AND 100)` · `grade text NOT NULL CHECK (grade IN ('A','B','C','D','F'))`
- `status text NOT NULL DEFAULT 'new' CHECK (status IN ('new','shortlist','archived'))`
- `verdict text CHECK (verdict IN ('interested','pass'))` · `verdict_note text CHECK (verdict_note IS NULL OR char_length(verdict_note) <= 500)`
- `kill_memo jsonb` (success-only overwrite; zod-bounded interior)
- `model_id text NOT NULL` · `pipeline_version text NOT NULL` · `build_sha text` (nullable — `process.env.VERCEL_GIT_COMMIT_SHA ?? null` at insert; null in local dev; pins the row to the exact deployed commit)
- Indexes: `(status, composite DESC, created_at DESC)`, `(industry_key)`

### `blue_filler_research`
- `id` · `idea_id uuid NOT NULL REFERENCES blue_filler_ideas(id) ON DELETE CASCADE` · `created_at/updated_at`
- `status text NOT NULL DEFAULT 'generating' CHECK (status IN ('generating','completed','partial','failed'))`
- `raw_findings_md text CHECK (raw_findings_md IS NULL OR char_length(raw_findings_md) <= 200000)` · `report jsonb` · `summary_md text CHECK (summary_md IS NULL OR char_length(summary_md) <= 20000)` · `citations jsonb` · `revised_scores jsonb`
- `search_count int NOT NULL DEFAULT 0 CHECK (search_count >= 0)`
- `model_id text` · `pipeline_version text` · `build_sha text` (nullable; set at row INSERT, same rule as ideas)
- `generation_error text CHECK (generation_error IS NULL OR generation_error IN ('search_failed','no_citations','structuring_failed','truncated','timeout','provider_error','internal'))` — **column CHECK (round-3 fix): arbitrary strings can never enter, even via service role**
- `completed_at timestamptz`
- `UNIQUE INDEX uq_blue_filler_research_one_generating ON (idea_id) WHERE status='generating'`
- Terminal-shape CHECK `_ck` (round-3 fix — versioned provenance required on rows that carry results): `completed` requires report + summary_md + revised_scores + completed_at + `jsonb_array_length(citations) >= 1` + **model_id + pipeline_version**; `partial` requires raw_findings_md + generation_error + completed_at + **model_id + pipeline_version**; `failed` requires generation_error + completed_at (model_id/pipeline_version exempt — the stale-flipper can't know them)
- Index `(idea_id, created_at DESC)`

### SQL helpers + RPC — exact contract

```sql
-- Weights and bands mirrored from lib/blue-filler/scoring.ts; parity pinned by shared test fixtures.
-- Both helpers RAISE outside their domain (round-3 fix) — they are sources of truth, not lenient utilities.

CREATE OR REPLACE FUNCTION public.blue_filler_composite_for(p_scores jsonb)
RETURNS int LANGUAGE plpgsql IMMUTABLE AS ...
-- Validates: jsonb object with EXACTLY the six keys (gap, market, fit, speed, moat, exit),
-- each an integer 1–10; anything else RAISES. Returns round((gap*25 + market*15 + fit*15
-- + speed*15 + moat*15 + exit*15) / 10.0) — by construction 10..100, within the 0–100 CHECK.

CREATE OR REPLACE FUNCTION public.blue_filler_grade_for(p_composite int)
RETURNS text LANGUAGE plpgsql IMMUTABLE AS ...
-- RAISES if p_composite outside 0–100; else A>=80 / B>=65 / C>=50 / D>=35 / F.

CREATE OR REPLACE FUNCTION public.finalize_blue_filler_research(
  p_research_id      uuid,
  p_status           text,     -- 'completed' | 'partial' | 'failed'
  p_report           jsonb   DEFAULT NULL,
  p_summary_md       text    DEFAULT NULL,
  p_citations        jsonb   DEFAULT NULL,
  p_revised_scores   jsonb   DEFAULT NULL,
  p_search_count     int     DEFAULT NULL,
  p_generation_error text    DEFAULT NULL,
  p_model_id         text    DEFAULT NULL,
  p_pipeline_version text    DEFAULT NULL
) RETURNS jsonb   -- { "applied": boolean }
LANGUAGE plpgsql SECURITY DEFINER SET search_path = ''
```
Behavior (violations `RAISE EXCEPTION`, never coerced):
1. `p_status` ∈ the three terminal values.
2. **`completed`:** `p_report/p_summary_md/p_revised_scores/p_model_id/p_pipeline_version` non-null; `p_citations` jsonb array ≥ 1. **Composite and grade are COMPUTED here (round-3 fix — composite is now mathematically tied to scores):** `v_composite := public.blue_filler_composite_for(p_revised_scores)` (which also enforces score shape) and `v_grade := public.blue_filler_grade_for(v_composite)`. No caller-supplied composite/grade exists to disagree. `partial` requires `p_generation_error + p_model_id + p_pipeline_version`; `failed` requires `p_generation_error`.
3. CAS: `UPDATE public.blue_filler_research SET <status-appropriate fields>, search_count = COALESCE(p_search_count, search_count) /* round-3 fix: null preserves the checkpointed value */, status = p_status, completed_at = now(), updated_at = now() WHERE id = p_research_id AND status = 'generating'`. Row count 0 → `{"applied": false}`, no other writes (repeat finalization is a no-op regardless of payload).
4. If applied AND completed: `SELECT idea_id FROM the updated row` (never from the caller) → `UPDATE public.blue_filler_ideas SET current_scores = p_revised_scores, composite = v_composite, grade = v_grade, updated_at = now()`. Same transaction. `gen_scores` untouched.
5. `REVOKE ALL ON FUNCTION public.finalize_blue_filler_research(uuid,text,jsonb,text,jsonb,jsonb,int,text,text,text) FROM PUBLIC, anon, authenticated; GRANT EXECUTE ... TO service_role;` — exact 10-param signature. The two helpers are IMMUTABLE and side-effect-free; revoking them is optional (they RAISE on bad input either way).
Orphan note: `idea_id` is FK-CASCADE; orphan research rows cannot exist — documented, not tested.

## Versioning — `BF_PIPELINE_VERSION`

One constant (`'bf-pipeline-v1'`) on ideas, research rows, and kill memos. **Bump rule (documented beside the constant):** any behavior-affecting change — prompts, tool schemas/config (model IDs, max_uses, web-search version), scoring weights/bands, exit-math bounds, industry-map data. **Reproducibility stance (round-3 fix):** the map and prompts are code constants, so any historical run is reconstructable from `pipeline_version` + the git history of those files — the version labels behavior epochs; no runtime prior-snapshot column (deliberate; git is the snapshot store). Coarseness is accepted: a map-only edit advances the shared version, which is the honest signal that downstream outputs may differ. **Exact-commit pinning (round-4 fix — a version string alone doesn't identify a unique commit):** every idea and research row also stores nullable `build_sha` from `VERCEL_GIT_COMMIT_SHA`, so a production row reconstructs to the exact deployed commit; local-dev rows carry null and fall back to version + history.

## 2. Industry map — `lib/blue-filler/industry-map.ts`

~18–20 verticals. **All figures come from `docs/blue-filler-sources.md`** (round-3 fix — the ledger transcribes every number from the Sequoia quadrant chart S1 and the Anthropic Economic Index charts A1/A2/A3, with URLs, the gapTier mapping rule, the basis/scope interpretation note, and the crowded-tasks list). The file header cites the ledger; the executor transcribes from it, never from memory.

Selection: ALL 13 S1-autopilot + ALL 5 S1-next-wave verticals; watch/copilot excluded from the map (harder-mode territory named in the untargeted prompt); plus 1–2 extreme-gap entries with `sequoiaQuadrant: null` (e.g. education/library services).

Entry shape:
```ts
{ key, label,
  marketSizeUsdBn: { min: number; max: number | null },     // per ledger S1 ("$100B+" → { min: 100, max: null })
  basis: 'annual_spend' | 'annual_revenue', scope: 'US' | 'global' | 'unknown', asOfYear: number,
  // scope: 'US' only where S1 article prose states it (accounting & audit, healthcare rev-cycle);
  // 'unknown' where only the chart label exists — inferred geography is never encoded as fact
  sequoiaQuadrant: 'autopilot' | 'next_wave' | 'copilot' | 'watch' | null,
  gapTier: 'extreme' | 'high' | 'moderate',                 // per ledger A2 tier rule — [H] project heuristic
  anthropicAgentToolCallSharePct?: number,                  // ledger A1 (Fig. 6, "Measuring AI agent autonomy in practice"):
                                                            // share of one provider's sampled agent TOOL CALLS — a
                                                            // directional signal, NOT an adoption rate; prompt says so
  crowdedTasks?: string[],                                   // per ledger A3
  promptNotes: string, lastReviewedAt: 'YYYY-MM-DD',
  sourceOverrides?: { field: string; url: string; year: number }[] }
```
Field-level provenance: header maps fields → ledger sections (marketSizeUsdBn + sequoiaQuadrant ← S1; gapTier ← A2; anthropicAgentToolCallSharePct ← A1; crowdedTasks ← A3); deviations carry `sourceOverrides`. Staleness: format-validated only in tests (no calendar-triggered CI failures); surfaced in the UI ("priors reviewed {date}") and by the window-tracker roadmap; quarterly cadence stated. `buildIndustryPromptBlock()` includes quadrant, gap tier, agent share, crowded tasks, size with basis+scope+year.

## 3. Scoring — `lib/blue-filler/scoring.ts` (pure, unit-tested)

Six dimensions 1–10 (keys: gap, market, fit, speed, moat, exit): **gap** 25, others 15. `composite = round(Σ score×weight / 10)`; A ≥ 80 / B ≥ 65 / C ≥ 50 / D ≥ 35 / F. **Two computation sites, parity-pinned:** TS computes at generation-insert time; SQL (`blue_filler_composite_for` + `blue_filler_grade_for`) computes inside the RPC at research-finalize time. A shared fixture (band edges + representative score sets) is asserted against both in §10 so they can never drift. Model never emits composite/grade. `scores` zod `.strict()`. Latest completed research replaces `current_scores` wholesale via the RPC; `gen_scores` immutable; UI shows gen→current delta. QSBS is not a scoring input.

### 3a. Exit math — computed in code
Model emits assumptions only: `{ assumed_multiple: 2–10 (ARR, v1 fixed), price_point_monthly_usd: 20–20,000, target_exit_usd: 5M–100M }`. Code computes `needed_arr_usd` (nearest $10k) and `customers_needed` (ceil). Sanity bounds are deliberately wider than the $20–30M thesis: the prompt targets $20–30M and requires a justification sentence outside it; code stores `exit_in_thesis_band` and the UI badges out-of-band ideas — out-of-thesis values are surfaced, never silent. QSBS framed everywhere as a structuring hypothesis requiring qualified tax/legal review.

## 4. Idea generation — `lib/blue-filler/generator.ts` + `POST /api/admin/blue-filler/generate`

**Pattern A (forced tool_use + zod), cloning `lib/studio/audit/generator.ts`.** No `runAuthoringCall`; no `temperature`/`top_p`/`top_k`/`thinking` fields (400 on 5-series). Raw `fetch`, `anthropic-version: 2023-06-01`.

- `GENERATION_MODEL = 'claude-sonnet-5'` · `max_tokens 8000` (adaptive thinking counts toward it) · `AbortSignal.timeout(60_000)` · ~$0.03–0.06/idea. Guard `stop_reason === 'max_tokens'` and empty `tool_use.input` as typed errors.
- Route: synchronous, `maxDuration = 120`, inline `requireAdmin()`, zod body `{ request_id: uuid, industry_key?, mode?: 'cold'|'acquirer', source_text? }`. Direct INSERT; returns `{ idea }`.
- **Idempotency — row-level, not spend-level:** (1) pre-call `SELECT ... WHERE request_id = $1` → hit returns the existing idea with zero provider spend; (2) generate; (3) INSERT. Truly concurrent same-request_id calls can both invoke Claude — duplicate spend is accepted residual risk (single admin, busy button): typically ~$0.03–0.06, **true worst case ≈ $0.15** (8k output tokens at standard $15/M post-intro pricing + ~8k input at $3/M — round-4 correction: the old "≤ $0.06" was a typical figure misstated as a bound); job-table claim documented as the multi-user upgrade path. Telemetry line per generate.
- **23505 classification — lookup-based:** any insert 23505 → SELECT by request_id → found: return it (200); not found: slug collision → retry slug (retry 1: `-`+4 base36; retry 2: `-`+8 uuid chars) → re-INSERT; a second 23505 → re-run the request_id lookup (our twin may have just won) → found: return it; not found: **500, stop** (round-3: tested — the double-23505 path terminates, never loops, and never misclassifies an unrelated unique constraint because the only unique constraints on this table are request_id, slug, and the PK).
- **Slug — code-owned:** tool schema has NO slug field. Slugify title: lowercase → non-alphanumeric runs to `-` → trim → truncate 55; < 4 chars → `idea`. Matches DB CHECK.
- **`origin` precedence:** trimmed seed empty → absent; < 40 chars → 400; valid seed → `'seeded'` (acquirer block may still apply); else acquirer mode → `'acquirer'`; else `'cold'`.
- System prompt (fixed): thesis; hard constraints (AI SaaS + one-person service attachment; no physical products/marketplaces/consumer apps; weekend-MVP-able; $20–30M target with justify-if-outside; no VC; QSBS-as-hypothesis); rubric anchors referencing gapTier + anthropicAgentToolCallSharePct; adoption blocker + exit assumptions + 1–3 acquirer hypotheses required; steer around crowdedTasks; one idea via the tool.
- User content (volatile, in order): industry block · acquirer-mode block · seed block (delimited, treat-as-untrusted, angle-bracket neutralization) · taste profile (≤ 8 interested + ≤ 8 pass, any status, notes neutralized, "observations not constraints; favor recurring patterns") · dedupe (≤ 100 recent non-archived) · submit instruction.
- Tool `submit_blue_filler_idea`: title, one_liner, summary_md (≤ 8,000 chars), thesis (`.strict()`; exit_assumptions + acquirer_hypothesis; **no slug/exit_math/exit_in_thesis_band**), scores (`.strict()`), industry_key (enum-locked; single-value when targeted).

## 5. Kill Memo — `POST /api/admin/blue-filler/ideas/[id]/kill-memo`

Synchronous Pattern A (sonnet-5, `maxDuration 60`, `max_tokens 8000`, no web search). Bounded fields; `pipeline_version` inside the jsonb; success-only overwrite (failure → curated 502, previous memo retained); archived → 409.

## 6. Deep research — `lib/blue-filler/research/{phase1,run}.ts` + `/api/admin/blue-filler/ideas/[id]/research`

**Route = clone of the audit route:** `maxDuration=300`, `runtime='nodejs'`, requireAdmin, UUID regex, idea-exists (archived → 409), `flipStaleResearch` (STALE_MINUTES = 8; stale flip → `failed 'timeout'`) on POST and GET, INSERT `generating` (23505 → 409), `after(...)`, 202; GET `?poll=1` → `{latest}` else `{latest, history}`.

**Deadline model:** `RUN_BUDGET_MS = 250_000` · `PHASE2_RESERVE = 75_000` · phase-1 fetch timeout `min(90_000, deadline − now − PHASE2_RESERVE)` · continuation only if that margin ≥ 45_000, count ≤ 4 · phase-2 timeout `min(60_000, deadline − now − 15_000)` · < 30_000 left → finalize `partial 'timeout'`. STALE 480s > worst case.

**Phase 1 — web-grounded research (`RESEARCH_MODEL = 'claude-opus-5'`):**
- `tools: [{ type: 'web_search_20260318', name: 'web_search', max_uses: 12 }]` (verified live docs 2026-08-08). Dynamic filtering ON (org runs standard retention; `allowed_callers: ["direct"]` documented beside the constant as the ZDR-mode switch). `response_inclusion` left `'full'` deliberately — consumed result blocks stay in the response for citation harvesting. tool_choice omitted; no sampling/thinking params; `max_tokens 16000`.
- **Findings accumulation + per-response checkpointing (round-3 fix, refined round 4):** findings_md = concatenation of text blocks across ALL phase-1 assistant content (initial + continuations). After **every** phase-1 response, run a fenced checkpoint; `'fenced'` → stop silently. **Checkpoint contents rule (round-4 fix — never store meaningless text):** `citations` and `search_count` are always written; `raw_findings_md` is written **only when the trimmed accumulated text is non-empty** (early pause_turn responses can be all server-tool activity with no synthesis). A later failure qualifies as `partial` only when checkpointed findings meet the ≥ 200-char usable floor — citations alone never make a partial narrative appear to exist; below the floor the same failure classifies as `failed`. Cost: ≤ 5 small same-row UPDATEs per run.
- **`pause_turn` continuation contract:** preserve every request parameter and all prior `messages` entries exactly; append **one** assistant message whose content is `resp.content` verbatim — including `encrypted_content` (API requires it back unmodified; 400 otherwise); resend. No synthetic user message. Tests assert params + prior messages unchanged and exactly one appended assistant turn — not byte-equality of the body.
- **Citation harvesting — including nested blocks (round-3 fix):** with dynamic filtering, `server_tool_use`/`web_search_tool_result` pairs can appear **nested inside code-execution result blocks** carrying a `caller` field, as well as top-level. The harvester walks the full content tree (top-level blocks AND blocks inside code-execution results) plus text-block `citations` arrays. **URL normalization (round-3 fix — fully specified):** compare on `(host with leading "www." stripped + lowercased, path with trailing slash stripped, query string preserved)`, ignoring scheme, default ports, and fragments — http/https and `www.` variants of the same page dedupe; distinct query strings are distinct sources. `cited_text` ≤ 300 chars; cap 40. Fixture test uses a dynamic-filtering-shaped response (nested pairs + `caller`) — verified against the live docs' documented response shape; the executor re-checks the first real response against the fixture during the live smoke.
- **Truncation rule with floor (round-3 fix):** `stop_reason === 'max_tokens'` in phase 1 → never run phase 2. If accumulated findings text (trimmed) ≥ 200 chars → checkpoint → `partial 'truncated'`. If < 200 chars (thinking/tool blocks but no usable synthesis) → **`failed 'truncated'`** — the partial CHECK's raw_findings_md requirement is never violated.
- Server-tool errors arrive as HTTP-200 error-object content (`too_many_requests|invalid_tool_input|max_uses_exceeded|query_too_long|request_too_large|unavailable`); empty results array = no-match, not an error. Accumulate `search_count` from `usage.server_tool_use.web_search_requests`.

**Phase 2 — structuring (`claude-sonnet-5`, Pattern A):** forced tool `submit_blue_filler_report`, `max_tokens 12000`, zod → `report` + `revised_scores`; `summary_md` built in code; input delimited + neutralized.

**Outcomes — all through `finalize_blue_filler_research` (§1; composite/grade computed in SQL):** phase 2 ok + ≥1 citation → `completed` (atomic idea refresh). Zero citations → `partial 'no_citations'`. Phase-2 failure → `partial 'structuring_failed'`. Truncation → per the floor rule. Out of time → `partial 'timeout'`. Phase 1 unusable → `failed 'search_failed'`.

**Provider-error classification:**

| Failure | Phase 1, nothing checkpointed yet | Phase 1, findings checkpointed (real via per-response checkpoints) | Phase 2 | Generate/kill-memo routes |
|---|---|---|---|---|
| `AbortSignal` timeout | `failed 'timeout'` | `partial 'timeout'` | `partial 'structuring_failed'` | 502 curated |
| Network/DNS failure | `failed 'provider_error'` | `partial 'provider_error'` | `partial 'structuring_failed'` | 502 curated |
| Anthropic 400 (incl. org-disabled web search) | `failed 'provider_error'` (log loud) | `partial 'provider_error'` | `partial 'structuring_failed'` | 502 curated |
| Anthropic 401/403 | `failed 'provider_error'` (log loud) | `partial 'provider_error'` | `partial 'structuring_failed'` | 502 curated |
| Anthropic 429 | `failed 'provider_error'` (no auto-retry; manually re-runnable) | `partial 'provider_error'` | `partial 'structuring_failed'` | 502 curated |
| Anthropic 5xx/529 | `failed 'provider_error'` | `partial 'provider_error'` | `partial 'structuring_failed'` | 502 curated |
| Response not valid JSON | `failed 'provider_error'` | `partial 'provider_error'` | `partial 'structuring_failed'` | 502 curated |
| Valid JSON, no usable text/blocks | `failed 'search_failed'` | `partial 'search_failed'` | `partial 'structuring_failed'` | 502 curated |
| Zod rejection / empty tool input / phase-2 max_tokens | n/a | n/a | `partial 'structuring_failed'` | 502 curated |
| DB/RPC failure at finalize | console.error only; row stale-flips to `failed 'timeout'` at 8 min | same | same | 500 curated |
| Any unclassified exception (top-level catch-all) | `failed 'internal'` | `partial 'internal'` | `partial 'internal'` | 500 curated |

"Findings checkpointed" in this table means checkpointed `raw_findings_md` meeting the ≥ 200-char usable floor — an empty or sub-floor checkpoint does NOT count, and the same failure classifies as `failed` (the partial CHECK enforces non-null findings; the floor rule enforces *usable* findings). Stale flips use `'timeout'` (the flipper can't distinguish crash from slowness — audit-engine convention). Raw exceptions/provider bodies → console only, never DB, never client.

**Retention/privacy:** Standard API retention (up to 30 days) unless a different agreement applies. Sonnet 5 and Opus 5 are ZDR-eligible; the mandatory 30-day rule applies to designated covered models (e.g. Fable 5), not used here. Feature-level: dynamic-filtered web search runs through code execution, not ZDR-eligible by default — hence the documented `["direct"]` switch. Org currently runs standard retention; full seed text + taste notes + idea context go to the API under it; only the 2,000-char excerpt is stored; seed UI warns against secrets/regulated data. Executor confirms org/workspace retention config at build time.

**Cost:** ≈ $0.50–1.00/run typical (12 searches ≈ $0.12 + opus tokens); worst case ≈ $1.50 with maximum continuations. Explicit per idea, never auto-triggered; telemetry on finalize.

## 7. Taste Memory & actions — `lib/blue-filler/actions.ts`
Mirrors `lib/workbench/actions.ts`: private `requireAdmin()`, zod, `createAdminClient()`, explicit `updated_at`, `revalidatePath`. `updateIdeaStatus`, `updateIdeaVerdict` (clearable). Neither touches scores.

## 8. UI
As rev 3: list + detail pages (`notFound()` on bad id), GeneratePanel (mode toggle, industry select, seed textarea + no-secrets helper, fresh `request_id` per click, busy state, "priors reviewed {date}"), IdeasTable (chips; composite DESC, created_at DESC, id DESC; 200-row cap surfaced), KillMemoPanel, ResearchPanel (POLL_MS 5000, unmount cleanup — component-tested), exit-math card (thesis-band badge + QSBS disclaimer), StatusBadge additions, AdminNav entry (mobile flat-scroll issue flagged, out of scope). Archived: excluded from dedupe; research/kill-memo 409; verdicts still count; history viewable; no hard-delete UI. A11y: score-bar `aria-label`s, chips `aria-pressed`, research `aria-live="polite"`, busy = `disabled` + label swap.

## 9. Build order
1. `supabase/migrations/066_blue_filler.sql` (tables + helpers + RPC + RLS + CHECKs) — data source for nothing; schema only
2. `lib/blue-filler/industry-map.ts` (from `docs/blue-filler-sources.md`) → 3. `types.ts` → 4. `scoring.ts` → 5. `schemas.ts`
6. `generator.ts` → 7. `research/phase1.ts` → 8. `research/run.ts` → 9. `queries.ts` → 10. `actions.ts`
11–13. API routes (generate, kill-memo, research) → 14–19. Components + pages + StatusBadge + AdminNav → 20. Tests

## 10. Verification

### Unit tests (vitest `app` project; jsdom + RTL configured; templates: `__tests__/api/studio-lead-audit.test.ts`, `__tests__/api/prospects.test.ts`, `__tests__/workbench/authoring.test.ts`)
- **scoring:** weights sum 100; band edges; monotonicity; exit-math rounding/ceil/rejections; `exit_in_thesis_band` edges; **shared parity fixture exported** (band-edge composites + representative score sets → expected composite/grade) consumed by both the TS tests and the RLS suite's SQL-helper assertions.
- **schemas:** `.strict()`; ranges; unknown industry_key; tool schemas contain no slug/exit_math; citation shape + truncation.
- **industry-map:** unique keys; provenance fields + `lastReviewedAt` format; every `marketSizeUsdBn`/quadrant value matches ledger S1 (test imports a small transcription of the ledger table to pin the map to it); **scope rule enforced — exactly the two prose-stated entries (accounting & audit, healthcare rev-cycle) are `'US'`, no S1 entry is `'global'` without a `sourceOverrides` justification, all others `'unknown'`**; `anthropicAgentToolCallSharePct` values match ledger A1; deviations carry `sourceOverrides`; deterministic prompt block includes the not-an-adoption-rate framing.
- **generator (mocked fetch):** pause_turn contract; continuation caps; per-response checkpoint calls (initial + each continuation) — **including the round-4 rule: a response with no synthesis text checkpoints citations/search_count but does NOT write raw_findings_md, and a failure after only sub-floor text classifies as `failed`, not `partial`**; HTTP-200 error-object handling per table; truncation floor (≥200 → partial path, <200 → failed path, phase 2 never invoked); empty tool input; **harvester fixture with dynamic-filtering shape** (nested `server_tool_use`/`web_search_tool_result` pairs carrying `caller`, plus top-level blocks and text-block citations) + URL-normalization cases (www/scheme/port/fragment collapse; query preserved); taste-profile balance + neutralization; seed neutralization; origin precedence; slug spec.
- **research run (mocked supabase):** fence after stale flip; checkpoint failure aborts before phase-2 spend; every error-table row → exact curated code; RPC called WITHOUT composite/grade (computed in SQL); RPC payload never includes gen_scores.
- **routes (mocked deps):** 401/403/400 ×3; research double-POST 409; generate 23505 classification (request_id-found → 200; not-found → slug retry; **double-23505 → re-lookup → 500, terminates**); pre-call SELECT short-circuits provider; insert paths populate `build_sha` from `VERCEL_GIT_COMMIT_SHA` when present (null otherwise); **route-level concurrency race (round-3 fix):** two concurrent route invocations, same request_id, provider mocked with a controlled barrier (both enter generation; inserts race) → both resolve to the SAME idea id, exactly one row "inserted"; provider failures → curated 502/500 with no raw content.
- **component (RTL + fake timers):** ResearchPanel polls at 5s while generating; stops on terminal; **unmount clears the interval (no fetches after unmount)**; error responses stop polling without crashing.

### RLS/integration suite — `supabase/tests/blue_filler_rls.test.ts` (`pnpm test:rls`; 066 applied locally; 022/025 rename dance)
1–6. anon/non-admin SELECT+INSERT denied, admin CRUD, service-role writes — both tables. 7. ideas CHECKs (grade/origin/status/composite/slug/title/summary/source_excerpt bounds). 8. research CHECKs (terminal shapes incl. citations ≥ 1, model_id+pipeline_version on completed/partial, **generation_error code list**, text bounds). 9. one-generating 23505. 10. DB concurrency: `Promise.all` double insert same request_id → one row. 11. **RPC + helper matrix:** EXECUTE denied to anon/authenticated; invalid `p_status` RAISEs; malformed `p_revised_scores` (missing/extra/out-of-range/non-integer key) RAISEs via `blue_filler_composite_for`; `blue_filler_grade_for` RAISEs outside 0–100; **SQL composite + grade match the TS parity fixture on every entry**; completed without citations RAISEs; `p_search_count = NULL` preserves the checkpointed value; success updates research AND its own idea atomically, unrelated idea untouched, `gen_scores` byte-identical; repeat finalization → `applied:false`, row unchanged.

### Gate & review
`pnpm verify` (`NODE_OPTIONS=--max-old-space-size=8192`); adversarial review per §0 (preferred skill path or documented fallback).

### Verification checklist (execution session flips these)
- [ ] Unit + component tests green inside `pnpm verify`
- [ ] `pnpm verify` clean
- [ ] `pnpm test:rls` green for the full matrix incl. concurrency, RPC semantics, parity fixture
- [ ] Adversarial review done (path used recorded); findings triaged with reasons
- [ ] `/admin/blue-filler` renders EN + `/ja` (no console errors/warnings)
- [ ] Generate: cold + acquirer + seeded ideas; same-request_id double-submit returns the same idea
- [ ] Kill Memo generates; simulated failure retains previous memo
- [ ] **Live research run (confirm before running: invokes Opus 5 + up to 12 web searches, expected ≤ ~$1.00, worst case ~$1.50):** generating → completed, ≥1 citation, first real response spot-checked against the harvester fixture shape, idea grade/scores updated atomically (list and detail agree)
- [ ] Verdict saved; taste-profile injection asserted via prompt-builder test
- [ ] Research double-POST 409; research/kill-memo on archived idea 409
- [ ] A11y spot-check (chips, score bars, aria-live)
- [ ] **Ship: gates green → commit (no push) → apply committed 066 to prod → verify footer → push**

## 11. Roadmap (designed-toward, not built)
Pipeline board (status widening, artifact tables, PDF/DOCX reuse, server-side pagination) · advisory board sim (incl. the tax lens where QSBS analysis belongs) · window tracker (adoption re-checks; automates `lastReviewedAt`). Not chosen: idea tournaments.

## Risks
Duplicate spend on truly-concurrent same-request_id generates (accepted; typically ~$0.03–0.06, worst ≈ $0.15; upgrade path documented) · pause_turn runaway (deadline + ≤4 cap) · 200-with-error-content (mapped) · 5-series param rules (no sampling/thinking; max_tokens includes thinking) · prompt injection via web/seed/verdict text (delimiters + neutralization + sanitized markdown) · priors staleness (ledger + UI surfacing + quarterly cadence) · dynamic-filtering response-shape drift (fixture + live-smoke spot-check) · mobile admin nav (pre-existing, flagged) · JP locale (convention).
