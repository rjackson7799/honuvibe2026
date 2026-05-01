# Plan: learn.honuvibe.ai Subdomain Migration (Execution)

**Supersedes** the design draft at [docs/plans/learn-subdomain-migration.md](./learn-subdomain-migration.md). Companion: [docs/plans/2026-04-21-learn-subdomain-landing.md](./2026-04-21-learn-subdomain-landing.md) (sales landing at `/learn`).

## Context

Students should feel they're on a dedicated learning platform at `learn.honuvibe.ai` rather than buried inside the marketing site. Strategy is **URL-only separation**: one Next.js codebase, one Vercel deployment, no auth refactor. Vercel routes the subdomain to the same app; middleware rewrites the path to prepend `/learn/` so URLs stay clean.

```
learn.honuvibe.ai/                 → renders /learn               (new sales landing)
learn.honuvibe.ai/courses          → renders /learn/courses       (catalog)
learn.honuvibe.ai/dashboard        → renders /learn/dashboard     (auth-gated)
learn.honuvibe.ai/auth             → renders /learn/auth
learn.honuvibe.ai/ja/dashboard     → renders /ja/learn/dashboard
honuvibe.ai/learn/dashboard        → 301 → learn.honuvibe.ai/dashboard  (canonical)
honuvibe.ai/learn, /learn/courses  → unchanged (marketing)
```

Decisions (confirmed):
- Apex domain is **honuvibe.ai** (not `.com`). Cookie domain = `.honuvibe.ai`.
- Canonical redirects for authenticated routes are **on at launch**.
- Email links continue to point at `honuvibe.ai/learn/...`; canonical redirects forward to the subdomain.

## Reuse — already in the codebase

- [lib/subdomain-config.ts](../../lib/subdomain-config.ts) — `resolveHost(host)` returns `{ prefix: '/learn' }` for the learn host. Wire it into middleware instead of inlining a string compare.
- [lib/tenant.ts](../../lib/tenant.ts) — server-component wrapper around `resolveHost`; not needed for middleware but useful if any RSC needs to know the active host.
- [middleware.ts](../../middleware.ts) — already runs intl + auth gating; add subdomain rewrite at the very top.

## Code Changes

### 1. Production env vars (Vercel → Project → Settings → Environment Variables)

Add for **Production** (and Preview):

```
NEXT_PUBLIC_PRIMARY_HOST=honuvibe.ai
NEXT_PUBLIC_LEARN_HOST=learn.honuvibe.ai
```

These align `subdomain-config.ts` (which still defaults to `honuvibe.com`) with the actual `.ai` apex.

### 2. [middleware.ts](../../middleware.ts) — subdomain rewrite + cookie domain

At the very top of `middleware()`, before the `code` param check:

```typescript
import { resolveHost } from './lib/subdomain-config';

const host = request.headers.get('host');
const { prefix } = resolveHost(host);
const isSubdomainHost = prefix !== null;

let workingRequest = request;
if (isSubdomainHost) {
  const p = request.nextUrl.pathname;

  // Skip API/static/studio — matcher already excludes most, but be defensive
  const skipRewrite =
    p.startsWith('/api/') || p.startsWith('/_next/') || p.startsWith('/studio');

  if (!skipRewrite) {
    let rewrittenPath = p;
    if (p.startsWith('/ja/') && !p.startsWith('/ja/learn')) {
      rewrittenPath = '/ja/learn' + p.slice(3); // /ja/foo → /ja/learn/foo
    } else if (p === '/ja') {
      rewrittenPath = '/ja/learn';
    } else if (!p.startsWith('/learn') && !p.startsWith('/ja/learn')) {
      rewrittenPath = '/learn' + (p === '/' ? '' : p); // /foo → /learn/foo
    }

    if (rewrittenPath !== p) {
      const url = request.nextUrl.clone();
      url.pathname = rewrittenPath;
      // Build a NextRequest from the rewritten URL so intl + auth see the prefixed path
      workingRequest = new NextRequest(url, request);
    }
  }
}

// Use workingRequest from here onward in place of `request`
```

Replace every `request.nextUrl.pathname` / `request.url` / `request.cookies` reference in the rest of the function with `workingRequest.*`. Final return becomes:

```typescript
return isSubdomainHost && workingRequest !== request
  ? NextResponse.rewrite(workingRequest.nextUrl, response)
  : response;
```

(Use `NextResponse.rewrite` so the URL bar keeps the clean subdomain URL while the app sees the `/learn`-prefixed route.)

In the `setAll` handler inside the Supabase server client, scope cookies to the apex so login on the subdomain is recognized on the main domain:

```typescript
const cookieDomain =
  process.env.NODE_ENV === 'production' ? '.honuvibe.ai' : undefined;

cookiesToSet.forEach(({ name, value, options }) =>
  response.cookies.set(name, value, { ...options, domain: cookieDomain }),
);
```

`cookieDomain` must be `undefined` outside production — `.localhost` does not work in browsers.

### 3. [lib/supabase/server.ts](../../lib/supabase/server.ts) — same cookie domain

Apply the identical `cookieDomain` snippet inside the `setAll` handler so Server Actions / Route Handlers also write cookies at the apex.

### 4. [lib/supabase/middleware.ts](../../lib/supabase/middleware.ts) — same cookie domain

This helper is unused by the active `middleware.ts` today but exists; either delete it or apply the same `cookieDomain` patch for safety. Recommend patch (one-line risk, future-proof).

### 5. [next.config.ts](../../next.config.ts) — canonical redirects

Add to the `redirects()` array. Use `has` host conditions so the redirect only fires on the apex, not on the subdomain itself (would loop):

```typescript
const APEX = 'honuvibe.ai';
const APEX_WWW = 'www.honuvibe.ai';

// Inside redirects():
{
  source: '/learn/dashboard/:path*',
  has: [{ type: 'host', value: `(${APEX}|${APEX_WWW})` }],
  destination: 'https://learn.honuvibe.ai/dashboard/:path*',
  permanent: false,
},
{
  source: '/learn/auth/:path*',
  has: [{ type: 'host', value: `(${APEX}|${APEX_WWW})` }],
  destination: 'https://learn.honuvibe.ai/auth/:path*',
  permanent: false,
},
{
  source: '/admin/:path*',
  has: [{ type: 'host', value: `(${APEX}|${APEX_WWW})` }],
  destination: 'https://learn.honuvibe.ai/admin/:path*',
  permanent: false,
},
{
  source: '/partner/:path*',
  has: [{ type: 'host', value: `(${APEX}|${APEX_WWW})` }],
  destination: 'https://learn.honuvibe.ai/partner/:path*',
  permanent: false,
},
{
  source: '/instructor/:path*',
  has: [{ type: 'host', value: `(${APEX}|${APEX_WWW})` }],
  destination: 'https://learn.honuvibe.ai/instructor/:path*',
  permanent: false,
},
```

Mirror each for `/ja/...` paths. Keep `permanent: false` (302) until we're confident in the subdomain.

Do **not** redirect `/learn` (landing) or `/learn/courses` (catalog) — those stay marketing-side per the landing plan.

### 6. No changes needed

- [app/api/auth/callback/route.ts](../../app/api/auth/callback/route.ts) — already uses `origin` from the request URL; on the subdomain the redirect lands back on `learn.honuvibe.ai` automatically.
- [components/auth/AuthForm.tsx](../../components/auth/AuthForm.tsx) — uses `window.location.origin`; adapts naturally.
- All `NEXT_PUBLIC_SITE_URL` consumers (emails, sitemap, metadata, RSS) — stay on `honuvibe.ai`. Canonical redirects handle the funnel.

## Non-Code Steps

| Step | Where | What |
|------|-------|------|
| Add domain | Vercel → Project → Domains | Add `learn.honuvibe.ai`, point to same project |
| DNS | DNS provider | CNAME `learn.honuvibe.ai` → `cname.vercel-dns.com` |
| Env vars | Vercel → Settings → Environment Variables | Add `NEXT_PUBLIC_PRIMARY_HOST=honuvibe.ai`, `NEXT_PUBLIC_LEARN_HOST=learn.honuvibe.ai` (Production + Preview) |
| Supabase redirect URLs | Supabase → Auth → URL Configuration | Add `https://learn.honuvibe.ai/**` to allowed redirect URLs |
| Supabase Site URL | Supabase → Auth → URL Configuration | Leave at `https://honuvibe.ai` — emails keep landing on main domain |

## Critical Files

| File | Change |
|------|--------|
| [middleware.ts](../../middleware.ts) | Subdomain rewrite via `resolveHost`, cookie domain in Supabase `setAll` |
| [lib/supabase/server.ts](../../lib/supabase/server.ts) | Cookie domain in `setAll` |
| [lib/supabase/middleware.ts](../../lib/supabase/middleware.ts) | Cookie domain (or delete the file) |
| [next.config.ts](../../next.config.ts) | Canonical redirects for LMS routes (apex → subdomain) |
| `lib/subdomain-config.ts` | No edit — already correct, just reuse |

## Local Dev Testing

Add to hosts file (`C:\Windows\System32\drivers\etc\hosts` on Windows):

```
127.0.0.1  learn.localhost
```

Add to `.env.local`:

```
NEXT_PUBLIC_PRIMARY_HOST=localhost:3000
NEXT_PUBLIC_LEARN_HOST=learn.localhost:3000
```

Restart dev server. Cookies will not be apex-scoped in dev (intentional — `.localhost` won't work), so cross-host login won't be testable locally; verify auth on a single host at a time and validate cross-host cookie sharing only in Preview/Prod.

## Verification (post-deploy, in this order)

1. **DNS resolves** — `nslookup learn.honuvibe.ai` returns Vercel IPs.
2. **Vercel domain attached** — green checkmark in Project → Domains.
3. **Subdomain serves landing** — `https://learn.honuvibe.ai/` shows the new sales landing (whatever `/learn` renders today).
4. **Subdomain serves catalog** — `https://learn.honuvibe.ai/courses` shows course list.
5. **Subdomain dashboard auth gate** — visiting `/dashboard` while logged out redirects to `/auth?redirect=/learn/dashboard` *on the subdomain* (not bouncing to apex).
6. **Subdomain login** — log in at `https://learn.honuvibe.ai/auth`; redirected to `/dashboard` on the subdomain.
7. **Cross-domain auth visibility** — after step 6, open `https://honuvibe.ai/` in the same browser; nav user menu shows logged-in state. Confirms `.honuvibe.ai` cookie domain works.
8. **JP routes** — `https://learn.honuvibe.ai/ja/dashboard` renders Japanese dashboard.
9. **API not rewritten** — `https://learn.honuvibe.ai/api/health` (or any existing API route) hits the API, not a 404.
10. **Canonical redirects** — `https://honuvibe.ai/learn/dashboard` 302s to `https://learn.honuvibe.ai/dashboard`; same for `/admin`, `/partner`, `/instructor`, and their `/ja/...` variants.
11. **Marketing routes untouched** — `https://honuvibe.ai/learn` (landing) and `https://honuvibe.ai/learn/courses` (catalog) still 200 on the main domain.
12. **Course detail unchanged** — `https://honuvibe.ai/learn/[slug]` (e.g., `/learn/ai-essentials`) still works on the main domain.
13. **Password reset E2E** — request reset from `learn.honuvibe.ai/auth`; click email link; lands at `learn.honuvibe.ai/auth/reset` and completes.
14. **Stripe webhook** — manual test or Stripe CLI: `POST honuvibe.ai/api/stripe/webhook` still succeeds (subdomain doesn't affect this — webhooks always hit the apex).
15. **Sitemap / robots / RSS** — confirm `honuvibe.ai/sitemap.xml` and `/robots.txt` still reference the apex (not the subdomain), since `NEXT_PUBLIC_SITE_URL` is unchanged.

## Risks & Rollback

- **If cookie sharing breaks login** on the apex after enabling `.honuvibe.ai` cookie domain: revert the `cookieDomain` lines in `middleware.ts` and `lib/supabase/server.ts`. Auth will work per-host but `honuvibe.ai` nav won't reflect login.
- **If the rewrite causes a redirect loop**: most likely the `has: host` condition in `next.config.ts` doesn't match — the subdomain itself would be matched and redirect back to itself. Tighten the regex or temporarily disable the redirects block.
- **Rollback path**: remove the `learn.honuvibe.ai` domain in Vercel; the codebase changes become inert (rewrite only fires when host matches `LEARN_HOST`).

## Build Sequence

1. Add Vercel env vars (`NEXT_PUBLIC_PRIMARY_HOST`, `NEXT_PUBLIC_LEARN_HOST`) in Production + Preview.
2. Add `learn.honuvibe.ai` domain in Vercel and configure CNAME at the DNS provider.
3. Add Supabase redirect URL `https://learn.honuvibe.ai/**`.
4. Patch `middleware.ts`: import `resolveHost`, add rewrite block, swap `request` → `workingRequest`, add cookie `domain`.
5. Patch `lib/supabase/server.ts` and `lib/supabase/middleware.ts` with the same cookie `domain` block.
6. Add canonical redirects to `next.config.ts`.
7. Deploy to a Preview, run verification steps 1–15 against the preview alias (set up a preview-domain CNAME if testing cross-host cookies in preview).
8. Promote to production. Re-run verification 1–15 against production.
9. Monitor for 24h: Plausible for `/learn/dashboard` traffic on apex (should drop to ~0 as redirects kick in), Sentry for any new auth errors.
