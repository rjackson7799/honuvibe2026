# Sign In navigation: preserve current locale

## Context

On the EN homepage (`honuvibe.ai/`), clicking the **Sign In** button in the marketing nav navigates to `/ja/learn/auth` (the Japanese auth page) instead of `/learn/auth` (English). The auth page renders correctly for the locale in its URL — the bug is upstream, in how the Sign In link produces that URL.

The most likely cause: the next-intl `Link` resolves its href via locale context, but the user's `NEXT_LOCALE` cookie (set previously by clicking the 日本語 toggle) can desync from the URL/context. When that desync happens — or when middleware re-runs `localeDetection` on the navigation request to `/learn/auth` — the user ends up on `/ja/learn/auth`.

We need the Sign In link to be **deterministic**: it should always lead to the auth page in the same locale as the page the user clicked from, regardless of cookie state. We should also preserve the originating URL so post-auth the user lands back where they started.

## Root cause

In [marketing-user-menu.tsx:110-122](components/marketing/nav/marketing-user-menu.tsx#L110-L122) and [user-menu.tsx:116,206](components/layout/user-menu.tsx#L116):

```tsx
<Link href="/learn/auth" ...>
```

This uses the next-intl `Link` from `@/i18n/navigation`, which infers locale from React context. When the EN/JP toggle has set `NEXT_LOCALE=ja` in cookie but the page is rendered as EN (e.g., after a client-side locale switch back to EN, or stale cookie from prior visit), the resulting navigation can land on `/ja/learn/auth`.

There is also no `?redirect=` parameter being passed, so even if the auth page redirects correctly post-login, it can't return the user to the originating page/locale.

## Fix

Two small, independent changes:

### 1. Make Sign In href deterministic with explicit locale prefix

In both `marketing-user-menu.tsx` and `layout/user-menu.tsx`, replace the next-intl `Link` for the Sign In CTA with an explicit-prefix link built from `useLocale()` + `usePathname()`:

```tsx
import Link from 'next/link';
import { useLocale } from 'next-intl';
import { usePathname } from 'next/navigation';

// inside component, in the logged-out branch:
const locale = useLocale();
const pathname = usePathname(); // next/navigation pathname — includes /ja prefix if present
const authHref = locale === 'ja' ? '/ja/learn/auth' : '/learn/auth';
const redirectParam = pathname && pathname !== authHref
  ? `?redirect=${encodeURIComponent(pathname)}`
  : '';

<Link href={`${authHref}${redirectParam}`} ...>
```

Key points:
- Use plain `next/link` so next-intl's locale auto-prefix logic doesn't fight the explicit prefix.
- Use `next/navigation`'s `usePathname` (returns the full URL including `/ja` prefix), not next-intl's locale-stripped variant — this preserves locale through the redirect round-trip.
- The `redirect` param flows into the existing handling at [app/[locale]/learn/auth/page.tsx:32-35](app/[locale]/learn/auth/page.tsx#L32-L35), which already calls `sanitizeRedirect(sp.redirect, …)` after login.

### 2. Leave the rest of `MarketingUserMenu` alone

The logged-in branch's `Link`s for `/learn/dashboard` and `/admin` ([marketing-user-menu.tsx:166, 172](components/marketing/nav/marketing-user-menu.tsx#L166)) are fine to leave on next-intl `Link` — those flows are post-auth and the locale context is already authoritative by then. Only the logged-out Sign In CTA needs the deterministic treatment.

## Files to modify

- [components/marketing/nav/marketing-user-menu.tsx](components/marketing/nav/marketing-user-menu.tsx#L108-L123) — logged-out branch (`if (!user)`)
- [components/layout/user-menu.tsx](components/layout/user-menu.tsx#L116) — both `<Link href="/learn/auth" ...>` instances (line 116 row variant, line 206 dropdown variant)

Existing utilities to reuse (no new code needed):
- `useLocale` from `next-intl`
- `usePathname` from `next/navigation`
- `sanitizeRedirect` at [lib/auth/safe-redirect.ts](lib/auth/safe-redirect.ts) — already wired up in the auth page

## Verification

1. **EN → Sign In:**
   - `pnpm dev`, open `http://localhost:3000/`
   - DevTools → Application → Cookies → set `NEXT_LOCALE=ja` (simulates stale cookie)
   - Click **Sign In** → must land on `/learn/auth?redirect=%2F` (NOT `/ja/...`)
   - Auth page renders in English

2. **JP → Sign In:**
   - Open `http://localhost:3000/ja`
   - Click **Sign In** (サインイン) → lands on `/ja/learn/auth?redirect=%2Fja`
   - Auth page renders in Japanese

3. **Post-login redirect preserves locale:**
   - From `/ja/about`, click Sign In → URL is `/ja/learn/auth?redirect=%2Fja%2Fabout`
   - Complete login → lands back on `/ja/about`

4. **Mobile menu parity:**
   - Resize viewport < 1024px, open hamburger, repeat the EN/JP checks (the mobile menu reuses `MarketingUserMenu`, so this is the same code path).

5. **Existing tests still pass:**
   - `pnpm test __tests__/marketing/marketing-user-menu.test.tsx`

## Out of scope

- Changing `localeDetection` behavior in `i18n/routing.ts` (would have broader cookie/redirect implications across the site).
- Refactoring the lang toggle's cookie-set ordering. Cookie/URL desync is the trigger but the fix above neutralizes it for this CTA without touching the toggle.
