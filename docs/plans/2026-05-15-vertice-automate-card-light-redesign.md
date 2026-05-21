# Vertice Landing — AUTOMATE Capability Card Light Redesign

**Date:** 2026-05-15
**Component:** `components/partners/vertice/VerticeLanding.tsx` — `IllusAutomate()` function
**Styles:** `components/partners/vertice/vertice.css` — `.vertice-illus-automate*` rules

---

## Context

The four capability cards on the Vertice landing page each ship a distinctive illustration. Three of them — TOOLS, TEAM, BUILD — render on light/canvas backgrounds that match the page's overall warm cream aesthetic. The fourth, **AUTOMATE**, was built earlier with a dark `--vertice-dark` (`#0A0612`) background and a SaaS-dashboard data-viz treatment (process flow + saved-time metric + 7-bar histogram).

Two issues with the current card:

1. **Visual inconsistency.** Sitting next to three light illustrations, the dark AUTOMATE card looks pasted in from a different product. The page is supposed to feel light, warm, and educational; this card reads "enterprise SaaS dashboard."
2. **Message is muddled.** The flow diagram, the time-saved metric, and the bar chart compete for attention. None of them clearly says "you get hours back" at a glance.

Ryan confirmed the core message the card should land is **"time you get back."** The redesign leads with the saved-time metric as the visual hero and demotes everything else into supporting context.

---

## Design

### Visual structure

The card is 180px tall (existing `.vertice-illus` height — unchanged). Inside, a two-zone vertical stack:

- **Top zone (~52px):** A horizontal row of four small "done" badges, one per automated task. Each badge: emoji icon + short JP label + seafoam checkmark. Signals "AI handled these."
- **Bottom zone (~120px):** Hero metric — oversized "2h 18min" in navy, with a small seafoam eyebrow above ("RECLAIMED DAILY · 毎日取り戻す") and a delta chip below ("↓ 54% vs. 先月").

No flow arrows, no bar chart, no dark background.

### The four "done" badges

Replaces the existing 4-node flow (`📧 メール → 📊 要約 → 🌐 翻訳 → 📤 送信`). Same task semantics, restated as completed work:

| Emoji | JP label |
|---|---|
| 📧 | メール |
| 🔍 | リサーチ |
| 📝 | 要約 |
| 🌐 | 翻訳 |

Each badge: white background, soft 1px seafoam-tinted border, small box shadow, padding `~6px 10px`, gap `6px` between emoji and label. A small seafoam-filled circle with a white ✓ icon sits on the right edge of each badge.

Row layout: `display: flex; gap: 8px;` with each badge `flex: 1` so they share width equally. On narrowest mobile (~280px illustration content area), each badge is ~58px wide — emoji + 3–4 char JP word + check fits with `padding: 5px 8px`.

### Hero metric block

- **Eyebrow:** `RECLAIMED DAILY · 毎日取り戻す` — uppercase, 10.5px, weight 800, letter-spacing `0.16em`, color `var(--vertice-seafoam-dark)`. Centered. JP segment uses the JP font family.
- **Big number:** `2h 18min` — font size `clamp(34px, 5.5vw, 44px)`, weight 800, color `var(--vertice-navy)`, letter-spacing `-0.02em`, line-height 1. Centered.
- **Delta chip:** `↓ 54% vs. 先月` — small pill, seafoam-tinted background `rgba(45, 191, 176, 0.14)`, seafoam-dark text, font 11px weight 700, padding `4px 10px`, border-radius 999px. Centered.

Vertical rhythm inside the bottom zone: eyebrow 10px gap to number 6px gap to delta chip.

### Color palette

All pulled from existing CSS variables in `vertice.css`. No new design tokens:

- Background: `linear-gradient(135deg, #F0F8F6, #FAF6EE)` — a softer companion to the TOOLS card gradient, drawing on the same canvas/sand family
- Number text: `var(--vertice-navy)` (`#1A2B33`)
- Eyebrow + checkmark fill + delta text: `var(--vertice-seafoam-dark)` (`#1FA496`)
- Badge border: `rgba(45, 191, 176, 0.18)`
- Badge text: `var(--vertice-navy)`
- Card shadow: existing card shadow remains via `.vertice-illus`

### Motion

None. The other illustrations are static; AUTOMATE shouldn't be the only one with animation. Existing `prefers-reduced-motion` rules already in `vertice.css` apply automatically and need no new entries.

---

## Implementation outline

### `IllusAutomate()` in `VerticeLanding.tsx` (around line ~523)

Full rewrite of the function body. Pseudocode:

```tsx
function IllusAutomate() {
  const tasks: Array<{ icon: string; jp: string }> = [
    { icon: '📧', jp: 'メール' },
    { icon: '🔍', jp: 'リサーチ' },
    { icon: '📝', jp: '要約' },
    { icon: '🌐', jp: '翻訳' },
  ];

  return (
    <div className="vertice-illus vertice-illus-automate">
      <div className="vertice-illus-automate-badges">
        {tasks.map((t) => (
          <div key={t.jp} className="vertice-illus-automate-badge">
            <span className="vertice-illus-automate-badge-icon" aria-hidden="true">
              {t.icon}
            </span>
            <span className="vertice-illus-automate-badge-label">{t.jp}</span>
            <span className="vertice-illus-automate-badge-check" aria-hidden="true">
              <IconCheck size={9} />
            </span>
          </div>
        ))}
      </div>

      <div className="vertice-illus-automate-hero">
        <p className="vertice-illus-automate-eyebrow">
          <span>RECLAIMED DAILY</span>
          <span className="vertice-illus-automate-eyebrow-jp">毎日取り戻す</span>
        </p>
        <p className="vertice-illus-automate-amt">2h 18min</p>
        <span className="vertice-illus-automate-delta">↓ 54% vs. 先月</span>
      </div>
    </div>
  );
}
```

### CSS changes in `vertice.css`

Remove or override all existing `.vertice-illus-automate*` rules (lines ~1049–~1140). Replace with new rules that produce the layout above. The class `.vertice-illus-automate` keeps the same name but the background changes and old child selectors (`-flow`, `-node`, `-arrow`, `-arrow-head`, `-saved`, `-saved-row`, `-saved-eyebrow`, `-saved-amt`, `-saved-delta`, `-bars`, `-bar-cell`) are deleted as they have no consumers after the rewrite. New selectors: `-badges`, `-badge`, `-badge-icon`, `-badge-label`, `-badge-check`, `-hero`, `-eyebrow`, `-eyebrow-jp`, `-amt`, `-delta`.

Background change: `background: var(--vertice-dark);` → `background: linear-gradient(135deg, #F0F8F6, #FAF6EE);`.

### Files modified

- `components/partners/vertice/VerticeLanding.tsx` — replace `IllusAutomate()` body only
- `components/partners/vertice/vertice.css` — replace the `.vertice-illus-automate*` block

### Files NOT modified

- `CapabilityCard` and its surrounding plumbing — no structural changes
- Outcome chip and body copy on the AUTOMATE card — already aligned with the new visual ("1日2時間以上を取り戻す / Reclaim 2+ hours every day"); no edits needed
- The other three illustrations stay untouched

---

## Verification

1. `pnpm tsc --noEmit` — typecheck clean (filtering stale `.next/dev/types/routes.d.ts` artifacts)
2. Dev server already running on port 3000 — hard-reload `http://localhost:3000/ja/partners/vertice-society`, scroll to the Capabilities section
3. Visually compare the four capability cards side-by-side at three viewports:
   - **375px (mobile, 1-col):** AUTOMATE card should now harmonize with TOOLS card colors. Badges row must not overflow; the "2h 18min" number must not wrap.
   - **768px (tablet, 2-col):** Confirm all four cards have similar visual weight; AUTOMATE no longer stands out as dark/heavy.
   - **1440px (desktop, 2-col):** Same check; verify the hero number scales up gracefully via the `clamp()` size.
4. Toggle the site theme (dark mode) — confirm the new light-card gradient still reads correctly. The card maintains its light canvas regardless of site theme (the other 3 illustrations behave the same way; they're light by design).
5. `prefers-reduced-motion`: not applicable — no new motion introduced.
6. Confirm no orphan CSS rules remain (grep `vertice-illus-automate-bar\|vertice-illus-automate-saved\|vertice-illus-automate-flow\|vertice-illus-automate-node\|vertice-illus-automate-arrow` returns zero in `vertice.css`).

## Risk notes

- **Tradeoff: 7-bar histogram is removed.** The old card showed a week's worth of mini-bars implying ongoing savings. The new card replaces that signal with a single `↓ 54% vs. 先月` delta chip. The chip carries the same "this is trending up" message without the visual clutter; if Ryan misses the bars later, we can restore as a tiny sparkline inside the delta chip.
- **Hero number at narrow viewport.** "2h 18min" is 8 characters. At `clamp(34px, 5.5vw, 44px)` it occupies ~140–180px width. Confirmed fits within the smallest realistic card content area (~244px on 375px mobile).
- **Badge text wrap.** "リサーチ" is 4 chars and the longest label. With `padding: 5px 8px` and emoji + check, the badge needs ~62px. Four badges at flex:1 in a ~244px row gives ~57px each — borderline. If wrapping occurs on the smallest screens, drop the `vs. 先月` from the delta or stack badges 2×2 as fallback.
