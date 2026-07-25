/**
 * Partner benefits at checkout.
 *
 * `partner_benefits.stripe_coupon_id` is AUTHORITATIVE — `course_discount_pct`
 * is display metadata and is never used for price math.
 *
 * EXPAND PHASE: the Vertice special-cases are deliberately still here. The
 * `STRIPE_VERTICE_COUPON_ID` env var stays the runtime fallback (migration 064
 * backfills Vertice with a NULL coupon id on purpose, to keep the migration
 * secret-free), and the legacy `users.is_vertice_member` flag still qualifies a
 * user on its own. Both are removed in the later contract deploy, not here.
 *
 * Every lookup here uses a SERVICE-ROLE client: `partner_benefits` is readable
 * only by HonuVibe admins and partner admins under RLS, so a member's own
 * session cannot see its own perks.
 */

import type { SupabaseClient } from '@supabase/supabase-js';

export type CheckoutDiscount = {
  /** Stripe coupon id to apply, or null for full price. */
  couponId: string | null;
  /** Partner the coupon came from — needed to audit a stale-coupon failure. */
  partnerId: string | null;
  partnerSlug: string | null;
};

const EMPTY: CheckoutDiscount = { couponId: null, partnerId: null, partnerSlug: null };

/**
 * Resolve the course-checkout discount for a user.
 *
 * Order: active membership on an ACTIVE partner → that partner's coupon
 * (falling back to the Vertice env var while the contract deploy is pending)
 * → legacy `is_vertice_member` flag → no discount.
 */
export async function resolveCheckoutDiscount(
  admin: SupabaseClient,
  userId: string,
): Promise<CheckoutDiscount> {
  const verticeCoupon = process.env.STRIPE_VERTICE_COUPON_ID ?? null;

  const { data: membership, error: membershipError } = await admin
    .from('partner_members')
    .select('partner_id, partners:partner_id ( id, slug, is_active )')
    .eq('user_id', userId)
    .eq('status', 'active')
    .maybeSingle();

  if (membershipError) {
    console.error('[partner-benefits] membership lookup failed:', membershipError.message);
  }

  type PartnerRef = { id: string; slug: string; is_active: boolean } | null;
  const partner = (membership?.partners ?? null) as unknown as PartnerRef;

  if (partner?.is_active) {
    const { data: benefits } = await admin
      .from('partner_benefits')
      .select('stripe_coupon_id')
      .eq('partner_id', partner.id)
      .maybeSingle();

    const couponId =
      benefits?.stripe_coupon_id ??
      (partner.slug === 'vertice-society' ? verticeCoupon : null);

    if (couponId) {
      return { couponId, partnerId: partner.id, partnerSlug: partner.slug };
    }
  }

  // Legacy path — a Vertice member who predates partner_members, or whose
  // membership row was removed but whose flag was not. Removed at contract.
  const { data: profile } = await admin
    .from('users')
    .select('is_vertice_member')
    .eq('id', userId)
    .maybeSingle();

  if (profile?.is_vertice_member === true && verticeCoupon) {
    return { couponId: verticeCoupon, partnerId: null, partnerSlug: 'vertice-society' };
  }

  return EMPTY;
}

/**
 * True when Stripe rejected session creation because of the coupon we attached
 * (deleted, expired, or inapplicable), rather than for some unrelated reason.
 */
export function isCouponRejection(error: unknown): boolean {
  if (!error || typeof error !== 'object') return false;
  const err = error as { type?: string; param?: string; message?: string; code?: string };
  if (err.type !== 'StripeInvalidRequestError') return false;

  const haystack = `${err.param ?? ''} ${err.message ?? ''}`.toLowerCase();
  return (
    haystack.includes('coupon') ||
    haystack.includes('discount') ||
    haystack.includes('promotion')
  );
}

/**
 * Record a stale/invalid coupon so an admin can fix it.
 *
 * This CANNOT be atomic with the Stripe call — Stripe is an external service —
 * so it is a standalone `log_partner_audit` RPC. If the audit write itself
 * fails we emit a structured error log as the fallback signal and let checkout
 * continue: a member paying full price beats a member who cannot buy at all.
 */
export async function logBenefitCouponFailure(
  admin: SupabaseClient,
  params: { partnerId: string | null; couponId: string; reason: string },
): Promise<void> {
  const { partnerId, couponId, reason } = params;

  if (!partnerId) {
    console.error('[partner-benefits] benefit_coupon_failed (no partner row)', {
      couponId,
      reason,
    });
    return;
  }

  const { error } = await admin.rpc('log_partner_audit', {
    p_partner_id: partnerId,
    p_audit_source: 'system',
    p_action: 'benefit_coupon_failed',
    p_actor_id: null,
    p_target_type: 'partner',
    p_target_id: partnerId,
    p_target_email: null,
    p_old_value: null,
    p_new_value: { stripe_coupon_id: couponId },
    p_correlation_id: null,
    p_reason: reason.slice(0, 500),
  });

  if (error) {
    console.error('[partner-benefits] benefit_coupon_failed audit write failed', {
      partnerId,
      couponId,
      reason,
      error: error.message,
    });
  }
}
