import { describe, it, expect, vi, beforeEach } from 'vitest';

const { sessionsCreateMock, findCustomerMock } = vi.hoisted(() => ({
  sessionsCreateMock: vi.fn(),
  findCustomerMock: vi.fn(),
}));

vi.mock('@/lib/stripe/client', () => ({
  stripe: { checkout: { sessions: { create: sessionsCreateMock } } },
}));

vi.mock('@/lib/partner-checkout/fulfill', () => ({
  findReusableStripeCustomerByEmail: findCustomerMock,
}));

import { POST } from '@/app/api/stripe/partner-checkout/route';

function makePost(body: unknown): Request {
  return new Request('http://localhost/api/stripe/partner-checkout', {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify(body),
  });
}

const base = { email: 'a@b.com', locale: 'ja', partnerSlug: 'vertice-society' };

beforeEach(() => {
  process.env.STRIPE_COMMUNITY_PRICE_USD = 'price_community_test';
  process.env.STRIPE_VAULT_PRICE_USD = 'price_vault_test';
  sessionsCreateMock.mockReset().mockResolvedValue({ url: 'https://checkout.stripe.com/c/x' });
  findCustomerMock.mockReset().mockResolvedValue(null);
});

describe('POST /api/stripe/partner-checkout — tiers (D1)', () => {
  it('rejects a NEW community checkout (Community is free since 078)', async () => {
    const res = await POST(makePost({ ...base, tier: 'community' }) as never);

    expect(res.status).toBe(400);
    expect(sessionsCreateMock).not.toHaveBeenCalled();
  });

  it('still starts a vault checkout', async () => {
    const res = await POST(makePost({ ...base, tier: 'vault' }) as never);

    expect(res.status).toBe(200);
    expect(sessionsCreateMock).toHaveBeenCalledTimes(1);
    expect(sessionsCreateMock.mock.calls[0][0].line_items[0].price).toBe('price_vault_test');
  });
});
