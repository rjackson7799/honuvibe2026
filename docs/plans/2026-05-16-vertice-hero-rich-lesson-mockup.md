# Vertice Hero — Rich Lesson Mockup

**Date:** 2026-05-16
**Page:** `/partners/vertice-society` (EN) + `/ja/partners/vertice-society` (JP)
**Files:** `components/partners/vertice/VerticeLanding.tsx`, `components/partners/vertice/vertice.css`

## Context

The current Vault mockup (just rebuilt) shows a clean lesson preview: title + on-brand abstract image + 3 takeaway bullets + progress bar. It earns its space but it stops short of conveying *teaching density*. A glance at it tells you "this is a lesson" but not "this is a substantive lesson worth paying for."

A reference design surfaced (an AI Academy lesson UI mock) that goes further: framework cards laying out the lesson's mental model, side-by-side before/after output comparison, and an instructor video bubble for a human anchor. We want to channel that depth without copying the reference 1:1 — it's designed for ~1400px wide, our hero panel is ~520px.

Approach: **keep the existing Vault chrome** (browser bar + curriculum sidebar + progress footer + LIFETIME chip + testimonial card) and **replace the inside of the player area** with a distilled rich-lesson surface. Adapted to our real lesson topic (`第3週 · LESSON 04 · チームでAIを使いこなす`), not the reference's prompt-frameworks topic.

## Approach

Inside the player column of `.vertice-vault-grid` (currently lesson title + image + takeaways), render three new content blocks plus an instructor bubble overlaid outside the Vault frame:

### 1. Lesson header *(unchanged)*
- Eyebrow: `第3週 · LESSON 04`
- Title: `チームでAIを使いこなす`

### 2. Framework cards block *(new)*
A 3-card stack showing AI delegation patterns — the mental model the lesson teaches.

| JP | EN | Icon hint |
|---|---|---|
| 完全委任 | Full handoff | arrow-right |
| 検証付き | With verification | check-shield |
| 反復改善 | Iterative refinement | refresh/loop |

Each card: small icon + JP primary + EN secondary + 1-line micro-description. Card chrome: white, hairline border, soft shadow — same language as the existing Vault.

### 3. Before / after comparison block *(new)*
Two compact panels side-by-side showing how delegation pattern affects output quality.

- **Left (vague):** Prompt `会議準備して`. Output line `→ 一般論しか出てこない`. Red ❌ glyph.
- **Right (structured):** Prompt `目的・参加者・論点を整理した会議準備プロンプト`. Output line `→ チーム特化の議題草案`. Seafoam ✓ glyph.

Section eyebrow: `曖昧 → 構造化 · vague → structured`.

### 4. Instructor video bubble *(new — overlays outside the Vault)*
A small floating photo card at the bottom-right of the entire `.vertice-mockup` container (not inside the Vault), partially overlapping the Vault's bottom-right corner. Mirrors the reference's bottom-right video bubble.

- Photo: `INSTRUCTORS[0].photo` → `/images/partners/instructors/ryan.webp`
- Frame: rounded rectangle ~96×120px, white background, soft shadow
- Foot label: `Instructor · インストラクター` + a small seafoam pulse dot (signals "live"/"presenting")
- Slight tilt (`+1.5deg` opposite from Vault's `-1.5deg`) — same "two photos on a desk" rhythm as the testimonial card

### 5. Drop the current image
The `ai-delegation-guide.webp` image inside the player frame is removed — its visual job is replaced by the richer content. The image is preserved on disk for use elsewhere (Vault preview section still wires it).

## Files to modify

- **[components/partners/vertice/VerticeLanding.tsx](../../components/partners/vertice/VerticeLanding.tsx)**
  - `HeroMockup()` function (~line 218 area): replace the player-area JSX (lesson eyebrow + title remain, then swap out the `<Image>` + frame + takeaways list for the three new blocks)
  - Add a small `INSTRUCTOR_BUBBLE` constant or inline `INSTRUCTORS[0]` reference
  - Add the instructor video bubble JSX outside `.vertice-vault` but inside `.vertice-mockup`
  - Remove the now-unused `VAULT_TAKEAWAYS` constant
  - Remove unused `IconPlay` import if no longer referenced

- **[components/partners/vertice/vertice.css](../../components/partners/vertice/vertice.css)**
  - Remove `.vertice-vault-player-frame`, `.vertice-vault-player-img`, `.vertice-vault-player-scrim`, `.vertice-vault-player-play`, `.vertice-vault-player-duration`, `.vertice-vault-takeaways*` rules (no longer used)
  - Add new rules: `.vertice-vault-frameworks`, `.vertice-vault-framework-card`, `.vertice-vault-compare`, `.vertice-vault-compare-pane`, `.vertice-vault-compare-prompt`, `.vertice-vault-compare-output`, `.vertice-vault-instructor`, `.vertice-vault-instructor-photo`, `.vertice-vault-instructor-label`
  - All chrome reuses existing tokens (`--vertice-canvas`, `--vertice-seafoam`, `--vertice-navy`, `--vertice-caption`, `--vertice-lavender`)

## Reusable patterns / utilities

- **Existing Vault chrome** (`.vertice-vault`, `.vertice-vault-bar`, `.vertice-vault-grid`, `.vertice-vault-rail`, `.vertice-vault-week*`, `.vertice-vault-foot*`) — kept as-is
- **`INSTRUCTORS` array** at [VerticeLanding.tsx:2356](../../components/partners/vertice/VerticeLanding.tsx#L2356) — pull Ryan's photo without duplicating data
- **`IconCheck` / `IconX`** from [components/partners/vertice/icons.tsx](../../components/partners/vertice/icons.tsx) — used in the ✓ / ❌ glyphs on the compare panes
- **`Image` from `next/image`** — used for the instructor photo with proper `width`/`height` (avoid layout shift)
- **Existing chip / testimonial / LIFETIME positioning** — untouched

## Sizing notes

Player area is roughly 360×480px. Block budget:
- Lesson header: ~46px
- Framework cards section (header + 3 cards stacked): ~190px (3 × 56px + 16px header + gaps)
- Compare section (header + 2 side-by-side panes): ~150px (panes ~120px tall + 16px header)
- Spacing/padding: ~30px total
- **Sum:** ~416px — fits comfortably with ~60px of breathing room

If JP wrapping pushes any block over budget, the first dial to turn is the framework cards: drop to 2 cards (完全委任 / 検証付き) instead of 3, or reduce icon size.

## Verification

1. `pnpm type-check` should pass clean (no unused imports / dead vars after cleanup).
2. `pnpm dev` then visit:
   - `http://localhost:3000/partners/vertice-society`
   - `http://localhost:3000/ja/partners/vertice-society`
3. Confirm visually:
   - Vault chrome unchanged (browser bar + 5-week sidebar + progress bar still present)
   - Player area shows: lesson header → 3 framework cards → before/after panes
   - Instructor video bubble appears at bottom-right, tilted opposite the Vault, with Ryan's photo + label + pulse dot
   - LIFETIME chip + testimonial card still positioned correctly
   - All JP text wraps cleanly, no horizontal scroll
4. Resize browser:
   - ≥1024px — full layout intact
   - 768–1023px — mockup compresses but content still readable
   - <768px — current responsive behavior (mockup re-centers / shrinks) holds
5. Toggle reduced-motion in DevTools — no animation glitches; existing float animations on chips keep working
6. Lighthouse mobile run on the JP page: Performance ≥ 90 (page-level budget from `CLAUDE.md`), no new console errors

## Out of scope (intentionally)

- The reference's top nav (AI Academy logo + Dashboard/Courses/Community + 42% progress + search/notifications/avatar) — we already have the browser-chrome treatment, adding a second nav inside would be cluttered
- The reference's full 9-lesson sidebar — our 5-week sidebar is canonically correct
- The reference's bottom Previous / Mark complete / Next bar — would duplicate the existing progress footer
- The reference's syntax-highlighted code block — would not render legibly at hero scale
