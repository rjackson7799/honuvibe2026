# Learn Auth — Editorial Split-Screen Redesign

**Date:** 2026-05-20
**Scope:** Presentation layer only — no auth flow changes.

## Context

The current `/learn/auth` page is a single centered card on a blank background — visually disconnected from the editorial language now established on about, partnerships, explore, and the partner landings. The user shared a reference design showing a split-screen layout (cream editorial left panel + light form right panel with a layered bilingual serif headline, supporting lede, small testimonial card, and faint decorative honu/diamond watermark).

**The existing auth flow works and is not changing.** This redesign restyles the page shell and form chrome only. All Supabase calls, redirect logic, state machines, and i18n keys stay exactly as they are. The goal is to make the auth landing feel like the rest of the site.

## What's in scope

Visual restyle of:
- [app/[locale]/learn/auth/page.tsx](app/[locale]/learn/auth/page.tsx) — page shell (centered card → split-screen)
- [components/auth/AuthForm.tsx](components/auth/AuthForm.tsx) — drop the redundant outer card; lightly restyle the tab toggle to feel editorial. Logic untouched.

## What's explicitly out of scope

- **No LINE OAuth.** The reference shows a green LINE button — we don't have LINE OAuth wired (would need a LINE Developer channel + Supabase provider config). Omit for now; revisit as a separate plan.
- **No flow restructure.** The reference makes magic link the primary "Recommended · パスワード不要" path with password collapsed into an accordion. **We are not doing that.** Email/password stays primary; the existing "Or email me a login link" stays secondary exactly as it is today.
- No changes to the confirmation-pending screen, forgot-password flow, hash-token magic-link callback in [components/auth/AuthForm.tsx:84-120](components/auth/AuthForm.tsx#L84-L120), role-based redirect in [components/auth/AuthForm.tsx:21-32](components/auth/AuthForm.tsx#L21-L32), or the `/api/auth/*` endpoints.

## Design

### Layout

Page becomes a full-bleed two-column grid:

```
┌──────────────────────────────────┬──────────────────────────────┐
│  CREAM EDITORIAL PANEL           │  LIGHT FORM PANEL            │
│                                  │                              │
│  · PRACTICAL AI TRAINING ·       │  ◉ HonuVibe.AI    EN/日本語  │
│    実践的なAIトレーニング         │                              │
│                                  │  [Sign In] [Sign Up]         │
│  Learn AI.                       │                              │
│  Practice.                       │  ┌────────────────────────┐  │
│  Move forward. ← teal accent     │  │ G  Continue with       │  │
│                                  │  │    Google              │  │
│  A craft-focused training studio │  └────────────────────────┘  │
│  for the people doing the actual │       — or —                 │
│  work — built around Claude and  │  Email                       │
│  the modern LLM stack.           │  [____________________]      │
│                                  │  Password                    │
│  ┌──────────────────────────┐    │  [____________________]      │
│  │ 森 "3週間で社内の…"       │    │                Forgot? →    │
│  │    森 美咲 · Product Lead │    │  [    Sign In     ]          │
│  └──────────────────────────┘    │                              │
│                       ◇ (faint)  │  Or email me a login link    │
└──────────────────────────────────┴──────────────────────────────┘
```

- Desktop (`lg:`): `grid lg:grid-cols-2`, both columns full-height.
- Tablet/mobile (`< lg`): stacks. Left panel collapses to a short hero band (overline + condensed headline only — testimonial card hidden). Right panel is the form, full width.

### Left panel (cream, editorial)

- Surface: `var(--m-cream)` if defined in [styles/globals.css](styles/globals.css); otherwise the closest cream/light-secondary token already used on partnerships/about. Verify the token name in `globals.css` during implementation rather than guessing.
- Top-left overline: bilingual mono uppercase with the teal bullet, matching the pattern in [components/marketing/about/hero.tsx](components/marketing/about/hero.tsx). Copy: `· 実践的なAIトレーニング · PRACTICAL AI TRAINING` (locale-ordered).
- Headline: DM Serif Display, three-line stack, fluid `clamp()`. EN: `Learn AI. / Practice it. / Move forward.` JP: `AIを学ぶ。/ 実践する。/ 前へ進む。`. The third line takes `--m-accent-teal`. The headline displays in the active locale's primary script; the other-locale equivalent is not shown — the page is already locale-routed, so layering both languages on the headline would be redundant and noisy.
- Supporting lede: ~25 words. EN: "A craft-focused training studio for the people doing the actual work — built around Claude and the modern LLM stack." JP equivalent.
- Testimonial card (bottom-left): white surface, rounded, subtle border. Small square avatar tile (initial or HonuMark mini) + italic quote + attribution line. Pull a single quote from existing on-site testimonial copy (check `messages/*.json` for any `testimonials` namespace or existing testimonial sections in the homepage). If no on-site testimonial exists, omit the card entirely rather than fabricate one. **Confirm during implementation; if the source is unclear, ship without the card and add later.**
- Decorative watermark (bottom-right of left panel): faint diamond/honu-mark outline at ~6-8% opacity. Reuse [components/ocean/honu-mark.tsx](components/ocean/honu-mark.tsx) at large size with low opacity, or a simple SVG diamond outline. Pure decoration.

### Right panel (form)

- Surface: `--bg-primary` (white or very-near-white) — distinct from the cream left panel.
- Top row (small): HonuMark + "HonuVibe.AI" wordmark on the left, the existing locale toggle on the right. Find the locale toggle component already in use (likely in [components/layout/](components/layout/) — `LangToggle` or similar) and reuse it.
- Below the top row, render `<AuthForm />` directly. The right panel itself is the form's surface — no extra card.
- Vertically center the form within the right panel on desktop; let it sit naturally below the top row on mobile.

### AuthForm restyle (inside the form)

Two small changes, both purely visual:

1. **Remove the outer card wrapper.** The `<div className="bg-bg-secondary border border-border-default rounded-lg p-8">` at [components/auth/AuthForm.tsx:216](components/auth/AuthForm.tsx#L216) was needed when the page provided no surface. With the new right-panel surface, this card is redundant chrome. Drop the wrapping div; keep the inner padding via a simpler container.
2. **Pill tab toggle.** The current sign-in/sign-up tabs are square-cornered hard tabs. Match the reference's softer pill: rounded full, cream inactive background, dark-pill active background with white text — matches the reference's `ログイン / 新規登録` toggle. Behavior identical; only classNames change.

Everything else in `AuthForm.tsx` — handlers, state, mode switching, magic-link button, forgot-password flow, confirmation-pending screen — stays exactly as is.

### i18n

Add **at most one** new key under `auth.*` in [messages/en.json](messages/en.json) and [messages/ja.json](messages/ja.json):
- `auth.overline` → `"Practical AI Training"` / `"実践的なAIトレーニング"`

Reuse existing keys for everything else (`welcome_message` etc. are already there). The headline phrasing ("Learn AI. Practice it. Move forward." / "AIを学ぶ。実践する。前へ進む。") is hero copy and can be hardcoded in the page component since it isn't referenced elsewhere — but if a similar tagline already exists in `messages/*.json` under a marketing namespace, prefer that key. Check before adding.

## Files to modify

| File | Change |
|------|--------|
| [app/[locale]/learn/auth/page.tsx](app/[locale]/learn/auth/page.tsx) | Replace the centered single-column shell with the two-column split layout, left editorial panel, right form panel with HonuMark+wordmark+locale toggle top row. |
| [components/auth/AuthForm.tsx](components/auth/AuthForm.tsx) | Drop the outer card wrapper at line 216; restyle the tab toggle at lines 218–243 to pill shape. No other changes. |
| [messages/en.json](messages/en.json), [messages/ja.json](messages/ja.json) | Add `auth.overline` (only if not already present under another namespace). |

## Components / utilities to reuse

- [components/ocean/honu-mark.tsx](components/ocean/honu-mark.tsx) — already used on the page; reuse for both the right-panel wordmark and the faint left-panel watermark.
- Existing locale toggle in [components/layout/](components/layout/) (confirm exact filename during implementation).
- Existing CSS variables from [styles/globals.css](styles/globals.css): `--m-cream`, `--m-ink-primary`, `--m-ink-secondary`, `--m-accent-teal`, `--bg-primary`. Confirm names against the file before writing.
- The editorial overline + serif-italic headline pattern from [components/marketing/about/hero.tsx](components/marketing/about/hero.tsx) — copy the class structure verbatim for consistency.

## Verification

1. `pnpm dev` and open both locales:
   - `http://localhost:3000/learn/auth`
   - `http://localhost:3000/ja/learn/auth`
2. **Visual**
   - Desktop ≥ `lg`: split-screen renders, headline is serif italic with teal accent on the final line, locale toggle visible top-right of form panel
   - Below `lg`: stacks cleanly, testimonial card hidden, form is full-width
   - Toggle the locale: headline, overline, and form labels swap to the other language
3. **Behavior — full regression sweep** (everything below must still work):
   - Sign in with existing password account → role-based redirect (admin / partner / instructor / student) still fires
   - "Continue with Google" → OAuth redirect kicks off
   - "Or email me a login link" → POSTs to `/api/auth/send-login-link`, shows the "✓ check your email" message
   - Sign up new account → either auto-signs-in or hits the email-confirmation-pending screen (no regression on the resend button)
   - Click "Forgot password?" → form switches to forgot mode, sends reset, shows success
   - Sign in / Sign up tab toggle still works
   - Magic-link callback: arriving at `/learn/auth#access_token=...` still sets the session and bounces to the dashboard (the `useEffect` at [components/auth/AuthForm.tsx:84](components/auth/AuthForm.tsx#L84) is untouched, but confirm anyway by sending yourself a magic link and clicking it)
4. `pnpm typecheck && pnpm build` clean.

## Risks

- **Removing the outer card wrapper** is the only structural change inside `AuthForm`. If any sibling page (e.g. a modal sign-in) renders `<AuthForm />` without providing its own surface, it will look unstyled. Quick grep for `<AuthForm` usages before merging — there should only be the one usage on `/learn/auth`.
- The locale toggle component needs to be locatable. If it lives only inside the marketing nav and isn't exported as a standalone component, factoring it out is a small extra step — fine, but worth knowing.
