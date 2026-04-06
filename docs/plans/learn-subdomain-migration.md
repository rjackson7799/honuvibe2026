# Plan: learn.honuvibe.com Subdomain (URL-Only)

## Context

Students should feel like they're on a dedicated learning platform at `learn.honuvibe.com`, while reducing the sense of LMS complexity being mixed into the marketing site. The approach is **URL-only separation** — one codebase, one Vercel deployment, zero auth refactoring. The subdomain routes to the same app but strips the `/learn/` prefix so URLs are clean.

```
learn.honuvibe.com/           → serves /learn      (course catalog)
learn.honuvibe.com/dashboard  → serves /learn/dashboard
learn.honuvibe.com/auth       → serves /learn/auth
learn.honuvibe.com/ja/dashboard → serves /ja/learn/dashboard
honuvibe.com/learn/*          → continues to work (no breaking change)
```

The rewrite logic lives in `middleware.ts` — it detects the `host` header and, when on the `learn.` subdomain, prepends `/learn/` to the pathname before intl + auth logic runs.

---

## Code Changes

### 1. `middleware.ts` — Subdomain detection + path rewriting

At the very top of the middleware function (before the `code` param check and before `intlMiddleware`), add subdomain detection:

```typescript
const host = request.headers.get('host') || ''
const isLearnSubdomain = host === 'learn.honuvibe.com'

if (isLearnSubdomain) {
  const url = request.nextUrl.clone()
  const p = url.pathname

  // Don't rewrite API/static/already-prefixed paths
  if (!p.startsWith('/api/') && !p.startsWith('/_next/') && !p.startsWith('/studio')) {
    if (p.startsWith('/ja/') && !p.startsWith('/ja/learn')) {
      url.pathname = '/ja/learn' + p.slice(3)  // /ja/foo → /ja/learn/foo
    } else if (p === '/ja') {
      url.pathname = '/ja/learn'
    } else if (!p.startsWith('/learn')) {
      url.pathname = '/learn' + (p === '/' ? '' : p)  // /foo → /learn/foo
    }
  }
  // Continue using rewritten URL for all intl + auth logic below
}
```

> **Implementation note:** Next.js middleware doesn't let you mutate `request.nextUrl` in place. The correct pattern is to clone the URL, compute the new pathname, then pass a new `NextRequest` constructed from the cloned URL into `intlMiddleware` and all downstream auth checks. Return `NextResponse.rewrite(rewrittenUrl)` merged with the response headers at the end when on the learn subdomain.

### 2. Cookie domain — share auth across subdomains

In the `setAll` cookie handler inside `middleware.ts`'s Supabase client, add `domain: '.honuvibe.com'`:

```typescript
cookiesToSet.forEach(({ name, value, options }) =>
  response.cookies.set(name, value, { ...options, domain: '.honuvibe.com' })
)
```

Also apply the same `domain` setting in `lib/supabase/server.ts`'s `setAll` handler.

This ensures a user who logs in at `learn.honuvibe.com/auth` is also recognized as logged in on `honuvibe.com` (so the nav user menu shows the correct state on the main site).

### 3. `app/api/auth/callback/route.ts` — No changes needed

The callback already uses `origin` for its redirect: `new URL(redirectTo, origin)`. When the auth flow starts on `learn.honuvibe.com`, the `origin` will be `https://learn.honuvibe.com` and the post-login redirect will correctly land on `learn.honuvibe.com/dashboard`. ✓

### 4. `next.config.ts` — Optional canonical redirects

Add redirects so authenticated LMS routes on the main domain canonically redirect to the learn subdomain. Keep course catalog and course detail pages on the main domain (they're marketing pages).

```typescript
// In redirects():
{ source: '/learn/dashboard/:path*', destination: 'https://learn.honuvibe.com/dashboard/:path*', permanent: false },
{ source: '/learn/auth/:path*',      destination: 'https://learn.honuvibe.com/auth/:path*',      permanent: false },
{ source: '/admin/:path*',           destination: 'https://learn.honuvibe.com/admin/:path*',     permanent: false },
// Keep /learn (catalog) and /learn/[slug] on main domain — those are marketing pages
```

---

## Non-Code Changes (Manual Steps)

| Step | Where | What |
|------|--------|-------|
| Add domain | Vercel → Project → Domains | Add `learn.honuvibe.com`, point to same deployment |
| DNS | DNS provider | Add CNAME `learn` → `cname.vercel-dns.com` |
| Supabase redirect URLs | Supabase → Auth → URL Config | Add `https://learn.honuvibe.com/**` to allowed redirect URLs |
| Supabase Site URL | Supabase → Auth → URL Config | Can stay as `honuvibe.com` or update to `learn.honuvibe.com` |

---

## Critical Files

| File | Change |
|------|--------|
| `middleware.ts` | Primary: subdomain detection + path rewriting + cookie domain |
| `lib/supabase/server.ts` | Cookie domain setting in `setAll` |
| `app/api/auth/callback/route.ts` | No changes needed |
| `next.config.ts` | Optional canonical redirects |

---

## Verification Checklist

- [ ] `learn.honuvibe.com/` renders the course catalog (`/learn`)
- [ ] `learn.honuvibe.com/dashboard` renders student dashboard (auth-protected)
- [ ] `learn.honuvibe.com/auth` renders login page, post-login redirects back to `learn.` subdomain
- [ ] `learn.honuvibe.com/ja/dashboard` renders Japanese dashboard
- [ ] `learn.honuvibe.com/api/stripe/webhook` hits the API route correctly (not rewritten)
- [ ] `honuvibe.com/learn/[slug]` (course detail) still works on main domain
- [ ] Nav user menu on `honuvibe.com` shows logged-in state after auth on `learn.` (cookie domain sharing)
- [ ] Password reset flow (`learn.honuvibe.com/auth/reset`) works end-to-end

---

## Local Dev Testing

Add to `/etc/hosts`:
```
127.0.0.1  learn.localhost
```

Then access `http://learn.localhost:3000/dashboard` to test subdomain rewriting locally.
