# Learn Auth — Dark Left Panel + Legal Line

**Date:** 2026-05-20
**Follows:** [2026-05-20-learn-auth-editorial-redesign.md](2026-05-20-learn-auth-editorial-redesign.md), [2026-05-20-learn-auth-single-viewport-fit.md](2026-05-20-learn-auth-single-viewport-fit.md)
**Scope:** Two presentation-layer changes. No auth flow changes.

## Context

Two follow-ups on the redesigned `/learn/auth` page:

1. **Contrast.** The current cream-on-cream split has very little visible boundary between panels, and is the visual odd-one-out — every other editorial page on the site (`/about`, `/partnerships`, `/explore`) uses a dark navy hero with white text + teal accent. Ryan wants the auth left panel to match that established language so the page reads as part of the same family.
2. **Legal acknowledgment.** Reference designs (Sanity) include a small "by continuing you agree to ToS / Privacy" line under the primary auth CTA. We don't use reCAPTCHA, so the Google legal copy doesn't apply — but a basic ToS/Privacy acknowledgment is good practice and links to two pages that already exist bilingually (`/terms`, `/privacy`).

## Decisions locked in

- **Dark token:** `--m-ink-primary` (`#1A2B33`) — the exact color the about/explore/partnerships hero panels render today. Matches the site's editorial family.
- **Legal line position:** under the AuthForm, in the right panel (under the "Don't have an account?" toggle prompt). Not in the dark panel.

## Changes

### 1. Dark left panel ([app/[locale]/learn/auth/page.tsx](app/[locale]/learn/auth/page.tsx))

Flip the left `<aside>` from cream to dark. Mirror the treatment used in [components/marketing/about/hero.tsx](components/marketing/about/hero.tsx).

| Element | Before | After |
|---|---|---|
| Panel background | `var(--m-canvas)` (#FDFBF7) | `var(--m-ink-primary)` (#1A2B33) |
| Overline text | `var(--m-ink-tertiary)` | `text-white/55` |
| Overline divider dot | `var(--m-ink-tertiary)` 0.5 opacity | `text-white/30` |
| Headline | `var(--m-ink-primary)` | `text-white` |
| Headline teal accent | `var(--m-accent-teal)` | `var(--m-accent-teal)` (unchanged) |
| Lede paragraph | `var(--m-ink-secondary)` | `text-white/85` |
| Testimonial card surface | `bg-white/80 backdrop-blur` | `bg-white/[0.05]` (subtle translucent — matches about-page chapter-chip treatment at lines 49–54) |
| Testimonial card border | `rgba(26,43,51,0.08)` | `border-white/15` |
| Testimonial avatar tile | teal bg, white "T" | teal bg, white "T" (unchanged — already works on dark) |
| Testimonial quote | `var(--m-ink-primary)` | `text-white/90` |
| Testimonial attribution | `var(--m-ink-tertiary)` | `text-white/55` |
| Diamond watermark — outer path | `stroke="var(--m-ink-primary)"` | `stroke="white"` |
| Diamond watermark — inner path | `stroke="var(--m-accent-teal)"` (unchanged) | `stroke="var(--m-accent-teal)"` (unchanged) |
| Diamond watermark — center circle | `stroke="var(--m-accent-teal)"` (unchanged) | `stroke="var(--m-accent-teal)"` (unchanged) |
| Diamond watermark — opacity | `opacity-[0.08]` | `opacity-[0.12]` (slightly more visible on dark) |

Right panel: **no change** — stays cream/white form surface. The new contrast is dark-vs-light across the split, which is the entire point.

### 2. Legal line under the form ([app/[locale]/learn/auth/page.tsx](app/[locale]/learn/auth/page.tsx))

Render a small legal line at the bottom of the right-panel `<main>`, below the `<AuthForm />`:

- **EN:** "By continuing, you agree to our [Terms](/terms) and [Privacy Policy](/privacy)."
- **JP:** "続行することで、[利用規約](/terms)と[プライバシーポリシー](/privacy)に同意したものとみなされます。"

Styling: ~12px font, `text-[var(--m-ink-tertiary)]`, links use `var(--m-accent-teal)` with `hover:underline`. Lives in the page (server component) so the `<AuthForm />` client component stays focused on form logic.

Locale-aware links: the existing site uses `/terms` and `/privacy` (no locale prefix needed for EN; `/ja/terms` and `/ja/privacy` for JP). Use `next-intl`'s `Link` from `@/i18n/navigation` so the locale prefix is handled automatically — same import path the `LangToggle` already uses.

### 3. i18n keys ([messages/en.json](messages/en.json), [messages/ja.json](messages/ja.json))

Use `next-intl`'s rich-text translation pattern so the inline links don't fragment across multiple keys (avoids JP particle issues like "と…に同意"). Add to the `auth` namespace:

```jsonc
// en.json
"legal_acknowledgment": "By continuing, you agree to our <terms>Terms</terms> and <privacy>Privacy Policy</privacy>."

// ja.json
"legal_acknowledgment": "続行することで、<terms>利用規約</terms>と<privacy>プライバシーポリシー</privacy>に同意したものとみなされます。"
```

Render with `t.rich('legal_acknowledgment', { terms: (chunks) => <Link href="/terms">{chunks}</Link>, privacy: (chunks) => <Link href="/privacy">{chunks}</Link> })`.

## Files to modify

| File | Change |
|---|---|
| [app/[locale]/learn/auth/page.tsx](app/[locale]/learn/auth/page.tsx) | Flip left `<aside>` colors per table above. Add legal line under `<AuthForm />` in right `<main>`. Import `Link` from `@/i18n/navigation`. |
| [messages/en.json](messages/en.json) | Add `auth.legal_acknowledgment` |
| [messages/ja.json](messages/ja.json) | Add `auth.legal_acknowledgment` |

## Out of scope

- No changes to AuthForm, signup flow, magic-link wiring, or any backend.
- No consent checkbox or stored consent flag — this is informational copy only.
- No APPI-specific Japan copy — that's a Phase 1.5 item per CLAUDE.md and would be a separate plan.
- No changes to the right panel background or form chrome.

## Verification

1. `pnpm dev` and open both locales:
   - [http://localhost:3000/learn/auth](http://localhost:3000/learn/auth)
   - [http://localhost:3000/ja/learn/auth](http://localhost:3000/ja/learn/auth)
2. **Visual**
   - Left panel renders dark `#1A2B33` matching the `/about` hero color exactly (open `/about` in another tab and confirm side-by-side).
   - Headline reads as white with teal `Move forward.` / `前へ進む。` accent.
   - Testimonial card is a subtle translucent panel against the dark bg; quote and attribution stay legible.
   - Diamond watermark visible but not loud.
   - Right panel unchanged (cream form panel).
3. **Legal line**
   - Sits below the AuthForm in the right panel.
   - "Terms" and "Privacy Policy" (or 利用規約 / プライバシーポリシー) are teal, underline on hover, route to `/terms` and `/privacy` (EN) and `/ja/terms` / `/ja/privacy` (JP).
   - Sentence reads naturally in JP (no awkward word-order from per-fragment translation).
4. **Single-viewport fit** — the legal line adds ~24px of vertical content. Confirm the form panel still doesn't scroll on 720px+ viewports. If it tips over, drop `mt-3` on the toggle prompt to `mt-2` to recover the space.
5. `pnpm type-check` clean.

## Risk

Low.
- Color/class changes only on the left panel — same component structure.
- The legal line is one new block of JSX in the page and one new i18n key per locale.
- `t.rich` is well-tested next-intl API and is already used elsewhere in the codebase (search confirms — if not, fall back to `t.markup` or three-key fragmentation, but `t.rich` is the right tool).
