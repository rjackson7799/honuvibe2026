# Learn Auth — Drop Diamond + Refit to One Viewport

**Date:** 2026-05-20
**Follows:** [2026-05-20-learn-auth-dark-panel-and-legal.md](2026-05-20-learn-auth-dark-panel-and-legal.md)
**Scope:** Two presentation-only tweaks. No logic, no copy, no i18n.

## Context

After the dark-panel + legal-line round, two small issues remain:

1. The decorative diamond watermark in the bottom-right of the left panel is busy on the dark surface and not adding signal. Ryan wants it gone.
2. The legal acknowledgment line ("By continuing, you agree to our Terms and Privacy Policy") added ~38px of vertical content to the right form panel and pushed it just past the viewport edge — the page scrolls again.

## Changes

Both edits live in [app/[locale]/learn/auth/page.tsx](app/[locale]/learn/auth/page.tsx).

### 1. Remove the diamond watermark

Delete the entire `<svg aria-hidden="true" ...>` block (lines ~96-108 of the current file). Drop nothing else from the left panel — the overline, headline, lede, and testimonial card all stay. The dark surface alone carries enough visual weight; the diamond was leftover from when the panel was cream and needed an accent.

### 2. Recover ~25–30px of vertical in the right panel

Target the spacing around the legal line and outer panel padding — not inside the form, which is already tight from the previous round.

| Element | Before | After | Saves |
|---|---|---|---|
| Right panel `<main>` padding | `py-6 sm:py-8` | `py-5 sm:py-6` | 8–16px |
| Top row → form gap | `mb-5` | `mb-4` | 4px |
| Legal line top margin | `mt-5` | `mt-3` | 8px |
| Legal line font + leading | `text-[12px] leading-relaxed` | `text-[11.5px] leading-snug` | ~4px |

Combined: ~24–32px recovered. Enough headroom for the legal line to sit cleanly inside the viewport on 720px+ heights.

The right panel still uses `lg:[justify-content:safe_center]` so when content does fit, it remains visually centered; when it's barely-too-tall, it anchors from the top instead of clipping the bottom.

## Files to modify

| File | Change |
|---|---|
| [app/[locale]/learn/auth/page.tsx](app/[locale]/learn/auth/page.tsx) | Delete the diamond `<svg>` block in the left `<aside>`. Apply the four padding/margin/font tweaks in the right `<main>` per the table above. |

## Out of scope

- No changes to AuthForm, signup flow, magic-link wiring, or any backend.
- No changes to copy or i18n keys.
- No changes to the left panel beyond removing the diamond — overline, headline, lede, and testimonial card stay exactly as they are.
- No changes to the global font size or input field heights.

## Verification

1. `pnpm dev` and open both locales at a realistic laptop viewport (~768×800):
   - [http://localhost:3000/learn/auth](http://localhost:3000/learn/auth)
   - [http://localhost:3000/ja/learn/auth](http://localhost:3000/ja/learn/auth)
2. **No scrollbar on the right panel** at viewport heights ≥ 720px. The "By continuing, you agree to our Terms and Privacy Policy" line is fully visible without scrolling.
3. **Left panel** still shows: overline + bilingual marks, three-line serif headline with teal accent on "Move forward.", lede paragraph, and the testimonial card at the bottom. No diamond.
4. Behavior smoke-test (no regression expected — nothing logical changed): tab toggle, Google OAuth click, magic link send, forgot password switch, legal-link routing to `/terms` and `/privacy` (and `/ja/terms`, `/ja/privacy`).
5. `pnpm type-check` — should report the same pre-existing vault-page error and nothing new.

## Risk

Negligible. Two micro-edits to the auth page, both visual.
