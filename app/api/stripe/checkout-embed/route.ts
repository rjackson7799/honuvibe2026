import { NextRequest, NextResponse } from 'next/server';
import { stripe } from '@/lib/stripe/client';
import { createClient } from '@/lib/supabase/server';

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
        'id, slug, title_en, title_jp, price_usd, price_jpy, max_enrollment, current_enrollment, is_published, format',
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

    // Check Vertice Society membership for automatic discount
    const { data: userProfile } = await supabase
      .from('users')
      .select('is_vertice_member')
      .eq('id', user.id)
      .single();

    const verticeCouponId = process.env.STRIPE_VERTICE_COUPON_ID;
    const isVerticeMember = userProfile?.is_vertice_member === true;
    const discounts =
      isVerticeMember && verticeCouponId
        ? [{ coupon: verticeCouponId }]
        : undefined;

    // Determine currency and price based on locale, falling back to USD if no JPY price set
    const isJapanese = locale === 'ja';
    const useJpy = isJapanese && !!course.price_jpy;
    const currency = useJpy ? 'jpy' : 'usd';
    const unitAmount = useJpy ? course.price_jpy : course.price_usd;

    if (!unitAmount || unitAmount <= 0) {
      return NextResponse.json(
        { error: 'Course has no price configured' },
        { status: 400 },
      );
    }

    const courseTitle = isJapanese
      ? (course.title_jp ?? course.title_en)
      : course.title_en;

    // One-line description shown inside the Stripe payment form. Only set it for
    // formats that actually include live cohort sessions — a recorded-only course
    // must not claim "live".
    const includeDescription =
      course.format === 'live' || course.format === 'hybrid';
    const productDescription = includeDescription
      ? isJapanese
        ? `${courseTitle} — HonuVibeのライブ講座。実際にAIで作っている実務家から、少人数で学べます。全授業の録画付き。`
        : `${courseTitle} — a live, cohort-based AI course from HonuVibe, taught by people who build with AI every day. Recordings included.`
      : undefined;

    // Build origin for return URL
    const origin =
      request.headers.get('origin') ??
      process.env.NEXT_PUBLIC_SITE_URL ??
      'http://localhost:3000';

    const localePrefix = isJapanese ? '/ja' : '';

    // Create Stripe Embedded Checkout Session
    const session = await stripe.checkout.sessions.create({
      ui_mode: 'embedded',
      mode: 'payment',
      customer_email: user.email ?? undefined,
      line_items: [
        {
          price_data: {
            currency,
            product_data: {
              name: courseTitle,
              ...(productDescription
                ? { description: productDescription }
                : {}),
              metadata: { course_id: courseId },
            },
            unit_amount: unitAmount,
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
      },
      // Apply Vertice Society discount if applicable.
      // Note: discounts and allow_promotion_codes are mutually exclusive in Stripe.
      ...(discounts ? { discounts } : { allow_promotion_codes: true }),
      return_url: `${origin}${localePrefix}/learn/${course.slug}/checkout/return?session_id={CHECKOUT_SESSION_ID}`,
      locale: isJapanese ? 'ja' : 'en',
    });

    return NextResponse.json({ clientSecret: session.client_secret });
  } catch (error) {
    console.error('[Stripe Embedded Checkout] Error:', error);
    return NextResponse.json(
      { error: 'Failed to create checkout session' },
      { status: 500 },
    );
  }
}
