# Marketing Rebuild — Phase 2: Learn Page

> Source of truth remains [docs/plans/2026-04-26-marketing-rebuild.md](./2026-04-26-marketing-rebuild.md). This file is the Phase 2 execution plan; on completion it gets rolled into the umbrella plan's verification log.

## Context

Phase 0 (foundation) and Phase 1 (home page) are shipped and green (`pnpm verify` ✅, 276 vitest tests). The dark-themed Learn catalog at [app/[locale]/learn/page.tsx](../../app/[locale]/learn/page.tsx) is the last big public-marketing page still on the old shell. Phase 2 swaps it to the new light marketing shell, mirroring the prototype at [docs/designs/Learn.html](../designs/Learn.html).

**Why now:** The home page CTA "Explore Courses" routes to `/learn`, so visitors leaving the new home immediately hit the old dark catalog — a jarring mode flip. Closing this gap completes the most-trafficked entry path. (Course detail `/learn/[slug]` stays dark; documented mode flip per umbrella plan risk #5.)

**Outcome:** `/learn` and `/ja/learn` render the new marketing-shelled page with six sections (hero, three-paths, vault-moment, courses-catalog, private-cohorts, comparison-table). Course catalog pulls real data from `getPublishedCourses()`. Tests grow monotonically; verify stays green.

## Decisions

| Area | Decision |
|---|---|
| `learn` namespace | **Extend** the existing flat `learn` namespace with sub-objects (`learn.hero`, `learn.three_paths`, ...) — same shape Phase 1 used for `home`. Do not stomp existing flat keys (`beginner`, `enroll_now`, `view_course`, ~80 more) since the dark course player still consumes them. |
| Course data | Real data via `getPublishedCourses()`. Server fetches once in the page; full array passed to a client filter component. |
| Builder Track derivation | Tag-based: `tags?.includes('builder-track')`. **No migration in Phase 2** (confirmed). Keeps migration `034` available for Phase 4's `partnership_inquiries`. Empty state today matches reality (no published builder-track courses yet). |
| Filter UX | Client-side filter chips. Old `?level=` searchParam is dropped silently (confirmed). Default chip is "All Levels". Page stays fully static RSC. |
| Course card | New marketing-themed card inline in `courses-catalog-client.tsx`. Cannot reuse `components/learn/CourseCard.tsx` — it's dark-themed. Card adapts: `title_{en\|jp}`, `description_{en\|jp}`, `level`, `total_weeks`, `language`, `price_usd/jpy`, `start_date`, `slug`, `tags`. |
| Card click target | Whole card links to `/learn/{slug}` (existing dark course detail). |
| Two-commit split | Commit A: components + i18n + tests + filter helpers (page.tsx untouched). Commit B: swap page.tsx + update umbrella verification log. Direct-to-main per project workflow. |
| Icons | lucide-react throughout (`BookOpen`, `Users`, `Key`, `Check`, `Lock`, `Play`, `ArrowRight`). |
| Newsletter | Reuse `<MarketingNewsletter />` — same as home. |
| Vault mockup | Inline `<VaultLessonMockup>` inside `vault-moment.tsx`, wrapped in existing `<BrowserFrame>`. |

## Components to create

```
components/marketing/learn/
├── index.ts                      # barrel re-exports
├── hero.tsx                      # <LearnHero>
├── three-paths.tsx               # <LearnThreePaths>
├── vault-moment.tsx              # <LearnVaultMoment> + inline VaultLessonMockup
├── courses-catalog.tsx           # <LearnCoursesCatalog courses={...}> server wrapper
├── courses-catalog-client.tsx    # 'use client' — filter chips + grid + card
├── private-cohorts.tsx           # <LearnPrivateCohorts> + inline PartnerCard
└── comparison-table.tsx          # <LearnComparisonTable>
```

`lib/courses/filters.ts` — pure helpers:

```ts
export type CatalogFilter = 'all' | 'beginner' | 'intermediate' | 'advanced' | 'builder-track';
export function filterCatalog(courses: Course[], filter: CatalogFilter): Course[];
export function isBuilderTrack(course: Course): boolean;
```

## Files to modify

| File | Change |
|---|---|
| [messages/en.json](../../messages/en.json) | Add `learn.{meta,hero,three_paths,vault_moment,courses_catalog,private_cohorts,comparison_table}` sub-objects. Keep all existing flat `learn.*` keys untouched. |
| [messages/ja.json](../../messages/ja.json) | Add same sub-objects, EN content stubbed for now (Phase 1.5 owns JP translation). |
| [app/[locale]/learn/page.tsx](../../app/[locale]/learn/page.tsx) | **Commit B only.** Full rewrite mirroring [app/[locale]/page.tsx](../../app/[locale]/page.tsx) shell composition. Drops `?level=` searchParam, `Suspense`, `LevelFilter`, `LearnPathCards`, `FloatingTechBg`, glow orbs. Fetches courses via `getPublishedCourses()`, passes to `<LearnCoursesCatalog />`. |
| [docs/plans/2026-04-26-marketing-rebuild.md](./2026-04-26-marketing-rebuild.md) | **Commit B only.** Flip Phase 2 row to ✅ done. Append verification-log row with date, test count, build result, both commit SHAs. |

## Files to NOT touch (yet)

- `components/learn/CourseCard.tsx`, `LevelFilter.tsx`, `LearnPathCards.tsx`, `StudentDashboardLayout.tsx`, etc. — still consumed by `/learn/dashboard`, `/learn/vault`, `/learn/[slug]`. Phase 6 cleanup.
- `lib/marketing-routes.ts` — `/learn` is already in `MARKETING_PATHS`.

## Section-by-section build notes

See the umbrella plan's Phase 2 section for high-level scope. Implementation notes inline in the components.

## Tests

- `__tests__/marketing/learn/learn-sections.test.tsx` — mirrors `__tests__/marketing/home/home-sections.test.tsx`. Renders each section + the client catalog with a 4-course fixture array. Asserts headings, badges, CTA hrefs, filter narrowing.
- `__tests__/lib/courses/filters.test.ts` — pure unit tests for `filterCatalog` and `isBuilderTrack`.

## Verification

After **Commit A**:
- `pnpm verify:fast` — typecheck + vitest. Expected: ≥ 290 tests pass (276 baseline + ~14 new).

After **Commit B**:
- `pnpm verify` — full gate including `next build`. Expected: build green.
- Manual: `pnpm dev`, walk `/learn` against [docs/designs/Learn.html](../designs/Learn.html), test every chip, check `/ja/learn`, mobile breakpoint at 375px.
- Update [docs/plans/2026-04-26-marketing-rebuild.md](./2026-04-26-marketing-rebuild.md) Progress + verification log.
