import { NextRequest, NextResponse } from 'next/server';
import { createClient, createAdminClient } from '@/lib/supabase/server';
import { sendLocalizedPaymentLinkEmail } from '@/lib/email/payment-link';
import type { Locale } from '@/lib/email/types';

export async function POST(request: NextRequest) {
  try {
    // Auth: admin only
    const supabase = await createClient();
    const { data: { user } } = await supabase.auth.getUser();
    if (!user) return NextResponse.json({ error: 'Not authenticated' }, { status: 401 });

    const { data: profile } = await supabase.from('users').select('role').eq('id', user.id).single();
    if (profile?.role !== 'admin') return NextResponse.json({ error: 'Not authorized' }, { status: 403 });

    const { email, courseId, locale = 'en' } = await request.json() as {
      email: string;
      courseId: string;
      locale?: Locale;
    };
    if (!email || !courseId) {
      return NextResponse.json({ error: 'email and courseId are required' }, { status: 400 });
    }

    const adminSupabase = createAdminClient();

    // Look up the user by email to get their user_id for the webhook
    const { data: targetUser } = await adminSupabase
      .from('users')
      .select('id, full_name')
      .eq('email', email.toLowerCase().trim())
      .maybeSingle();

    if (!targetUser) {
      return NextResponse.json({ error: 'No account found for that email. They must register first.' }, { status: 404 });
    }

    // Check not already enrolled
    const { data: existing } = await adminSupabase
      .from('enrollments')
      .select('id')
      .eq('user_id', targetUser.id)
      .eq('course_id', courseId)
      .eq('status', 'active')
      .maybeSingle();

    if (existing) {
      return NextResponse.json({ error: 'This user is already enrolled.' }, { status: 400 });
    }

    // Fetch course
    const { data: course, error: courseError } = await adminSupabase
      .from('courses')
      .select('id, slug, title_en, title_jp, price_usd, is_published')
      .eq('id', courseId)
      .single();

    if (courseError || !course) {
      return NextResponse.json({ error: 'Course not found' }, { status: 404 });
    }
    if (!course.is_published) {
      return NextResponse.json(
        { error: 'Publish the course before sending a payment link.' },
        { status: 400 },
      );
    }
    if (!course.price_usd || course.price_usd <= 0) {
      return NextResponse.json({ error: 'Course has no USD price configured' }, { status: 400 });
    }

    const origin = process.env.NEXT_PUBLIC_SITE_URL ?? 'https://www.honuvibe.ai';
    const isJapanese = locale === 'ja';
    const localePrefix = isJapanese ? '/ja' : '';
    const courseTitle = isJapanese && course.title_jp ? course.title_jp : course.title_en;
    const checkoutUrl = `${origin}${localePrefix}/learn/${course.slug}/checkout`;

    await sendLocalizedPaymentLinkEmail({
      locale,
      email: email.toLowerCase().trim(),
      fullName: targetUser.full_name ?? 'there',
      courseTitle,
      paymentUrl: checkoutUrl,
      priceUsd: course.price_usd,
    });

    return NextResponse.json({ success: true });
  } catch (error) {
    console.error('[send-payment-link] Error:', error);
    const message =
      error instanceof Error ? error.message : 'Server error';
    return NextResponse.json({ error: message }, { status: 500 });
  }
}
