# Study Paths Review — Findings + Fix Plan

## Context

Ryan asked for a review of the Study Paths feature (shipped 2026-03-10, commit `377f3a0`): is it working, and is it adding value to the learning experience?

**Verdict: the generation engine works and is well-built, but the feature leaks almost all of its value after the moment of creation.** A student can create a path and study it in that session — but once they navigate away, there is **no way in the entire UI to get back to it**. Paths are effectively single-session artifacts, which defeats the point of a multi-week curriculum.

## What's working (verified by reading the code end to end)

- **Generation pipeline** (`lib/paths/generate.ts`, `app/api/learn/paths/generate/route.ts`): auth → validation → 3/day rate limit → tier-filtered catalog of published `content_items` → Claude call → Zod validation → catalog-ID cross-check → persist + telemetry log (tokens, timing, prompt version). Solid engineering.
- **Study view** (`components/learn/StudyPathView.tsx`): progress bar, next-up sequencing, mark-complete with path auto-completion, premium item locking, archive.
- **Security**: RLS on `study_paths`/`study_path_items` (migration 001), plus explicit ownership checks in every route. No holes found.
- **i18n**: the `study_paths` namespace is complete and in sync in both `en.json` and `ja.json`.
- The uncommitted `new/page.tsx` diff (DashboardPageHeader restyle) is self-consistent and safe to keep.

## Defects found (ranked)

### P0 — value-destroying
1. **No paths list page.** `app/[locale]/learn/paths/` has only `new/` and `[id]/`. `PathCard.tsx`, `GET /api/learn/paths`, `getUserPaths()`, and i18n keys `your_paths`/`no_paths`/`create_new` were all built for a list view that was never wired up — they are orphaned.
2. **Sidebar "Study Paths" points at the creation form** (`components/learn/StudentNav.tsx:39` → `/learn/paths/new`). Combined with #1 and #3, a returning student cannot reach an existing path except via browser history.
3. **Dashboard never surfaces paths.** `app/[locale]/learn/dashboard/page.tsx` has zero references to study paths — no "continue your path" card.

### P1 — broken affordances
4. **"Regenerate" from a saved path is dead.** `StudyPathView.tsx:223-227` pushes `/learn/paths/new?regenerate={id}`, but nothing reads that param — user lands on a blank form. (In-preview regenerate works.)
5. **Deprecated model.** `claude-sonnet-4-20250514` (hardcoded at `lib/paths/generate.ts:12` and `lib/paths/queries.ts:115`) retires **June 15, 2026**. Replacement: `claude-sonnet-5` — requires removing `temperature: 0.3` (Sonnet 5 rejects non-default sampling params) and re-checking token headroom (~30% more tokens; keep `MAX_TOKENS` 4000+ or raise).
6. **Tier divergence.** Generation uses `subscription_tier === 'vault'` only, while viewing uses `hasPremiumAccess()` (admin/trialing/grace). Admins and trialing users generate from the free-only catalog. Fix: use `hasPremiumAccess()` in `generate/route.ts` too.

### P2 — polish / hardening
7. Hardcoded English strings: "Try again" + fetch error messages in `PathIntakeFlow.tsx`; "English"/"Japanese", "Premium", "min" in form/item components.
8. No timeout/`maxDuration` on the generation route; no `AbortController` on the Anthropic fetch.
9. Claude returning a duplicate `content_item_id` violates `UNIQUE(path_id, content_item_id)` and fails the whole insert — dedupe items before insert in `createPath`.
10. Zod allows 3–20 items vs. prompt's 8–15; `'regenerating'` status is never used; zero test coverage for `lib/paths/*`.

## Recommended plan (one unit, ~half-day)

### A. Make paths reachable again (P0)
- **New list page** `app/[locale]/learn/paths/page.tsx`: server component, `getUserPaths(user.id)` (reuse existing query), render existing `PathCard` grid + empty state using the already-translated `your_paths`/`no_paths`/`create_new` keys, "Create new path" CTA → `/new`. Show active paths first, archived collapsed/hidden.
- **Repoint sidebar** `StudentNav.tsx:39` → `/learn/paths`.
- **Dashboard card**: on `learn/dashboard/page.tsx`, if the user has an active path, render a compact "Continue your path" card (title + progress + link) via `getUserPaths`; otherwise nothing.

### B. Fix broken affordances (P1)
- **Regenerate**: change `StudyPathView` button to call `POST /api/learn/paths/{id}/regenerate` directly (with an optional feedback prompt), then `router.push` to the returned new path id. Remove the dead `?regenerate=` navigation and phantom href.
- **Model bump**: `claude-sonnet-5` in `generate.ts:12` (single source — export it and import in `queries.ts:115`), drop `temperature`, keep max_tokens ≥4000.
- **Tier fix**: use `hasPremiumAccess()` (already in `lib/paths/access.ts`) in `generate/route.ts` to pick the catalog tier.

### C. Small hardening (P2, same pass)
- i18n the hardcoded strings (add keys to `study_paths` in both locales).
- Dedupe items by `content_item_id` in `createPath` before insert.
- Add `export const maxDuration = 60` to generate/regenerate routes + AbortController (45s) on the Anthropic fetch.
- Remove the now-orphaned `create_title` key (superseded by `page_title` in the uncommitted diff) — or keep if reused on the list page.

Skipped deliberately: linking path-item completion to course completion (bigger design question), tests for `lib/paths/*` (worth a follow-up unit), `'regenerating'` status cleanup.

## Verification
- `pnpm verify` (type-check → tests → build). No migrations touched, so no `test:rls` run needed.
- Browser smoke EN + `/ja`: create path → leave → return via sidebar list → continue item → regenerate → archive.
- Confirm one real generation succeeds on `claude-sonnet-5` (watch `path_generation_logs` row for tokens/model).
- Adversarial review pass (code-reviewer sub-agent) before commit, per dev workflow.

## Key files
`app/[locale]/learn/paths/page.tsx` (new), `components/learn/StudentNav.tsx`, `app/[locale]/learn/dashboard/page.tsx`, `components/learn/StudyPathView.tsx`, `components/learn/PathCard.tsx` (reuse), `lib/paths/generate.ts`, `lib/paths/queries.ts`, `app/api/learn/paths/generate/route.ts`, `messages/en.json`, `messages/ja.json`.
