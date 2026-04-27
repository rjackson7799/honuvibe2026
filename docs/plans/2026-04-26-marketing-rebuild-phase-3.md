# Marketing Rebuild — Phase 3: Explore + About + Contact

> Sub-plan of [`2026-04-26-marketing-rebuild.md`](./2026-04-26-marketing-rebuild.md). Update the umbrella plan's Progress + Verification log when this phase ships.

## Context

Phases 0/1/2 (foundation, Home, Learn) shipped on `main` through `3288cbe`. Phase 3 brings the next three public marketing routes — Explore, About, Contact — onto the new light marketing shell.

These three routes are already registered in [`lib/marketing-routes.ts`](../../lib/marketing-routes.ts), which means the locale layout's `<Nav />` and `<ConditionalFooter />` already return null on them. The current dark Explore/About/Contact pages render today **without any nav/footer chrome** — Phase 3 closes that gap by mounting `<MarketingShell>` + `<MarketingNav />` + `<MarketingFooter />` from the new pages themselves.

No data migration risk: the existing dark pages are pure static composition (verified — no Sanity/Supabase/CMS calls). The Contact form has a fully-working state machine in [`components/sections/contact/contact-form.tsx`](../../components/sections/contact/contact-form.tsx) we can port to the new visual shell.

## Pre-flight

- ✅ Phase 2 baseline confirmed green: `pnpm verify:fast` → 296 vitest tests pass (29 files, 28s).
- Run full `pnpm verify` once before commit 1 to also catch any `next build` regressions on the post-`3288cbe` baseline.
- `lib/marketing-routes.ts` already lists `/explore`, `/about`, `/contact` — **no registry change needed**.

## Build order — 7 commits, 3 pages

The umbrella plan's two-commits-per-page invariant (components → swap, one-file revert safety) is preserved. Contact gets a third leading commit because the API + email-types change is contract-level and deserves to land independently.

| # | Commit | Files | Verify |
|---|---|---|---|
| 1 | `feat(marketing): add Explore page section components and i18n` | new components + i18n + tests | `pnpm verify:fast` |
| 2 | `feat(marketing): swap Explore page to new light marketing shell` | `app/[locale]/explore/page.tsx` | `pnpm verify` (full) |
| 3 | `feat(marketing): add About page section components and i18n` | new components + i18n + tests | `pnpm verify:fast` |
| 4 | `feat(marketing): swap About page to new light marketing shell` | `app/[locale]/about/page.tsx` | `pnpm verify` (full) |
| 5 | `refactor(contact): widen subject enum to general/course/partnership/media/other` | API + types + i18n keys | `pnpm verify` (full) |
| 6 | `feat(marketing): add Contact page section components and i18n` | new components + i18n + tests | `pnpm verify:fast` |
| 7 | `feat(marketing): swap Contact page to new light marketing shell` | `app/[locale]/contact/page.tsx` | `pnpm verify` (full) |

Direct-to-main per [`feedback_git_workflow.md`](../../C:/Users/HCI/.claude/projects/c--Users-HCI-Desktop-Projects-HonuVibe-2026/memory/feedback_git_workflow.md). Push after each commit.

## Per-page detail

### Explore (commits 1–2)

**New components** — `components/marketing/explore/`:
- `hero.tsx` — overline "Our Work" + headline with teal accent + body. Server.
- `stats-strip.tsx` — 4-column stat card (20+ Projects · 3 Countries · 60% Time Saved · 2 Languages). Hardcoded. Server.
- `featured-projects.tsx` — alternating left/right rows. Two real projects (KwameBrathwaite.com, HCI Medical Group) + one "Community Project" placeholder card. Use `<BrowserFrame>` for project mockups; `<PhotoPlaceholder variant="dashed">` for the community placeholder.
- `how-we-build.tsx` — 3-col `<NumberedStep layout="horizontal">` row (Discovery, Design & Build, Launch & Support). Server.
- `aloha-standard.tsx` — community-illustration left + headline/body right. **Distinct from About's aloha-standard** — do not share.
- `two-path-cta.tsx` — primary-teal + outline-coral button pair with arrows.

**Page swap** — [`app/[locale]/explore/page.tsx`](../../app/[locale]/explore/page.tsx):
- Drop imports from `@/components/sections/exploration` (those files stay on disk for Phase 6 audit).
- Compose: `<MarketingShell>` → `<MarketingNav />` → `<main>` (six new sections in order) → `<MarketingNewsletter />` → `<MarketingFooter />`.
- Pattern mirror: [`app/[locale]/learn/page.tsx`](../../app/[locale]/learn/page.tsx).

**i18n** — extend `messages/{en,ja}.json` with `explore.{meta,hero,stats_strip,featured_projects,how_we_build,aloha_standard,two_path_cta}`. JP stubbed with EN per Phase 1.5 deferral (matches Phases 1 & 2).

**Test** — `__tests__/marketing/explore/explore-sections.test.tsx`. Smoke-test pattern mirrors [`__tests__/marketing/learn/learn-sections.test.tsx`](../../__tests__/marketing/learn/learn-sections.test.tsx): mocked `next-intl`, role/text/href assertions per section.

### About (commits 3–4)

**New components** — `components/marketing/about/`:
- `hero.tsx` — split grid: "People first. Always." headline left; subhead + 3 facts (Honolulu · EN·JP · 2024) right.
- `origin-story.tsx` — left photo placeholder w/ floating credential badge for Ryan; right narrative paragraphs + Hawaii origin marker. Reuse `public/images/partners/instructors/ryan.webp` if a real headshot is wanted; fall back to `<PhotoPlaceholder variant="gradient">`.
- `team.tsx` — 3 team cards in a grid (Ryan, Mizuho, Chimi). Headshots from `public/images/partners/instructors/{ryan,mizuho,chimi}.webp` (all three exist). Card hover lift via `interactive` `<Card>` or hand-rolled. Lang badges (EN / 日本語) per member.
- `aloha-standard.tsx` — 4 numbered value rows (01–04) with hover highlighting. **Distinct from Explore's** — different shape.
- `mission-vision.tsx` — 2-column split (Mission · Vision). Plain text statements. (Confirmed in plan line 130 — was a miscount in initial pass.)
- `social-section.tsx` — 4 social cards (TikTok / Instagram / YouTube / **LINE**) with hover lift.
- `soft-cta.tsx` — primary-teal "Browse Courses" → `/learn` + outline-coral "Partner With Us" → `/partnerships`.

**Page swap** — [`app/[locale]/about/page.tsx`](../../app/[locale]/about/page.tsx):
- Drop the `<AbyssalEchoBackground />` dark-zone wrapper and all 6 dark `AboutXxx` imports.
- Compose with `<MarketingShell>` shell pattern.

**i18n** — `about.{meta,hero,origin_story,team,aloha_standard,mission_vision,social_section,soft_cta}`. Team member copy (name / title / location / bio) keyed under `about.team.members.{ryan,mizuho,chimi}.{name,title,location,bio}`. Source copy: prototype + existing dark `about_page.*` keys where the prototype is generic (founder bio is richer in the existing keys; port forward).

**Test** — `__tests__/marketing/about/about-sections.test.tsx`. Per-section smoke tests; assert team grid renders three named cards with lang badges.

### Contact API widening (commit 5)

**Why standalone:** the `subject` field is a TypeScript literal union in [`lib/email/types.ts:7`](../../lib/email/types.ts), consumed by `sendContactConfirmation` / `sendContactAdminNotification`. Widening the API route's `validSubjects` array without updating the type fails `tsc`. Isolating the contract change makes the failure mode obvious if anything regresses.

**Changes:**
- [`lib/email/types.ts:7`](../../lib/email/types.ts) — replace literal union with `'general' | 'course' | 'partnership' | 'media' | 'other'`.
- [`app/api/contact/submit/route.ts:16`](../../app/api/contact/submit/route.ts) — replace `validSubjects` array to match the new union. Default-fallback to `'general'` for unknown values stays in place.
- `messages/{en,ja}.json` — under `contact_form.subject_options`, replace `consulting / advisory / training / speaking / feedback` keys with `course / media`. Keep `general / partnership / other`. (Inventory the keys in both locales before deleting.)
- The existing dark `<ContactForm />` is the only caller of the old enum — it's about to be replaced in commit 7, so the only intermediate risk is one commit (5→6) where the dark form's hardcoded subject values mismatch the new enum. Mitigation: in commit 5, also update the dark form's options if it has any `'consulting' | 'feedback'` literal usage. Otherwise the API's default-to-`'general'` fallback absorbs it harmlessly during the gap.

### Contact (commits 6–7)

**New components** — `components/marketing/contact/`:
- `hero.tsx` — centered. Overline "Get in Touch" + headline + sub. `mailto:hello@honuvibe.ai` pill button.
- `contact-form.tsx` — `'use client'`. Port the state machine and char counter (`MAX_MESSAGE_LENGTH = 2000`) from [`components/sections/contact/contact-form.tsx`](../../components/sections/contact/contact-form.tsx). Visual layer rebuilt with marketing primitives + `--m-*` tokens. Subject `<select>` lists 5 options (general / course / partnership / media / other) keyed via `contact.contact_form.subject_options.*`. Submit posts to `/api/contact/submit` (unchanged endpoint, new enum). Success state shows checkmark circle + confirmation message.
- `info-strip.tsx` — 3-card horizontal flex (Email · Location · Response time). Lucide icons: `Mail`, `MapPin`, `Clock`.
- `social-section.tsx` — 4 social cards (TikTok / Instagram / YouTube / **LinkedIn** — note: differs from About's LINE). Build inline; do NOT share with About per YAGNI (overlap is 3 of 4 icons but the visual emphasis differs).

**Page swap** — [`app/[locale]/contact/page.tsx`](../../app/[locale]/contact/page.tsx): drop the 3 dark imports, compose with the marketing shell.

**i18n** — `contact.{meta,hero,contact_form,info_strip,social_section}`. The `contact_form` namespace mirrors the existing `contact_form` keys (label_name, placeholder_name, error_*, chars_remaining w/ `{count}` interpolation, submit, etc.) — port and prune to the new 5-option subject set.

**Test** — `__tests__/marketing/contact/contact-sections.test.tsx`. Beyond per-section smoke tests, the form needs interactive coverage:
1. `vi.stubGlobal('fetch', vi.fn().mockResolvedValue({ ok: true, json: async () => ({ success: true }) }))` → fill → submit → assert success state renders.
2. Re-stub fetch to reject → submit → assert error alert renders with `aria-live="assertive"`.
3. Char counter updates as message length grows; assert reaches `chars_remaining` text at length 1801.

## Critical files

**Reused (no edits expected):**
- [`components/marketing/primitives/`](../../components/marketing/primitives/) — `Section`, `Container`, `Overline`, `DisplayHeading`, `SectionHeading`, `Button`, `Card`, `Badge`, `BrowserFrame`, `PhotoPlaceholder`, `NumberedStep`. All exist from Phase 0.
- [`components/marketing/shell.tsx`](../../components/marketing/shell.tsx)
- [`components/marketing/nav/marketing-nav.tsx`](../../components/marketing/nav/marketing-nav.tsx)
- [`components/marketing/footer/marketing-footer.tsx`](../../components/marketing/footer/marketing-footer.tsx)
- [`components/marketing/newsletter/marketing-newsletter.tsx`](../../components/marketing/newsletter/marketing-newsletter.tsx)

**Reference patterns:**
- [`app/[locale]/learn/page.tsx`](../../app/[locale]/learn/page.tsx) — shell composition + `generateMetadata` pattern
- [`components/marketing/learn/three-paths.tsx`](../../components/marketing/learn/three-paths.tsx) — primitive + lucide + i18n usage
- [`__tests__/marketing/learn/learn-sections.test.tsx`](../../__tests__/marketing/learn/learn-sections.test.tsx) — test scaffolding
- [`components/sections/contact/contact-form.tsx`](../../components/sections/contact/contact-form.tsx) — form state machine to port

**Modified:**
- [`app/[locale]/explore/page.tsx`](../../app/[locale]/explore/page.tsx) (commit 2)
- [`app/[locale]/about/page.tsx`](../../app/[locale]/about/page.tsx) (commit 4)
- [`lib/email/types.ts`](../../lib/email/types.ts) (commit 5)
- [`app/api/contact/submit/route.ts`](../../app/api/contact/submit/route.ts) (commit 5)
- [`messages/en.json`](../../messages/en.json), [`messages/ja.json`](../../messages/ja.json) (commits 1, 3, 5, 6)
- [`app/[locale]/contact/page.tsx`](../../app/[locale]/contact/page.tsx) (commit 7)

## Decisions locked in

| Area | Decision |
|---|---|
| Shared `social-cards` component | **No.** YAGNI — inline in both About and Contact. Revisit in Phase 6 if real duplication earns it. |
| Aloha Standard sharing | **No** — Explore (illustration) and About (numbered values) are different shapes. |
| Subject enum | **Replace** (`consulting`/`feedback` → `course`/`media`), not add. Clean break, matches prototype. |
| About hero data | Hardcoded "Honolulu / EN·JP / 2024" facts in i18n. |
| Team headshots | Reuse `public/images/partners/instructors/{ryan,mizuho,chimi}.webp`. |
| Old dark sections | Stay on disk through Phase 6 audit. No deletes in Phase 3. |
| JP translations | Stubbed with EN. Phase 1.5 owns full translation. |
| Two-commit split | Preserved per page; commit 5 is the contract-change exception. |

## Verification

**Per commit:** `pnpm verify:fast` (typecheck + vitest, ~30s). Must stay green.

**Per page-swap commit (2, 4, 7):** full `pnpm verify` (typecheck + vitest + `next build`, ~3 min). Append a row to the umbrella plan's Verification log.

**End-to-end smoke (after commit 7):**
1. `pnpm dev` → walk `/`, `/ja`, `/learn`, `/ja/learn`, `/explore`, `/ja/explore`, `/about`, `/ja/about`, `/contact`, `/ja/contact` at 1440px.
2. Mobile breakpoints: 375 / 414 / 768 — sticky nav, mobile menu, hero stacking, card-grid collapse, form inputs (16px min font on mobile to prevent iOS zoom).
3. JP locale: Noto Sans JP loads, no English fallback in headlines (EN-stubbed copy is expected — Phase 1.5 owns translations).
4. Side-by-side with `docs/designs/{Explore,About,Contact}.html` open in Chrome at 1440px. Walk section by section.
5. **Contact form e2e:** submit a real message on `/contact` → admin email arrives at the configured admin address → applicant confirmation arrives.
6. Lighthouse on `/about` (heaviest of the three): LCP < 2.5s, accessibility ≥ 95.

**Test growth:** ~15–25 new tests across the three smoke files. Suite target: 311–321 tests post-Phase-3.

## Risks

1. **Subject enum drift between commits 5 and 7.** During the gap the dark `<ContactForm />` may submit a now-unrecognized subject. The API's default-fallback to `'general'` absorbs this — flag in commit 5 message.
2. **Team photos.** All three exist at `public/images/partners/instructors/`. If we later want a dedicated `public/images/team/` directory per the umbrella plan's literal path, that's a future move, not a Phase 3 blocker.
3. **JP copy length.** About hero headline "People first. Always." has no obvious JP equivalent of equal compactness. Stub with the EN copy + a TODO comment in `messages/ja.json` for Phase 1.5.
4. **`/explore` Featured Projects mockups** — Kwame and HCI Medical screenshots inside `<BrowserFrame>` need either a real screenshot asset or a tasteful gradient placeholder. Use `<PhotoPlaceholder variant="gradient">` inside the BrowserFrame body for v1.
5. **Phase 5 nav cutover deferred.** The new pages reuse Phase 0/1's `MarketingNav` directly; the auth-aware `UserMenu` polish + mobile menu polish stay scoped to Phase 5.
