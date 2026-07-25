/**
 * Admin partner-benefits editor.
 *
 * `stripe_coupon_id` is authoritative at checkout, so it is validated against
 * Stripe at save time — a coupon that does not exist, or is no longer valid, is
 * rejected here rather than discovered mid-checkout. When the coupon's percent
 * disagrees with the display percent we still save, and hand the UI a warning:
 * the two are allowed to diverge (fixed-amount coupons have no percent at all),
 * it just usually means a typo.
 */

import { NextResponse } from 'next/server';
import { z } from 'zod';
import { stripe } from '@/lib/stripe/client';
import {
  requirePartnerAdminRoute,
  rpcOutcomeResponse,
  invalidUuidResponse,
} from '@/lib/admin/partner-route-guard';

const PutSchema = z.object({
  course_discount_pct: z.number().min(0).max(100),
  // Stripe object ids are opaque; bound the shape without pretending to know it.
  stripe_coupon_id: z
    .string()
    .trim()
    .max(255)
    .regex(/^[A-Za-z0-9_\-.]+$/, 'Invalid coupon id')
    .nullable()
    .optional(),
  included_tier: z.enum(['community', 'vault']).nullable().optional(),
});

export async function GET(
  request: Request,
  { params }: { params: Promise<{ id: string }> },
) {
  const gate = await requirePartnerAdminRoute(request, { mutation: false });
  if (!gate.ok) return gate.response;

  const { id: partnerId } = await params;
  const badId = invalidUuidResponse({ partnerId });
  if (badId) return badId;

  const { data, error } = await gate.admin
    .from('partner_benefits')
    .select('partner_id, course_discount_pct, stripe_coupon_id, included_tier, updated_at')
    .eq('partner_id', partnerId)
    .maybeSingle();

  if (error) {
    console.error('[Admin/Partners/Benefits] load failed:', error);
    return NextResponse.json({ error: 'Failed to load benefits' }, { status: 500 });
  }

  return NextResponse.json({ benefits: data ?? null });
}

export async function PUT(
  request: Request,
  { params }: { params: Promise<{ id: string }> },
) {
  const gate = await requirePartnerAdminRoute(request, { mutation: true });
  if (!gate.ok) return gate.response;

  const { id: partnerId } = await params;
  const badId = invalidUuidResponse({ partnerId });
  if (badId) return badId;

  const parsed = PutSchema.safeParse(await request.json().catch(() => ({})));
  if (!parsed.success) {
    return NextResponse.json({ error: 'Invalid benefits payload' }, { status: 400 });
  }

  const couponId = parsed.data.stripe_coupon_id?.trim() || null;
  let warning: string | null = null;

  if (couponId) {
    try {
      const coupon = await stripe.coupons.retrieve(couponId);
      if (!coupon.valid) {
        return NextResponse.json(
          { error: 'That Stripe coupon exists but is no longer valid' },
          { status: 400 },
        );
      }
      if (
        typeof coupon.percent_off === 'number' &&
        Math.abs(coupon.percent_off - parsed.data.course_discount_pct) > 0.01
      ) {
        warning = `Stripe coupon is ${coupon.percent_off}% off but the displayed discount is ${parsed.data.course_discount_pct}%.`;
      }
      if (coupon.percent_off === null) {
        warning = 'This is a fixed-amount coupon — the displayed percentage is decorative.';
      }
    } catch (error) {
      console.error('[Admin/Partners/Benefits] coupon lookup failed:', error);
      return NextResponse.json(
        { error: 'No such coupon in Stripe — check the id' },
        { status: 400 },
      );
    }
  }

  const { data, error } = await gate.admin.rpc('update_partner_benefits', {
    p_partner_id: partnerId,
    p_course_discount_pct: parsed.data.course_discount_pct,
    p_stripe_coupon_id: couponId,
    p_included_tier: parsed.data.included_tier ?? null,
    p_actor_id: gate.actorId,
    p_audit_source: 'admin',
  });

  if (error) {
    console.error('[Admin/Partners/Benefits] update_partner_benefits failed:', error);
    return NextResponse.json({ error: 'Failed to save benefits' }, { status: 500 });
  }

  const outcome = (data as { outcome?: string } | null)?.outcome ?? 'invalid';
  const failure = rpcOutcomeResponse(outcome);
  if (failure) return failure;

  return NextResponse.json({ ...(data as object), warning });
}
