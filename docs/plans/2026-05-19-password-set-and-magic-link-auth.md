# Password Set + Magic-Link Login Method

**Date:** 2026-05-19
**Owner:** Ryan
**Status:** Plan (pre-implementation)

---

## Context

The Vertice partner-checkout flow shipped successfully and verified end-to-end yesterday. Paid users land in the dashboard via magic link but **never set a password**. Future logins require another magic link, which is friction for power users and unusable for browser password autofill.

Goal: add standard password auth alongside the magic-link flow so the most common login path (browser-saved credentials) works, while keeping the friction-free guest-checkout entry point.

## Decisions (locked)

1. **WelcomeScreen password step is OPTIONAL with Skip.** Higher conversion through onboarding beats higher password-set rate.
2. **Magic-link on login page is an ALTERNATIVE login method**, not a fallback. Always-visible button next to the password form. Standard pattern (Slack, Notion).
3. **Google OAuth stays visible.** Three independent login methods (password / magic link / Google) is normal for modern apps and each is small.

## Architecture

### Schema: `users.password_set` boolean

New column on `public.users`, default `false`. Single source of truth for "does this user have a password set?" — avoids per-page-load admin queries against `auth.users.encrypted_password`.

- **Backfill**: existing users → `true` (they all came through password signup historically).
- **Set to `true`**: when `ResetPasswordForm.updateUser({ password })` or the new in-settings password form succeeds. Server action `markPasswordSet()` flips the flag.
- **Read by**: dashboard page server component (to decide WelcomeScreen password step + dashboard banner visibility) and settings page (to decide "Set password" vs "Change password" UI).

### Three user-facing entry points to set a password

1. **WelcomeScreen** (highest intent) — new step BEFORE the three-card chooser, only for `password_set = false` users. Has Set / Skip buttons.
2. **Dashboard banner** — small dismissible nudge for users who skipped, links to settings.
3. **Settings page** — permanent home for set/change password.

### Magic-link login

- New **`POST /api/auth/send-login-link`** endpoint. Email-only, no Stripe gating (separate from the existing `/api/auth/magic-link` route which is Stripe-session-gated and stays untouched).
- Rate-limited 5/hr/IP via the same module-level pattern used in the existing magic-link route.
- Returns 200 regardless of whether the email exists in `auth.users` (prevents email enumeration). Supabase auto-sends the magic-link email when the email matches.
- New button in `AuthForm.tsx`: "Or send me a magic link" below the password fields.

---

## Files to create

| Path | Purpose |
|---|---|
| `supabase/migrations/039_users_password_set.sql` | Add `password_set boolean default false`; backfill existing rows to `true`. |
| `app/api/auth/send-login-link/route.ts` | POST `{ email }` → `supabase.auth.admin.generateLink({ type: 'magiclink', email })`. Rate-limited. Always returns 200. |
| `components/learn/SetPasswordBanner.tsx` | Dismissible client banner shown on dashboard pages when `password_set = false` and `onboarded = true`. SessionStorage-backed dismiss state. |
| `components/auth/SetPasswordCard.tsx` | Reusable card for set-password UX. Used by WelcomeScreen step and settings page. Wraps `supabase.auth.updateUser({ password })` + `markPasswordSet()` server action. |

## Files to modify

| Path | Change |
|---|---|
| [lib/students/actions.ts](lib/students/actions.ts) | Add `markPasswordSet()` server action — sets `users.password_set = true` for the current authenticated user. Mirrors the existing `markOnboarded()` pattern. |
| [components/auth/ResetPasswordForm.tsx](components/auth/ResetPasswordForm.tsx) | After `updateUser({ password })` succeeds at line 86, call `markPasswordSet()` before the router push. |
| [app/[locale]/learn/dashboard/page.tsx](app/[locale]/learn/dashboard/page.tsx) | Extend the profile select at line 52 to include `password_set`. Pass `passwordSet` boolean to `<WelcomeScreen>`. Mount `<SetPasswordBanner>` for `passwordSet === false && onboarded === true` users on the main dashboard view. |
| [components/learn/WelcomeScreen.tsx](components/learn/WelcomeScreen.tsx) | Accept new `passwordSet: boolean` prop. If `!passwordSet`, render `<SetPasswordCard>` as a first step before the three-card chooser; include "Skip for now" link that calls `markOnboarded()` and advances to the chooser. If `passwordSet`, behave as today. |
| [app/[locale]/learn/dashboard/settings/page.tsx](app/[locale]/learn/dashboard/settings/page.tsx) | Add a "Password" section. Render `<SetPasswordCard>` with mode `set` if `password_set = false`, `change` if `true`. |
| [components/auth/AuthForm.tsx](components/auth/AuthForm.tsx) | Below the existing password sign-in submit row, add a secondary "Or send me a magic link" button. On click: validate email is filled, POST to `/api/auth/send-login-link`, show success state "Check your email for a sign-in link." Stays visible for all login modes (sign-in only, not sign-up). |
| `messages/en.json` and `messages/ja.json` | New `auth` keys: `or_use_magic_link`, `send_magic_link`, `magic_link_sent`, `magic_link_check_email`. New `welcome` keys: `set_password_title`, `set_password_body`, `set_password_cta`, `skip_for_now`. New `settings` keys: `password_section_title`, `set_password_subtitle`, `change_password_subtitle`. |

---

## Reuse map — don't rebuild

- **`ResetPasswordForm` hash-token + `setSession()` + `updateUser()` flow** — already works for first-time password setup (no token requirement once a session exists). The new `<SetPasswordCard>` uses the same `supabase.auth.updateUser({ password })` call but skips the hash-token bootstrap since the user is already logged in.
- **`markOnboarded()` server action** in `lib/students/actions.ts` — `markPasswordSet()` follows the same shape.
- **`/api/auth/magic-link/route.ts`** (Stripe-gated) — leave alone. Different security model, different caller (thanks page button). The new `/api/auth/send-login-link` route is general-purpose.
- **`/api/auth/forgot-password`** — leave alone. Password recovery semantics, separate from magic-link sign-in.
- **`/api/auth/callback`** — works as-is. Magic-link sign-ins hit it via the existing `exchangeCodeForSession` path.
- **Rate-limit token bucket** pattern from `/api/auth/magic-link/route.ts` — copy into the new send-login-link route.
- **i18n `auth` namespace** in messages/en.json — already covers sign_in, sign_up, password, forgot_password, reset_password, etc. New keys extend it.
- **Settings page shell** at `app/[locale]/learn/dashboard/settings/page.tsx` — exists, just needs a new section.

## What NOT to do

- **Don't make password set required** — explicit user decision. Skip is allowed.
- **Don't merge `/api/auth/magic-link` and `/api/auth/send-login-link`** — different gating (Stripe session vs anonymous email). Keep separate to avoid security creep.
- **Don't auto-sign-in after password set in WelcomeScreen** — user is already signed in via the magic-link path. No re-auth needed.
- **Don't change AuthForm sign-up mode** — the partner-checkout flow doesn't use sign-up. Sign-up users already set a password during signup.
- **Don't update `/api/auth/callback` to detect "first-time magic link"** — overkill. The `password_set` flag on `users` is the only signal we need, read at dashboard-render time.

---

## Build order

1. **Migration** — `039_users_password_set.sql`. Add column + backfill. Apply before deploying any code that reads it.
2. **Server action** — `markPasswordSet()` in `lib/students/actions.ts`.
3. **`<SetPasswordCard>`** component — the reusable piece.
4. **`<SetPasswordBanner>`** component — small client component.
5. **WelcomeScreen update** — wire in `<SetPasswordCard>` as conditional first step + Skip handler.
6. **Dashboard page update** — fetch `password_set`, pass to WelcomeScreen, conditionally mount banner.
7. **Settings page update** — render `<SetPasswordCard>` in set/change mode based on flag.
8. **`/api/auth/send-login-link` route** — rate-limited, enumeration-resistant.
9. **AuthForm magic-link button** — POST to send-login-link, show success state.
10. **i18n keys** — EN + JA for the three new namespaces.
11. **End-to-end verification** (see below).

Each step is a separate commit straight to `main`. Existing partner-checkout flow continues to work throughout — these changes are additive.

---

## Verification

### Scenario A — partner buyer sets password during onboarding

1. Stripe partner-checkout signup with a fresh email (test mode).
2. Click magic link in email → land on `/learn/dashboard?welcome=true`.
3. WelcomeScreen shows the **Set Password** step (not the three cards yet).
4. Fill in password + confirm → click "Set password" → advances to three-card chooser.
5. Supabase: `users.password_set = true` for this user.
6. Sign out, return to `/learn/auth`, sign in with email + password → success.

### Scenario B — partner buyer skips, sets password later from settings

1. Same Stripe signup, fresh email.
2. Click magic link → land on WelcomeScreen → click **"Skip for now"** → advances to three-card chooser.
3. Pick any card → navigate around dashboard → **dashboard banner** visible ("Set a password for faster sign-in").
4. Click banner → routed to `/learn/dashboard/settings` → Password section shows "Set password" form.
5. Fill in + submit → `password_set = true` → banner disappears on next render.
6. Sign out + sign back in with password → success.

### Scenario C — existing user (already has password)

1. Sign in as existing user.
2. Settings page Password section shows "**Change password**" (not "Set password").
3. WelcomeScreen never re-renders for them (they're already onboarded).
4. No dashboard banner.

### Scenario D — magic-link login from login page

1. Open `/learn/auth` in incognito.
2. Enter email of an existing user → click "Or send me a magic link".
3. Success state appears: "Check your email."
4. Email arrives, click link → land on `/learn/dashboard` authenticated.
5. Enter email of NON-existent user → same success state (no enumeration).
6. Rate limit test: click magic-link button 6 times in quick succession → 6th request returns 429.

### Scenario E — Google OAuth still works

1. Click "Continue with Google" → standard Google OAuth → land on dashboard.
2. Confirm no UX regressions from the magic-link button addition.

---

## Out of scope (call out, don't build)

- **2FA / TOTP** setup
- **Account deletion / data export** from settings
- **Email change flow** (different security model — requires verification of both old and new email)
- **Password strength meter** in `<SetPasswordCard>` — Supabase enforces minimum 6 chars by default; can add UI polish later
- **"Resend magic link" rate-limit retry messaging** — show a generic "try again in an hour" on 429; richer UI is a polish item
- **Migrating existing partner-checkout users** who already came through and skipped/don't have passwords yet — they'll see the dashboard banner the next time they visit (once this ships), which is the right behavior
