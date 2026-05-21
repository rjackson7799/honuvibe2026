# Vertice Landing — Tier Clarity + Tools Expansion

**Date:** 2026-05-15
**Component:** `components/partners/vertice/VerticeLanding.tsx`
**Styles:** `components/partners/vertice/vertice.css`

---

## Context

Two issues surfaced after the 2026-05-14 enhancement pass:

1. **Tier differentiation is not obvious at a glance.** Vault ($199) and Live Cohort ($1,250) read as side-by-side alternatives instead of as a ladder where Cohort = Vault + live coaching. A 6.3× price gap with unclear "what extra do I get" framing kills conversion on the higher tier and creates anxiety on the lower one. Compounding this: the recent copy pass introduced a Vault bullet ("Honu Communityで困った時は24時間以内に回答") that bleeds into the Community tier's territory.

2. **The tool list is incomplete.** The page currently markets "4 tools" (ChatGPT, Claude, Perplexity, NotebookLM). Ryan wants to add **Gemini** and **Claude Cowork** (Anthropic's new agentic mode in Claude.ai — Cowork tab with tasks, Projects, Scheduled, Live artifacts, Dispatch). New total: **6 tools**.

This plan fixes both with surgical edits — no new sections, no new components.

---

## Part A — Vault vs Live Cohort clarity

### A1. Add an "INCLUDES VAULT" pill on the Cohort card

The Cohort card has a `badge` prop already used for the seat-count pulse pill. We'll add a second pill above (or alongside) the existing badge that explicitly reads:

```
✓ Vault込み / INCLUDES VAULT
```

Visually: small seafoam outline pill, top of card, distinct from the orange "残り15席" cohort pulse pill so both can coexist.

**File:** `components/partners/vertice/VerticeLanding.tsx`, the `<PriceCard tier="cohort" ...>` invocation.
**CSS:** new `.vertice-pr-includes` rule in `vertice.css`.

### A2. Visual "ladder" subtitle above the pricing grid

Above the existing `vertice-pr-grid`, add a single horizontal subtitle showing the progression. Three labels separated by arrows:

```
Honu Community でつながる  →  Vault で身につける  →  Live Cohort で仕上げる
Connect                       Learn                  Master
```

Compact, centered, small caption text. Visually it tells visitors "these are stages, not parallel options." Click targets on each label scroll to the corresponding card or anchor.

**File:** `VerticeLanding.tsx`, inside `Pricing()` between `<div className="vertice-pr-head">` and `<div className="vertice-pr-grid">`.

### A3. Restore Vault bullet — remove Community bleed

Change Vault tier's 5th feature back to a clean Community-as-bonus framing:

| Current (problematic) | New |
|---|---|
| `Honu Communityで困った時は24時間以内に回答` | `Honu Community 1ヶ月無料アクセス付き` (with `en: '1 month Community membership free'`) |

This removes the implication that Community is bundled inside Vault forever, restoring honest tier boundaries.

**File:** `VerticeLanding.tsx`, in the Vault tier `features` array.

### A4. Add a "WHAT'S DIFFERENT" delta line atop Cohort bullets

Right above the Cohort card's feature list, add a one-line tag showing the delta vs Vault:

```
Vaultに加えて → 週1ライブ · プロジェクト指導 · 同期仲間 · 認定証
On top of Vault → Live weekly · Project feedback · Cohort peers · Verified cert
```

This makes the differential value unmistakable to a pricing-shopping visitor, so they don't have to mentally diff the two bullet lists themselves.

**File:** `VerticeLanding.tsx`, inside `PriceCard()` — new conditional render block for `tier === 'cohort'` only, between `vertice-pr-card-price-wrap` and `vertice-pr-card-features`.
**CSS:** new `.vertice-pr-delta` rule.

### A5. Hero secondary CTA copy nudge (optional, small)

Hero currently has two CTAs:
- Primary: "Vaultに今すぐアクセス →"
- Secondary: "5/15開講のライブコホートを見る"

The secondary doesn't telegraph the relationship. Light wording tweak:

| Current | New |
|---|---|
| `5/15開講のライブコホートを見る` | `Vault + ライブ指導 / 5/15開講コホート` |

Subtle but reinforces "live cohort builds on Vault."

**File:** `VerticeLanding.tsx`, `Hero()` secondary CTA stack.

---

## Part B — Add Gemini + Claude Cowork (4 tools → 6 tools)

### B1. Update `IllusTools` illustration

**File:** `VerticeLanding.tsx`, `IllusTools()` function (around line 494).

Current `tools` array has 4 entries at absolute coordinates within a ~210×110 area. Expand to 6 entries arranged in a denser scattered cloud. Tool brand colors:

| Tool | Color | Notes |
|---|---|---|
| ChatGPT | `#10A37F` | existing |
| Claude | `#C77B58` | existing — Anthropic terracotta |
| Claude Cowork | `#B45A1F` | deeper terracotta, distinct from base Claude |
| Gemini | `#4285F4` | Google blue (note conflict with NotebookLM — see below) |
| Perplexity | `#1FA095` | existing — mint |
| NotebookLM | `#E6B450` | **change** from `#4285F4` to amber/notebook-gold to avoid color clash with Gemini |

Layout: keep the playful scattered look. Suggested positions (within ~220×130 container — small bump on the existing `.vertice-illus-tools` min-height in CSS):

- Row 1 (y ≈ 8–20): ChatGPT (x≈6), Gemini (x≈92), Claude (x≈174)
- Row 2 (y ≈ 64–86): Claude Cowork (x≈0), Perplexity (x≈86), NotebookLM (x≈170)

Reduce chip width slightly (`max-width: 110px` on chip, was implicit-based-on-content) so two rows of 3 fit cleanly. Adjust rotations per chip individually for organic feel.

Update the pill at bottom-right: `4ツール使い分け` → `6ツール使い分け` (`en: '6 tools, the right one each time'` if added).

**CSS:** May need height bump and chip max-width in `.vertice-illus-tools` and `.vertice-illus-tools-chip`. Verify on mobile that chip cluster doesn't overflow capability card width.

### B2. Update Capabilities TOOLS card body copy

**File:** `VerticeLanding.tsx`, `Capabilities()` `cards` array, TOOLS entry.

| Field | Current | New |
|---|---|---|
| `jpBody` | `ChatGPT、Claude、Perplexity、NotebookLMの実践的な使い分け。それぞれの強みを業務シーンで使いこなす。` | `ChatGPT、Claude、Claude Cowork、Gemini、Perplexity、NotebookLMの実践的な使い分け。それぞれの強みを業務シーンで使いこなす。` |
| `enBody` | `Master ChatGPT, Claude, Perplexity, and NotebookLM — and know when to use each.` | `Master ChatGPT, Claude, Claude Cowork, Gemini, Perplexity, and NotebookLM — and know when to use each.` |

Outcome chip (`outcomeJp` / `outcomeEn`) stays — it's count-agnostic.

### B3. Update `IllusBuild` TOOLS layer text

**File:** `VerticeLanding.tsx`, `IllusBuild()` function.

Layer entry currently reads `'ChatGPT · Claude · Perplexity'`. With 6 tools the string gets long — keep it scannable:

| Field | Current | New |
|---|---|---|
| TOOLS layer `j` | `ChatGPT · Claude · Perplexity` | `ChatGPT · Claude · Gemini +3` |

The `+3` indicates the additional tools (Cowork, Perplexity, NotebookLM) without overflowing the layer pill.

### B4. Update Curriculum Week 1 description

**File:** `VerticeLanding.tsx`, `CURRICULUM_WEEKS` array, week 1.

| Field | Current | New |
|---|---|---|
| `d` | `なぜ今AIが重要なのか、プロが使うトップ10ツールをハンズオンで体験。基礎概念から始めて、実務に直結する全体像を掴む。` | `なぜ今AIが重要なのか、プロが日常で使う6つのAI（ChatGPT、Claude、Claude Cowork、Gemini、Perplexity、NotebookLM）をハンズオンで体験。基礎概念から始めて、実務に直結する全体像を掴む。` |

Explicit tool naming here reinforces the curriculum's concrete value and matches the Capabilities card.

### B5. Update FAQ "Do I need to pay for AI tools separately?" answer

**File:** `VerticeLanding.tsx`, `FAQ_ITEMS` array.

Current answer mentions only "ChatGPT Plus（月$20）またはClaude Pro（月$20）". Update to acknowledge the broader stack:

> 無料プランで学習を開始できます。本格活用には ChatGPT Plus（月$20）またはClaude Pro（月$20）を推奨。Gemini は無料の Advanced プランが利用可能、Perplexity と NotebookLM も無料枠で十分に学習できます。Claude Cowork は Claude Pro / Team プランに含まれます。コース内で各プランの選び方を解説します。

### B6. Hero stat chip — optional update

Hero has a stats chip "🌐 バイリンガル / EN-JP". No tool-count chip currently exists in the hero stats. **Skip** any hero changes here unless Ryan wants a "6 AIツール" chip added — that would crowd the hero, and the Capabilities section covers it adequately.

---

## Files modified summary

- `components/partners/vertice/VerticeLanding.tsx`
  - Pricing: A1 (Cohort INCLUDES pill), A2 (ladder subtitle), A3 (Vault bullet restore), A4 (Cohort delta line), A5 (hero CTA copy)
  - Tools: B1 (IllusTools 6 chips), B2 (Capabilities TOOLS body), B3 (IllusBuild layer text), B4 (Curriculum Week 1), B5 (FAQ answer)
- `components/partners/vertice/vertice.css`
  - New: `.vertice-pr-includes`, `.vertice-pr-delta`, `.vertice-pr-ladder` and child rules
  - Updated: `.vertice-illus-tools` height, `.vertice-illus-tools-chip` max-width if needed

## Files NOT modified

- No new section components — all changes live inside existing Pricing, Capabilities, Curriculum, and FAQ sections.
- No image asset changes.
- No i18n migration.
- Testimonials, TaughtBy, QualifierStrip, MobileStickyCTA from the 2026-05-14 pass remain untouched.

---

## Verification

1. `pnpm tsc --noEmit` — typecheck clean
2. `pnpm dev`, request `http://localhost:3000/ja/partners/vertice-society` — HTTP 200, no console errors
3. **Visual checks at 375px / 768px / 1440px:**
   - Pricing: confirm Cohort card has visible "INCLUDES VAULT" pill, the ladder subtitle reads naturally, the "WHAT'S DIFFERENT" delta line is clearly above Cohort bullets only (not on Vault or Community)
   - Capabilities TOOLS card: illustration shows all 6 chips legibly without overlap on mobile, pill reads "6ツール使い分け"
   - Curriculum Week 1: tool list reads cleanly without overflowing the description
   - FAQ: expand the "AIツールの料金" item — answer mentions all 6 tools coherently
4. Confirm Vault tier's 5th bullet now reads "Honu Community 1ヶ月無料アクセス付き" — no longer implies always-on Community access
5. Confirm grep for the string `4ツール` returns zero results (all updated to `6ツール`)
6. Theme toggle: both dark + light render correctly on the new badges
7. Reduce-motion: no new animations introduced beyond existing patterns

## Risk notes

- **Color collision (Gemini vs NotebookLM):** both Google products use blue brand colors. Plan changes NotebookLM to amber (#E6B450) — this is a deliberate departure from strict brand color for legibility. If Ryan wants strict brand colors, alternative is to use a Gemini gradient (`linear-gradient(135deg, #4796E3, #9747FF)`) on Gemini's bullet circle.
- **`+3` notation in IllusBuild:** This is concise but slightly ambiguous. Acceptable for an illustration layer pill; the full list lives in the Capabilities card body. If Ryan prefers, switch to `ChatGPT · Claude · Gemini · Perplexity` (4 tools, drop NotebookLM + Cowork from the visual stack) — they're still listed in the body text.
- **Cohort card height:** Adding the INCLUDES pill + delta line may push Cohort card taller than Vault. Visually that's fine (signals "more"), but verify the three cards align at the header level on desktop. The Vault card retains its `vertice-pr-card-highlighted` raised treatment so it doesn't visually disappear.
