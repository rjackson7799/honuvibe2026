# For Organizations (/partnerships) redesign — "The Field Guide"

## Context

Ryan recently reskinned `/explore` into "The Wayfinding Chart" (a warm narrative metaphor, dark/premium) and wants the same quality-of-redesign treatment for the **For Organizations** page. Three concept mockups were generated (Prospectus / Blueprint / Field Guide); Ryan delegated the pick and the depth. Chosen: **The Field Guide** (concept #3), two dedicated new content sections, teachers framed generically (no wiring).

**Two things need fixing on this page, not just a reskin:**
1. **The target is `/partnerships`, not `/organizations`.** The "For Organizations" nav/footer/homepage CTAs all point to `/partnerships` (`components/marketing/nav/marketing-nav.tsx:8`, label `nav.partnerships` = "For Organizations"). `app/[locale]/organizations/page.tsx` is a legacy orphaned page — out of scope.
2. **The two messages Ryan cares most about are missing.** Monetization is a single bullet on the live page; "members become teachers" is entirely absent (even though `/become-an-instructor` redirects here). This redesign fills that gap with two dedicated sections.

Outcome: a distinctive, premium, on-brand `/partnerships` page where an org/community leader immediately understands they can run co-branded AI training *and monetize it*, and that their best members can grow into paid teachers.

## Approach

Copy + motif reskin of the 5 existing partnership sections + 2 new content sections, reusing all marketing primitives and the navy/canvas/sand rhythm. New identity = "grow a community, season by season" metaphor (Seed → Tend → Harvest), a restrained botanical-gradient dark band (`.fg-band`) on the hero/method/CTA, and a teal (primary) + verdigris (growth) + gold (harvest) accent set. Editorial hero voice retained; `prefers-reduced-motion` respected; WCAG AA on both themes.

### Page structure (`app/[locale]/partnerships/page.tsx`)
1. Hero — "Programs that take root in your community." (navy + `.fg-band`)
2. How a community grows — Seed → Tend → Harvest triptych (canvas, **new** `growing-cycle.tsx`)
3. Featured specimen — Vertice Society card (sand, refactored `cohort-chapter.tsx`)
4. Monetize your community — revenue models, gold harvest accent (navy, **new** `monetize.tsx`)
5. Members grow into teachers — generic framing, placeholder CTA (canvas, **new** `members-teachers.tsx`)
6. Studio callout (sand, `studio-router.tsx`, unchanged copy)
7. Five seasons of a cohort — method (navy + `.fg-band`, `method-table.tsx`, heading reframe only)
8. "Let's plant the next season." CTA (navy + `.fg-band`, `next-chapter.tsx`)
+ Newsletter + Footer (unchanged)

### Files
- New: `components/marketing/partnerships/{growing-cycle,monetize,members-teachers}.tsx` + barrel exports.
- Rewrite copy/motif: `editorial-hero.tsx`, `cohort-chapter.tsx`, `method-table.tsx`, `next-chapter.tsx`.
- `styles/globals.css`: add `--m-accent-gold`/`--m-accent-gold-soft` tokens (+ `@theme inline`), and a scoped `.fg-band` botanical-gradient block.
- `messages/en.json` + `ja.json`: rewrite `partnerships.{editorial_hero,cohort,method,next_chapter}`, add `partnerships.{growing_cycle,monetize,members_teachers}`. Form/apply/studio/comade keys untouched.
- `__tests__/marketing/partnerships/partnerships-sections.test.tsx`: update copy assertions.

### Locked behaviors (preserve)
- Hero lede still starts "We design and run AI learning programs …".
- Vertice card: "Vertice Society", "In session", 10/5wk/EN+JP, "Read the Vertice case study" → `/partners/vertice-society`.
- Cohort + closing primary CTA "Apply for a cohort partnership" → `/partnerships/apply?type=cohort`.
- Studio callout copy + "Visit HonuVibe Studio" → `STUDIO_URL` (new tab).
- Method keeps 5 phase labels (Audience deep-dive / Co-design / Deliver live / Iterate / Outcome); "Contracting"/"Consulting" absent; chapter_label "How a cohort partnership runs".
- Application form untouched. Nav coral convention untouched; body accents teal/verdigris/gold.

## Verification
1. `pnpm verify` (type-check → tests → build) green — partnerships test updated as part of the change.
2. Browser smoke `/partnerships` (EN) + `/ja/partnerships`: growth metaphor reads, monetize + teachers prominent, CTAs resolve, reduced-motion honored, AA contrast on navy bands.
3. JA copy machine-drafted — flag for Ryan's native review.
4. No migration; no RLS change.
