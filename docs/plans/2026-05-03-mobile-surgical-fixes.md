# Mobile Surgical Fixes — Home + Learn + Glossary + Blog

**Date:** 2026-05-03
**Scope:** Surgical mobile fixes across the four high-traffic marketing route groups. No new components, no redesigns.

## Context

A user-supplied screenshot of `honuvibe.ai` on mobile (Android/Chrome) shows two issues that demand fixes:

1. **Two footers stack on the homepage** — the new `MarketingFooter` renders, then the legacy `Footer` renders directly below it.
2. **Hero has excess top whitespace on phones** — about 140px of empty canvas above the "PRACTICAL AI TRAINING" eyebrow on a 375-414px viewport.

A code audit also found the in-flight redesign work (vault section, course detail, glossary, blog — all modified per `git status`) leaves several mobile-cramped layouts: an in-text desktop hero mockup at 175px-wide, oversized `p-6`/`p-7` inner padding on phone-narrow callouts and chips, a course-detail illustration column that wastes the entire fold on mobile, and a `<main>` that doesn't reserve clearance for the sticky enroll bar.

Goal: ship a tight pass that removes the duplicate footer site-wide, reclaims the hero fold on phones, and tightens cramped blocks across `/`, `/learn/[slug]`, `/glossary`, `/glossary/[slug]`, `/blog`, `/blog/[slug]`. Leave `/about`, `/contact`, `/explore`, `/partnerships` untouched.

## Approach

Remove `ConditionalFooter` from the locale layout and have every public page own its footer directly — eliminates the brittle client-only `usePathname()` race that caused the duplicate. Then make pinpoint Tailwind class adjustments at the file:line level for the cramped phone layouts. No new components.

## Site-wide

### Footer dedup — ROOT CAUSE: STALE DEPLOY (no source change needed)

The locale layout mounts `<ConditionalFooter />` ([app/[locale]/layout.tsx:92](../../app/[locale]/layout.tsx#L92)) which uses `usePathname()` to suppress the legacy `Footer` on marketing routes. Tracing the logic for `/`:

```
usePathname() → '/'
isMarketingPathWithLocale('/') → isMarketingPath('/') → MARKETING_PATHS.includes('/') → true
=> ConditionalFooter returns null  ✓
```

The home page mounts `MarketingFooter` directly ([app/[locale]/page.tsx:39](../../app/[locale]/page.tsx#L39)) and the conditional correctly returns null. **Source is already correct.** The duplicate footer in the production screenshot reflects a stale deploy from before commit `cc045bc feat(marketing): footer reconciliation`. The most recent commit `8960898 fix(build): sync pnpm-lock.yaml` was specifically a deploy-unblock — once that goes out, the duplicate disappears. **No source edits required for this issue.**

Migrating away from `ConditionalFooter` was considered and rejected: legal pages ([components/sections/legal/legal-page.tsx](../../components/sections/legal/legal-page.tsx)) use the dark-theme `Container` and would clash visually with `MarketingFooter`. Touching ~10 leaf pages to swap footers is not surgical.

### Hero spacing primitive

[components/marketing/primitives/section.tsx:26](../../components/marketing/primitives/section.tsx#L26) — `hero` spacing is non-responsive at the top:

```ts
hero: 'pt-[88px] pb-16 md:pb-20',
```

Change to:

```ts
hero: 'pt-24 pb-16 md:pt-[88px] md:pb-20',
```

`pt-24` (96px) - 68px fixed nav = 28px breathing room on phones.

## Home (`/`)

- **[components/marketing/home/hero.tsx:76](../../components/marketing/home/hero.tsx#L76)** — wrap the `<HeroVaultMockup />` so it unmounts on phones: `<div className="hidden lg:block"><HeroVaultMockup /></div>`. The 176px sidebar inside a 335px BrowserFrame leaves only ~140px for lesson cards on a 375px screen. The full vault preview already lives in `HomeVaultSection` below the fold.
- **[components/marketing/home/vault-section.tsx](../../components/marketing/home/vault-section.tsx)** — change the chip-row → mockup gap `mt-20` → `mt-12 md:mt-20` (around line 78; verify exact line during edit).
- **[components/marketing/home/vault-lesson-mockup.tsx:25](../../components/marketing/home/vault-lesson-mockup.tsx#L25)** — outer `px-5 pt-9 pb-9 sm:px-8 md:px-14` → `px-4 pt-7 pb-7 sm:px-8 md:px-14 md:pt-9 md:pb-11`.
- **[components/marketing/home/vault-lesson-mockup.tsx](../../components/marketing/home/vault-lesson-mockup.tsx)** code/example blocks — find the `<pre>` and example-output containers (around lines 170 and 181 per audit); change `px-6 py-6` → `px-4 py-4 sm:px-6 sm:py-5` and `px-6 py-6` → `px-4 py-5 sm:px-7 sm:py-6` respectively. `overflow-x-auto` already protects against blowout.

## Learn (`/learn/[slug]`)

- **[components/learn/CourseDetailHero.tsx](../../components/learn/CourseDetailHero.tsx)** — find the right-column illustration block (`<div className="relative">…</div>` around line 142 per audit) and change to `<div className="relative hidden md:block">`. For courses without a `heroImageUrl`, the gradient placeholder steals the entire phone fold before the title.
- **[components/learn/CourseDetailHero.tsx:107](../../components/learn/CourseDetailHero.tsx#L107)** — title `clamp(40px, 5.2vw, 64px)` → `clamp(32px, 5.2vw, 64px)` so long bilingual titles don't wrap five lines on 375px.
- **[app/[locale]/learn/[slug]/page.tsx](../../app/[locale]/learn/[slug]/page.tsx)** — add bottom clearance for the fixed `StickyEnrollBar`: change the `<main>` element (around line 127) to `<main className="pb-24 md:pb-0">`.
- **[components/learn/CurriculumAccordion.tsx:61](../../components/learn/CurriculumAccordion.tsx#L61)** — badge row inside the trigger button: `gap-2` → `gap-x-2 gap-y-1` so wrapped badges don't double their vertical gap.
- **[components/learn/InstructorCard.tsx:23](../../components/learn/InstructorCard.tsx#L23)** — `p-6` → `p-5 sm:p-6` and `gap-4` → `gap-3 sm:gap-4` (the 64px avatar plus bio is cramped at 375px otherwise).
- HowItWorks, LearningOutcomes, ToolsBadges, BonusSessionsSection, AvailabilityBadge, StickyEnrollBar, StickyEnrollSidebar, CourseDetailFinalCta — already mobile-correct, no changes.

## Glossary (`/glossary`, `/glossary/[slug]`)

- **[components/glossary/GlossaryTermCard.tsx:30](../../components/glossary/GlossaryTermCard.tsx#L30)** — `gap-4` → `gap-3 sm:gap-4` so the `DifficultyBadge` (`shrink-0`) doesn't crowd long term names on 375px.
- **[app/[locale]/glossary/[slug]/page.tsx:209](../../app/[locale]/glossary/%5Bslug%5D/page.tsx#L209)** and **[:218](../../app/[locale]/glossary/%5Bslug%5D/page.tsx#L218)** — both callout containers `p-6` → `p-5 sm:p-6`.
- GlossaryIndexContent, GlossaryAlphaNav (`hidden md:flex` already), GlossarySearch, RelatedTerms, DifficultyBadge — already mobile-correct.

## Blog (`/blog`, `/blog/[slug]`)

- **[components/blog/category-filter.tsx:49](../../components/blog/category-filter.tsx#L49)** — chip padding `px-4 py-2` → `px-3.5 py-2 sm:px-4` so seven categories wrap to fewer rows on 375px.
- **[components/blog/newsletter-cta.tsx:64](../../components/blog/newsletter-cta.tsx#L64)** — outer card `p-7` → `p-5 sm:p-7`.
- **[app/[locale]/blog/[slug]/page.tsx:128](../../app/[locale]/blog/%5Bslug%5D/page.tsx#L128)** — verify the `--m-text-h1` token's clamp floor in [styles/globals.css](../../styles/globals.css). If the floor exceeds ~30px, override on the title with `text-[clamp(28px,7vw,48px)]`. No change if the token already has a phone-friendly floor.
- post-card, featured-post, share-buttons, author-bio, related-posts — already mobile-correct.

## Critical Files (changed)

| File | Reason |
|---|---|
| [components/marketing/primitives/section.tsx](../../components/marketing/primitives/section.tsx) | hero spacing now responsive: `pt-24 md:pt-[88px]` |
| [components/marketing/home/hero.tsx](../../components/marketing/home/hero.tsx) | mockup hidden under `lg:` |
| [components/marketing/home/vault-section.tsx](../../components/marketing/home/vault-section.tsx) | chip→mockup gap `mt-12 md:mt-20` |
| [components/marketing/home/vault-lesson-mockup.tsx](../../components/marketing/home/vault-lesson-mockup.tsx) | outer + workflow + code + output padding tightened on phones |
| [components/learn/CourseDetailHero.tsx](../../components/learn/CourseDetailHero.tsx) | illustration column `hidden md:block`; title clamp floor 32px |
| [app/[locale]/learn/[slug]/page.tsx](../../app/[locale]/learn/%5Bslug%5D/page.tsx) | `<main className="pb-24 md:pb-0">` clears sticky enroll bar |
| [components/learn/CurriculumAccordion.tsx](../../components/learn/CurriculumAccordion.tsx) | badge row `gap-x-2 gap-y-1` |
| [components/learn/InstructorCard.tsx](../../components/learn/InstructorCard.tsx) | `p-5 sm:p-6`, `gap-3 sm:gap-4` |
| [components/glossary/GlossaryTermCard.tsx](../../components/glossary/GlossaryTermCard.tsx) | `gap-3 sm:gap-4` |
| [app/[locale]/glossary/[slug]/page.tsx](../../app/[locale]/glossary/%5Bslug%5D/page.tsx) | callouts `p-5 sm:p-6` |
| [components/blog/category-filter.tsx](../../components/blog/category-filter.tsx) | chips `px-3.5 py-2 sm:px-4` |
| [components/blog/newsletter-cta.tsx](../../components/blog/newsletter-cta.tsx) | card `p-5 sm:p-7` |

## Verification

1. `pnpm dev`. In Chrome DevTools open the device toolbar at iPhone SE (375×667), iPhone 14 Pro (393×852), and iPad portrait (768×1024).
2. **Footer dedup:** confirm the next deploy renders exactly one footer on `/` (the duplicate seen on production should disappear once the latest source ships).
3. **Home `/`:** at 375px the hero eyebrow sits ~28px below the nav (was ~140px). The desktop vault preview is gone on phone; only the in-page `HomeVaultSection` mockup is visible. The vault lesson mockup has comfortable but not over-padded gutters.
4. **Learn `/learn/[slug]`:** at 375px, no illustration column above the title; long titles clamp at 32px floor; scrolling to the bottom of the page shows page content above the sticky enroll bar (no overlap).
5. **Glossary:** no horizontal overflow on term cards; "Why it matters" callout has comfortable inner padding on 375px.
6. **Blog:** category filter wraps cleanly; newsletter CTA card padding feels right; share buttons stack below author.
7. `pnpm tsc --noEmit` passes (verified — exit 0).
8. `pnpm build` passes (verified — full route table compiled).
