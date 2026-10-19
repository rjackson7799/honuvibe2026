// @vitest-environment node
import { beforeEach, describe, expect, it, vi } from 'vitest';
import { NextRequest } from 'next/server';

const mocks = vi.hoisted(() => ({
  checkout: vi.fn(),
  checkVaultAccess: vi.fn(),
  vaultIncluded: true,
}));

vi.mock('@/lib/stripe/client', () => ({ stripe: { checkout: { sessions: { create: mocks.checkout } } } }));
vi.mock('@/lib/partner-attribution', () => ({ getAttributedPartnerSlug: async () => null }));
vi.mock('@/lib/analytics-server', () => ({ trackServerEvent: vi.fn(), serverEventContextFromRequest: () => ({}) }));
vi.mock('@/lib/partners/benefits', () => ({ resolveCheckoutDiscount: async () => ({ couponId: null }), isCouponRejection: () => false, logBenefitCouponFailure: vi.fn() }));
vi.mock('@/lib/vault/access', () => ({ checkVaultAccess: mocks.checkVaultAccess }));
vi.mock('@/lib/supabase/server', () => ({
  createAdminClient: () => ({}),
  createClient: async () => ({
    auth: { getUser: async () => ({ data: { user: { id: 'member', email: 'member@example.test' } }, error: null }) },
    from: (table: string) => {
      if (!['course_catalog', 'enrollments'].includes(table)) throw new Error(`Unexpected table: ${table}`);
      const query = {
        select: () => query, eq: () => query, in: () => query,
        single: async () => ({ data: { id: 'self-study', slug: 'self-study', title_en: 'Self-study', title_jp: null, is_published: true, vault_included: mocks.vaultIncluded, price_usd: 4900, price_jpy: 7000, current_enrollment: 0, max_enrollment: null, format: 'recorded' }, error: null }),
        // No enrollment: the member reads through the Vault, not a purchase.
        maybeSingle: async () => ({ data: null, error: null }),
      };
      return query;
    },
  }),
}));

import { POST as checkout } from '@/app/api/stripe/checkout/route';
import { POST as embedded } from '@/app/api/stripe/checkout-embed/route';

const vaultMember = { hasAccess: true, source: 'subscription', subscriptionStatus: 'active', activeCourseName: null, sponsor: null };
const request = () =>
  new NextRequest('http://localhost/api/stripe/checkout', { method: 'POST', body: JSON.stringify({ courseId: 'self-study', locale: 'en' }) });

beforeEach(() => {
  vi.clearAllMocks();
  mocks.vaultIncluded = true;
  mocks.checkVaultAccess.mockResolvedValue(vaultMember);
  mocks.checkout.mockResolvedValue({ url: 'https://checkout.stripe.test/session', client_secret: 'test-secret' });
});

describe.each([['checkout', checkout], ['checkout-embed', embedded]] as const)('%s (B3 D9)', (name, route) => {
  it(`${name} returns 409 included_in_vault for a Vault member on an included course`, async () => {
    const result = await route(request());
    expect(result.status).toBe(409);
    expect(await result.json()).toEqual({ error: 'included_in_vault' });
    expect(mocks.checkout).not.toHaveBeenCalled();
  });

  it(`${name} still creates a session for a Vault member on a non-included course`, async () => {
    mocks.vaultIncluded = false;
    const result = await route(request());
    expect(result.status).toBe(200);
    expect(mocks.checkout).toHaveBeenCalledTimes(1);
    expect(mocks.checkVaultAccess).not.toHaveBeenCalled();
  });

  it(`${name} lets a non-member buy an included course`, async () => {
    mocks.checkVaultAccess.mockResolvedValue({ ...vaultMember, hasAccess: false, source: null });
    const result = await route(request());
    expect(result.status).toBe(200);
    expect(mocks.checkout).toHaveBeenCalledTimes(1);
  });
});
