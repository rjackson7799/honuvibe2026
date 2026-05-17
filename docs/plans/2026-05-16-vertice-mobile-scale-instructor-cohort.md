# Vertice Mobile Scale-Down + Instructor Reorder + Cohort Date

**Date:** 2026-05-16
**Page:** `/partners/vertice-society` (EN) + `/ja/partners/vertice-society` (JP)
**Files:** `components/partners/vertice/VerticeLanding.tsx`, `components/partners/vertice/vertice.css`

## Context

Three asks bundled into one change:

1. **Mobile hero mockup is broken.** Previous attempt stripped the Vault chrome on mobile and rendered just the lesson body as a clean card. User feedback: "still doesn't look good. I thought we would make a mini-screen like the attached, but for mobile only." Intent: keep the **full desktop Vault chrome** (browser bar + 5-week sidebar + lesson body + progress footer + LIFETIME chip + testimonial card) on mobile, just visually shrunk so it fits the viewport — a true mini-mockup, not a redesigned mobile-only layout.

2. **Chiemi M. is now the lead teacher for Vertice Society.** Reorder the `INSTRUCTORS` array so Chiemi appears before Mizuho. New order: Ryan → Chiemi → Mizuho.

3. **Live cohort training start date moved to 2026-05-23.** Update the single source-of-truth `COHORT` constant; the `startDateLabel` cascades to the hero stats tile, the Vault+Live Coaching pricing card, the FinalCTA, the mobile sticky CTA, and any other "5/15開講" reference automatically.

## Approach

### 1. Mobile scale-down mockup

Wrap the existing `.vertice-mockup` element in a new `.vertice-mockup-stage` div. The stage controls layout space; the inner mockup keeps its desktop dimensions (520×880) and gets `transform: scale()` applied below a breakpoint. CSS variable `--mockup-scale` lets us tune the factor per breakpoint.

- **Revert** the previous "strip-chrome on mobile" rules in `vertice.css` (the `@media (max-width: 768px)` block under the hero mockup section that hides `.vertice-vault-bar`, `.vertice-vault-rail`, `.vertice-vault-foot`, the `::before` LESSON SAMPLE eyebrow, etc.). Those rules are no longer needed and conflict with the new approach.
- **Add** new mobile rules that wrap the entire mockup in a stage and apply `transform: scale`:
  - `@media (max-width: 768px)` — scale 0.78 (tablet portrait)
  - `@media (max-width: 540px)` — scale 0.62 (typical phone)
  - `@media (max-width: 380px)` — scale 0.52 (small phone)
- The stage gets `height: calc(880px * var(--mockup-scale))` so the document flow reserves the correct space.
- The inner mockup gets `transform: scale(var(--mockup-scale))` with `transform-origin: top center` and is absolute-positioned within the stage so its layout doesn't claim the original 520×880.
- Restore display on `.vertice-chip-lifetime` and `.vertice-mockup-testimonial` on mobile (those were hidden); they now scale along with the rest.

### 2. Instructor reorder

Reorder the `INSTRUCTORS` array entries at [VerticeLanding.tsx:2356](../../components/partners/vertice/VerticeLanding.tsx#L2356). Move the Chiemi M. object to index 1 (between Ryan and Mizuho). No JSX or CSS changes — the array drives both the `TaughtBy` strip and the `Instructors` section.

New order:
1. Ryan Jackson — AI Education Director
2. Chiemi M. — AI Consultant & Trainer *(now Vertice lead)*
3. Mizuho H. — Lead AI Trainer

### 3. Cohort date update

Update the `COHORT` constant at [VerticeLanding.tsx:25-29](../../components/partners/vertice/VerticeLanding.tsx#L25):

```ts
const COHORT = {
  startDate: '2026-05-23',
  startDateLabel: { jp: '5/23開講', en: 'Starts May 23' },
  seatsLeft: 15,
};
```

Verified via grep: `5/15`, `May 15`, and `2026-05-15` appear ONLY inside the COHORT constant in `components/partners/vertice/`. Updating the constant cascades to every consumer.

## Files to modify

- **[components/partners/vertice/VerticeLanding.tsx](../../components/partners/vertice/VerticeLanding.tsx)**
  - Update `COHORT` constant (lines 25-29) → 2026-05-23 + 5/23開講 / Starts May 23
  - Reorder `INSTRUCTORS` array (line 2356) → Ryan, Chiemi, Mizuho
  - Inside `HeroMockup()` (around line 219): wrap the returned JSX in a new outer `<div className="vertice-mockup-stage">` containing the existing `<div className="vertice-mockup">` and its contents

- **[components/partners/vertice/vertice.css](../../components/partners/vertice/vertice.css)**
  - Replace the existing `@media (max-width: 768px)` block under "Hero Mockup (Vault product preview)" — the one that hides chrome and adds the LESSON SAMPLE eyebrow — with the new scale-down rules
  - Restore mobile visibility on `.vertice-chip-lifetime` and `.vertice-mockup-testimonial` (remove the `display: none` at `@media (max-width: 640px)`)
  - Add `.vertice-mockup-stage` rules to control layout space at each breakpoint

## Reusable patterns

- Existing `.vertice-mockup` class and all child rules (Vault chrome, grid, sidebar, player content, progress footer, LIFETIME chip, testimonial card) — kept as-is, no changes
- `COHORT` constant pattern — single source of truth, already cascades correctly
- `INSTRUCTORS` array consumers (`TaughtBy` strip, `Instructors` section) — both `.map` over the array; reorder is purely data-driven

## Verification

1. `pnpm type-check` — clean
2. `pnpm dev` — visit `http://localhost:3000/ja/partners/vertice-society` and `http://localhost:3000/partners/vertice-society`
3. Desktop (>1024px) — mockup unchanged: full 520×880 with all chrome, chips, testimonial. No regressions.
4. Tablet (~960px wide) — mockup scaled to ~78%, all chrome visible, layout doesn't overflow.
5. Mobile (~360-420px) — mockup scaled to ~52-62%, full Vault chrome (browser bar + sidebar with 5 weeks + lesson body + progress bar) visible as a "mini-screen". LIFETIME chip and testimonial card scale along. No horizontal scroll.
6. Open the JP page on a real phone (or DevTools mobile emulation) — confirm mockup looks like the desktop version, just shrunk.
7. Confirm "5/23開講" appears in hero stats, Vault+Live Coaching pricing card, FinalCTA, sticky mobile CTA.
8. Confirm Chiemi M. appears second (between Ryan and Mizuho) in both the TaughtBy strip and the Instructors section.
9. Lighthouse mobile run on the JP page: Performance ≥ 90, no new console errors.

## Out of scope

- Re-styling the Vault chrome itself — it stays exactly as designed for desktop
- Mobile-specific content variants (e.g. hiding the checklist on mobile) — content stays identical, only visual size changes
- Touch-target accessibility on scaled content — mockup is `aria-hidden="true"` and decorative, so smaller touch targets don't matter
