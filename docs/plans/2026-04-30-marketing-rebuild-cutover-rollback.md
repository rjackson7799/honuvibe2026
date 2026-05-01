# Marketing Rebuild — Production Cutover & Rollback Plan

> Plan saved here per the user's durable preference (`docs/plans/`, not `.claude/plans/`).

## Context

The marketing visual rebuild (Phases 0–6) is fully merged on `main` as of 2026-04-27 (`9bd115f`). Local dev shows the new light-mode marketing surface; **production at `honuvibe.ai` still serves the old dark design** (visual confirmation: DM Serif Display "A Whole New Vibe" hero, `/build` still in nav — `/build` was deleted in `3d5c05e`).

The next Vercel production deploy is the cutover. Ryan wants:
1. A guaranteed rollback path that does **not** depend on Vercel deployment retention alone.
2. To know whether we can "fork" — i.e., snapshot the live old design as a permanent reference point.

**Yes, we can fork.** A `legacy-dark-design` branch off the currently-deployed commit gives us a permanent git anchor and (because Vercel auto-deploys branches) a permanently-live preview URL of the old design — independent of how long Vercel keeps the old prod build around.

## Recommended approach (do all four, in order)

### 1. Identify the currently-deployed production commit

The screenshot proves prod is pre-`d7e9030` (Phase 0 foundation). The most likely candidate is `08736f5` (the commit immediately before Phase 0), but Vercel may be on something even older. Confirm in the Vercel dashboard:

- Vercel → `honuvibe-ai` project → Deployments → filter "Production" → top entry → copy the commit SHA.
- Sanity check: `git show <sha> -- app/[locale]/page.tsx` should show the **old** `<HeroSection>` composition, not `<MarketingShell>`.

Call this commit `$PROD_SHA`. Everything below depends on it.

### 2. Fork: create a `legacy-dark-design` branch + tag

This is the durable insurance. It costs nothing and survives any Vercel retention policy.

```bash
git tag legacy-dark-design-prod $PROD_SHA
git branch legacy-dark-design $PROD_SHA
git push origin legacy-dark-design-prod legacy-dark-design
```

Outcomes:
- **Tag** `legacy-dark-design-prod` is the immutable git anchor.
- **Branch** `legacy-dark-design` triggers a Vercel preview build → URL like `honuvibe-2026-git-legacy-dark-design-<scope>.vercel.app`. This is a permanently-live old-design URL. Bookmark it.
- If we ever need to fully revert main to the old design: `git checkout main && git reset --hard legacy-dark-design-prod && git push --force-with-lease` (destructive — only after Ryan approves; better path is option 4 below).

### 3. Cutover via Vercel Rolling Releases (do not hard-promote)

Vercel Rolling Releases (GA June 2025) is the right tool. Stage the cutover:

- Merge/push `main` to trigger the new prod build (or click "Promote to Production" on a verified preview).
- In the Vercel dashboard for the project, configure the production deployment as a **rolling release** at e.g. 5% → 25% → 50% → 100% with manual step gates.
- Watch metrics between steps: error rate, LCP, conversion (course enroll clicks via Plausible).
- **Abort with one click** at any stage — that instantly returns 100% traffic to the previous production deployment with no git churn.

If Rolling Releases isn't enabled on the project, alternative: do a normal promote, then keep a browser tab open on Vercel → Deployments → previous prod → "Promote to Production" button armed.

### 4. Rollback playbook (post-cutover, if something breaks)

In order of preference:

| Severity | Action | Time | Notes |
|---|---|---|---|
| Site-wide regression | Vercel dashboard → previous prod deployment → **Promote to Production** | ~10s | Atomic. No git changes. The default rollback. |
| Single page broken (e.g. `/learn` form bug) | Hotfix forward — edit `app/[locale]/learn/page.tsx` and ship | ~5 min | New design components are intact; usually faster than reverting one page. |
| Single page must serve old design temporarily | `git revert` the page-swap commit only (123f1d8 home / 5ea34f6+swap learn / 48dda02+swap explore / a6de682+swap about / fcf4a8e+swap contact / b0f5e4b+swap partnerships) | ~10 min | **Caveat:** Phase 6A (`3d5c05e`) physically deleted the old `components/sections/*` files. A page-swap revert without restoring those files will fail to build. Either also revert `3d5c05e` (large diff) or cherry-pick the deleted components back from `legacy-dark-design`. |
| Need full rollback in source (Vercel prod gone, lost confidence) | `git checkout -b rollback-from-rebuild legacy-dark-design-prod` → cherry-pick any post-rebuild non-design commits (e.g. partnership backend changes you want to keep) → push as new prod | ~30 min | Use the `legacy-dark-design` branch as the baseline. |

### 5. Pre-cutover risks to mitigate now

- **308 (permanent) redirects in `next.config.ts`**. Browsers cache 308s aggressively. If a user hits `/build` during the new-design window, the browser learns `/build → /explore` and may keep redirecting locally even after rollback. **Mitigation:** change all 12 marketing-rebuild redirects in `next.config.ts:15–27` from `permanent: true` (308) to `permanent: false` (307) for the cutover window. Promote back to 308 after a 1–2 week soak. Single-line edit, low risk.
- **Database forward-compat**. Migration `034_partnership_inquiries` (`7562f2c`) added a new table; rollback leaves it unused but harmless. **No drop required.** Confirm the migration has been applied to prod Supabase before cutover (otherwise the new `/partnerships` form will 500 on submit).
- **JP content**. The new design ships with JP stubbed in English per the umbrella plan (Phase 1.5 deferred). Acceptable for soft launch but worth flagging to JP-locale users explicitly if any.
- **Uncommitted working tree**. There are ~100 modified files in the working tree (admin, learn dashboard, ui components). These are **not part of the cutover** — they're uncommitted local work that won't deploy. Either commit them deliberately or stash them before pushing main, so the cutover diff matches what we tested.

## Critical files referenced

- `next.config.ts:15–27` — the 12 marketing-rebuild redirects (consider 307 for the soak window).
- `app/[locale]/page.tsx`, `app/[locale]/learn/page.tsx`, `app/[locale]/explore/page.tsx`, `app/[locale]/about/page.tsx`, `app/[locale]/contact/page.tsx`, `app/[locale]/partnerships/page.tsx` — the six page-swap files; each is the single revert point for its page.
- `supabase/migrations/034_partnership_inquiries.sql` — must be applied to prod before cutover.
- `components/marketing/shell.tsx` — entry point for the new shell.
- `docs/plans/2026-04-26-marketing-rebuild.md` — umbrella plan with Phase-by-Phase verification log.

## Verification

Before cutover:
1. Confirm `$PROD_SHA` from Vercel dashboard.
2. After creating the tag/branch, visit the auto-generated `legacy-dark-design` preview URL — confirm it renders the OLD dark design.
3. `git log legacy-dark-design-prod..main --oneline | wc -l` — sanity check the size of what's about to ship.
4. Confirm migration `034` is applied in prod Supabase (Supabase dashboard → Migrations).
5. Edit `next.config.ts` redirects to `permanent: false`, commit, push.
6. `pnpm verify` ✓ on a clean tree (commit/stash the working-tree changes first).

After cutover (per stage of Rolling Release):
1. Hit `honuvibe.ai/`, `/learn`, `/explore`, `/about`, `/contact`, `/partnerships` — both `en` and `/ja/`.
2. Submit a real partnership inquiry → verify Supabase row + Resend email to ryan@honuvibe.ai.
3. Plausible: confirm course_enroll_click events are flowing.
4. Lighthouse on `/`: LCP < 2.5s.
5. Test a redirect: `/build` → `/explore` (307 during soak).

If any of those fail at the 5%/25%/50% stage, abort the rolling release.

## Out of scope

- Keeping old design and new design serving in parallel by URL prefix (e.g. `/v2/...`). Possible but invasive — would require a Vercel Routing Middleware rewrite. Not needed because Rolling Releases + the legacy fork branch cover the same use case at a fraction of the work.
- Reverting `partnership_inquiries` table. Forward-compatible; leave it.
- i18n JP content — full pass deferred to Phase 1.5 per umbrella plan.
