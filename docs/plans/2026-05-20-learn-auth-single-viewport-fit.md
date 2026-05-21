# Learn Auth — Fit on One Viewport (Follow-up Polish)

**Date:** 2026-05-20
**Follows:** [2026-05-20-learn-auth-editorial-redesign.md](2026-05-20-learn-auth-editorial-redesign.md)
**Scope:** Spacing/density-only changes to the redesigned auth page. No logic changes.

## Context

After shipping the split-screen editorial redesign, the right form panel runs slightly past the viewport on common laptop heights (~720–820px), forcing users to scroll to reach the Sign In button. Ryan asked: "Can we fit all of this on 1 page?" — yes, by removing one redundant element and tightening vertical spacing. The other two questions (header, trial) are resolved as no-ops:

- **Header:** keep the minimal in-page top row (HonuMark + wordmark + locale toggle). The global nav is correctly suppressed by [components/layout/conditional-nav.tsx](components/layout/conditional-nav.tsx)'s `isAuthShellRoute()` regex; no change there.
- **Trial:** current behavior is correct. New signups → `/learn/dashboard?welcome=true` → [WelcomeScreen](components/learn/WelcomeScreen.tsx). Default `subscription_tier = 'free'`. No 14-day Community trial — and we're not adding one in this plan.

## What's making the page tall

Right panel vertical stack today, top to bottom:

| Element | Approx height |
|---|---|
| `py-10` top padding | 40 |
| Top row (wordmark + locale toggle) | ~44 |
| `mb-10` | 40 |
| Welcome H1 "Let's get started." (clamp 32→44px serif) | ~50 |
| Welcome sub "Sign in to access your courses" | ~20 |
| `mb-8 lg:mb-10` | 40 |
| Pill tab toggle (`py-2` + `mb-7`) | ~72 |
| Google button (`mb-6`) | ~68 |
| Divider (`mb-6`) | ~40 |
| Email input + label (`gap-4`) | ~80 |
| Password input + label (`gap-4`) | ~80 |
| "Forgot password?" link | ~24 |
| Sign In button (`mt-2`) | ~52 |
| Magic-link link (`mt-4`) | ~36 |
| "Don't have an account?" toggle (`mt-6`) | ~36 |
| `py-10` bottom padding | 40 |
| **Total** | **~762** |

That's right at the edge of a 768–800px laptop viewport (browser chrome eats 80–120px). The page tips over.

## Changes

All changes are in two files. Pure CSS class/value tweaks.

### 1. [app/[locale]/learn/auth/page.tsx](app/[locale]/learn/auth/page.tsx) — right panel only

- **Drop the redundant welcome H1 + sub block.** The left panel already carries the editorial energy ("Learn AI. / Practice it. / Move forward."), and the pill tabs make the purpose of the form self-evident. The "Let's get started. / Sign in to access your courses" block is duplicative chrome. Remove the entire `<div className="mb-8 lg:mb-10 max-w-[440px]">…</div>` block. Saves ~110px.
- **Shorten panel vertical padding:** `py-10 ... lg:py-12` → `py-8 ... lg:py-10`. Saves ~16px.
- **Tighten the top-row → form gap:** `mb-10` on the top row → `mb-7`. Saves 12px.
- **Vertical centering:** Add `lg:justify-center` to the right panel `<main>` so on tall viewports the form sits visually centered rather than top-stacked. (Mobile keeps the natural top-down flow.)

### 2. [components/auth/AuthForm.tsx](components/auth/AuthForm.tsx) — density only, no logic touched

- Pill tab toggle: `mb-7` → `mb-5`. `py-2` → `py-1.5`. Saves ~12px.
- Google button: `className="mb-6"` → `className="mb-4"`. Saves 8px.
- Divider row: `mb-6` → `mb-4`. Saves 8px.
- Form `gap-4` → `gap-3` (input stack). Saves 8–12px.
- Sign In button: `mt-2` → `mt-1`. Saves 4px.
- Magic-link link wrapper: `mt-4` → `mt-3`. Saves 4px.
- Toggle prompt ("Don't have an account?…"): `mt-6` → `mt-4`. Saves 8px.

Cumulative savings: ~190–200px. The form will fit comfortably on 700px viewports with room to spare.

### Out of scope

- No copy changes.
- No restructuring of fields.
- No "compact mode" media query branch — these reductions are safe at all sizes (they don't make the form feel cramped on desktop; current spacing is generous).
- No font-size reductions on the headline — left panel stays as-is.

## Files to modify

| File | Change |
|---|---|
| [app/[locale]/learn/auth/page.tsx](app/[locale]/learn/auth/page.tsx) | Remove the welcome H1 + sub block; tighten panel padding and top-row gap; add `lg:justify-center`. |
| [components/auth/AuthForm.tsx](components/auth/AuthForm.tsx) | Tighten the seven vertical margins/gaps listed above. No JSX structure or handler changes. |

## Verification

1. `pnpm dev` and open both locales on a realistic viewport (~768×800 or smaller):
   - [http://localhost:3000/learn/auth](http://localhost:3000/learn/auth)
   - [http://localhost:3000/ja/learn/auth](http://localhost:3000/ja/learn/auth)
2. **No scrollbar on the right panel** at viewport heights ≥ 700px. The Sign In button and the "Don't have an account?" toggle are visible without scrolling.
3. **Mobile (< lg):** layout still stacks naturally; left panel is hidden, the form flows top-down with `py-8` padding. Verify nothing feels cramped — labels and inputs still have breathing room.
4. **Behavior smoke-test** — nothing logical changed, but confirm: Sign in / Sign up tab toggle, Google OAuth click, magic link send, forgot password switch all still work.
5. `pnpm type-check` clean.

## Risk

Minimal. All edits are class-name swaps and one block removal. No state, handler, or i18n key changes.
