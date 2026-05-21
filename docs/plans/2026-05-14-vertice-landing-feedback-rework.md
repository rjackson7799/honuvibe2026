# Vertice Landing Page — Feedback-Driven Enhancement Pass

**Date:** 2026-05-14
**Page:** `app/[locale]/partners/vertice-society/page.tsx`
**Component:** `components/partners/vertice/VerticeLanding.tsx`
**Styles:** `components/partners/vertice/vertice.css`

---

## Context

Two external review passes on the current Vertice landing page converged on the same gaps:
- Hero is aspirational but abstract — no concrete "what you'll ship"
- No social proof / testimonials anywhere
- Instructor trust signal is buried at the bottom
- Pricing tier copy reads as features, not outcomes
- No "Who this is for" qualifier to help visitors self-select
- No sticky mobile CTA — long page, decision fatigue on small screens

Several other recommendations from the reviews were already implemented and need no work: FAQ accordion exists, scarcity badges exist ("残り15席", "残り37名"), Vault tier already has "RECOMMENDED" badge, transformation framing already exists in the Contrast section ("今のあなた" → "3ヶ月後のあなた"), and the page is already bilingual within JP locale (JP primary + EN accent).

**Out of scope (deliberately):**
- i18n migration of inline copy to `messages/ja.json`. The page is JP-locale primary with EN accent strings; full extraction is a separate large task.
- Replacing the headline. "追いつく。追い越す。使いこなす。" has identity equity; preserve it and reinforce with outcomes underneath.
- Fabricated urgency. Existing seat-count scarcity stays; nothing new invented.
- Real student testimonials. Use placeholder structure; Ryan fills real quotes before launch.

---

## Section-by-section changes

All changes live inside the single client component `components/partners/vertice/VerticeLanding.tsx` (~1,512 lines). The pattern in this file is: top-level data objects, then inline section functions. New sections follow the same pattern.

### 1. Hero — add outcomes micro-list

**Function:** `Hero()` in `VerticeLanding.tsx`

Keep headline, keep subhead, keep CTAs, keep mockup. Insert a 3-item "5週間で身につくスキル / What you'll ship in 5 weeks" micro-list between the pain statement and the CTA buttons. Three concrete deliverables, each one line, with a small check icon.

Example items (Ryan can refine):
- 自分専用のAIワークフローを構築 / Build your own AI workflow
- 業務時間を週10時間削減 / Reclaim 10+ hours/week
- ポートフォリオ用のAIプロジェクト1本 / One portfolio-ready AI project

Reuses no existing component — inline JSX with a check svg, same typography tokens as the existing stat chips.

### 2. NEW: "Taught by" trust strip

**Placement:** Immediately after `Hero()`, before `Contrast()`.

Compact horizontal strip (mobile: stacked, desktop: row). 3 small circular avatars + "Taught by" overline + one short credential line per instructor. Click target scrolls to the full `Instructors()` section near the bottom.

Reuses the same `INSTRUCTORS` data array already defined for the bottom section. Photos: `/images/partners/instructors/ryan.webp`, `mizuho.webp`, `chimi.webp`.

Add a new inline `TaughtByStrip()` function in `VerticeLanding.tsx`. ~30 LOC.

### 3. NEW: "Who this is for / not for" qualifier strip

**Placement:** After `Contrast()`, before `Capabilities()`.

Two-column layout (mobile: stacked). Left column header "こんな方におすすめ" with 3 ✓ items. Right column header "向いていない方" with 3 ✗ items.

Purpose: visitors self-qualify in 5 seconds. Filters tire-kickers, increases conversion intent of those who proceed.

Add a new inline `QualifierStrip()` function. Inline data array following the same `{ jp, en }` pattern used throughout the file. ~40 LOC.

Placeholder content (Ryan refines):
- For you: working professionals who use spreadsheets/docs daily; want a structured curriculum, not random YouTube; have 30+ min/day for 5 weeks
- Not for you: pure beginners who haven't tried ChatGPT once; people looking for passive watching only; those who want certification, not application

### 4. NEW: Testimonials section

**Placement:** Immediately before `Pricing()`.

3 testimonial cards in a row (mobile: stacked). Each card: short quote (1-2 sentences JP + EN), avatar/initial circle, name, role, and a small result metric chip (e.g., "週12時間削減", "ROI 3か月").

Data shape:
```ts
type Testimonial = {
  quote: { jp: string; en: string };
  name: string;
  role: { jp: string; en: string };
  result: { jp: string; en: string }; // metric chip
  avatar?: string;
  initial: string; // fallback when avatar is null
};
```

Add an inline `Testimonials()` function + `TESTIMONIALS` array. 3 placeholder entries with `avatar: undefined` so the initial-circle path renders until Ryan swaps in real photos. ~80 LOC.

Reference: SmashHaus has a `Testimonials()` section in `SmashHausLanding.tsx`. **Do not extract to shared component this pass** — two inline copies is fine; abstract only when a third partner page lands.

### 5. Pricing — feature → outcome copy pass

**Function:** `Pricing()` + `PriceCard()` in `VerticeLanding.tsx`. No structural change. The "RECOMMENDED" badge on Vault stays.

Rewrite bullet items per tier from feature-style to outcome-style. Examples of the transformation:

| Before (feature) | After (outcome) |
|---|---|
| 24/7コミュニティアクセス | 困ったら24時間以内にプロから答えが返ってくる |
| 40本以上のビデオ | 1日30分×5週間で実務スキルが身につく |
| Vaultテンプレート集 | コピペで使える業務テンプレートで初日から時短 |
| ライブQ&A セッション | 自分のプロジェクトで直接フィードバックがもらえる |

Keep the existing `bold?: boolean` field for emphasis on the key Vault line ("Lifetime access · one-time payment"). Add a small ROI line under price on Vault tier: e.g., "業務時間で2週間で元が取れる試算" (or whatever Ryan finds defensible).

### 6. NEW: Sticky mobile CTA bar

**Placement:** Fixed bottom on mobile only (`md:hidden`). Shows after user scrolls past hero (use IntersectionObserver on the hero element or simple scrollY threshold).

Reference pattern: `components/learn/StickyEnrollBar.tsx` (already exists, exact pattern needed — fixed positioning, `z-40`, `safe-area-bottom` for notch).

Content:
- Left: "AI Essentials Vault" + "$199" (with strikethrough $299)
- Right: seafoam button "今すぐ参加 →" linking to `#pricing`

Do not extract to shared component. Create a new inline `MobileStickyCTA()` function inside `VerticeLanding.tsx` (~50 LOC) styled to match Vertice palette. Backdrop-blur semi-transparent surface using existing `--bg-glass` token.

### 7. Capabilities cards — scannability pass

**Function:** `Capabilities()` + `CapabilityCard()`.

Light touch only. Add a small metric or check-icon row to each of the 4 capability cards so they read as concrete outcomes, not abstract themes. Example: under "AUTOMATE" card, add a chip row: "・反復作業を80%削減 ・1日30分で完了". No layout change, just an extra inline element in `CapabilityCard()`.

### 8. FAQ — add 1 outcome-focused question

**Function:** `FAQ()`. Already an accordion, keep as-is. Add one Q&A item near the top:
- Q (JP): "受講後、実際に何ができるようになりますか？"
- Q (EN): "What can I actually do after completing the course?"
- A: 3-sentence concrete answer listing 3 outcomes (workflow automation, prompt library, one shipped AI project).

---

## Files modified

- `components/partners/vertice/VerticeLanding.tsx` — all changes (section additions + copy edits)
- `components/partners/vertice/vertice.css` — minor additions for sticky-CTA backdrop, qualifier-strip dividers, testimonial card border treatment

## Files created

- None (deliberately — keep changes localized to the existing landing component until a second partner page demands extraction)

## Files referenced (not modified)

- `components/learn/StickyEnrollBar.tsx` — pattern reference for sticky mobile CTA
- `components/partners/smashhaus/SmashHausLanding.tsx` — pattern reference for testimonials structure
- `public/images/partners/instructors/{ryan,mizuho,chimi}.webp` — reused for the new TaughtBy strip

---

## Final section order after this pass

1. Hero (with new outcomes micro-list)
2. **NEW: TaughtBy trust strip**
3. Contrast (今のあなた → 3ヶ月後のあなた)
4. **NEW: Qualifier strip (for / not for)**
5. Capabilities (with new metric chips)
6. Curriculum (unchanged)
7. Vault Preview (unchanged)
8. **NEW: Testimonials**
9. Pricing (outcome-rewritten copy)
10. Instructors (full bios — stays at bottom as deep trust)
11. FAQ (one new Q added)
12. Operating Company (unchanged)
13. Final CTA (unchanged)
14. Footer (unchanged)
15. **NEW: MobileStickyCTA (fixed, mobile-only)**

---

## Verification

After implementation:

1. `pnpm dev` — confirm page renders at `/ja/partners/vertice-society` without errors
2. Visual check at three viewports: 375px (mobile), 768px (tablet), 1440px (desktop)
3. Scroll behavior: confirm MobileStickyCTA appears after scrolling past hero, disappears when reaching pricing section (no double-CTA stacking)
4. Confirm new TaughtBy strip click target scrolls smoothly to full Instructors section
5. Confirm all new copy has both JP and EN fields populated (no fallback to undefined)
6. Lighthouse mobile run — keep performance budget: target 90+, LCP < 2.5s, JS bundle stays under 200KB gzipped (per `CLAUDE.md`)
7. Reduce-motion check: confirm no new animations break `prefers-reduced-motion: reduce`
8. Theme toggle: verify all new sections work in both dark and light mode
9. Confirm no hardcoded colors introduced — all styling uses CSS variables per project convention

## Risk notes

- The component file grows from ~1,512 to ~1,800 LOC. Still manageable, but next pass should consider splitting into section files under `components/partners/vertice/sections/`.
- Placeholder testimonial copy must be visually distinct enough that Ryan/team won't accidentally ship them. Consider a temporary "Coming soon" or dimmed treatment until real quotes are supplied.
- The sticky CTA on mobile may overlap the existing FloatingHonu decorative element; verify z-index ordering.
