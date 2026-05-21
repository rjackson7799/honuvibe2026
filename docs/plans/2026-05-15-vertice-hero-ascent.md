# Vertice Hero — Ascent Graphic

**Date:** 2026-05-15
**Page:** `/partners/vertice-society` (EN) + `/ja/partners/vertice-society` (JP)
**Files:** `components/partners/vertice/VerticeLanding.tsx`, `components/partners/vertice/vertice.css`

## Context

The current Vertice Society hero uses a hand-built "Vault" SaaS mockup on the right side (`HeroMockup` → `.vertice-mockup`/`.vertice-vault-*`). It works, but it's anonymous — every AI-course landing page on the web looks like this. We reviewed three concept directions and picked **Option B + a small product anchor**: a conceptual ascent graphic (lesson cards climbing toward a MASTERY peak), with one floating LIFETIME chip kept for product proof.

The ascent metaphor reinforces three things at once:
- The brand name (Vertice = vertex / summit)
- The headline (`AIで、追いつく。追い越す。使いこなす。` — catch up, get ahead, master)
- The curriculum structure (5 modules building toward action)

Goal: a hero graphic that feels uniquely Vertice instead of generically SaaS, while preserving a single product-proof signal (lifetime access) so the offer remains concrete.

## Approach

Replace `HeroMockup()` with a new `HeroAscent()` component. Geometry rises bottom-left → top-right. Five lesson cards staggered along a faint lavender track. Stage labels sit outside each card on the track. Module 5 becomes the visually elevated summit with a `MASTERY · 使いこなす` tag attached. One `LIFETIME · 永久アクセス` chip floats at the top-right edge.

No new color or font tokens — everything pulls from existing `:root` variables in [vertice.css](../../components/partners/vertice/vertice.css). Card chrome reuses the same canvas + hairline + soft shadow language already in the hero mockup, so cards feel cohesive with the rest of the page.

## Rung content

Pulled from `CURRICULUM_MODULES` ([VerticeLanding.tsx:1339](../../components/partners/vertice/VerticeLanding.tsx#L1339)) — single source of truth, no duplication.

| # | JP title | Stage label |
|---|---|---|
| 1 | `AIの基礎` | 基礎・理解 |
| 2 | `AIに仕事をさせる` | 応用・実践 |
| 3 | `チームでAIを活用する` | チーム拡張 |
| 4 | `はじめてのAIツールを作る` | 自分のツール |
| 5 | `自分のAIアクションプラン` | 行動計画 *(summit + MASTERY tag)* |

Each card shows only: eyebrow (`LESSON 0X`) + JP title. Stage label is rendered on the track, outside the card. No icon trios per card — the ascent shape carries the visual weight.

## Visual language

- **Cards:** `var(--vertice-canvas)` background, soft shadow, 1px hairline `rgba(26,43,51,0.06)`
- **Eyebrows:** `var(--vertice-seafoam)`, 11px uppercase, 0.18em tracking (matches existing Overline rule)
- **JP titles:** `var(--vertice-navy)`, Noto Sans JP 600, 16–18px
- **Stage labels:** `var(--vertice-lavender)`, small uppercase
- **Track line:** lavender at 25–30% opacity, 1.5px, faint arrow glyph at the summit
- **Summit card:** subtle seafoam→lavender gradient border (1px) to mark arrival; slightly larger than the other rungs
- **LIFETIME chip:** reuses existing `.vertice-chip-lifetime` styles unchanged

## Motion

- On scroll-in: rungs fade-up sequentially, 80ms stagger, IntersectionObserver threshold 0.2 (matches existing reveal pattern in the codebase)
- Track line draws in left-to-right via `stroke-dashoffset` over ~700ms after the first rung enters
- Summit card has a slow seafoam glow pulse (3s loop, 8% opacity max) — calmer than the current `.vertice-mockup-halo`
- All animation gated behind `@media (prefers-reduced-motion: no-preference)` — reduced-motion users see a static composition

## Responsive

- **≥1024px:** full ascent in the right column of `.vertice-hero-inner`
- **768–1023px:** rungs vertical-stack, shorter track on the left edge
- **<768px:** hide the ascent entirely; mobile hero remains text + CTAs + stats (same as current mockup behavior)

## Files to modify

- [components/partners/vertice/VerticeLanding.tsx](../../components/partners/vertice/VerticeLanding.tsx)
  - Replace `HeroMockup()` (currently at line 204) with `HeroAscent()`
  - Reference `CURRICULUM_MODULES` directly instead of the local `weeks` array
  - Update `<HeroMockup />` call site at line 196 to `<HeroAscent />`
- [components/partners/vertice/vertice.css](../../components/partners/vertice/vertice.css)
  - Add `.vertice-ascent-*` rules
  - Remove `.vertice-mockup`, `.vertice-mockup-halo`, `.vertice-vault`, `.vertice-vault-*` rules once cutover is verified

## Files referenced / reused

- `CURRICULUM_MODULES` array — [VerticeLanding.tsx:1339](../../components/partners/vertice/VerticeLanding.tsx#L1339)
- `.vertice-chip-lifetime` styles — kept as-is in `vertice.css`
- Existing reveal pattern via IntersectionObserver — search `IntersectionObserver` in [VerticeLanding.tsx](../../components/partners/vertice/VerticeLanding.tsx) for the prevailing pattern
- Design tokens — `--vertice-seafoam`, `--vertice-lavender`, `--vertice-navy`, `--vertice-canvas`, `--vertice-caption` in [vertice.css:8-17](../../components/partners/vertice/vertice.css#L8)
- Telemetry: unchanged. Hero CTAs already fire `partner.vertice.hero_cta_*` events via `lib/analytics.ts`

## Build sequence

1. Add `.vertice-ascent-*` CSS scaffold (containers, track, card, summit, MASTERY tag) using existing tokens
2. Build `HeroAscent()` component in `VerticeLanding.tsx` reading from `CURRICULUM_MODULES`; swap `<HeroMockup />` for `<HeroAscent />`
3. Layer in motion (fade-up stagger, track draw, summit pulse) behind `prefers-reduced-motion` guard
4. Tighten responsive behavior (1024 / 768 breakpoints)
5. Remove the now-orphaned `HeroMockup` function and `.vertice-mockup` / `.vertice-vault-*` CSS
6. Visual QA on both `/partners/vertice-society` and `/ja/partners/vertice-society`

## Verification

- `pnpm dev`, then visit `/partners/vertice-society` and `/ja/partners/vertice-society`
- Confirm the ascent rises bottom-left → top-right with five rungs, stage labels, and summit MASTERY tag
- Confirm the LIFETIME chip sits at the top-right edge of the summit
- Resize the viewport: ascent compresses cleanly between 1024 and 768, hides below 768
- Toggle Emulate CSS media feature `prefers-reduced-motion: reduce` in DevTools — all motion stops
- Lighthouse mobile run on the JP page: Performance ≥ 90, LCP < 2.5s (page-level budget from `CLAUDE.md`)
- No new console errors; existing hero CTA analytics still fire on click
