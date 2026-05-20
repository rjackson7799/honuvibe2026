# Partnerships Page — Co-Made Redesign (Pass 2 of 3)

**Date:** 2026-05-20
**Approach:** Co-Made (second of three — Editorial shipped, The Pitch to follow)

## Context

Pass 1 (Editorial) reframed `/partnerships` as a HonuVibe-authored publication: serif headlines, three numbered chapters, Vertice as an embedded proof tile. The voice is unmistakably HonuVibe's.

Co-Made inverts that posture. Where Editorial says *"we publish, you read,"* Co-Made says *"we make this together — and you can see it."* Partners aren't proof tiles supporting a HonuVibe thesis; they share the byline. The page lives at the seam between the two brands, with logo lockups, dual-author quotes, real co-branded artifacts, and a hero that introduces partners by name before it introduces HonuVibe.

The intent is to test whether a more relationship-forward layout converts better with founders/community leads who are wary of buying from a "vendor" but warm to "working alongside" a peer. The aesthetic stays inside HonuVibe's design system (serif/sans pairing, teal/coral accents, monospace overlines) — but its rhetoric, hierarchy, and use of partner color/marks is fundamentally different.

## What "Co-Made" means visually

Five moves separate this from Editorial:

1. **Lockup-as-hero.** The page opens not with "Partner with us." but with a `HonuVibe × {Partner}` lockup that cycles through real engagements. Partner name appears before HonuVibe's offering.
2. **Dual color system.** Each featured partner contributes an accent color that pairs with HonuVibe teal in their section (Vertice navy on teal, future partners follow). One co-branded surface = one dual-color region.
3. **Dual-byline quotes.** Testimonials show both speakers — Ryan + partner principal — in a conversation/duet structure rather than a one-sided pull quote.
4. **Real artifacts, full-bleed.** Screenshots of the actual co-branded program, slides, dashboards, and certificate templates are shown at scale, not as decorative cards.
5. **First-person plural copy.** "We picked the curriculum together. We taught it together. We measured it together." Replaces HonuVibe's "We design, deliver, and measure."

## Goals

1. Test a relationship-forward posture against the Editorial pass — same content underneath, fundamentally different rhetoric.
2. Make the partner the protagonist of each section, with HonuVibe as the constant collaborator across all three engagement types.
3. Show — not just describe — what co-made work actually looks like (real screenshots, real lockups, real names).
4. Keep the page within the existing design system. No new fonts, no new primitives required.

## Where it lives

Build under a **preview route** so Editorial stays live for comparison:

- New route: `app/[locale]/partnerships/preview/co-made/page.tsx`
- Components in: `components/marketing/partnerships/comade/`
- Once Ryan picks a direction, the chosen variant moves to `/partnerships` and the others are deleted.

Add a small dev-only banner on the preview page noting "PREVIEW — Co-Made variant" so it's not mistaken for the live page if accidentally linked.

## Page Composition

Six sections, navy-canvas-sand-navy alternation, monospace meta strips between:

| # | Component | Variant | Role |
|---|-----------|---------|------|
| 1 | `ComadeLockupHero` | navy | Cycling `HonuVibe × {Partner}` lockup; partner-name-first |
| 2 | `ComadeFeatureCase` | canvas | Full-bleed Vertice case (the deep one) — real screenshots, dual color region |
| 3 | `ComadeThreeWays` | sand | "Three things we co-make" — programs / products / plans |
| 4 | `ComadeDuetQuotes` | navy | Dual-byline quote rail; Ryan + partner principal alternating |
| 5 | `ComadeCurrentlyMaking` | canvas | "Currently making with…" — lockup grid with status (live/in-progress/reserved) |
| 6 | `ComadeLetsMakeSomething` | navy | Closing CTA — "Let's make something" routing to apply form |

## Section anatomy

### 1. `ComadeLockupHero` — the lockup-as-hero

- Background: navy
- **Above the fold:** A large logo lockup component. Center mark is `×` in serif italic. Left side: partner logo (or stylized name when no logo is available). Right side: HonuVibe wordmark.
- The lockup **cycles** through 3 real engagements every ~6 seconds (with prev/next controls, like Reel hero). Each cycle is a real engagement we're allowed to name publicly — Vertice today, more as they come.
- **Tagline underneath the lockup** (smaller than the lockup, sans, secondary):
  *"We don't build programs for our partners. We build them with our partners."*
- **Meta strip top** in mono: `VOL. 02 · CO-MADE · MMXXVI`
- **Two CTAs:** `See how we work →` (smooth scroll to feature case) and `Start an inquiry →` (link to /partnerships/apply)

```
┌───────────────────────────────────────────────┐
│ VOL. 02 · CO-MADE · MMXXVI                    │
├───────────────────────────────────────────────┤
│                                               │
│   VERTICE       ×       HonuVibe.AI           │
│   SOCIETY                                     │
│                                               │
│   We don't build programs for our partners.   │
│   We build them with our partners.            │
│                                               │
│   [ See how we work → ] [ Start an inquiry ]  │
│                                               │
│   01 / 03    ◀ ▶                              │
└───────────────────────────────────────────────┘
```

### 2. `ComadeFeatureCase` — Vertice deep dive

The load-bearing section. One real case, presented at scale.

- Background: canvas, with a **dual-color band** at the top (50% Vertice color / 50% HonuVibe teal). The lockup sits centered on the seam.
- **Three sub-blocks:**
  - **The brief.** Short paragraph in HonuVibe voice — what Vertice came to us for.
  - **The make.** Full-bleed screenshot row — the actual cohort dashboard, the bilingual slide template, the live session. (We already have these mocks in [PartnershipsHeroComposite](components/marketing/partnerships/editorial-hero.tsx) — repurpose. Real screenshots when available.)
  - **The outcome.** Three stat tiles (size · duration · language) — same data as cohort chapter today but bigger.
- **Closing line:** A duet-style quote — Vertice's principal on one side, Ryan on the other, both in serif italic, separated by a vertical rule.

### 3. `ComadeThreeWays` — three ways to co-make

Same three engagement types as Editorial, but reframed and visually unified:

- "We co-make **programs**" (cohort)
- "We co-make **products**" (project)
- "We co-make **plans**" (consulting)

Each as a wide row (not three narrow columns):
- Left: serif italic verb-noun headline + 2-sentence lede
- Middle: cadence/pricing row (3 monospace columns)
- Right: a small "currently co-making" tile (lockup + partner name) — or "your name here" placeholder
- Each row has its own per-chapter CTA, routing to `/partnerships/apply?type=cohort|project|consulting`

This keeps the underlying offering structure (so we don't lose the work from Editorial) while changing how it's framed.

### 4. `ComadeDuetQuotes` — alternating dual-byline quotes

A rail of 3–4 quote pairs, displayed as conversation:

```
┌────────────────────────────────────────────────┐
│  "Partner principal's quote about HonuVibe."   │
│              — Name, Title, Org                │
│                                                │
│                                    ┌───────────│
│                                    │ "Ryan's   │
│                                    │  reply."  │
│                                    │           │
│                                    │ — Ryan,   │
│                                    │  HonuVibe │
│                                    └───────────│
└────────────────────────────────────────────────┘
```

Variant: navy background, serif italic body, monospace bylines. Alternating left/right with subtle teal connector rule between paired quotes to make the "duet" structure legible.

At minimum we need ONE real duet (Vertice). Placeholders flagged for the rest. Without real names, this section drops to a single hero quote and the section header becomes "What partners have said."

### 5. `ComadeCurrentlyMaking` — lockup grid

A grid of `× Partner` lockups showing active and past collaborations.

- Each cell: lockup + status pill (LIVE / IN PROGRESS / RESERVED)
- Reserved cells say "your name here" with a teal "+" icon — invites the reader to fill the slot
- Lockups for partners we can't name publicly use silhouette + sector ("a Tokyo medical group", "a photography collective")

This replaces the Editorial pass's quiet footnote — Co-Made elevates the partner-list to a section in its own right.

### 6. `ComadeLetsMakeSomething` — closing CTA

- Navy background, end-of-issue meta strip
- Headline: serif "Let's make something." with teal period
- Sub: "Tell us about the program, product, or plan you've been carrying around. We respond to every inquiry within five business days."
- Primary CTA: `Start an inquiry →` to `/partnerships/apply`
- Secondary CTA: `See recent work →` to `/explore`

Same shape as Editorial's `PartnershipsNextChapter` — repurpose the component if structure aligns.

## New primitives we'll likely need

One small primitive that doesn't exist yet:

- **`LogoLockup`** — `<LogoLockup left={...} right="HonuVibe.AI" mark="×" theme="navy|canvas" partnerColor="..." />` — used in hero, feature case, currently-making grid. Centralizes the `×` glyph, sizing, and color pairing logic.

Everything else composes from existing `Section`, `Container`, `Button`, monospace/serif typography tokens.

## Data + i18n changes

New namespace: `partnerships.comade.*` (alongside the existing `partnerships.editorial_*` keys — they don't conflict).

Sub-trees:
- `comade.lockup_hero.{meta_*, tagline, cta_primary, cta_secondary, partners.{vertice, partner_b, partner_c}.{display_name, color}}`
- `comade.feature_case.{overline, brief, brief_body, make_overline, outcome_overline, stat_*, quote_partner, quote_partner_attr, quote_ryan, quote_ryan_attr}`
- `comade.three_ways.{programs.*, products.*, plans.*}` — each with headline, lede, cadence triple, tile_text, cta
- `comade.duet_quotes.{section_overline, pairs.{1, 2, 3}.{partner, partner_attr, ryan, ryan_attr}}`
- `comade.currently_making.{overline, headline, cells.{1, 2, 3, 4, 5, 6}.{display_name, status, sector_anonymized}}`
- `comade.lets_make_something.{meta_*, headline_1, headline_2, lede, cta_primary, cta_secondary}`

Per locale-pure pattern, EN and JP translations parallel; no inline mixing.

## Critical files to create

- `app/[locale]/partnerships/preview/co-made/page.tsx`
- `components/marketing/partnerships/comade/index.ts`
- `components/marketing/partnerships/comade/lockup-hero.tsx`
- `components/marketing/partnerships/comade/feature-case.tsx`
- `components/marketing/partnerships/comade/three-ways.tsx`
- `components/marketing/partnerships/comade/duet-quotes.tsx`
- `components/marketing/partnerships/comade/currently-making.tsx`
- `components/marketing/partnerships/comade/lets-make-something.tsx`
- `components/marketing/primitives/logo-lockup.tsx` (new shared primitive)
- Test: `__tests__/marketing/partnerships/comade-sections.test.tsx`

## Files unchanged

The Editorial implementation stays put. `/partnerships` continues to render the editorial variant. Co-Made lives at `/partnerships/preview/co-made`.

## Reuse opportunities

- The existing `PartnershipsHeroComposite` (mocks of cohort dashboard / bilingual slide / live session in [editorial-hero.tsx](components/marketing/partnerships/editorial-hero.tsx)) — repurpose inside `feature-case.tsx`.
- The Reel hero cycling mechanics from [explore reel-hero](components/marketing/explore/reel-hero.tsx) — model the lockup cycler after the same prev/next + progress-bar pattern.
- `application-form.tsx` is shared — Co-Made reuses `/partnerships/apply` exactly as Editorial does.

## Open content TBDs (need Ryan input at execution time)

1. **Partner color for Vertice** — confirm or pick the Vertice accent that pairs with HonuVibe teal. Same for future named partners.
2. **Real dual-byline quotes** — need one real Vertice principal quote (paired with a Ryan response) to make the Duet section credible. Without it, section drops to a single quote.
3. **Real screenshots** for the feature case — confirm we can use actual Vertice cohort dashboard, slide template, live session captures (vs. the existing mock composites).
4. **Currently-making cells** — same as Editorial pass: which engagements can we name publicly? Anonymized cells work as a fallback but real names are stronger.
5. **Tagline confirmation** — "We don't build programs for our partners. We build them with our partners." This phrasing is the thesis of the entire variant. Lock it or replace it before we ship copy.

## Verification

1. `pnpm dev` and visit `/partnerships/preview/co-made` (EN) and `/ja/partnerships/preview/co-made` (JP). Confirm:
   - Lockup hero cycles through partners; partner-name-first ordering reads correctly
   - Feature case shows the dual-color band cleanly on desktop and mobile
   - Three-ways rows stack on mobile, sit as wide rows on desktop
   - Duet quotes alternate left/right with the connector rule visible
   - Currently-making grid renders all cells including the "your name here" reserved slot
   - JP route is JP-only — no English bleed
2. `pnpm vitest run __tests__/marketing/partnerships/comade-sections.test.tsx` passes
3. `npx tsc --noEmit` clean
4. Visual diff against the live Editorial `/partnerships` to confirm the two variants are genuinely distinct in posture, not just rearranged

## Decision after build

Once Co-Made is on the preview route, Ryan walks both variants in the browser. The Pitch (pass 3) follows. Final choice collapses to `/partnerships` and the other two preview routes are deleted.

## Out of scope

- The Pitch design (pass 3)
- Modifying the live `/partnerships` (Editorial) page
- New shared primitives beyond `LogoLockup`
- New translation infrastructure — reuse existing `next-intl` namespace pattern
- Real partner data ingestion — placeholders are acceptable for this pass; replace with real content only when Ryan signs off on design direction
