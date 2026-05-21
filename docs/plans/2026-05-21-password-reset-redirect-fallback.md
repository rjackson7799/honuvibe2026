# Password Reset Link Lands on Home Page

## Context

A user requests a password reset, receives the email, clicks "Reset Password," and lands at:

```
https://honuvibe.ai/#access_token=eyJ...&refresh_token=...&type=recovery
```

The home page renders with no reset UI. The session tokens are in the URL hash but nothing consumes them, so the user is stuck.

### Why this happens

Our forgot-password route ([app/api/auth/forgot-password/route.ts:24-33](app/api/auth/forgot-password/route.ts#L24-L33)) does the right thing — it calls `admin.generateLink({ type: 'recovery', options: { redirectTo: '${origin}/learn/auth/reset' } })` and emails the returned `action_link`.

When the user clicks the link, Supabase's `/auth/v1/verify` endpoint validates the token and then needs to redirect to the `redirect_to` value. Supabase only honors `redirect_to` if it matches the project's **Redirect URLs allowlist** (Auth → URL Configuration in the dashboard). If it doesn't match, Supabase silently falls back to the project **Site URL** — which for this project is `https://honuvibe.ai/`. That is exactly the URL the user is landing on.

Our existing hash handler at [components/auth/AuthForm.tsx:85-125](components/auth/AuthForm.tsx#L85-L125) correctly forwards `type=recovery` hashes to `/learn/auth/reset`, but it only runs on `/learn/auth` — not on `/`. So the fallback silently breaks the flow.

The intended outcome: clicking the reset link reliably lands the user on the reset-password form, both in production and on preview deployments.

## Approach

Two-part fix: a Supabase configuration change (the root cause) plus a code-level safety net so the flow doesn't silently break again if the allowlist drifts.

### 1. Supabase dashboard: add reset URLs to the Redirect URL allowlist

Supabase project → Authentication → URL Configuration → **Redirect URLs**. Add:

- `https://honuvibe.ai/learn/auth/reset`
- `https://honuvibe.ai/ja/learn/auth/reset`
- `https://honuvibe.ai/learn/auth` (covers magic-link flow too)
- `https://honuvibe.ai/ja/learn/auth`
- `https://*-honuvibe.vercel.app/learn/auth/reset` (Vercel preview deploys, if reset is ever tested against previews)
- `https://*-honuvibe.vercel.app/ja/learn/auth/reset`
- `http://localhost:3000/learn/auth/reset` and `/ja/learn/auth/reset` (local dev)

Confirm **Site URL** is `https://honuvibe.ai` (no trailing slash, no path).

This is the actual root cause fix. Without it, Supabase will keep falling back to Site URL.

### 2. Code: add a root-level recovery hash safety net

Even with the allowlist correct, a single missed entry (e.g. forgetting the `/ja` variant, or a new locale) will silently break the flow again. Add a tiny client component that runs on the home page and routes recovery hashes to `/learn/auth/reset`.

**New file:** `components/auth/RecoveryHashRedirect.tsx`

A `'use client'` component with a single `useEffect`:

- Read `window.location.hash`. If empty, return.
- Parse with `URLSearchParams`. If `type !== 'recovery'`, return.
- If `access_token` is present, `router.replace` to `/learn/auth/reset${hash}` (or `/ja/learn/auth/reset${hash}` based on the `locale` prop).
- Renders `null`.

This mirrors the recovery branch already in [components/auth/AuthForm.tsx:97-100](components/auth/AuthForm.tsx#L97-L100) — keep the same logic so behavior matches. Do **not** also handle magic-link tokens here; recovery is the only case where Supabase's Site-URL fallback strands the user. Magic-link emails go through `/learn/auth` and the existing handler covers them.

**Modify:** [app/[locale]/page.tsx:21-41](app/[locale]/page.tsx#L21-L41)

Render `<RecoveryHashRedirect locale={locale} />` once near the top of the returned tree (above `<MarketingShell>` is fine — it returns `null`, so placement is cosmetic). Pass `locale` so the component can build the right path prefix.

Use `router.replace` not `router.push` so the hash-bearing URL doesn't pollute history.

### Why not also patch the API route?

The `redirectTo` value we send is already correct. The failure happens *after* Supabase validates the token, when it picks the redirect destination. We can't fix that from our API — it's a Supabase config concern.

### Files

- **Modify**: [app/[locale]/page.tsx](app/[locale]/page.tsx) — mount the new component
- **Create**: `components/auth/RecoveryHashRedirect.tsx` — new client component
- **No change**: [app/api/auth/forgot-password/route.ts](app/api/auth/forgot-password/route.ts), [components/auth/AuthForm.tsx](components/auth/AuthForm.tsx), [components/auth/ResetPasswordForm.tsx](components/auth/ResetPasswordForm.tsx) — already correct

## Verification

1. **Confirm Supabase config first** — open the Supabase dashboard, verify Site URL and Redirect URLs as above. Save.
2. Trigger a fresh password reset against production (use an email you control). Click the link in the email. Expected: lands directly on `https://honuvibe.ai/learn/auth/reset#access_token=...`, the form renders, you can set a new password.
3. **Simulate the Site-URL fallback** to prove the safety net works: manually paste a URL of the form `https://honuvibe.ai/#access_token=FAKE&refresh_token=FAKE&type=recovery` into the browser. Expected: instantly redirects to `/learn/auth/reset#access_token=FAKE&...`. The reset form will then show an "expired/invalid link" error from `setSession` — that's the correct UX for a bad token; what we're verifying here is the routing, not the token validity.
4. Repeat (2) on the JP locale (`/ja` forgot-password flow). Expected: lands on `/ja/learn/auth/reset`.
5. Sign in with the new password to confirm the update persisted.
