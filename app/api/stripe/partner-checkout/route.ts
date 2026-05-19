/**
 * Partner-checkout endpoint — guest-friendly Stripe Checkout for the three
 * paid tiers (community / vault / cohort) sold via partner landing pages.
 *
 * No HonuVibe auth required. The user provides email at the landing-page
 * interstitial; the server looks up an existing Stripe Customer (to avoid
 * duplicate subscriptions) and creates a Checkout Session.
 *
 * Webhook handles the fulfillment side (lib/stripe/webhooks.ts +
 * lib/partner-checkout/fulfill.ts).
 */

import { NextRequest, NextResponse } from 'next/server';
import { z } from 'zod';
import type Stripe from 'stripe';
import { stripe } from '@/lib/stripe/client';
import { findReusableStripeCustomerByEmail } from '@/lib/partner-checkout/fulfill';
import {
  TIER_REGISTRY,
  getSubscriptionPriceId,
  type SubscriptionTier,
} from '@/lib/stripe/tiers';
import {
  getCohortPriceId,
  isCohortId,
  type CohortId,
} from '@/lib/stripe/cohorts';

const BodySchema = z.object({
  tier: z.enum(['community', 'vault', 'cohort']),
  cohortId: z.string().optional(),
  email: z.string().email(),
  locale: z.enum(['en', 'ja']).default('en'),
  partnerSlug: z.string().min(1),
});

export async function POST(request: NextRequest) {
  let body: z.infer<typeof BodySchema>;
  try {
    body = BodySchema.parse(await request.json());
  } catch (error) {
    return NextResponse.json(
      { error: 'Invalid request body', detail: error instanceof Error ? error.message : 'unknown' },
      { status: 400 },
    );
  }

  const { tier, locale, partnerSlug } = body;
  const email = body.email.trim().toLowerCase();

  // Resolve price ID + mode based on tier.
  let priceId: string;
  let mode: 'subscription' | 'payment';
  let trialDays: number | undefined;
  let cohortId: CohortId | undefined;

  try {
    if (tier === 'cohort') {
      if (!body.cohortId || !isCohortId(body.cohortId)) {
        return NextResponse.json(
          { error: 'Cohort tier requires a valid cohortId' },
          { status: 400 },
        );
      }
      cohortId = body.cohortId;
      priceId = getCohortPriceId(cohortId);
      mode = 'payment';
    } else {
      const subscriptionTier = tier as SubscriptionTier;
      priceId = getSubscriptionPriceId(subscriptionTier);
      mode = 'subscription';
      trialDays = TIER_REGISTRY[subscriptionTier].trialDays;
    }
  } catch (error) {
    console.error('[partner-checkout] Price ID resolution failed:', error);
    return NextResponse.json(
      { error: 'Tier not configured' },
      { status: 500 },
    );
  }

  // Customer reuse: if this email already has an active subscription on Stripe,
  // pass the existing customer ID so Stripe doesn't create a duplicate.
  const existingCustomerId = await findReusableStripeCustomerByEmail(email);

  const origin =
    request.headers.get('origin') ??
    process.env.NEXT_PUBLIC_SITE_URL ??
    'http://localhost:3000';

  const localePrefix = locale === 'ja' ? '/ja' : '';
  const successUrl = `${origin}${localePrefix}/partners/${partnerSlug}/thanks?tier=${tier}&session_id={CHECKOUT_SESSION_ID}`;
  const cancelUrl = `${origin}${localePrefix}/partners/${partnerSlug}#pricing`;

  // Structured metadata — the webhook reads checkout_kind as the discriminator.
  const metadata = {
    checkout_kind: 'partner',
    partner_slug: partnerSlug,
    tier,
    cohort_id: cohortId ?? '',
    locale,
  };

  try {
    const sessionParams: Stripe.Checkout.SessionCreateParams = {
      mode,
      line_items: [{ price: priceId, quantity: 1 }],
      metadata,
      billing_address_collection: 'required',
      automatic_tax: { enabled: true },
      success_url: successUrl,
      cancel_url: cancelUrl,
      locale: locale === 'ja' ? 'ja' : 'en',
    };

    if (existingCustomerId) {
      sessionParams.customer = existingCustomerId;
      sessionParams.customer_update = { address: 'auto', name: 'auto' };
    } else {
      sessionParams.customer_email = email;
      if (mode === 'payment') {
        // customer_creation is only valid in payment / setup modes. For
        // subscriptions, Stripe creates a Customer automatically.
        sessionParams.customer_creation = 'always';
      }
    }

    if (mode === 'subscription' && trialDays) {
      sessionParams.subscription_data = {
        trial_period_days: trialDays,
        metadata,
      };
    } else if (mode === 'subscription') {
      sessionParams.subscription_data = { metadata };
    }

    const session = await stripe.checkout.sessions.create(sessionParams);

    if (!session.url) {
      return NextResponse.json(
        { error: 'Stripe returned a session with no URL' },
        { status: 500 },
      );
    }

    return NextResponse.json({ url: session.url });
  } catch (error) {
    console.error('[partner-checkout] sessions.create failed:', error);
    return NextResponse.json(
      { error: 'Failed to create checkout session' },
      { status: 500 },
    );
  }
}
