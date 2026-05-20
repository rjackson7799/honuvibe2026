# Partnerships Page — Editorial Redesign (Pass 1 of 3)

**Date:** 2026-05-20
**Approach:** Editorial (first of three explorations — Co-Made and The Pitch to follow)

## Context

The current `/partnerships` page is structured around a single offering — educational cohort partnerships — using a generic value-card + 4-step-process + form layout. As partnerships have matured, HonuVibe now sells three distinct engagement types: (01) Community & Organizational Learning, (02) Project Build (at-cost product work), and (03) Strategy, Audits & AI-Ops. The current page can't express that range, and its tone reads like a SaaS lead-gen page rather than the editorial publication the rest of the site (Explore, Learn) has become.

This redesign restructures the page as three numbered chapters in the same editorial idiom as `/explore` — serif italic chapter headlines, monospace overlines, dark-navy anchors, no card-grid filler. Each chapter has its own pitch, pricing/cadence, proof point, and per-chapter CTA. Vertice Society remains the named anchor case study; other engagements appear as quiet "currently working with…" mentions (specific names TBD with Ryan).

## Goals

1. Reframe partnerships as **three offerings** with distinct readers (community ops vs. founders vs. exec/strategy buyers), each with its own CTA.
2. Match the editorial voice of `/explore` and `/learn` — no value-prop cards, no generic 4-step timeline.
3. Replace the lead-gen form-at-bottom pattern with **per-chapter CTAs** routed to the right next action (apply form pre-filtered, project intake, Cal.com booking).
4. Keep Vertice as the load-bearing proof point; quietly acknowledge other engagements without violating partner visibility constraints (SmashHaus stays hidden).

## Page Composition

Replace [app/[locale]/partnerships/page.tsx](app/[locale]/partnerships/page.tsx) section list wholesale. New top-to-bottom order:

| # | Component | Section variant | Role |
|---|-----------|-----------------|------|
| 1 | `PartnershipsEditorialHero` | navy | "Partner with us." + sub-pitch + 01/02/03 chip nav |
| 2 | `PartnershipsCohortChapter` | canvas | Chapter 01 — Community & Organizational Learning |
| 3 | `PartnershipsProjectChapter` | sand | Chapter 02 — Building out your project |
| 4 | `PartnershipsConsultingChapter` | canvas | Chapter 03 — Strategy, audits & AI-ops |
| 5 | `PartnershipsMethodTable` | navy | 3-column workflow comparison (replaces old HowItWorks) |
| 6 | `PartnershipsNextChapter` | navy | Closing CTA — "Let's write the next chapter." |

**Sections being deleted** (move logic into chapters, then delete):
- [components/marketing/partnerships/hero.tsx](components/marketing/partnerships/hero.tsx)
- [components/marketing/partnerships/what-you-get.tsx](components/marketing/partnerships/what-you-get.tsx) — value props fold into Chapter 01 body
- [components/marketing/partnerships/how-it-works.tsx](components/marketing/partnerships/how-it-works.tsx) — replaced by Method table
- [components/marketing/partnerships/current-partners.tsx](components/marketing/partnerships/current-partners.tsx) — Vertice card moves into Chapter 01 as the embedded proof tile
- [components/marketing/partnerships/metrics.tsx](components/marketing/partnerships/metrics.tsx) — dropped per spec (no stats row this pass)
- [components/marketing/partnerships/who-is-it-for.tsx](components/marketing/partnerships/who-is-it-for.tsx) — fit criteria reabsorbed as a small "Fit check" block inside Chapter 01
- [components/marketing/partnerships/application-form.tsx](components/marketing/partnerships/application-form.tsx) — **keep the form component itself** but move it to a dedicated route `/partnerships/apply` reached from per-chapter CTAs (see "Routing & CTAs" below)

## Chapter Anatomy

Each of the three chapters shares this skeleton, modeled after [components/marketing/explore/method-chapter.tsx](components/marketing/explore/method-chapter.tsx) and [components/marketing/explore/aloha-chapter.tsx](components/marketing/explore/aloha-chapter.tsx):

```
┌─ Overline ──────────────────────────────── Right-aligned meta ─┐
│ CH. 0X · OFFERING NAME                        FOR / TIMELINE   │
├────────────────────────────────────────────────────────────────┤
│                                                                │
│ Serif italic headline. Two-line max. Teal accent period.       │
│                                                                │
├──────────────────────────── ──────────────────────────────────┤
│ Lede paragraph (15–16.5px sans, line-height 1.7, max 65ch).    │
│ One short follow-on sentence.                                  │
│                                                                │
├──────────────────────────── ──────────────────────────────────┤
│  Cadence/pricing row  │  Outcome row  │  Proof tile            │
│  3 monospace columns  │  3 bullets    │  Vertice / quiet list  │
├────────────────────────────────────────────────────────────────┤
│  Pull quote (serif italic, left teal rule)                     │
├────────────────────────────────────────────────────────────────┤
│  → Per-chapter CTA link (outline-teal button with arrow)       │
└────────────────────────────────────────────────────────────────┘
```

Chapter-specific content:

### Chapter 01 — Community & Organizational Learning
- **Reader:** community managers, association directors, professional networks
- **Cadence row:** "From $20K USD" · "8–16 weeks" · "5–500+ participants"
- **Outcome bullets:** Custom curriculum · Co-branded delivery · Revenue share or flat license
- **Proof tile:** Vertice Society — link to [/partners/vertice-society](app/[locale]/partners/vertice-society/page.tsx) with the existing screenshot/pull stat
- **CTA:** `Apply for a cohort partnership →` linking to `/partnerships/apply?type=cohort`

### Chapter 02 — Building out your project
- **Reader:** founders, ops leads, product owners who need something shipped
- **Cadence row:** "3-day sprint" · "1–4 weeks scoped" · "6+ weeks build"
- **Outcome bullets:** Production app/site · Documentation + handoff · Optional retainer
- **Proof tile:** Quiet "Currently building with…" line — **TBD: needs Ryan to name 2–3 active engagements that are OK to acknowledge without case study pages.** Fall back to a single anonymized line ("A bilingual healthcare archive · A photography archive rebuild") if no names approved.
- **CTA:** `Tell us about your project →` linking to `/partnerships/apply?type=project`

### Chapter 03 — Strategy, audits & AI-ops design
- **Reader:** execs, ops directors, founders past initial build, evaluating AI rollouts
- **Cadence row:** "3-day strategy week" · "4 / 8 / 12-week engagements" · "Senior, hands-on"
- **Outcome bullets:** AI-readiness audit · Workflow + tool selection · Internal team enablement
- **Proof tile:** Sample artifact preview (terminal snippet or doc thumbnail) instead of a named client, OR a single anonymized quote
- **CTA:** `Book a consulting intro call →` linking to Cal.com (use existing booking URL — same one as HonuHub if available, otherwise placeholder pending Ryan confirmation)

## Method Comparison Table

New component `components/marketing/partnerships/method-table.tsx`, on `Section variant="navy"`. Three columns matching the chapter order:

| | Private Cohorts | Contracting | Consulting |
|---|---|---|---|
| **Audience deep-dive** | 1–2 weeks, surveys, interviews | At kickoff, scoped to product | One-day intensive |
| **Co-design curriculum / scope** | 2–3 weeks, modules outlined | Sprint + SOW | Roadmap doc |
| **Sprint & ship** | 6–12 week cohort | 1–6+ week build | Workshops & decisions |
| **Co-deliver + iterate** | Live cohort sessions | Handoff & support | Written artifacts |
| **Outcomes** | Cohort engagement & cert | Production launch | Aligned plan & training |

Use the same overline + serif headline rhythm; table uses monospace for header row, sans for body, divider rules between rows. Reference structure from [components/marketing/explore/index-table.tsx](components/marketing/explore/index-table.tsx).

## Hero

New `components/marketing/partnerships/editorial-hero.tsx`:
- Headline: serif italic "Partner with us." with teal period (size ~`clamp(56px, 8vw, 104px)`)
- Sub-pitch: 2–3 sentence lede ("HonuVibe partners three ways. We teach for your community, we build with your team, and we advise where it matters most. Bilingual by default. Hawaii-rooted, Japan-fluent.")
- Three chip-style anchor links: `01 ↓ Cohort` `02 ↓ Project` `03 ↓ Consulting` — each smooth-scrolls to its chapter
- Right side: existing hero composite (cohort screenshot + LMS dashboard + bilingual slide) can be reused — extract from [hero.tsx](components/marketing/partnerships/hero.tsx) into a reusable `<HeroComposite />` if visually heavy enough to reuse

## Routing & CTAs

Per-chapter CTAs need destinations. Create a new route `app/[locale]/partnerships/apply/page.tsx` that:
- Reads a `?type=cohort|project|consulting` query param
- Reuses the existing [application-form.tsx](components/marketing/partnerships/application-form.tsx) with the org-type / engagement-type field pre-filled
- Inherits the editorial frame (navy header, serif headline "Apply.")

Chapter 03's CTA bypasses the form and goes to Cal.com — confirm the booking URL.

## Data + i18n

Add `partnerships.*` keys to [messages/en.json](messages/en.json) and [messages/ja.json](messages/ja.json) under these new namespaces (replacing the old ones):
- `partnerships.editorial_hero.{headline, lede, chip_01, chip_02, chip_03}`
- `partnerships.cohort.{overline, meta_right, headline, lede, cadence_*, outcome_*, quote, quote_attr, cta}`
- `partnerships.project.{...same keys...}`
- `partnerships.consulting.{...same keys...}`
- `partnerships.method.{headline, chapter_label, col_*, row_*}`
- `partnerships.next_chapter.{headline, lede, cta_primary, cta_secondary}`
- `partnerships.apply.{headline, lede, type_label_*}`

Per the established locale-pure pattern ([memory: bilingual interleaving removed on /learn]), EN page shows EN only, JP page shows JP only. No inline mixing.

## Critical Files to Modify

- [app/[locale]/partnerships/page.tsx](app/[locale]/partnerships/page.tsx) — swap section composition
- [components/marketing/partnerships/index.ts](components/marketing/partnerships/index.ts) — update exports
- [messages/en.json](messages/en.json) + [messages/ja.json](messages/ja.json) — new `partnerships.*` tree

## Critical Files to Create

- `components/marketing/partnerships/editorial-hero.tsx`
- `components/marketing/partnerships/cohort-chapter.tsx`
- `components/marketing/partnerships/project-chapter.tsx`
- `components/marketing/partnerships/consulting-chapter.tsx`
- `components/marketing/partnerships/method-table.tsx`
- `components/marketing/partnerships/next-chapter.tsx`
- `app/[locale]/partnerships/apply/page.tsx`

## Critical Files to Delete

After content is migrated into the chapters above:
- `components/marketing/partnerships/hero.tsx`
- `components/marketing/partnerships/what-you-get.tsx`
- `components/marketing/partnerships/how-it-works.tsx`
- `components/marketing/partnerships/current-partners.tsx`
- `components/marketing/partnerships/metrics.tsx`
- `components/marketing/partnerships/who-is-it-for.tsx`

Keep `application-form.tsx` — it's reused on the new `/apply` route.

## Reusable Primitives Already Available

No new shared primitives needed. Compose from:
- [`Section`](components/marketing/primitives/Section.tsx) variants `navy`, `canvas`, `sand`
- [`Container`](components/marketing/primitives/Container.tsx)
- Existing `Button` with `outline-teal` and `withArrow`
- CSS vars `--m-ink-primary`, `--m-ink-secondary`, `--m-accent-teal`, `--m-border-soft`

## Open Content TBDs (need Ryan input at execution time)

1. **Quiet engagements for Chapter 02 proof tile** — which active (non-SmashHaus, non-Vertice) project work can be named or anonymized?
2. **Pricing anchors** — confirm the dollar/time figures suggested above match what Ryan actually quotes today.
3. **Chapter 03 proof artifact** — terminal snippet? doc preview? anonymized quote? Pick one.
4. **Cal.com URL** for consulting intro calls.

## Verification

1. `pnpm dev` and visit `/partnerships` (EN) and `/ja/partnerships` (JP). Confirm:
   - Three chapter anchors scroll smoothly from hero chips
   - Each chapter renders with correct overline, headline, cadence row, outcome bullets, proof tile, CTA
   - Method table reads cleanly on desktop and stacks on mobile
   - Each per-chapter CTA lands on the right destination (apply form pre-filled OR Cal.com)
   - JP route shows JP-only copy (no English bleed)
2. Run existing test: `pnpm test __tests__/marketing/partnerships/` if present; add a smoke test mirroring [__tests__/marketing/explore/explore-sections.test.tsx](__tests__/marketing/explore/explore-sections.test.tsx) for the new chapter components.
3. Lighthouse mobile pass — confirm Performance ≥ 90 and LCP < 2.5s per project budget.
4. Visual diff against Explore page to confirm typographic rhythm matches.

## Out of Scope (deferred to passes 2 and 3)

- **Co-Made** approach (next exploration)
- **The Pitch** approach (final exploration)
- Stats row (explicitly dropped this pass)
- FAQ / Notes accordion (explicitly dropped this pass)
- New partner case study pages beyond Vertice
