import { describe, it, expect, beforeEach, afterEach, vi } from 'vitest';
import type { SupabaseClient } from '@supabase/supabase-js';
import {
  resolveCheckoutDiscount,
  isCouponRejection,
  logBenefitCouponFailure,
} from '@/lib/partners/benefits';

/**
 * A minimal stand-in for the service-role client. Only the three shapes
 * resolveCheckoutDiscount actually uses are modelled — anything else throws, so
 * a query the implementation adds later cannot silently pass these tests.
 */
type Tables = {
  partner_members?: unknown;
  partner_benefits?: unknown;
  users?: unknown;
};

function fakeAdmin(tables: Tables, rpc = vi.fn().mockResolvedValue({ error: null })) {
  const client = {
    rpc,
    from(table: string) {
      if (!(table in tables)) {
        throw new Error(`Unexpected query against ${table}`);
      }
      const result = { data: tables[table as keyof Tables] ?? null, error: null };
      const chain = {
        select: () => chain,
        eq: () => chain,
        maybeSingle: () => Promise.resolve(result),
        then: (fn: (r: typeof result) => unknown) => Promise.resolve(result).then(fn),
      };
      return chain;
    },
  };
  return client as unknown as SupabaseClient & { rpc: typeof rpc };
}

const ORIGINAL_ENV = process.env.STRIPE_VERTICE_COUPON_ID;

afterEach(() => {
  if (ORIGINAL_ENV === undefined) delete process.env.STRIPE_VERTICE_COUPON_ID;
  else process.env.STRIPE_VERTICE_COUPON_ID = ORIGINAL_ENV;
  vi.restoreAllMocks();
});

describe('resolveCheckoutDiscount', () => {
  beforeEach(() => {
    delete process.env.STRIPE_VERTICE_COUPON_ID;
  });

  it('uses the active partner’s own coupon', async () => {
    const admin = fakeAdmin({
      partner_members: {
        partner_id: 'p1',
        partners: { id: 'p1', slug: 'smashhaus', is_active: true },
      },
      partner_benefits: { stripe_coupon_id: 'PARTNER_COUPON' },
    });

    expect(await resolveCheckoutDiscount(admin, 'u1')).toEqual({
      couponId: 'PARTNER_COUPON',
      partnerId: 'p1',
      partnerSlug: 'smashhaus',
    });
  });

  it('falls back to the Vertice env coupon while the coupon id is still NULL (expand phase)', async () => {
    process.env.STRIPE_VERTICE_COUPON_ID = 'ENV_VERTICE';
    const admin = fakeAdmin({
      partner_members: {
        partner_id: 'v1',
        partners: { id: 'v1', slug: 'vertice-society', is_active: true },
      },
      partner_benefits: { stripe_coupon_id: null },
    });

    expect(await resolveCheckoutDiscount(admin, 'u1')).toEqual({
      couponId: 'ENV_VERTICE',
      partnerId: 'v1',
      partnerSlug: 'vertice-society',
    });
  });

  it('does NOT lend the Vertice env coupon to another partner', async () => {
    process.env.STRIPE_VERTICE_COUPON_ID = 'ENV_VERTICE';
    const admin = fakeAdmin({
      partner_members: {
        partner_id: 'p1',
        partners: { id: 'p1', slug: 'smashhaus', is_active: true },
      },
      partner_benefits: { stripe_coupon_id: null },
      users: { is_vertice_member: false },
    });

    expect((await resolveCheckoutDiscount(admin, 'u1')).couponId).toBeNull();
  });

  it('refuses a deactivated partner’s benefits', async () => {
    const admin = fakeAdmin({
      partner_members: {
        partner_id: 'p1',
        partners: { id: 'p1', slug: 'smashhaus', is_active: false },
      },
      users: { is_vertice_member: false },
    });

    expect(await resolveCheckoutDiscount(admin, 'u1')).toEqual({
      couponId: null,
      partnerId: null,
      partnerSlug: null,
    });
  });

  it('honours the legacy is_vertice_member flag with no membership row (Vertice regression)', async () => {
    process.env.STRIPE_VERTICE_COUPON_ID = 'ENV_VERTICE';
    const admin = fakeAdmin({
      partner_members: null,
      users: { is_vertice_member: true },
    });

    expect(await resolveCheckoutDiscount(admin, 'u1')).toEqual({
      couponId: 'ENV_VERTICE',
      partnerId: null,
      partnerSlug: 'vertice-society',
    });
  });

  it('gives no discount when the legacy flag is set but the env var is missing', async () => {
    const admin = fakeAdmin({
      partner_members: null,
      users: { is_vertice_member: true },
    });
    expect((await resolveCheckoutDiscount(admin, 'u1')).couponId).toBeNull();
  });

  it('gives no discount to a plain non-member', async () => {
    const admin = fakeAdmin({ partner_members: null, users: { is_vertice_member: false } });
    expect((await resolveCheckoutDiscount(admin, 'u1')).couponId).toBeNull();
  });
});

describe('isCouponRejection', () => {
  const stripeError = (over: Record<string, unknown>) => ({
    type: 'StripeInvalidRequestError',
    ...over,
  });

  it('matches the real shapes Stripe returns for a bad coupon', () => {
    expect(
      isCouponRejection(
        stripeError({ param: 'discounts[0][coupon]', message: 'No such coupon: abc' }),
      ),
    ).toBe(true);
    expect(
      isCouponRejection(stripeError({ message: 'This coupon has expired.' })),
    ).toBe(true);
    expect(
      isCouponRejection(
        stripeError({ message: 'This promotion code cannot be applied.' }),
      ),
    ).toBe(true);
    expect(
      isCouponRejection(stripeError({ param: 'discounts', message: 'Invalid discount' })),
    ).toBe(true);
  });

  it('does NOT swallow an unrelated Stripe request error', () => {
    expect(
      isCouponRejection(
        stripeError({ param: 'line_items[0][price_data][unit_amount]', message: 'Invalid integer' }),
      ),
    ).toBe(false);
  });

  it('does not treat other Stripe error types, or non-errors, as coupon failures', () => {
    expect(isCouponRejection({ type: 'StripeAPIError', message: 'coupon' })).toBe(false);
    expect(isCouponRejection(new Error('coupon'))).toBe(false);
    expect(isCouponRejection(null)).toBe(false);
    expect(isCouponRejection('coupon')).toBe(false);
  });
});

describe('logBenefitCouponFailure', () => {
  it('writes the audit row through the RPC, never a direct table insert', async () => {
    const rpc = vi.fn().mockResolvedValue({ error: null });
    const admin = fakeAdmin({}, rpc);

    await logBenefitCouponFailure(admin, {
      partnerId: 'p1',
      couponId: 'DEAD',
      reason: 'No such coupon',
    });

    expect(rpc).toHaveBeenCalledWith(
      'log_partner_audit',
      expect.objectContaining({
        p_partner_id: 'p1',
        p_action: 'benefit_coupon_failed',
        p_audit_source: 'system',
        p_new_value: { stripe_coupon_id: 'DEAD' },
      }),
    );
  });

  it('falls back to a structured log when there is no partner row to audit against', async () => {
    const rpc = vi.fn();
    const admin = fakeAdmin({}, rpc);
    const spy = vi.spyOn(console, 'error').mockImplementation(() => {});

    await logBenefitCouponFailure(admin, {
      partnerId: null,
      couponId: 'ENV_VERTICE',
      reason: 'No such coupon',
    });

    expect(rpc).not.toHaveBeenCalled();
    expect(spy).toHaveBeenCalled();
  });

  it('never throws when the audit write itself fails — checkout must still complete', async () => {
    const rpc = vi.fn().mockResolvedValue({ error: { message: 'db down' } });
    const admin = fakeAdmin({}, rpc);
    vi.spyOn(console, 'error').mockImplementation(() => {});

    await expect(
      logBenefitCouponFailure(admin, {
        partnerId: 'p1',
        couponId: 'DEAD',
        reason: 'boom',
      }),
    ).resolves.toBeUndefined();
  });
});
