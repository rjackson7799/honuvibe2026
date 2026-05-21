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
      makeRequest('http://localhost/api/stripe/subscribe?tier=community') as never,
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

    const res = await GET(makeRequest('http://localhost/api/stripe/subscribe') as never);

    expect(res.status).toBe(400);
  });

  it('returns 400 for invalid tier', async () => {
    getUserMock.mockResolvedValue({
      data: { user: { id: 'u1', email: 'a@b.com' } },
      error: null,
    });

    const res = await GET(
      makeRequest('http://localhost/api/stripe/subscribe?tier=enterprise') as never,
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
      makeRequest('http://localhost/api/stripe/subscribe?tier=vault') as never,
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
      makeRequest('http://localhost/api/stripe/subscribe?tier=vault') as never,
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
      makeRequest('http://localhost/api/stripe/subscribe?tier=community') as never,
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
      makeRequest('http://localhost/api/stripe/subscribe?tier=vault') as never,
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
      makeRequest('http://localhost/api/stripe/subscribe?tier=community') as never,
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
      makeRequest('http://localhost/api/stripe/subscribe?tier=vault') as never,
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
      ) as never,
    );

    const args = sessionsCreateMock.mock.calls[0][0];
    expect(args.success_url).toContain('/ja/learn/dashboard/billing');
    expect(args.cancel_url).toContain('/ja/learn/dashboard/billing');
    expect(args.locale).toBe('ja');
    expect(res.status).toBe(302);
  });
});
