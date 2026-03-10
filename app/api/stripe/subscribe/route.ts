import { NextRequest, NextResponse } from 'next/server';
import { stripe } from '@/lib/stripe/client';
import { createClient } from '@/lib/supabase/server';

export async function POST(request: NextRequest) {
  try {
    const supabase = await createClient();

    const {
      data: { user },
      error: authError,
    } = await supabase.auth.getUser();
    if (authError || !user) {
      return NextResponse.json({ error: 'Not authenticated' }, { status: 401 });
    }

    const { locale } = (await request.json()) as { locale: string };
    const isJapanese = locale === 'ja';

    // Get or create Stripe customer
    const { data: profile } = await supabase
      .from('users')
      .select('stripe_customer_id, subscription_status, email, full_name')
      .eq('id', user.id)
      .single();

    if (profile?.subscription_status === 'active') {
      return NextResponse.json(
        { error: 'Already subscribed' },
        { status: 400 },
      );
    }

    let customerId = profile?.stripe_customer_id;

    if (!customerId) {
      const customer = await stripe.customers.create({
        email: user.email ?? undefined,
        name: profile?.full_name ?? undefined,
        metadata: { user_id: user.id },
      });
      customerId = customer.id;

      await supabase
        .from('users')
        .update({ stripe_customer_id: customerId })
        .eq('id', user.id);
    }

    // Select price based on locale
    const priceId = isJapanese
      ? process.env.STRIPE_VAULT_PRICE_JPY
      : process.env.STRIPE_VAULT_PRICE_USD;

    if (!priceId) {
      console.error('[Stripe Subscribe] Vault price ID not configured');
      return NextResponse.json(
        { error: 'Subscription not configured' },
        { status: 500 },
      );
    }

    const origin =
      request.headers.get('origin') ??
      process.env.NEXT_PUBLIC_SITE_URL ??
      'http://localhost:3000';

    const localePrefix = isJapanese ? '/ja' : '';

    const session = await stripe.checkout.sessions.create({
      mode: 'subscription',
      customer: customerId,
      line_items: [{ price: priceId, quantity: 1 }],
      metadata: {
        user_id: user.id,
        type: 'vault_subscription',
        locale,
      },
      success_url: `${origin}${localePrefix}/learn/dashboard/billing?subscribed=true`,
      cancel_url: `${origin}${localePrefix}/learn/dashboard/billing`,
      locale: isJapanese ? 'ja' : 'en',
    });

    return NextResponse.json({ url: session.url });
  } catch (error) {
    console.error('[Stripe Subscribe] Error:', error);
    return NextResponse.json(
      { error: 'Failed to create subscription checkout' },
      { status: 500 },
    );
  }
}
