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

describe('legacy $29 Community price (retired in 078)', () => {
  it('a STRIPE_COMMUNITY_PRICE_USD renewal still resolves to community', async () => {
    process.env.STRIPE_COMMUNITY_PRICE_USD = 'price_community_legacy';
    process.env.STRIPE_VAULT_PRICE_USD = 'price_vault_current';
    const { resolveSubscriptionTier, paymentTypeForRenewal, CHECKOUT_TIERS } =
      await import('@/lib/stripe/tiers');

    expect(resolveSubscriptionTier('price_community_legacy')).toBe('community');
    expect(paymentTypeForRenewal('community')).toBe('community_renewal');
    // Resolvable for renewals, but no longer sold.
    expect(CHECKOUT_TIERS).toEqual(['vault']);
  });
});
