import { NextRequest, NextResponse } from 'next/server';
import { stripe } from '@/lib/stripe/client';
import { createClient } from '@/lib/supabase/server';

export async function POST(request: NextRequest) {
  try {
    const supabase = await createClient();

    // Authenticate
    const {
      data: { user },
      error: authError,
    } = await supabase.auth.getUser();
    if (authError || !user) {
      return NextResponse.json({ error: 'Not authenticated' }, { status: 401 });
    }

    const { courseId, locale } = (await request.json()) as {
      courseId: string;
      locale: string;
    };

    if (!courseId) {
      return NextResponse.json({ error: 'courseId is required' }, { status: 400 });
    }

    // Fetch course
    const { data: course } = await supabase
      .from('courses')
      .select('id, slug, title_en, title_jp, esl_enabled, esl_included, esl_price_usd, esl_price_jpy')
      .eq('id', courseId)
      .single();

    if (!course) {
      return NextResponse.json({ error: 'Course not found' }, { status: 404 });
    }

    if (!course.esl_enabled) {
      return NextResponse.json({ error: 'ESL not available for this course' }, { status: 400 });
    }

    if (course.esl_included) {
      return NextResponse.json({ error: 'ESL is already included with enrollment' }, { status: 400 });
    }

    // Check for existing purchase (idempotency)
    const { data: existingPurchase } = await supabase
      .from('esl_purchases')
      .select('id')
      .eq('user_id', user.id)
      .eq('course_id', courseId)
      .maybeSingle();

    if (existingPurchase) {
      return NextResponse.json({ error: 'ESL already purchased' }, { status: 400 });
    }

    // Determine currency and price
    const isJapanese = locale === 'ja';
    const currency = isJapanese ? 'jpy' : 'usd';
    const unitAmount = isJapanese ? course.esl_price_jpy : course.esl_price_usd;

    if (!unitAmount || unitAmount <= 0) {
      return NextResponse.json({ error: 'ESL price not configured' }, { status: 400 });
    }

    const courseTitle = isJapanese
      ? (course.title_jp ?? course.title_en)
      : course.title_en;

    const origin =
      request.headers.get('origin') ??
      process.env.NEXT_PUBLIC_SITE_URL ??
      'http://localhost:3000';

    const localePrefix = isJapanese ? '/ja' : '';

    // Create Stripe Checkout Session
    const session = await stripe.checkout.sessions.create({
      mode: 'payment',
      customer_email: user.email ?? undefined,
      line_items: [
        {
          price_data: {
            currency,
            product_data: {
              name: `English Study Add-On — ${courseTitle}`,
              metadata: { course_id: courseId, type: 'esl_addon' },
            },
            unit_amount: unitAmount,
          },
          quantity: 1,
        },
      ],
      metadata: {
        type: 'esl_addon',
        user_id: user.id,
        course_id: courseId,
        course_slug: course.slug,
        currency,
        locale,
      },
      success_url: `${origin}${localePrefix}/learn/dashboard/${course.slug}?esl=unlocked`,
      cancel_url: `${origin}${localePrefix}/learn/dashboard/${course.slug}`,
      locale: isJapanese ? 'ja' : 'en',
    });

    return NextResponse.json({ url: session.url });
  } catch (error) {
    console.error('[ESL Purchase] Error:', error);
    return NextResponse.json(
      { error: 'Failed to create checkout session' },
      { status: 500 },
    );
  }
}
