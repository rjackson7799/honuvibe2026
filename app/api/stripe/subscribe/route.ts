import { NextRequest, NextResponse } from 'next/server';
import { stripe } from '@/lib/stripe/client';
import { createClient } from '@/lib/supabase/server';
import {
  TIER_REGISTRY,
  getSubscriptionPriceId,
  type SubscriptionTier,
} from '@/lib/stripe/tiers';
import { hasActiveSubscription } from '@/lib/access/checks';

function parseTier(value: unknown): SubscriptionTier | null {
  return value === 'community' || value === 'vault' ? value : null;
}

/** Fetch the user fields needed for access checks + checkout. Single source of truth. */
async function fetchUserAccessRow(
  supabase: Awaited<ReturnType<typeof createClient>>,
  userId: string,
) {
  const { data } = await supabase
    .from('users')
    .select(
      'stripe_customer_id, subscription_tier, subscription_status, subscription_expires_at, email, full_name, role',
    )
    .eq('id', userId)
    .single();
  return data;
}

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

    const body = (await request.json()) as { locale?: string; tier?: string };
    const tier = parseTier(body.tier) ?? 'vault';
    const locale = body.locale ?? 'en';
    const isJapanese = locale === 'ja';

    const profile = await fetchUserAccessRow(supabase, user.id);

    // Use the shared access helper — covers active, trialing, AND
    // cancelled-with-grace. A raw subscription_status === 'active' check would
    // miss trialing users and let them start a second Checkout session.
    if (
      profile &&
      hasActiveSubscription({
        subscription_tier: profile.subscription_tier,
        subscription_status: profile.subscription_status,
        subscription_expires_at: profile.subscription_expires_at,
      })
    ) {
      return NextResponse.json(
        { error: 'Already subscribed', upgrade_url: '/learn/dashboard/billing?upgrade=true' },
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

    const priceId = getSubscriptionPriceId(tier);
    const trialDays = TIER_REGISTRY[tier].trialDays;

    const origin =
      request.headers.get('origin') ??
      process.env.NEXT_PUBLIC_SITE_URL ??
      'http://localhost:3000';
    const localePrefix = isJapanese ? '/ja' : '';

    const session = await stripe.checkout.sessions.create({
      mode: 'subscription',
      customer: customerId,
      line_items: [{ price: priceId, quantity: 1 }],
      ...(trialDays ? { subscription_data: { trial_period_days: trialDays } } : {}),
      metadata: { user_id: user.id, type: `${tier}_subscription`, locale },
      success_url: `${origin}${localePrefix}/learn/dashboard/billing?subscribed=true&tier=${tier}`,
      cancel_url: `${origin}${localePrefix}/learn/dashboard/billing`,
      locale: isJapanese ? 'ja' : 'en',
    });

    return NextResponse.json({ url: session.url });
  } catch (error) {
    console.error('[Stripe Subscribe POST] Error:', error);
    return NextResponse.json(
      { error: 'Failed to create subscription checkout' },
      { status: 500 },
    );
  }
}

// Re-export the helpers so the GET handler in Task 2 reuses them.
export { fetchUserAccessRow, parseTier };
