// @vitest-environment node
import { beforeEach, describe, expect, it, vi } from 'vitest';
import { NextRequest } from 'next/server';
const mocks = vi.hoisted(() => ({
  checkout: vi.fn(), tables: [] as string[], enrollment: null as { id: string } | null,
  statuses: vi.fn(), authenticated: true,
}));
vi.mock('@/lib/stripe/client', () => ({ stripe: { checkout: { sessions: { create: mocks.checkout } } } }));
vi.mock('@/lib/partner-attribution', () => ({ getAttributedPartnerSlug: async () => null }));
vi.mock('@/lib/analytics-server', () => ({ trackServerEvent: vi.fn(), serverEventContextFromRequest: () => ({}) }));
vi.mock('@/lib/partners/benefits', () => ({ resolveCheckoutDiscount: async () => ({ couponId: null }), isCouponRejection: () => false, logBenefitCouponFailure: vi.fn() }));
vi.mock('@/lib/supabase/server', () => ({
  createAdminClient: () => ({}),
  createClient: async () => ({
    auth: { getUser: async () => ({ data: { user: mocks.authenticated ? { id: 'buyer', email: 'test@example.test' } : null }, error: null }) },
    from: (table: string) => {
      mocks.tables.push(table);
      if (!['course_catalog', 'enrollments'].includes(table)) throw new Error(`Unexpected table: ${table}`);
      const query = {
        select: () => query, eq: () => query,
        in: (...args: unknown[]) => { mocks.statuses(...args); return query; },
        single: async () => ({ data: { id: 'unlisted', slug: 'unlisted-course', title_en: 'Private course', title_jp: '限定講座', is_published: true, is_private: true, price_usd: 1500, price_jpy: 2000, current_enrollment: 0, max_enrollment: 20 }, error: null }),
        maybeSingle: async () => ({ data: mocks.enrollment, error: null }),
      };
      return query;
    },
  }),
}));
import { POST as checkout } from '@/app/api/stripe/checkout/route';
import { POST as embedded } from '@/app/api/stripe/checkout-embed/route';
beforeEach(() => {
  vi.clearAllMocks(); mocks.tables = []; mocks.enrollment = null; mocks.authenticated = true;
  mocks.checkout.mockResolvedValue({ url: 'https://checkout.stripe.test/session', client_secret: 'test-secret' });
});
describe.each([['hosted', checkout], ['embedded', embedded]] as const)('%s checkout compatibility', (_name, route) => {
  it.each(['en','ja'])('allows unlisted published courses by ID in %s', async locale => {
    const result = await route(new NextRequest('http://localhost/api/stripe/checkout', { method: 'POST', body: JSON.stringify({ courseId: 'unlisted', locale }) }));
    expect(result.status).toBe(200);
    expect(mocks.tables).toContain('course_catalog');
    expect(mocks.checkout.mock.calls[0][0].line_items[0].price_data).toMatchObject({ currency: locale === 'ja' ? 'jpy' : 'usd', unit_amount: locale === 'ja' ? 2000 : 1500 });
  });
  it('does not charge an existing active or completed learner again', async () => {
    mocks.enrollment = { id: 'already-owned' };
    const result = await route(new NextRequest('http://localhost/api/stripe/checkout', { method: 'POST', body: JSON.stringify({ courseId: 'unlisted', locale: 'en' }) }));
    expect(result.status).toBe(400);
    expect(mocks.statuses).toHaveBeenCalledWith('status', ['active','completed']);
    expect(mocks.checkout).not.toHaveBeenCalled();
  });
  it('requires authentication before looking up a course', async () => {
    mocks.authenticated = false;
    const result = await route(new NextRequest('http://localhost/api/stripe/checkout', { method: 'POST', body: '{}' }));
    expect(result.status).toBe(401); expect(mocks.tables).toEqual([]);
  });
});
