# Community Paywall — Direct Checkout Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Send users from the community paywall and `/learn` pricing cards directly to Stripe Checkout in one click, showing price + trial inline so they're not asked to "Subscribe" without knowing what they're buying.

**Architecture:** A single canonical `GET /api/stripe/subscribe?tier={community|vault}` endpoint handles both authed and unauthed visitors via 302 redirects — authed users go straight to a new Stripe Checkout session; unauthed users are bounced to `/learn/auth?redirect=<self>` and resume into checkout the moment their session lands. The paywall and `/learn` pricing cards link to that endpoint with **plain `<a>` tags** (never `next/link`) so the App Router prefetcher cannot accidentally create Stripe Checkout sessions on hover/viewport. The existing `POST /api/stripe/subscribe` is generalized to accept a tier param (so the SubscribeButton on the billing page can target either tier) but is no longer the primary path.

**Hardening invariants (do not weaken without re-review):**
1. **No `next/link` to `/api/stripe/subscribe`.** Plain anchors only. Side-effectful GET + prefetch = ghost Stripe sessions.
2. **Duplicate-subscription detection uses `hasActiveSubscription` from [lib/access/checks.ts](lib/access/checks.ts), not a raw `status === 'active'` check.** That helper already understands `trialing` and `cancelled-with-grace`. Don't reinvent.
3. **Redirect param validation is strict:** must start with `/` AND not start with `//` AND not contain `\\` AND must match an allowlist prefix (`/api/stripe/subscribe`, `/learn`, `/ja/learn`). Reject everything else; fall back to `/learn/dashboard`.
4. **Auth-resume coverage:** password sign-in, OAuth, magic-link click-through, and the magic-link hash handler in `AuthForm` all preserve `redirect`. New-signup-with-onboarding is the documented exception (see "Known scope cuts" below).
5. **No red commits on `main`.** Tests and implementation land in the same commit. TDD red runs locally only.

**Known scope cuts (intentional, documented for the reviewer):**
- **Brand-new signup → dashboard, not Stripe.** [app/api/auth/callback/route.ts:53-62](app/api/auth/callback/route.ts#L53-L62) forces `onboarded: false` users to `/learn/dashboard?welcome=true` regardless of `?redirect=`. This is correct onboarding UX — the dashboard's WelcomeScreen captures consent, locale, and password setup before payment. The user re-encounters the paywall (or a dashboard upsell) and converts on the second click. Building "signup → onboarding → resume-to-checkout" is a separate plan.
- **Tier upgrade for existing subscribers.** If a Community subscriber hits `/api/stripe/subscribe?tier=vault`, this plan bounces them to `/learn/dashboard/billing?upgrade=true` where the Stripe Customer Portal handles prorated upgrades. A proper in-app upgrade UI is a separate plan.
- **JPY pricing.** Out of scope by the tier registry's USD-only design.

**Tech Stack:** Next.js App Router route handlers, Supabase server client for auth, Stripe Node SDK, next-intl for the price/trial strings (reusing existing `learn.chapter_vault.*` keys), Vitest for the route-handler tests.

---

## File Structure

**Create:**
- `lib/auth/safe-redirect.ts` — Pure helper `isSafeInternalRedirect(value: string | null | undefined): boolean` plus `sanitizeRedirect(value, fallback): string`. Used by the subscribe GET handler, the auth page, and the auth callback. Strict allowlist of internal prefixes.
- `lib/auth/safe-redirect.test.ts` — Unit tests covering `//evil.com`, `\\evil.com`, `http://evil.com`, `javascript:`, empty/null, and the legitimate happy paths.
- `__tests__/api/stripe-subscribe-get.test.ts` — Vitest integration tests for the GET handler (authed → 302 to Stripe; unauthed → 302 to `/learn/auth` with sanitized redirect; trialing → 302 to billing; cancelled-with-grace → 302 to billing; invalid tier → 400; protocol-relative redirect param → rejected).
- `__tests__/lib/stripe-webhooks-subscription.test.ts` — Webhook test confirming `handleCheckoutCompleted` with `type: 'vault_subscription'` returns cleanly without the misleading "Missing user_id or course_id" error.

**Modify:**
- `app/api/stripe/subscribe/route.ts` — add `GET` handler that reads `?tier=`, branches on auth state, uses `hasActiveSubscription` for duplicate detection (covers trialing + cancelled-grace), and 302s. Generalize the existing `POST` handler so the price is selected from the tier registry (`getSubscriptionPriceId`) instead of hardcoded Vault, and so Community gets a 14-day trial via `subscription_data.trial_period_days`. Both handlers share a `selectUserAccessRow()` helper that fetches the fields `hasActiveSubscription` needs.
- `lib/stripe/webhooks.ts` — add an explicit early-return branch in `handleCheckoutCompleted` for `session.metadata.type ∈ {community_subscription, vault_subscription}` with a comment that fulfillment happens via `customer.subscription.created`. Silences the misleading "Missing user_id or course_id" log without changing fulfillment logic.
- `components/community/CommunityPaywall.tsx` — replace the three plain CTA buttons with two inline-priced tier cards (price, `/month`, trial note for Community, 3 bullets each) plus a smaller "Browse courses" link. **Tier cards use plain `<a>` tags, not `next/link`** — see hardening invariant #1.
- `components/marketing/learn/learn-chapter-vault.tsx` — change `ctaHref` on both `PricingCard` instances from `/learn/auth?intent=community|vault` (dead — `intent` is unread) to `/api/stripe/subscribe?tier=community|vault`. **`PricingCard`'s `Button` rendering must use a plain `<a>`** — verify in Task 4 and refactor `Button` if it forces `next/link`.
- `components/billing/SubscribeButton.tsx` — accept optional `tier?: 'community' | 'vault'` prop defaulting to `'vault'`; pass it in the POST body.
- `app/api/auth/send-login-link/route.ts` — accept a `redirectTo` field in the body, sanitize via `sanitizeRedirect`, and pass it as `next=` to the callback URL. Default to `/learn/dashboard` if missing or rejected.
- `components/auth/AuthForm.tsx` — (a) include the current `redirect` searchParam in the send-login-link POST body, (b) in the magic-link hash handler at lines 84-119, read `redirect` from `window.location.search` and route there post-`setSession` (sanitized) instead of hardcoded `/learn/dashboard?welcome=true`. Welcome flag only applies when no explicit redirect.
- `lib/analytics.ts` — widen `trackCommunityPaywallCtaClicked` to accept `cta: 'community_tier' | 'vault_tier' | 'courses'`.
- `messages/en.json` and `messages/ja.json` — add a small `community.paywall_inline.*` block with the bullets for each tier (price, unit, trial note reused from existing `learn.chapter_vault.*` keys).

**Out of scope:**
- Course one-shot purchases — `/api/stripe/checkout` is a separate route and already works from the course pages; not touched here.
- Existing JPY price env var (`STRIPE_VAULT_PRICE_JPY`) — the tier registry is USD-only by design ([lib/stripe/tiers.ts:1-8](lib/stripe/tiers.ts#L1-L8)). We keep behavior consistent: subscriptions are USD regardless of locale; only the Stripe Checkout UI locale flips to `ja`.
- Removing the dead `intent` param from elsewhere — only `learn-chapter-vault.tsx` is changed; if other surfaces grow direct-checkout entry points later, they should use the same `/api/stripe/subscribe?tier=` pattern.

---

## Task 0: Build the safe-redirect helper (foundation for Tasks 1, 3, 6, 8)

**Files:**
- Create: `lib/auth/safe-redirect.ts`
- Create: `lib/auth/safe-redirect.test.ts`

Side-effectful redirect targets must be allowlisted; never trust raw query params. This helper is used by every downstream task.

- [ ] **Step 1: Write the helper and tests together (TDD red runs locally only — never commit red on main)**

Create `lib/auth/safe-redirect.test.ts`:

```ts
import { describe, it, expect } from 'vitest';
import { isSafeInternalRedirect, sanitizeRedirect } from './safe-redirect';

describe('isSafeInternalRedirect', () => {
  it('accepts known internal prefixes', () => {
    expect(isSafeInternalRedirect('/learn/dashboard')).toBe(true);
    expect(isSafeInternalRedirect('/learn')).toBe(true);
    expect(isSafeInternalRedirect('/ja/learn/dashboard/billing')).toBe(true);
    expect(isSafeInternalRedirect('/api/stripe/subscribe?tier=community')).toBe(true);
    expect(isSafeInternalRedirect('/api/stripe/subscribe?tier=vault&locale=ja')).toBe(true);
  });

  it('rejects protocol-relative URLs', () => {
    expect(isSafeInternalRedirect('//evil.com')).toBe(false);
    expect(isSafeInternalRedirect('//evil.com/learn')).toBe(false);
  });

  it('rejects backslash-prefixed URLs', () => {
    expect(isSafeInternalRedirect('\\\\evil.com')).toBe(false);
    expect(isSafeInternalRedirect('/\\evil.com')).toBe(false);
  });

  it('rejects absolute and javascript URLs', () => {
    expect(isSafeInternalRedirect('http://evil.com')).toBe(false);
    expect(isSafeInternalRedirect('https://evil.com')).toBe(false);
    expect(isSafeInternalRedirect('javascript:alert(1)')).toBe(false);
    expect(isSafeInternalRedirect('data:text/html,<script>')).toBe(false);
  });

  it('rejects paths outside the allowlist', () => {
    expect(isSafeInternalRedirect('/admin')).toBe(false); // not in paywall flow allowlist
    expect(isSafeInternalRedirect('/random')).toBe(false);
    expect(isSafeInternalRedirect('/')).toBe(false);
  });

  it('rejects empty, null, undefined', () => {
    expect(isSafeInternalRedirect(null)).toBe(false);
    expect(isSafeInternalRedirect(undefined)).toBe(false);
    expect(isSafeInternalRedirect('')).toBe(false);
  });
});

describe('sanitizeRedirect', () => {
  it('returns the value when safe', () => {
    expect(sanitizeRedirect('/learn/dashboard', '/learn')).toBe('/learn/dashboard');
  });
  it('returns the fallback when unsafe', () => {
    expect(sanitizeRedirect('//evil.com', '/learn')).toBe('/learn');
    expect(sanitizeRedirect(null, '/learn')).toBe('/learn');
  });
});
```

Then create `lib/auth/safe-redirect.ts`:

```ts
/**
 * Strict redirect validation for auth + checkout flows.
 *
 * Rejects everything that isn't an allowlisted internal path. Specifically:
 *   - protocol-relative URLs (`//host` — browsers treat these as external)
 *   - backslash variants (Windows path quirks parsed as `//` by some browsers)
 *   - absolute URLs (`http://`, `https://`, `javascript:`, `data:`)
 *   - paths not in the allowlist below
 *
 * Allowlist is intentionally small — anything new must be added explicitly.
 */
const ALLOWLIST_PREFIXES = [
  '/api/stripe/subscribe',
  '/learn',
  '/ja/learn',
] as const;

export function isSafeInternalRedirect(
  value: string | null | undefined,
): boolean {
  if (!value || typeof value !== 'string') return false;
  if (!value.startsWith('/')) return false;
  if (value.startsWith('//')) return false;
  if (value.includes('\\')) return false;
  // Path must match an allowlist prefix exactly or be followed by `/` or `?`.
  return ALLOWLIST_PREFIXES.some((p) => {
    if (value === p) return true;
    const next = value.charAt(p.length);
    return value.startsWith(p) && (next === '/' || next === '?');
  });
}

export function sanitizeRedirect(
  value: string | null | undefined,
  fallback: string,
): string {
  return isSafeInternalRedirect(value) ? value! : fallback;
}
```

- [ ] **Step 2: Run the tests — must pass before committing**

Run: `pnpm exec vitest run lib/auth/safe-redirect.test.ts`
Expected: PASS (all green).

- [ ] **Step 3: Commit (green only)**

```bash
git add lib/auth/safe-redirect.ts lib/auth/safe-redirect.test.ts
git commit -m "feat(auth): safe-redirect helper with strict allowlist"
```

---

## Task 1: Generalize the tier-selection logic for the subscribe endpoint

**Files:**
- Modify: `app/api/stripe/subscribe/route.ts`

This task only refactors the existing POST handler to read tier from the body and use the registry, without changing call sites yet. The existing `SubscribeButton` keeps working because it'll default-receive `tier: 'vault'` on the server when the body omits `tier`.

- [ ] **Step 1: Read the current route handler**

Read [app/api/stripe/subscribe/route.ts](app/api/stripe/subscribe/route.ts) end to end so you understand the current control flow (auth → profile lookup → customer create → price lookup → session create).

- [ ] **Step 2: Replace the route handler body with a tier-aware version**

Open `app/api/stripe/subscribe/route.ts` and replace the entire file with:

```ts
import { NextRequest, NextResponse } from 'next/server';
import { stripe } from '@/lib/stripe/client';
import { createClient } from '@/lib/supabase/server';
import {
  TIER_REGISTRY,
  getSubscriptionPriceId,
  type SubscriptionTier,
} from '@/lib/stripe/tiers';
import { hasActiveSubscription } from '@/lib/access/checks';

function parseTier(value: unknown): SubscriptionTier | null {
  return value === 'community' || value === 'vault' ? value : null;
}

/** Fetch the user fields needed for access checks + checkout. Single source of truth. */
async function fetchUserAccessRow(
  supabase: Awaited<ReturnType<typeof createClient>>,
  userId: string,
) {
  const { data } = await supabase
    .from('users')
    .select(
      'stripe_customer_id, subscription_tier, subscription_status, subscription_expires_at, email, full_name, role',
    )
    .eq('id', userId)
    .single();
  return data;
}

export async function POST(request: NextRequest) {
  try {
    const supabase = await createClient();
    const {
      data: { user },
      error: authError,
    } = await supabase.auth.getUser();
    if (authError || !user) {
      return NextResponse.json({ error: 'Not authenticated' }, { status: 401 });
    }

    const body = (await request.json()) as { locale?: string; tier?: string };
    const tier = parseTier(body.tier) ?? 'vault';
    const locale = body.locale ?? 'en';
    const isJapanese = locale === 'ja';

    const profile = await fetchUserAccessRow(supabase, user.id);

    // Use the shared access helper — covers active, trialing, AND
    // cancelled-with-grace. A raw subscription_status === 'active' check would
    // miss trialing users and let them start a second Checkout session.
    if (
      profile &&
      hasActiveSubscription({
        subscription_tier: profile.subscription_tier,
        subscription_status: profile.subscription_status,
        subscription_expires_at: profile.subscription_expires_at,
      })
    ) {
      return NextResponse.json(
        { error: 'Already subscribed', upgrade_url: '/learn/dashboard/billing?upgrade=true' },
        { status: 400 },
      );
    }

    let customerId = profile?.stripe_customer_id;
    if (!customerId) {
      const customer = await stripe.customers.create({
        email: user.email ?? undefined,
        name: profile?.full_name ?? undefined,
        metadata: { user_id: user.id },
      });
      customerId = customer.id;
      await supabase
        .from('users')
        .update({ stripe_customer_id: customerId })
        .eq('id', user.id);
    }

    const priceId = getSubscriptionPriceId(tier);
    const trialDays = TIER_REGISTRY[tier].trialDays;

    const origin =
      request.headers.get('origin') ??
      process.env.NEXT_PUBLIC_SITE_URL ??
      'http://localhost:3000';
    const localePrefix = isJapanese ? '/ja' : '';

    const session = await stripe.checkout.sessions.create({
      mode: 'subscription',
      customer: customerId,
      line_items: [{ price: priceId, quantity: 1 }],
      ...(trialDays ? { subscription_data: { trial_period_days: trialDays } } : {}),
      metadata: { user_id: user.id, type: `${tier}_subscription`, locale },
      success_url: `${origin}${localePrefix}/learn/dashboard/billing?subscribed=true&tier=${tier}`,
      cancel_url: `${origin}${localePrefix}/learn/dashboard/billing`,
      locale: isJapanese ? 'ja' : 'en',
    });

    return NextResponse.json({ url: session.url });
  } catch (error) {
    console.error('[Stripe Subscribe POST] Error:', error);
    return NextResponse.json(
      { error: 'Failed to create subscription checkout' },
      { status: 500 },
    );
  }
}

// Re-export the helper so the GET handler in Task 3 reuses it without duplicating the SELECT.
export { fetchUserAccessRow, parseTier };
```

Key changes from the previous version:
- Tier is read from the body; defaults to `'vault'` so existing `SubscribeButton` callers keep working.
- Price comes from `getSubscriptionPriceId(tier)` instead of hardcoded `STRIPE_VAULT_PRICE_USD`.
- Trial days flow from the tier registry — Community gets 14 days, Vault gets none.
- Duplicate-subscription detection routes through `hasActiveSubscription` so trialing and cancelled-grace users are caught.
- Success URL carries `tier=` so the billing page can show a tier-specific confirmation later.
- Japanese price env var dropped — the registry is USD-only by design.
- The `fetchUserAccessRow` helper is re-exported so the GET handler can share it.

- [ ] **Step 3: Type-check and lint**

Run: `pnpm exec tsc --noEmit`
Expected: no new errors. (Pre-existing repo-wide errors, if any, are fine; you're checking that the new code typechecks.)

Run: `pnpm exec eslint app/api/stripe/subscribe/route.ts`
Expected: no errors.

- [ ] **Step 4: Commit**

```bash
git add app/api/stripe/subscribe/route.ts
git commit -m "refactor(stripe): subscribe POST handler reads tier from body"
```

---

## Task 2: Add the GET handler with tests in one commit (no red on main)

**Files:**
- Modify: `app/api/stripe/subscribe/route.ts` (add `GET`)
- Create: `__tests__/api/stripe-subscribe-get.test.ts`

Per hardening invariant #5, write tests + implementation locally, run red, then write impl, run green, then commit *both together*. No intermediate red commit on `main`.

Tests cover: unauth → 302 to `/learn/auth` with sanitized redirect; authed + valid tier → 302 to Stripe; **trialing user → 302 to billing**; **cancelled-with-grace user → 302 to billing**; invalid/missing tier → 400; **protocol-relative redirect attempt → rejected**; JP locale prefix preserved.

- [ ] **Step 1: Write the test file (run RED locally — do not commit yet)**

Create `__tests__/api/stripe-subscribe-get.test.ts` with this content:

```ts
import { describe, it, expect, vi, beforeEach } from 'vitest';

const {
  getUserMock,
  fromMock,
  selectSingleMock,
  customersCreateMock,
  sessionsCreateMock,
} = vi.hoisted(() => ({
  getUserMock: vi.fn(),
  fromMock: vi.fn(),
  selectSingleMock: vi.fn(),
  customersCreateMock: vi.fn(),
  sessionsCreateMock: vi.fn(),
}));

vi.mock('@/lib/supabase/server', () => ({
  createClient: async () => ({
    auth: { getUser: getUserMock },
    from: fromMock,
  }),
}));

vi.mock('@/lib/stripe/client', () => ({
  stripe: {
    customers: { create: customersCreateMock },
    checkout: { sessions: { create: sessionsCreateMock } },
  },
}));

import { GET } from '@/app/api/stripe/subscribe/route';

function makeRequest(url: string): Request {
  return new Request(url, { method: 'GET' });
}

beforeEach(() => {
  process.env.STRIPE_COMMUNITY_PRICE_USD = 'price_community_test';
  process.env.STRIPE_VAULT_PRICE_USD = 'price_vault_test';

  getUserMock.mockReset();
  customersCreateMock.mockReset().mockResolvedValue({ id: 'cus_new' });
  sessionsCreateMock
    .mockReset()
    .mockResolvedValue({ url: 'https://checkout.stripe.com/c/test_session' });

  selectSingleMock.mockReset();
  fromMock.mockReset().mockImplementation(() => ({
    select: () => ({
      eq: () => ({ single: selectSingleMock }),
    }),
    update: () => ({ eq: () => Promise.resolve({ error: null }) }),
  }));
});

describe('GET /api/stripe/subscribe', () => {
  it('redirects unauthenticated visitors to /learn/auth with redirect= preserved', async () => {
    getUserMock.mockResolvedValue({ data: { user: null }, error: null });

    const res = await GET(
      makeRequest('http://localhost/api/stripe/subscribe?tier=community'),
    );

    expect(res.status).toBe(302);
    const location = res.headers.get('location') ?? '';
    expect(location).toContain('/learn/auth');
    expect(location).toContain(
      'redirect=%2Fapi%2Fstripe%2Fsubscribe%3Ftier%3Dcommunity',
    );
  });

  it('returns 400 for missing tier', async () => {
    getUserMock.mockResolvedValue({
      data: { user: { id: 'u1', email: 'a@b.com' } },
      error: null,
    });

    const res = await GET(makeRequest('http://localhost/api/stripe/subscribe'));

    expect(res.status).toBe(400);
  });

  it('returns 400 for invalid tier', async () => {
    getUserMock.mockResolvedValue({
      data: { user: { id: 'u1', email: 'a@b.com' } },
      error: null,
    });

    const res = await GET(
      makeRequest('http://localhost/api/stripe/subscribe?tier=enterprise'),
    );

    expect(res.status).toBe(400);
  });

  it('redirects active subscribers to billing (upgrade path)', async () => {
    getUserMock.mockResolvedValue({
      data: { user: { id: 'u1', email: 'a@b.com' } },
      error: null,
    });
    selectSingleMock.mockResolvedValue({
      data: {
        stripe_customer_id: 'cus_existing',
        subscription_tier: 'community',
        subscription_status: 'active',
        subscription_expires_at: null,
        email: 'a@b.com',
        full_name: 'A B',
        role: null,
      },
      error: null,
    });

    const res = await GET(
      makeRequest('http://localhost/api/stripe/subscribe?tier=vault'),
    );

    expect(res.status).toBe(302);
    expect(res.headers.get('location') ?? '').toContain(
      '/learn/dashboard/billing?upgrade=true',
    );
    expect(sessionsCreateMock).not.toHaveBeenCalled();
  });

  it('redirects trialing subscribers to billing (regression: trialing must not start a 2nd Checkout)', async () => {
    getUserMock.mockResolvedValue({
      data: { user: { id: 'u1', email: 'a@b.com' } },
      error: null,
    });
    selectSingleMock.mockResolvedValue({
      data: {
        stripe_customer_id: 'cus_existing',
        subscription_tier: 'community',
        subscription_status: 'trialing',
        subscription_expires_at: null,
        email: 'a@b.com',
        full_name: 'A B',
        role: null,
      },
      error: null,
    });

    const res = await GET(
      makeRequest('http://localhost/api/stripe/subscribe?tier=vault'),
    );

    expect(res.status).toBe(302);
    expect(res.headers.get('location') ?? '').toContain('/learn/dashboard/billing');
    expect(sessionsCreateMock).not.toHaveBeenCalled();
  });

  it('redirects cancelled-with-grace subscribers to billing', async () => {
    const future = new Date(Date.now() + 7 * 24 * 60 * 60 * 1000).toISOString();
    getUserMock.mockResolvedValue({
      data: { user: { id: 'u1', email: 'a@b.com' } },
      error: null,
    });
    selectSingleMock.mockResolvedValue({
      data: {
        stripe_customer_id: 'cus_existing',
        subscription_tier: 'vault',
        subscription_status: 'cancelled',
        subscription_expires_at: future,
        email: 'a@b.com',
        full_name: 'A B',
        role: null,
      },
      error: null,
    });

    const res = await GET(
      makeRequest('http://localhost/api/stripe/subscribe?tier=community'),
    );

    expect(res.status).toBe(302);
    expect(res.headers.get('location') ?? '').toContain('/learn/dashboard/billing');
    expect(sessionsCreateMock).not.toHaveBeenCalled();
  });

  it('lets cancelled-past-grace users start a new checkout', async () => {
    const past = new Date(Date.now() - 1).toISOString();
    getUserMock.mockResolvedValue({
      data: { user: { id: 'u1', email: 'a@b.com' } },
      error: null,
    });
    selectSingleMock.mockResolvedValue({
      data: {
        stripe_customer_id: 'cus_existing',
        subscription_tier: 'vault',
        subscription_status: 'cancelled',
        subscription_expires_at: past,
        email: 'a@b.com',
        full_name: 'A B',
        role: null,
      },
      error: null,
    });

    const res = await GET(
      makeRequest('http://localhost/api/stripe/subscribe?tier=vault'),
    );

    expect(res.status).toBe(302);
    expect(sessionsCreateMock).toHaveBeenCalledTimes(1);
  });

  it('creates a Stripe session with trial for community and 302s to checkout', async () => {
    getUserMock.mockResolvedValue({
      data: { user: { id: 'u1', email: 'a@b.com' } },
      error: null,
    });
    selectSingleMock.mockResolvedValue({
      data: {
        stripe_customer_id: 'cus_existing',
        subscription_tier: null,
        subscription_status: null,
        subscription_expires_at: null,
        email: 'a@b.com',
        full_name: 'A B',
        role: null,
      },
      error: null,
    });

    const res = await GET(
      makeRequest('http://localhost/api/stripe/subscribe?tier=community'),
    );

    expect(sessionsCreateMock).toHaveBeenCalledTimes(1);
    const args = sessionsCreateMock.mock.calls[0][0];
    expect(args.line_items[0].price).toBe('price_community_test');
    expect(args.subscription_data?.trial_period_days).toBe(14);
    expect(args.metadata.type).toBe('community_subscription');

    expect(res.status).toBe(302);
    expect(res.headers.get('location')).toBe(
      'https://checkout.stripe.com/c/test_session',
    );
  });

  it('creates a Stripe session without trial for vault', async () => {
    getUserMock.mockResolvedValue({
      data: { user: { id: 'u1', email: 'a@b.com' } },
      error: null,
    });
    selectSingleMock.mockResolvedValue({
      data: {
        stripe_customer_id: 'cus_existing',
        subscription_tier: null,
        subscription_status: null,
        subscription_expires_at: null,
        email: 'a@b.com',
        full_name: 'A B',
        role: null,
      },
      error: null,
    });

    const res = await GET(
      makeRequest('http://localhost/api/stripe/subscribe?tier=vault'),
    );

    expect(sessionsCreateMock).toHaveBeenCalledTimes(1);
    const args = sessionsCreateMock.mock.calls[0][0];
    expect(args.line_items[0].price).toBe('price_vault_test');
    expect(args.subscription_data).toBeUndefined();
    expect(args.metadata.type).toBe('vault_subscription');
    expect(res.status).toBe(302);
  });

  it('preserves the ja locale prefix on success and cancel URLs', async () => {
    getUserMock.mockResolvedValue({
      data: { user: { id: 'u1', email: 'a@b.com' } },
      error: null,
    });
    selectSingleMock.mockResolvedValue({
      data: {
        stripe_customer_id: 'cus_existing',
        subscription_tier: null,
        subscription_status: null,
        subscription_expires_at: null,
        email: 'a@b.com',
        full_name: 'A B',
        role: null,
      },
      error: null,
    });

    const res = await GET(
      makeRequest(
        'http://localhost/api/stripe/subscribe?tier=community&locale=ja',
      ),
    );

    const args = sessionsCreateMock.mock.calls[0][0];
    expect(args.success_url).toContain('/ja/learn/dashboard/billing');
    expect(args.cancel_url).toContain('/ja/learn/dashboard/billing');
    expect(args.locale).toBe('ja');
    expect(res.status).toBe(302);
  });
});
```

- [ ] **Step 2: Run the tests to confirm RED locally (do not commit)**

Run: `pnpm exec vitest run __tests__/api/stripe-subscribe-get.test.ts`
Expected: FAIL — `GET` is not exported yet. Confirm the failure mode, then move to Step 3 immediately. **Do not git add or commit yet.**

- [ ] **Step 3: Add the GET handler to `app/api/stripe/subscribe/route.ts`**

Append to `app/api/stripe/subscribe/route.ts` (the POST handler and helpers from Task 1 stay above). Also import `sanitizeRedirect`:

```ts
import { sanitizeRedirect } from '@/lib/auth/safe-redirect';

function buildAuthRedirect(request: NextRequest, originalPath: string): NextResponse {
  const url = new URL(request.url);
  const origin =
    request.headers.get('origin') ??
    process.env.NEXT_PUBLIC_SITE_URL ??
    url.origin;
  // Sanitize the path we hand back to the auth page. originalPath always
  // starts with /api/stripe/subscribe — but in case of malformed input,
  // sanitize defensively. Allowlist will pass it through.
  const safePath = sanitizeRedirect(originalPath, '/learn/dashboard');
  const localePrefix = url.searchParams.get('locale') === 'ja' ? '/ja' : '';
  const target = `${origin}${localePrefix}/learn/auth?redirect=${encodeURIComponent(safePath)}`;
  return NextResponse.redirect(target, 302);
}

export async function GET(request: NextRequest) {
  try {
    const url = new URL(request.url);
    const tier = parseTier(url.searchParams.get('tier'));
    if (!tier) {
      return NextResponse.json({ error: 'Invalid or missing tier' }, { status: 400 });
    }

    const supabase = await createClient();
    const { data: { user } } = await supabase.auth.getUser();

    if (!user) {
      // Preserve the full original path+query so we resume into checkout post-auth.
      return buildAuthRedirect(request, `${url.pathname}${url.search}`);
    }

    const locale = url.searchParams.get('locale') ?? 'en';
    const isJapanese = locale === 'ja';

    const profile = await fetchUserAccessRow(supabase, user.id);

    const origin =
      request.headers.get('origin') ??
      process.env.NEXT_PUBLIC_SITE_URL ??
      url.origin;
    const localePrefix = isJapanese ? '/ja' : '';

    // Duplicate-subscription check via the shared helper — covers active,
    // trialing, and cancelled-with-grace. Existing subscribers go to the
    // billing portal (upgrade flow is a separate plan).
    if (
      profile &&
      hasActiveSubscription({
        subscription_tier: profile.subscription_tier,
        subscription_status: profile.subscription_status,
        subscription_expires_at: profile.subscription_expires_at,
      })
    ) {
      return NextResponse.redirect(
        `${origin}${localePrefix}/learn/dashboard/billing?upgrade=true`,
        302,
      );
    }

    let customerId = profile?.stripe_customer_id;
    if (!customerId) {
      const customer = await stripe.customers.create({
        email: user.email ?? undefined,
        name: profile?.full_name ?? undefined,
        metadata: { user_id: user.id },
      });
      customerId = customer.id;
      await supabase
        .from('users')
        .update({ stripe_customer_id: customerId })
        .eq('id', user.id);
    }

    const priceId = getSubscriptionPriceId(tier);
    const trialDays = TIER_REGISTRY[tier].trialDays;

    const session = await stripe.checkout.sessions.create({
      mode: 'subscription',
      customer: customerId,
      line_items: [{ price: priceId, quantity: 1 }],
      ...(trialDays ? { subscription_data: { trial_period_days: trialDays } } : {}),
      metadata: { user_id: user.id, type: `${tier}_subscription`, locale },
      success_url: `${origin}${localePrefix}/learn/dashboard/billing?subscribed=true&tier=${tier}`,
      cancel_url: `${origin}${localePrefix}/learn/dashboard/billing`,
      locale: isJapanese ? 'ja' : 'en',
    });

    if (!session.url) throw new Error('Stripe session has no URL');
    return NextResponse.redirect(session.url, 302);
  } catch (error) {
    console.error('[Stripe Subscribe GET] Error:', error);
    return NextResponse.json(
      { error: 'Failed to start subscription checkout' },
      { status: 500 },
    );
  }
}
```

- [ ] **Step 4: Run the tests — must be green**

Run: `pnpm exec vitest run __tests__/api/stripe-subscribe-get.test.ts`
Expected: PASS — all scenarios green (unauth, invalid tier, active, trialing, cancelled-grace, cancelled-expired, JP locale, community-with-trial, vault-no-trial).

- [ ] **Step 5: Type-check**

Run: `pnpm exec tsc --noEmit`
Expected: no new errors.

- [ ] **Step 6: Commit test + implementation together (green)**

```bash
git add app/api/stripe/subscribe/route.ts __tests__/api/stripe-subscribe-get.test.ts
git commit -m "feat(stripe): GET /api/stripe/subscribe with auth-resume + trial/grace guards"
```

---

## Task 3: Add webhook hygiene branch for direct subscription checkouts

**Files:**
- Modify: `lib/stripe/webhooks.ts:26-65`
- Create: `__tests__/lib/stripe-webhooks-subscription.test.ts`

The direct-subscription checkout works today because `customer.subscription.created` handles fulfillment via price-ID → tier resolution. But `handleCheckoutCompleted` falls through to the course-enrollment branch and logs the misleading "Missing user_id or course_id" error for every subscription checkout. Add an explicit no-op branch.

- [ ] **Step 1: Write the test (run RED locally)**

Create `__tests__/lib/stripe-webhooks-subscription.test.ts`:

```ts
import { describe, it, expect, vi, beforeEach } from 'vitest';

vi.mock('@supabase/supabase-js', () => ({
  createClient: () => ({ from: vi.fn() }),
}));

const consoleErrorSpy = vi.spyOn(console, 'error').mockImplementation(() => {});

import { handleCheckoutCompleted } from '@/lib/stripe/webhooks';

beforeEach(() => {
  consoleErrorSpy.mockClear();
  process.env.NEXT_PUBLIC_SUPABASE_URL = 'https://x.supabase.co';
  process.env.SUPABASE_SERVICE_ROLE_KEY = 'service-key';
});

describe('handleCheckoutCompleted — subscription checkouts', () => {
  it('returns cleanly for community_subscription without "Missing user_id" error', async () => {
    const session = {
      id: 'cs_test',
      metadata: { user_id: 'u1', type: 'community_subscription', locale: 'en' },
    } as unknown as import('stripe').default.Checkout.Session;

    await handleCheckoutCompleted(session);

    const errorMessages = consoleErrorSpy.mock.calls
      .map((c) => String(c[0]))
      .join('\n');
    expect(errorMessages).not.toContain('Missing user_id or course_id');
  });

  it('returns cleanly for vault_subscription', async () => {
    const session = {
      id: 'cs_test',
      metadata: { user_id: 'u1', type: 'vault_subscription', locale: 'en' },
    } as unknown as import('stripe').default.Checkout.Session;

    await handleCheckoutCompleted(session);

    const errorMessages = consoleErrorSpy.mock.calls
      .map((c) => String(c[0]))
      .join('\n');
    expect(errorMessages).not.toContain('Missing user_id or course_id');
  });
});
```

- [ ] **Step 2: Confirm RED**

Run: `pnpm exec vitest run __tests__/lib/stripe-webhooks-subscription.test.ts`
Expected: FAIL — currently logs the "Missing user_id or course_id" message.

- [ ] **Step 3: Add the hygiene branch**

In `lib/stripe/webhooks.ts`, locate the ESL add-on block (around line 51):

```ts
  // STEP 2: ESL add-on branch.
  if (session.metadata?.type === 'esl_addon') {
```

Add a new STEP 2.5 right before it:

```ts
  // STEP 2.5: Direct subscription checkout (community/vault from /api/stripe/subscribe).
  // Fulfillment runs via customer.subscription.created (price-ID → tier). This
  // branch exists only to silence the misleading "Missing user_id or course_id"
  // log that the course-enrollment fall-through would otherwise emit.
  if (
    session.metadata?.type === 'community_subscription' ||
    session.metadata?.type === 'vault_subscription'
  ) {
    return;
  }
```

- [ ] **Step 4: Confirm GREEN**

Run: `pnpm exec vitest run __tests__/lib/stripe-webhooks-subscription.test.ts`
Expected: PASS.

Also re-run any existing webhook tests to confirm no regression:
Run: `pnpm exec vitest run lib/partner-attribution lib/revenue-split`

- [ ] **Step 5: Commit**

```bash
git add lib/stripe/webhooks.ts __tests__/lib/stripe-webhooks-subscription.test.ts
git commit -m "fix(stripe-webhook): explicit branch for direct subscription checkouts"
```

---

## Task 4: Update the `/learn` pricing cards to point at the new endpoint

**Files:**
- Modify: `components/marketing/learn/learn-chapter-vault.tsx:49`
- Modify: `components/marketing/learn/learn-chapter-vault.tsx:68`

The current `ctaHref="/learn/auth?intent=community"` is dead — the auth page doesn't read `intent`. Replace with the new endpoint so unauthed visitors auth-then-resume, and authed visitors go straight to Stripe.

- [ ] **Step 1: Change the community `ctaHref`**

In `components/marketing/learn/learn-chapter-vault.tsx`, find the line:

```tsx
ctaHref="/learn/auth?intent=community"
```

Replace with:

```tsx
ctaHref={`/api/stripe/subscribe?tier=community${locale === 'ja' ? '&locale=ja' : ''}`}
```

- [ ] **Step 2: Change the vault `ctaHref`**

In the same file, find:

```tsx
ctaHref="/learn/auth?intent=vault"
```

Replace with:

```tsx
ctaHref={`/api/stripe/subscribe?tier=vault${locale === 'ja' ? '&locale=ja' : ''}`}
```

- [ ] **Step 3: CRITICAL — verify `Button` renders a plain `<a>` for the API href (hardening invariant #1)**

Open the file holding `Button` (the `Button` import on line 3 of `learn-chapter-vault.tsx` — likely `components/marketing/primitives/index.tsx` or similar). Inspect what `Button` does with the `href` prop.

**Acceptance:**
- If `Button` renders a plain `<a href={...}>`, no change needed.
- If `Button` wraps in `next/link` Link, either (a) refactor `Button` to render plain `<a>` when `href` starts with `/api/`, or (b) replace the two `<Button href=...>` calls in `learn-chapter-vault.tsx` with bare `<a>` styled to match.

This is non-negotiable. `next/link` prefetch on a side-effectful endpoint would create Stripe Checkout sessions on every paywall scroll. Confirm via dev-server network tab in Step 4.

- [ ] **Step 4: Manual check in the dev server — verify NO prefetch fires**

Run: `pnpm dev`

In a logged-out browser, open DevTools → Network tab → filter "subscribe". Visit `http://localhost:3000/learn` and scroll the pricing cards into view. **No request to `/api/stripe/subscribe` should appear from scrolling or hovering** — only from an actual click. If a request fires before click, the link is being prefetched and Step 3's fix didn't land. Stop and revisit.

After clicking "Join the Community", you should be bounced to `/learn/auth?redirect=%2Fapi%2Fstripe%2Fsubscribe%3Ftier%3Dcommunity`. (Don't complete the auth flow yet — Task 7 covers that.)

- [ ] **Step 5: Commit**

```bash
git add components/marketing/learn/learn-chapter-vault.tsx
git commit -m "feat(learn): pricing cards link to direct checkout endpoint"
```

---

## Task 5: Rebuild the `CommunityPaywall` with inline pricing and direct-checkout links

**Files:**
- Modify: `components/community/CommunityPaywall.tsx`
- Modify: `lib/analytics.ts` (widen the analytics type)
- Modify: `messages/en.json` and `messages/ja.json` (add the bullets)

The new paywall has two prominent tier cards (Community and Vault) showing price, billing unit, trial note for Community, and 3 bullets each. Below them, a small text link to `/learn` for users who want to browse free content first.

- [ ] **Step 1: Widen the analytics CTA type**

In `lib/analytics.ts`, change the `trackCommunityPaywallCtaClicked` signature:

```ts
export function trackCommunityPaywallCtaClicked(props: {
  cta: 'community_tier' | 'vault_tier' | 'courses';
}) {
  trackEvent('community_paywall_cta_clicked', props);
}
```

(Renames `course` → `courses` since the surviving CTA goes to the `/learn` catalog, not a single course.)

- [ ] **Step 2: Add the inline-paywall i18n keys to `messages/en.json`**

Inside the existing `"community": { ... }` block in `messages/en.json` (starts at line 3159 — find `"paywall_cta_courses"` and add the new keys right after `"paywall_cta_courses": "Browse courses",`), add:

```json
"paywall_inline": {
  "community_bullets": [
    "Forum + weekly office hours",
    "New prompts & tools every week",
    "Members-only resources"
  ],
  "vault_bullets": [
    "All Vault lessons — videos, articles, templates",
    "Bilingual EN / 日本語",
    "Honu Community included"
  ],
  "browse_courses_hint": "Want to see what's free first?"
}
```

(Reuse `learn.chapter_vault.community.price` / `price_unit` / `price_note` and the equivalent vault keys for the price strings — don't duplicate them.)

- [ ] **Step 3: Add the same block to `messages/ja.json`**

Find the JP `"community"` block and insert:

```json
"paywall_inline": {
  "community_bullets": [
    "フォーラム + 週次オフィスアワー",
    "毎週新しいプロンプト・ツール",
    "メンバー限定リソース"
  ],
  "vault_bullets": [
    "全Vaultレッスン — 動画・記事・テンプレート",
    "バイリンガル EN / 日本語",
    "Honu Communityも含む"
  ],
  "browse_courses_hint": "まずは無料コンテンツから？"
}
```

- [ ] **Step 4: Replace the `CommunityPaywall` component**

Open `components/community/CommunityPaywall.tsx` and replace the entire file with:

```tsx
'use client';

import { useEffect } from 'react';
import Link from 'next/link';
import { usePathname } from 'next/navigation';
import { useLocale, useTranslations } from 'next-intl';
import { Users, Sparkles, Check } from 'lucide-react';
import {
  trackCommunityPaywallCtaClicked,
  trackCommunityPaywallViewed,
} from '@/lib/analytics';

export function CommunityPaywall() {
  const t = useTranslations('community');
  const tTiers = useTranslations('learn.chapter_vault');
  const locale = useLocale();
  const pathname = usePathname();

  useEffect(() => {
    trackCommunityPaywallViewed({ referrer_path: pathname ?? '' });
  }, [pathname]);

  const localeSuffix = locale === 'ja' ? '&locale=ja' : '';
  const communityBullets = t.raw('paywall_inline.community_bullets') as string[];
  const vaultBullets = t.raw('paywall_inline.vault_bullets') as string[];

  return (
    <div className="max-w-[640px] mx-auto py-12">
      <div className="text-center mb-10">
        <div className="w-16 h-16 mx-auto mb-4 rounded-full bg-[color:var(--accent-teal-subtle)] text-[color:var(--accent-teal)] flex items-center justify-center">
          <Users size={28} />
        </div>
        <h1 className="text-[clamp(24px,3vw,32px)] font-bold text-fg-primary tracking-[-0.02em] mb-2">
          {t('paywall_title')}
        </h1>
        <p className="text-fg-secondary text-base">{t('paywall_subtitle')}</p>
      </div>

      <div className="grid gap-4 md:grid-cols-2">
        <TierCard
          icon={<Users size={20} />}
          title={t('paywall_cta_community').replace('Subscribe — ', '')}
          price={tTiers('community.price')}
          priceUnit={tTiers('community.price_unit')}
          priceNote={tTiers('community.price_note')}
          bullets={communityBullets}
          cta={tTiers('community.cta')}
          href={`/api/stripe/subscribe?tier=community${localeSuffix}`}
          onClick={() => trackCommunityPaywallCtaClicked({ cta: 'community_tier' })}
          accent={false}
        />
        <TierCard
          icon={<Sparkles size={20} />}
          title={t('paywall_cta_vault').replace('Subscribe — ', '')}
          price={tTiers('vault.price')}
          priceUnit={tTiers('vault.price_unit')}
          priceNote={tTiers('vault.price_note')}
          bullets={vaultBullets}
          cta={tTiers('vault.cta')}
          href={`/api/stripe/subscribe?tier=vault${localeSuffix}`}
          onClick={() => trackCommunityPaywallCtaClicked({ cta: 'vault_tier' })}
          accent
        />
      </div>

      <p className="mt-8 text-center text-sm text-fg-secondary">
        {t('paywall_inline.browse_courses_hint')}{' '}
        <Link
          href="/learn"
          onClick={() => trackCommunityPaywallCtaClicked({ cta: 'courses' })}
          className="text-[color:var(--accent-teal)] font-semibold hover:underline"
        >
          {t('paywall_cta_courses')} →
        </Link>
      </p>
    </div>
  );
}

type TierCardProps = {
  icon: React.ReactNode;
  title: string;
  price: string;
  priceUnit: string;
  priceNote: string;
  bullets: string[];
  cta: string;
  href: string;
  onClick: () => void;
  accent: boolean;
};

function TierCard({
  icon,
  title,
  price,
  priceUnit,
  priceNote,
  bullets,
  cta,
  href,
  onClick,
  accent,
}: TierCardProps) {
  return (
    <article
      className={
        accent
          ? 'rounded-[14px] border-[1.5px] border-[color:var(--accent-teal)] bg-bg-primary p-5 shadow-sm'
          : 'rounded-[14px] border border-border-default bg-bg-primary p-5'
      }
    >
      <div className="flex items-center gap-2 text-[color:var(--accent-teal)]">
        {icon}
        <h2 className="text-lg font-bold text-fg-primary">{title}</h2>
      </div>
      <div className="mt-3 flex items-baseline gap-1">
        <span className="text-[32px] font-bold tracking-[-0.02em] text-fg-primary">
          {price}
        </span>
        <span className="text-sm text-fg-secondary">{priceUnit}</span>
      </div>
      <p className="mt-1 text-[12.5px] text-fg-secondary">{priceNote}</p>

      <ul className="mt-4 space-y-2">
        {bullets.map((b) => (
          <li
            key={b}
            className="flex items-start gap-2 text-[13.5px] leading-snug text-fg-secondary"
          >
            <Check
              size={14}
              strokeWidth={2.5}
              className="mt-[3px] shrink-0 text-[color:var(--accent-teal)]"
            />
            <span>{b}</span>
          </li>
        ))}
      </ul>

      {/* Plain <a>, NOT next/link — see hardening invariant #1. The link
          targets a side-effectful API route (/api/stripe/subscribe). Using
          next/link could trigger prefetch and create Stripe Checkout sessions
          on hover/viewport. */}
      <a
        href={href}
        onClick={onClick}
        className={
          accent
            ? 'mt-5 flex items-center justify-center gap-2 rounded-[10px] bg-[color:var(--accent-teal)] px-4 py-3 text-sm font-semibold text-white hover:bg-[color:var(--accent-teal-hover)] transition-colors'
            : 'mt-5 flex items-center justify-center gap-2 rounded-[10px] border border-border-default bg-bg-secondary px-4 py-3 text-sm font-semibold text-fg-primary hover:border-border-hover transition-colors'
        }
      >
        {cta} <span aria-hidden>→</span>
      </a>
    </article>
  );
}
```

- [ ] **Step 5: Run the full type-check**

Run: `pnpm exec tsc --noEmit`
Expected: no new errors.

- [ ] **Step 6: Manual check in the dev server**

Run (if not still running): `pnpm dev`

1. Sign in as a user without a subscription, navigate to `http://localhost:3000/learn/dashboard/community`. Confirm both tier cards render with correct prices ($29 / $49), the Community card shows "14-day free trial · cancel anytime", and bullets render.
2. Click "Join the Community". Confirm the browser navigates to a `checkout.stripe.com` URL.
3. Switch to `/ja/learn/dashboard/community`. Confirm JP bullets render and the link includes `&locale=ja`.

- [ ] **Step 7: Commit**

```bash
git add components/community/CommunityPaywall.tsx lib/analytics.ts messages/en.json messages/ja.json
git commit -m "feat(community): paywall shows inline pricing + direct checkout per tier"
```

---

## Task 6: Close the auth-resume gaps (auth page, magic link, magic-link hash)

**Files:**
- Modify: `app/[locale]/learn/auth/page.tsx`
- Modify: `app/api/auth/send-login-link/route.ts`
- Modify: `components/auth/AuthForm.tsx` (two spots: magic-link POST body, magic-link hash handler)

Three current gaps mean the round-trip from paywall → auth → checkout can break mid-flow. Each is one small surgical fix. All use `sanitizeRedirect` from Task 0 so we never honor an untrusted path.

**Documented non-fix (intentional scope cut):** The signup flow does NOT resume to checkout. [app/api/auth/callback/route.ts:53-62](app/api/auth/callback/route.ts#L53-L62) sends `onboarded: false` users to `/learn/dashboard?welcome=true` regardless of the redirect param. This is correct UX — new users need the WelcomeScreen for consent/locale/password setup. They re-encounter the paywall on first dashboard visit and convert on the second click. Building a signup → onboarding → resume-to-checkout chain is a separate plan.

- [ ] **Step 1: Fix the already-authed case on the `/learn/auth` page**

Open `app/[locale]/learn/auth/page.tsx`. Find:

```tsx
if (user) {
  const prefix = locale === 'ja' ? '/ja' : '';
  redirect(`${prefix}/learn/dashboard`);
}
```

Update the `Props` type and the function signature, then replace the redirect block. The full top-of-file becomes:

```tsx
import { sanitizeRedirect } from '@/lib/auth/safe-redirect';
// ... other existing imports

type Props = {
  params: Promise<{ locale: string }>;
  searchParams: Promise<{ redirect?: string }>;
};

export default async function AuthPage({ params, searchParams }: Props) {
  const { locale } = await params;
  const sp = await searchParams;
  setRequestLocale(locale);

  const supabase = await createClient();
  const { data: { user } } = await supabase.auth.getUser();

  if (user) {
    const prefix = locale === 'ja' ? '/ja' : '';
    redirect(sanitizeRedirect(sp.redirect, `${prefix}/learn/dashboard`));
  }
  // ... rest of the file unchanged
}
```

- [ ] **Step 2: Forward `redirectTo` through the magic-link send-link endpoint**

Open `app/api/auth/send-login-link/route.ts`. Find line 95 (`redirectTo: \`${origin}/api/auth/callback?next=...\``).

The handler currently hardcodes `/learn/dashboard` as the post-callback target. Make it accept a `redirectTo` field from the request body (already passed by AuthForm in the password-signin and signup flows — see [AuthForm.tsx:135](components/auth/AuthForm.tsx#L135) and [AuthForm.tsx:283](components/auth/AuthForm.tsx#L283)) and use `sanitizeRedirect` to validate it.

Add at the top of the route file:

```ts
import { sanitizeRedirect } from '@/lib/auth/safe-redirect';
```

Find the body destructuring (somewhere near the top of the handler) and add `redirectTo`. Replace the existing line ~95 with:

```ts
const localePrefix = locale === 'ja' ? '/ja' : '';
const safeNext = sanitizeRedirect(redirectTo, `${localePrefix}/learn/dashboard`);
// ...
redirectTo: `${origin}/api/auth/callback?next=${encodeURIComponent(safeNext)}`,
```

(Verify the body schema uses Zod; if so, add `redirectTo: z.string().optional()`.)

- [ ] **Step 3: Have `AuthForm` pass the current `?redirect=` to send-login-link**

In `components/auth/AuthForm.tsx`, find the `handleSendMagicLink` function (around line 47-71). Change the body of the POST to include `redirectTo`:

```ts
body: JSON.stringify({ email, redirectTo }),
```

`redirectTo` is already in scope from line 19 (`const redirectTo = explicitRedirect || '/learn/dashboard';`). No other change needed in that function.

- [ ] **Step 4: Have the magic-link hash handler honor `?redirect=`**

In `components/auth/AuthForm.tsx`, find the useEffect around lines 84-119 (the hash handler that calls `setSession`). Currently it hardcodes:

```tsx
window.location.assign(`${prefix}/learn/dashboard?welcome=true`);
```

Replace that line with:

```tsx
import { sanitizeRedirect } from '@/lib/auth/safe-redirect';
// (top of file)

// ... inside the useEffect, after successful setSession:
const search = new URLSearchParams(window.location.search);
const requested = search.get('redirect');
const fallback = `${prefix}/learn/dashboard?welcome=true`;
const target = sanitizeRedirect(requested, fallback);
window.location.assign(target);
```

This preserves the existing welcome flag for organic magic-link users while honoring an explicit `?redirect=` that came in through the paywall flow.

- [ ] **Step 5: Type-check**

Run: `pnpm exec tsc --noEmit`
Expected: no new errors.

- [ ] **Step 6: Manual end-to-end check (anonymous user, password signup)**

Run: `pnpm dev`

1. In an incognito browser, visit `http://localhost:3000/learn`.
2. Click "Join the Community" → land at `/learn/auth?redirect=%2Fapi%2Fstripe%2Fsubscribe%3Ftier%3Dcommunity`.
3. **Sign up new account.** Confirm the verification email arrives, click the link → land at `/learn/dashboard?welcome=true` (NOT checkout). This is the documented scope cut. Confirm the dashboard's paywall/upsell is visible so the user can convert.

- [ ] **Step 7: Manual end-to-end check (anonymous user, magic link)**

1. Incognito browser, visit `/learn`, click "Join the Vault" → land at `/learn/auth?redirect=%2Fapi%2Fstripe%2Fsubscribe%3Ftier%3Dvault`.
2. Use the "email me a login link" path with an *existing* (already-onboarded) account.
3. Click the magic link → should land at `checkout.stripe.com/...` directly, NOT the dashboard.

- [ ] **Step 8: Manual end-to-end check (anonymous user, password sign-in)**

1. Incognito browser, paywall flow → `/learn/auth?redirect=...`.
2. Sign in with an *existing* account that has no subscription.
3. Should land at `checkout.stripe.com/...`.

- [ ] **Step 9: Manual end-to-end check (already-authed user clicks paywall)**

1. Logged-in browser with a no-sub account, visit `/learn/dashboard/community`.
2. Click Community card → directly to Stripe.

- [ ] **Step 10: Commit**

```bash
git add app/[locale]/learn/auth/page.tsx app/api/auth/send-login-link/route.ts components/auth/AuthForm.tsx
git commit -m "fix(auth): preserve ?redirect= through auth page, magic link, hash handler"
```

---

## Task 7: Generalize `SubscribeButton` to accept a tier prop

**Files:**
- Modify: `components/billing/SubscribeButton.tsx`

This is a small back-compat improvement so the billing page (or anywhere else still using the POST flow) can also choose a tier without forking the component.

- [ ] **Step 1: Read current usages**

Run: `pnpm exec grep -rn "SubscribeButton" --include='*.tsx' --include='*.ts'` (or use Grep tool).
Expected: identify every caller. If any callers exist, they currently pass no props — the default value below preserves their behavior.

- [ ] **Step 2: Update the component**

Replace `components/billing/SubscribeButton.tsx` with:

```tsx
'use client';

import { useState } from 'react';
import { useLocale, useTranslations } from 'next-intl';
import { Button } from '@/components/ui/button';
import type { SubscriptionTier } from '@/lib/stripe/tiers';

type Props = {
  tier?: SubscriptionTier;
};

export function SubscribeButton({ tier = 'vault' }: Props) {
  const t = useTranslations('billing');
  const locale = useLocale();
  const [loading, setLoading] = useState(false);

  async function handleSubscribe() {
    setLoading(true);
    try {
      const response = await fetch('/api/stripe/subscribe', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ locale, tier }),
      });
      const data = await response.json();
      if (data.url) {
        window.location.href = data.url;
        return;
      }
    } catch (err) {
      console.error('Subscribe failed:', err);
    } finally {
      setLoading(false);
    }
  }

  const label = tier === 'community' ? t('subscribe_community') : t('subscribe_vault');

  return (
    <Button variant="gold" onClick={handleSubscribe} disabled={loading}>
      {loading ? '...' : label}
    </Button>
  );
}
```

- [ ] **Step 3: Add the `subscribe_community` label if missing**

Open `messages/en.json` and `messages/ja.json`. Find the `billing` namespace and confirm both `subscribe_vault` and `subscribe_community` exist. If `subscribe_community` is missing, add:

EN: `"subscribe_community": "Subscribe to Community"`
JA: `"subscribe_community": "コミュニティに登録"`

- [ ] **Step 4: Type-check**

Run: `pnpm exec tsc --noEmit`
Expected: no new errors.

- [ ] **Step 5: Commit**

```bash
git add components/billing/SubscribeButton.tsx messages/en.json messages/ja.json
git commit -m "refactor(billing): SubscribeButton accepts tier prop"
```

---

## Task 8: Full regression pass + dev-server smoke test

**Files:** none — verification only.

- [ ] **Step 1: Run the full test suite**

Run: `pnpm exec vitest run`
Expected: all tests pass — no regressions in the existing partnerships/courses/library/marketing tests.

- [ ] **Step 2: Run the linter**

Run: `pnpm exec eslint .`
Expected: no new errors in the files touched.

- [ ] **Step 3: Run the type-checker**

Run: `pnpm exec tsc --noEmit`
Expected: no new errors.

- [ ] **Step 4: Build**

Run: `pnpm build`
Expected: build succeeds. Watch for warnings about the modified routes — any new warning about `app/api/stripe/subscribe/route.ts` must be understood before shipping.

- [ ] **Step 5: Smoke matrix in the dev server**

Run: `pnpm dev`

Walk through each row:

| Scenario | Steps | Expected landing |
|---|---|---|
| **Prefetch sanity** | Open `/learn` with DevTools Network filtered to "subscribe"; scroll pricing cards into view | **Zero requests to `/api/stripe/subscribe`** until an actual click |
| Logged-out, `/learn` Community card | Click "Join the Community" → sign up *new* account → click confirmation email | `/learn/dashboard?welcome=true` (NOT checkout — documented scope cut). Paywall available from dashboard. |
| Logged-out, `/learn` Community card | Click → sign in with *existing* unboarded-false account | Stripe Checkout (community, trial) |
| Logged-out, `/learn` Vault card | Click → sign in with existing account | Stripe Checkout (vault, no trial) |
| Logged-out, magic link | Click paywall → "email me a login link" → click email link | Stripe Checkout (resumed via hash handler) |
| Logged-in, no sub, paywall Community | Visit `/learn/dashboard/community` → click Community | Stripe Checkout (community, trial) |
| Logged-in, no sub, paywall Vault | Same page → click Vault | Stripe Checkout (vault, no trial) |
| Logged-in, **trialing** community sub, clicks Vault on paywall | — | 302 → `/learn/dashboard/billing?upgrade=true` |
| Logged-in, **cancelled-grace** vault sub | Visit `/api/stripe/subscribe?tier=community` | 302 → `/learn/dashboard/billing?upgrade=true` |
| Logged-in, cancelled-past-grace | Same | Stripe Checkout (sub allowed) |
| Logged-out, GET endpoint directly | Visit `/api/stripe/subscribe?tier=community` | 302 → `/learn/auth?redirect=%2Fapi%2Fstripe%2Fsubscribe%3Ftier%3Dcommunity` |
| Open-redirect attempt | Visit `/learn/auth?redirect=//evil.com` | After sign-in, lands on `/learn/dashboard` (NOT `//evil.com`) |
| Invalid tier | Visit `/api/stripe/subscribe?tier=enterprise` | 400 JSON error |
| JP locale, paywall | Visit `/ja/learn/dashboard/community` → click Community | Stripe Checkout with `locale=ja`, JP UI |
| Stripe webhook log noise | Trigger a `checkout.session.completed` for a subscription session in Stripe test mode | No "Missing user_id or course_id" line in server logs |

- [ ] **Step 6: Final commit if anything was tweaked, otherwise note completion**

If you adjusted anything during smoke testing, commit it. Otherwise:

```bash
git log --oneline -10
```

Confirm the new commits are present and push:

```bash
git push origin main
```

(Per [feedback_git_workflow](feedback_git_workflow.md) — commit directly to main; no PR.)

---

## Self-Review Notes (from the plan author)

- **Spec coverage:** Both visitor types (logged-in dashboard user, anonymous `/learn` browser) reach Stripe in ≤1 click after CTA, with pricing visible before they click.
- **Hardening invariants enforced:** (1) plain `<a>` not Link, verified in Tasks 4/5 with a Network-tab prefetch check; (2) `hasActiveSubscription` used for duplicate detection; (3) `sanitizeRedirect` allowlist used everywhere a redirect param is consumed; (4) magic-link + send-login-link + hash handler all forward redirect; (5) all commits land green — no red on `main`.
- **Reviewer feedback addressed:**
  - GET + Link prefetch → switched to plain `<a>`, added prefetch-sanity row to smoke matrix.
  - Trialing / cancelled-grace duplicate-sub gap → `hasActiveSubscription` covers these; dedicated tests in Task 2.
  - `//evil.com` open-redirect → `safe-redirect.ts` with allowlist + unit tests for protocol-relative, backslash, absolute, javascript: variants.
  - Magic-link / send-login-link redirect loss → Task 6 Steps 2-4 thread redirect through.
  - Webhook noise for subscription checkouts → Task 3 adds explicit branch + test.
  - Red commits on main → Tasks 0/2/3 all do red-locally then green-then-commit in one shot.
- **Reviewer feedback explicitly NOT actioned (with reasoning):**
  - Signup → resume-to-checkout: the callback's onboarded-false override is correct UX (WelcomeScreen first). Documented as scope cut in the plan header.
  - Tier upgrade UI: out of scope; Customer Portal handles proration. Existing subscribers route to `/learn/dashboard/billing?upgrade=true`.
- **Type consistency:** `SubscriptionTier` is imported from `lib/stripe/tiers` everywhere it appears; `parseTier` returns that narrowed type. The success-URL `tier=` value is the same string the metadata uses. The user-row SELECT in `fetchUserAccessRow` returns exactly the fields `hasActiveSubscription` needs.
- **`SubscribeButton`:** kept for back-compat. If a future audit shows no remaining callers, delete it then.
