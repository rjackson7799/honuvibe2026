# About Page — Drop Second Profile Section + Eliminate Duplicate Footer

**Date:** 2026-05-03
**Scope:** `/about` (EN + JP). Site-wide footer mounting.

## Context

A screenshot of `/about` shows two issues:

1. **A second, smaller "The team" profile card for Ryan** appears below the origin-story section. Since the team was scoped down to Ryan-only in commit `0446a10`, this card now duplicates content already on the page (Ryan's photo, name, location, and bio all appear in the origin-story section above). The team section adds no new information and visually fragments the page.
2. **Two footers stack at the bottom** — `MarketingFooter` (navy, 5-col) followed by the legacy dark `Footer` (`dark-zone bg-bg-primary`).

A prior plan ([docs/plans/2026-05-03-mobile-surgical-fixes.md](2026-05-03-mobile-surgical-fixes.md)) traced the duplicate-footer issue and concluded the source was correct: `<ConditionalFooter />` mounted at [app/[locale]/layout.tsx:92](../../app/[locale]/layout.tsx#L92) calls `usePathname()` and returns `null` for marketing routes (including `/about`), and `MarketingFooter` is mounted directly by each marketing page. That plan blamed a stale deploy and explicitly *rejected* migrating away from `ConditionalFooter` because legal pages would lose their footer. **The duplicate is reappearing, so the rejection no longer holds — we need a structural fix that does not depend on a client-only `usePathname()` race.**

Goal: ship a small, structural change that (1) removes the redundant team card on `/about` and (2) makes duplicate footers impossible by giving every page explicit ownership of its footer.

## Approach

### 1. Remove `<AboutTeam />` from the About page

[app/[locale]/about/page.tsx](../../app/[locale]/about/page.tsx) — drop the `<AboutTeam />` element from the `<main>` tree and remove `AboutTeam` from the import on line 9. The section's content (Ryan's photo, location, bio) is already present in the origin-story block via [components/marketing/about/origin-story.tsx](../../components/marketing/about/origin-story.tsx).

Leave [components/marketing/about/team.tsx](../../components/marketing/about/team.tsx) on disk — it still has the multi-member rendering scaffold (Mizuho/Chiemi commented out via the `MEMBERS` filter) and may be re-mounted later. No changes to messages files needed; the `about.team.*` keys remain referenced by `team.tsx` if it's re-introduced.

### 2. Eliminate duplicate footers structurally

Replace `<ConditionalFooter />` in the locale layout with explicit footer mounts on the three pages that need the legacy `<Footer />` (the legal pages). This removes the `usePathname()` race entirely.

- [app/[locale]/layout.tsx:11](../../app/[locale]/layout.tsx#L11) — drop the `ConditionalFooter` import.
- [app/[locale]/layout.tsx:92](../../app/[locale]/layout.tsx#L92) — delete `<ConditionalFooter />` from the JSX.
- [components/sections/legal/legal-page.tsx](../../components/sections/legal/legal-page.tsx) — mount `<Footer />` (from `@/components/layout/footer`) at the bottom of the rendered tree. This is the single shared primitive used by `/privacy`, `/terms`, and `/cookies` ([app/[locale]/privacy/page.tsx](../../app/[locale]/privacy/page.tsx), [app/[locale]/terms/page.tsx](../../app/[locale]/terms/page.tsx), [app/[locale]/cookies/page.tsx](../../app/[locale]/cookies/page.tsx)) — one edit covers all three.
- [components/layout/conditional-footer.tsx](../../components/layout/conditional-footer.tsx) — delete the file (no remaining references after the layout edit).

Marketing pages already self-mount `<MarketingFooter />` via their page shells (verified across [app/[locale]/page.tsx:39](../../app/[locale]/page.tsx#L39), [app/[locale]/about/page.tsx:47](../../app/[locale]/about/page.tsx#L47), `/explore`, `/partnerships`, `/contact`, `/learn`, `/learn/[slug]`, `/blog`, `/blog/[slug]`, `/glossary`, `/glossary/[slug]`). Auth shells (`/learn/dashboard`, `/learn/vault`, `/admin`) don't render a footer at all and shouldn't — that's the existing behavior preserved.

### Routes that still don't mount a footer

After this change, the following non-marketing, non-legal routes will not render a footer (same as today):

- `/learn/dashboard`, `/learn/vault`, `/admin/*` — auth shells with their own chrome.
- `/honuhub`, `/instructor/*`, `/partner/*`, `/survey/*` — verify each. If any of these existing routes were relying on `ConditionalFooter` to inject the dark `<Footer />`, mount it explicitly on those pages or accept the no-footer state. Since those routes were already excluded from `isMarketingPathWithLocale`, they currently *do* receive the dark footer; spot-check during verification and add explicit `<Footer />` mounts to any that need to keep it.

## Critical Files

| File | Change |
|---|---|
| [app/[locale]/about/page.tsx](../../app/[locale]/about/page.tsx) | Drop `<AboutTeam />` JSX + import |
| [app/[locale]/layout.tsx](../../app/[locale]/layout.tsx) | Remove `<ConditionalFooter />` mount + import |
| [components/sections/legal/legal-page.tsx](../../components/sections/legal/legal-page.tsx) | Mount `<Footer />` at the bottom |
| [components/layout/conditional-footer.tsx](../../components/layout/conditional-footer.tsx) | Delete file |
| `/honuhub`, `/instructor`, `/partner`, `/survey` page files | Mount `<Footer />` explicitly **only if** they previously rendered it via the conditional and the no-footer state is undesired |

## Verification

1. `pnpm dev`. In the browser:
   - **`/about` and `/ja/about`**: confirm exactly one footer (the navy `MarketingFooter`). Confirm the second smaller team card is gone — the page should flow origin-story → "The Aloha Standard" directly.
   - **`/privacy`, `/terms`, `/cookies`** (EN + JP): confirm exactly one dark `Footer` at the bottom (no regression).
   - **All other marketing routes** (`/`, `/learn`, `/learn/[slug]`, `/explore`, `/partnerships`, `/contact`, `/blog`, `/blog/[slug]`, `/glossary`, `/glossary/[slug]`): confirm exactly one navy `MarketingFooter`.
   - **Auth shells** (`/learn/dashboard`, `/learn/vault`, `/admin`): confirm no footer (unchanged).
   - **Misc public routes** (`/honuhub`, `/instructor/*`, `/partner/*`, `/survey/*` if they exist): spot-check — if a footer was expected and is now missing, add `<Footer />` to that page.
2. `pnpm tsc --noEmit` passes.
3. `pnpm test` — confirm `__tests__/marketing/conditional-main.test.tsx` and the marketing-routes test still pass (they should — those test the `ConditionalMain` and route-list logic, not `ConditionalFooter`).
4. `pnpm build` passes.
