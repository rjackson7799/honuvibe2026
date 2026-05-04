# Course Detail — Vault/Marketing Pattern Redesign

**Date:** 2026-05-03
**Status:** Ready to execute

## Context

The course detail page at `app/[locale]/learn/[slug]/page.tsx` still wears the original dark-navy hero (`bg-[#1A2B33]` with stars + decorative circles) on a `learn-zone` cream body. That dark hero is now visually inconsistent with the rest of the site:

- **Home hero** (`components/marketing/home/hero.tsx`) — cream canvas, oversized DM Sans 700 display headline with a teal accent line, navy ink, no dark surfaces.
- **Course catalog cards** — cream cards with serif course titles ("AI Essentials", "AI Mastery", "Builder Track"), teal/coral pill chips for meta, dark navy CTAs.
- **Vault** (`app/[locale]/learn/vault/page.tsx`) — cream canvas, bold sans heading + teal `BadgePill`, rounded-pill filter chips, white content cards on cream.
- **Glossary detail** (`app/[locale]/glossary/[slug]/page.tsx`) — already migrated to `MarketingShell` + `Section variant="canvas"|"sand"` with `--m-*` tokens. This is the cleanest reference template.

The course detail is the page where intent-to-enroll is closed, so it should sit *more* polished than catalog and glossary, not less. This plan ports it onto the same marketing-shell + token system used by the redesigned glossary detail and home, while preserving all functional behavior (Supabase fetch, enrollment check, free-preview gating, bilingual fallbacks, mobile sticky bar).

## Reference templates

- **Layout shell + section rhythm:** [app/[locale]/glossary/[slug]/page.tsx](app/[locale]/glossary/[slug]/page.tsx) — uses `MarketingShell`, `MarketingNav`, `Section variant="canvas"`, callout boxes with `--m-accent-*-soft`.
- **Hero typography + teal accent line:** [components/marketing/home/hero.tsx](components/marketing/home/hero.tsx)
- **Pills/chips:** [components/ui/badge-pill.tsx](components/ui/badge-pill.tsx) (`teal`, `coral`, `purple`, `gray`, `live`, `navy`)
- **Difficulty chip:** [components/glossary/DifficultyBadge.tsx](components/glossary/DifficultyBadge.tsx)
- **Section primitive + alternating canvas/sand:** [components/marketing/primitives/section.tsx](components/marketing/primitives/section.tsx)
- **Section heading:** [components/marketing/primitives/section-heading.tsx](components/marketing/primitives/section-heading.tsx)

## Design direction

**Page chrome.** Wrap the page in `MarketingShell` + `MarketingNav` + `MarketingFooter` (drop the bare `learn-zone` div). This gives consistent nav, footer, newsletter strip, and the `--m-*` token set used by the rest of the redesigned pages.

**Hero (canvas).** Replace `CourseDetailHero` with a new light hero on `Section variant="canvas"`:
- Two-column on desktop (`md:grid-cols-[1fr_minmax(0,440px)]`), single column on mobile.
- **Left:** breadcrumb (`← Learn` with teal hover), pill row (level → `DifficultyBadge`; format → `BadgePill variant="navy"`; language → `BadgePill variant="gray"`), course title in **DM Serif Display** at `clamp(40px, 5.2vw, 64px)` to match the catalog cards' serif identity (this is the one place we keep serif), JP subtitle, description in `text-[var(--m-ink-secondary)]`, optional tag row using `BadgePill variant="gray" size="xs"`.
- **Right:** course illustration card — `hero_image_url || thumbnail_url` rendered inside a rounded `var(--m-radius-lg)` frame with soft shadow and a faint pastel gradient backdrop (use the same gradient palette as `VaultContentCard.tsx`). On mobile, this drops below the title.
- Stats strip ("5 weeks · 5 live sessions · 5 recorded lessons · Cohort Size: 15") moves into the hero as small uppercase metadata under the description, separated by `·`.

**Body sections.** Switch the page from a single long body into alternating `Section variant="canvas"` and `variant="sand"` to create visual rhythm (mirrors home/glossary):
1. Hero — `canvas`
2. What You'll Master + Tools You'll Learn — `canvas` (paired in one section, two-column on desktop)
3. How It Works — `sand`
4. Weekly Curriculum — `canvas`
5. Bonus Sessions — `sand` (only if any)
6. Who This Course Is For + Prerequisites — `canvas` (paired)
7. Your Instructors — `sand`
8. Course Logistics + Materials You'll Receive — `canvas` (paired)
9. Final CTA — `sand` (mirrors glossary's bottom CTA: heading + description + teal button)

The right-rail sticky enrollment card stays only inside sections 2–8 (the body) so it doesn't fight the hero or the closing CTA. Wrap that range in a single `<div class="md:grid md:grid-cols-[minmax(0,1fr)_288px]">` so the sidebar can stick alongside.

**Section headings.** Drop `text-xl font-serif` everywhere outside the hero. Use the `SectionHeading` primitive (DM Sans 700, `var(--m-text-h2)`, navy ink, tight letter-spacing). Add `Overline` tags above each section heading where it adds rhythm (e.g., "CURRICULUM", "INSTRUCTORS").

**Sticky enrollment card** ([components/learn/StickyEnrollSidebar.tsx](components/learn/StickyEnrollSidebar.tsx)):
- Surface: `bg-[var(--m-white)] border border-[var(--m-border-default)] rounded-[var(--m-radius-lg)] shadow-[var(--m-shadow-md)]`.
- Thumbnail at top stays, but wrapped in the same pastel gradient frame style as the hero illustration when no thumbnail.
- Replace the inline `AvailabilityBadge` look with `BadgePill variant="teal"` ("Open for Enrollment · 13 spots left") and `BadgePill variant="coral"` for "Almost Full" / `gray` for "Closed".
- "Free preview" line: keep teal but use `--m-accent-teal`.
- Enroll CTA: use the marketing `Button variant="primary-teal" size="lg" withArrow` for visual parity with home/glossary.
- Cancellation policy link: `--m-ink-tertiary` → hover `--m-accent-teal`.

**Tools You'll Learn** ([components/learn/ToolsBadges.tsx](components/learn/ToolsBadges.tsx)): drop the `font-mono` gray tags. Replace with `BadgePill variant="gray" size="md"` rendering each tool. Keep tool names plaintext (no monospace).

**How It Works** ([components/learn/HowItWorks.tsx](components/learn/HowItWorks.tsx)): four-step row stays. Restyle each step card as `bg-[var(--m-white)] border border-[var(--m-border-default)] rounded-[var(--m-radius-lg)] p-5` with the icon in a teal soft circle (`bg-[var(--m-accent-teal-soft)] text-[var(--m-accent-teal)]`). Step caption text in `--m-ink-secondary`.

**Weekly Curriculum** ([components/learn/CurriculumAccordion.tsx](components/learn/CurriculumAccordion.tsx)): keep the accordion behavior. Each week row becomes a white card on the section background with `var(--m-radius-md)` corners and a hairline border. Week format chip → `BadgePill variant="gray" size="xs"`. Free preview chip → `BadgePill variant="teal" size="xs"`. Chevron uses `--m-ink-tertiary`.

**Bonus Sessions** ([components/learn/BonusSessionsSection.tsx](components/learn/BonusSessionsSection.tsx)): each session as a white card. Session-type chip uses `BadgePill`:
- `office-hours` → `teal`
- `guest-speaker` → `purple`
- `workshop` → `coral`
- `qa` → `navy`

**Who This Course Is For + Prerequisites:** plain copy on cream, teal `•` bullet for the list. Move both into one two-column block on desktop to reduce vertical sprawl.

**Your Instructors** ([components/learn/InstructorCard.tsx](components/learn/InstructorCard.tsx)): card surface → `bg-[var(--m-white)] border border-[var(--m-border-default)] rounded-[var(--m-radius-lg)]`. Lead-instructor overline uses the `Overline` primitive (`tone="teal"`). Avatar stays 64×64, names in DM Sans 700, role/bio in `--m-ink-secondary`.

**Course Logistics + Materials:** keep the two-column logistics layout. Materials table — restyle: header row in `--m-ink-tertiary` uppercase 11px tracked; row borders in `--m-border-subtle`; cells in `--m-ink-primary`/`--m-ink-secondary`. Wrap in a white card so it reads as a single object on the cream.

**Final CTA section:** clone the glossary detail's bottom block — heading "Ready to enroll?" / "受講を始めましょう" + sub + `Button variant="primary-teal" size="lg" withArrow` linking to the same enroll action as the sticky card. Mobile users who scrolled past the sidebar still see the mobile sticky bar; this gives desktop scrollers an in-flow CTA.

**Mobile sticky bar** ([components/learn/StickyEnrollBar.tsx](components/learn/StickyEnrollBar.tsx)): swap colors to `bg-[var(--m-canvas)]/95 backdrop-blur border-t border-[var(--m-border-default)]`, CTA → marketing `Button variant="primary-teal"`. No structural change.

## Files to create / modify

**Modify:**
- `app/[locale]/learn/[slug]/page.tsx` — swap shell, replace section primitives, restructure into the canvas/sand sequence above, drop the inline dark wrapper, add final CTA section.
- `components/learn/CourseDetailHero.tsx` — full rewrite per "Hero (canvas)" above. Keep the same prop signature so the page barely changes its call site. Add an `illustrationGradientIndex` deterministic from slug if no `hero_image_url` exists.
- `components/learn/StickyEnrollSidebar.tsx` — re-skin with `--m-*` tokens, adopt `BadgePill` and marketing `Button`.
- `components/learn/StickyEnrollBar.tsx` — re-skin with `--m-*` tokens.
- `components/learn/AvailabilityBadge.tsx` — replace its internal markup with `BadgePill` variants (teal / coral / gray) so it keeps a single API but inherits the new look.
- `components/learn/ToolsBadges.tsx` — switch tags to `BadgePill`.
- `components/learn/HowItWorks.tsx` — restyle step cards.
- `components/learn/CurriculumAccordion.tsx` — restyle week rows + chips.
- `components/learn/BonusSessionsSection.tsx` — restyle session cards + chips.
- `components/learn/InstructorCard.tsx` — restyle to white card + tokens.
- `components/learn/LearningOutcomes.tsx` — promote heading to `SectionHeading`, keep teal check icons (use `--m-accent-teal`).

**Create:**
- `components/learn/CourseDetailFinalCta.tsx` — small section component (heading + sub + teal Button) used at the bottom of the page. Localized via `learn.final_cta_*` keys.

**i18n additions** (`messages/en.json` + `messages/ja.json`, `learn` namespace):
- `final_cta_heading` — "Ready to start? / 受講を始めましょう"
- `final_cta_sub` — short reminder line
- `final_cta_button` — "Enroll now" / "今すぐ申し込む"
- (No other key changes — all existing keys are reused.)

**No changes to:**
- Supabase queries (`lib/courses/queries.ts`)
- Free-preview gating (`lib/courses/utils.ts`)
- Enrollment check / payment flow (`components/learn/EnrollButton.tsx`, `lib/enrollments/queries.ts`)
- Course data shape

## Verification

Run locally and walk through the page end to end:

1. `npm run dev` and open `http://localhost:3000/learn/ai-essentials` (and `/ja/learn/ai-essentials`).
2. Visual cross-check the new hero, sticky sidebar, and section rhythm against `/` (home), `/learn` (catalog), `/glossary/<term>`, and `/learn/vault`. Cream canvas, navy ink, teal accents should match across all four. No dark navy hero anywhere.
3. Toggle the language switcher — JP subtitle appears under the EN title; on `/ja`, headings render in DM Sans / Noto Sans JP fallback with appropriate line-height.
4. Logged-out: hero CTA, sticky card CTA, mobile bottom-bar CTA all route to login → enroll. Free preview rows in curriculum show "Free preview" pill.
5. Logged-in + enrolled: enroll buttons swap to "Continue → /learn/<slug>/dashboard"; bonus session Zoom/replay links resolve.
6. Mobile (≤768px): hero collapses to single column, illustration drops below title, right sidebar disappears, bottom sticky bar shows. Tap targets ≥44px.
7. `prefers-reduced-motion: reduce`: no animation runs.
8. `npm run lint && npm run typecheck && npm test`.
9. Lighthouse mobile run on `/learn/ai-essentials` — Performance ≥90, LCP <2.5s. Confirm hero illustration is `next/image` with `priority` and `sizes` set.
10. Check `npm run build` — no warnings about server/client component boundaries from the shell swap.
