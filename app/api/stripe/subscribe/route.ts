import { NextRequest, NextResponse } from 'next/server';
import { stripe } from '@/lib/stripe/client';
import { createClient } from '@/lib/supabase/server';
import { TIER_REGISTRY, getSubscriptionPriceId } from '@/lib/stripe/tiers';
import { hasActiveSubscription } from '@/lib/access/checks';
import { parseTier, fetchUserAccessRow } from '@/lib/stripe/subscribe-helpers';
import { sanitizeRedirect } from '@/lib/auth/safe-redirect';

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
      const { error: customerSaveError } = await supabase
        .from('users')
        .update({ stripe_customer_id: customerId })
        .eq('id', user.id);
      if (customerSaveError) {
        console.error(
          '[Stripe Subscribe POST] Failed to persist stripe_customer_id:',
          customerSaveError.message,
        );
      }
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

function buildAuthRedirect(request: NextRequest, originalPath: string): NextResponse {
  const url = new URL(request.url);
  const origin =
    request.headers.get('origin') ??
    process.env.NEXT_PUBLIC_SITE_URL ??
    url.origin;
  // Defensively sanitize even though originalPath comes from us.
  const safePath = sanitizeRedirect(originalPath, '/learn/dashboard');
  const localePrefix = url.searchParams.get('locale') === 'ja' ? '/ja' : '';
  const target = `${origin}${localePrefix}/learn/auth?redirect=${encodeURIComponent(safePath)}`;
  return NextResponse.redirect(target, 302);
}

export async function GET(request: NextRequest) {
  try {
    const url = new URL(request.url);
    const tier = parseTier(url.searchParams.get('tier'));
    if (!tier) {
      return NextResponse.json({ error: 'Invalid or missing tier' }, { status: 400 });
    }

    const supabase = await createClient();
    const { data: { user } } = await supabase.auth.getUser();

    if (!user) {
      return buildAuthRedirect(request, `${url.pathname}${url.search}`);
    }

    const locale = url.searchParams.get('locale') ?? 'en';
    const isJapanese = locale === 'ja';

    const profile = await fetchUserAccessRow(supabase, user.id);

    const origin =
      request.headers.get('origin') ??
      process.env.NEXT_PUBLIC_SITE_URL ??
      url.origin;
    const localePrefix = isJapanese ? '/ja' : '';

    if (
      profile &&
      hasActiveSubscription({
        subscription_tier: profile.subscription_tier,
        subscription_status: profile.subscription_status,
        subscription_expires_at: profile.subscription_expires_at,
      })
    ) {
      return NextResponse.redirect(
        `${origin}${localePrefix}/learn/dashboard/billing?upgrade=true`,
        302,
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
      const { error: customerSaveError } = await supabase
        .from('users')
        .update({ stripe_customer_id: customerId })
        .eq('id', user.id);
      if (customerSaveError) {
        console.error(
          '[Stripe Subscribe GET] Failed to persist stripe_customer_id:',
          customerSaveError.message,
        );
      }
    }

    const priceId = getSubscriptionPriceId(tier);
    const trialDays = TIER_REGISTRY[tier].trialDays;

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

    if (!session.url) throw new Error('Stripe session has no URL');
    return NextResponse.redirect(session.url, 302);
  } catch (error) {
    console.error('[Stripe Subscribe GET] Error:', error);
    return NextResponse.json(
      { error: 'Failed to start subscription checkout' },
      { status: 500 },
    );
  }
}
