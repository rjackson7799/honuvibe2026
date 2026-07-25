import { NextRequest, NextResponse } from 'next/server';
import type Stripe from 'stripe';
import { stripe } from '@/lib/stripe/client';
import { createClient, createAdminClient } from '@/lib/supabase/server';
import { getAttributedPartnerSlug } from '@/lib/partner-attribution';
import {
  resolveCheckoutDiscount,
  isCouponRejection,
  logBenefitCouponFailure,
} from '@/lib/partners/benefits';
import {
  trackServerEvent,
  serverEventContextFromRequest,
} from '@/lib/analytics-server';

export async function POST(request: NextRequest) {
  try {
    const supabase = await createClient();

    // Authenticate user
    const {
      data: { user },
      error: authError,
    } = await supabase.auth.getUser();
    if (authError || !user) {
      return NextResponse.json({ error: 'Not authenticated' }, { status: 401 });
    }

    // Parse request body
    const { courseId, locale } = (await request.json()) as {
      courseId: string;
      locale: string;
    };

    if (!courseId) {
      return NextResponse.json(
        { error: 'courseId is required' },
        { status: 400 },
      );
    }

    // Fetch course from DB
    const { data: course, error: courseError } = await supabase
      .from('courses')
      .select(
        'id, slug, title_en, title_jp, price_usd, price_jpy, max_enrollment, current_enrollment, is_published',
      )
      .eq('id', courseId)
      .single();

    if (courseError || !course) {
      return NextResponse.json({ error: 'Course not found' }, { status: 404 });
    }

    if (!course.is_published) {
      return NextResponse.json(
        { error: 'Course is not available' },
        { status: 400 },
      );
    }

    // Check capacity
    if (
      course.max_enrollment &&
      course.current_enrollment >= course.max_enrollment
    ) {
      return NextResponse.json({ error: 'Course is full' }, { status: 400 });
    }

    // Check for existing enrollment
    const { data: existing } = await supabase
      .from('enrollments')
      .select('id')
      .eq('user_id', user.id)
      .eq('course_id', courseId)
      .eq('status', 'active')
      .maybeSingle();

    if (existing) {
      return NextResponse.json(
        { error: 'Already enrolled' },
        { status: 400 },
      );
    }

    // Partner benefits — the member's active partner supplies the coupon
    // (Vertice env fallback + legacy is_vertice_member flag still honored
    // during the expand phase). Service role: partner_benefits is not readable
    // by the member's own session under RLS.
    const adminSupabase = createAdminClient();
    const discount = await resolveCheckoutDiscount(adminSupabase, user.id);
    const discounts = discount.couponId
      ? [{ coupon: discount.couponId }]
      : undefined;

    // Determine currency and price based on locale
    const isJapanese = locale === 'ja';
    const currency = isJapanese ? 'jpy' : 'usd';
    const unitAmount = isJapanese ? course.price_jpy : course.price_usd;

    if (!unitAmount || unitAmount <= 0) {
      return NextResponse.json(
        { error: 'Course has no price configured' },
        { status: 400 },
      );
    }

    const courseTitle = isJapanese
      ? (course.title_jp ?? course.title_en)
      : course.title_en;

    // Build origin for success/cancel URLs
    const origin =
      request.headers.get('origin') ??
      process.env.NEXT_PUBLIC_SITE_URL ??
      'http://localhost:3000';

    const localePrefix = isJapanese ? '/ja' : '';

    // Partner attribution — read hv_partner cookie set by /partners/[slug]
    const partnerSlug = await getAttributedPartnerSlug();

    // Create Stripe Checkout Session
    const baseParams: Stripe.Checkout.SessionCreateParams = {
      mode: 'payment',
      customer_email: user.email ?? undefined,
      line_items: [
        {
          price_data: {
            currency,
            product_data: {
              name: courseTitle,
              metadata: { course_id: courseId },
            },
            unit_amount: unitAmount, // USD in cents, JPY in yen (zero-decimal)
          },
          quantity: 1,
        },
      ],
      metadata: {
        user_id: user.id,
        course_id: courseId,
        course_slug: course.slug,
        currency,
        locale,
        ...(partnerSlug ? { partner_slug: partnerSlug } : {}),
      },
      success_url: `${origin}${localePrefix}/learn/dashboard/${course.slug}?enrolled=true`,
      cancel_url: `${origin}${localePrefix}/learn/${course.slug}`,
      locale: isJapanese ? 'ja' : 'en',
    };

    // Note: discounts and allow_promotion_codes are mutually exclusive in Stripe.
    let session;
    try {
      session = await stripe.checkout.sessions.create({
        ...baseParams,
        ...(discounts ? { discounts } : { allow_promotion_codes: true }),
      });
    } catch (error) {
      // Stale coupon (deleted / expired / inapplicable): retry ONCE at full
      // price so checkout never blocks, and audit the failure so an admin can
      // fix the partner's coupon. The member pays full price rather than being
      // unable to buy at all.
      if (!discounts || !isCouponRejection(error)) throw error;

      await logBenefitCouponFailure(adminSupabase, {
        partnerId: discount.partnerId,
        couponId: discount.couponId!,
        reason: error instanceof Error ? error.message : 'Stripe rejected the coupon',
      });

      session = await stripe.checkout.sessions.create({
        ...baseParams,
        allow_promotion_codes: true,
      });
    }

    // Funnel: checkout initiated (server-side, captures abandons too).
    await trackServerEvent('checkout_started', {
      ...serverEventContextFromRequest(request),
      props: { kind: 'course', currency, slug_or_tier: course.slug },
    });

    return NextResponse.json({ url: session.url });
  } catch (error) {
    console.error('[Stripe Checkout] Error:', error);
    return NextResponse.json(
      { error: 'Failed to create checkout session' },
      { status: 500 },
    );
  }
}
