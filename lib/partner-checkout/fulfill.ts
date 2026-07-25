/**
 * Partner-checkout fulfillment — webhook side-effects for guest checkouts
 * initiated from a partner landing page (Vertice Society, future partners).
 *
 * Two entry points, both called from lib/stripe/webhooks.ts:
 *   - fulfillCohortCheckout: one-time payment for a Live Cohort.
 *   - fulfillSubscriptionCheckout: subscription checkout (Community or Vault)
 *     where we only handle the user-creation + welcome-email side. The actual
 *     subscription_tier/status mutations happen in handleSubscriptionCreated.
 *
 * Both branches:
 *   1. Find or create the HonuVibe user by Stripe-collected email.
 *   2. Attach stripe_customer_id to the user if not already set.
 *   3. Send a tier-appropriate welcome email with a fresh magic link.
 *
 * Idempotency: cohort branch checks cohort_enrollments by stripe_session_id
 * before insert. Subscription branch is safe to call multiple times — emails
 * are fire-and-forget but the user lookup is idempotent.
 */

import type Stripe from 'stripe';
import type { SupabaseClient } from '@supabase/supabase-js';

import { findOrCreateUserByEmail } from '@/lib/auth/find-or-create';
import { resolvePartnerIdBySlug } from '@/lib/partner-attribution';
import {
  COHORT_REGISTRY,
  getCohortBundleWindow,
  isCohortId,
} from '@/lib/stripe/cohorts';
import { sendStudentWelcomeEmail } from '@/lib/email/send';
import { stripe } from '@/lib/stripe/client';

type Locale = 'en' | 'ja';

/**
 * Create (or repair) partner membership for an explicit partner checkout.
 *
 * MEMBERSHIP IS ONLY EVER CREATED IN EXPLICIT PARTNER CONTEXTS — a partner
 * landing-page checkout (trusted Stripe metadata) or a cohort purchase carrying
 * a partner_slug. A generic course checkout with an `hv_partner` attribution
 * cookie records attribution ONLY: a referral is not a tenant election.
 *
 * Idempotency is DB-enforced inside `fulfill_partner_membership` keyed on the
 * Checkout Session id, so this is safe to call on every webhook delivery —
 * which is exactly why it runs BEFORE any "already fulfilled" early return: a
 * retry must be able to repair the "enrollment exists, membership missing" case.
 *
 * Never throws: a membership failure must not fail the payment webhook and
 * cause Stripe to retry a completed enrollment.
 */
async function fulfillPartnerMembership(
  supabase: SupabaseClient,
  params: { userId: string; partnerSlug: string | null; sessionId: string },
): Promise<void> {
  const { userId, partnerSlug, sessionId } = params;
  if (!partnerSlug) return;

  try {
    const partnerId = await resolvePartnerIdBySlug(supabase, partnerSlug);
    if (!partnerId) {
      console.error('[fulfill] Unknown/inactive partner_slug, skipping membership:', partnerSlug);
      return;
    }

    const { data, error } = await supabase.rpc('fulfill_partner_membership', {
      p_user_id: userId,
      p_partner_id: partnerId,
      p_stripe_ref: sessionId,
    });

    if (error) {
      console.error('[fulfill] fulfill_partner_membership failed:', error.message);
      return;
    }
    console.log('[fulfill] partner membership outcome:', JSON.stringify(data));
  } catch (err) {
    console.error('[fulfill] fulfill_partner_membership threw:', err);
  }
}

function getLocaleFromMetadata(value: string | undefined): Locale {
  return value === 'ja' ? 'ja' : 'en';
}

async function generateMagicLink(
  supabase: SupabaseClient,
  email: string,
  locale: Locale,
): Promise<string | null> {
  const origin = process.env.NEXT_PUBLIC_SITE_URL ?? 'https://honuvibe.ai';
  const localePrefix = locale === 'ja' ? '/ja' : '';

  const { data, error } = await supabase.auth.admin.generateLink({
    type: 'magiclink',
    email,
    options: {
      redirectTo: `${origin}/api/auth/callback?next=${encodeURIComponent(`${localePrefix}/learn/dashboard`)}`,
    },
  });

  if (error || !data.properties?.action_link) {
    console.error('[fulfill] Failed to generate magic link:', error);
    return null;
  }

  return data.properties.action_link;
}

export async function fulfillCohortCheckout(
  supabase: SupabaseClient,
  session: Stripe.Checkout.Session,
): Promise<void> {
  const email = session.customer_details?.email;
  const name = session.customer_details?.name ?? null;
  const cohortId = session.metadata?.cohort_id;
  const partnerSlug = session.metadata?.partner_slug ?? null;
  const locale = getLocaleFromMetadata(session.metadata?.locale);

  if (!email) {
    console.error('[fulfill cohort] Missing customer_details.email on session', session.id);
    return;
  }

  if (!cohortId || !isCohortId(cohortId)) {
    console.error('[fulfill cohort] Unknown cohort_id in metadata:', cohortId);
    return;
  }

  // 1. Find or create user (idempotent — safe to run on every retry).
  const user = await findOrCreateUserByEmail(supabase, email, name, locale);

  // 2. Partner membership, BEFORE the "already fulfilled" guard below, so a
  //    webhook retry repairs a missing membership on an existing enrollment.
  await fulfillPartnerMembership(supabase, {
    userId: user.id,
    partnerSlug,
    sessionId: session.id,
  });

  // Idempotency: skip the rest if this session was already fulfilled.
  const { data: existing } = await supabase
    .from('cohort_enrollments')
    .select('id')
    .eq('stripe_session_id', session.id)
    .maybeSingle();

  if (existing) {
    console.log('[fulfill cohort] Already enrolled for session', session.id);
    return;
  }

  // 3. Attach Stripe customer ID if Stripe created/used one for this session.
  const customerId =
    typeof session.customer === 'string'
      ? session.customer
      : (session.customer?.id ?? null);
  if (customerId && user.stripe_customer_id !== customerId) {
    await supabase
      .from('users')
      .update({ stripe_customer_id: customerId })
      .eq('id', user.id);
  }

  // 4. Insert cohort_enrollments row.
  const window = getCohortBundleWindow(cohortId);
  const paymentIntentId =
    typeof session.payment_intent === 'string'
      ? session.payment_intent
      : (session.payment_intent?.id ?? null);

  const { error: insertError } = await supabase.from('cohort_enrollments').insert({
    user_id: user.id,
    cohort_id: cohortId,
    stripe_session_id: session.id,
    stripe_payment_intent_id: paymentIntentId,
    amount_paid: session.amount_total ?? 0,
    currency: session.currency ?? 'usd',
    partner_slug: partnerSlug,
    bundle_access_starts_at: window.starts_at,
    bundle_access_ends_at: window.ends_at,
  });

  if (insertError) {
    console.error('[fulfill cohort] cohort_enrollments insert failed:', insertError);
    throw insertError; // Stripe will retry.
  }

  // 5. Mirror the purchase into payments for the unified billing history view.
  await supabase.from('payments').insert({
    user_id: user.id,
    type: 'cohort_purchase',
    stripe_checkout_session_id: session.id,
    stripe_payment_intent_id: paymentIntentId,
    amount: session.amount_total ?? 0,
    currency: session.currency ?? 'usd',
    status: 'succeeded',
    description: COHORT_REGISTRY[cohortId].displayName,
  });

  // 6. Mark as Vertice member (preserves existing 40%-off course coupon perk).
  //    EXPAND PHASE: this legacy flag is written alongside the generalized
  //    partner_members row above. The contract deploy removes it.
  if (partnerSlug === 'vertice-society' && !user.is_vertice_member) {
    await supabase
      .from('users')
      .update({ is_vertice_member: true })
      .eq('id', user.id);
  }

  // 7. Send welcome email with magic link (fire-and-forget).
  const magicLink = await generateMagicLink(supabase, email, locale);
  if (magicLink) {
    try {
      await sendStudentWelcomeEmail({
        locale,
        fullName: name ?? user.full_name ?? email,
        email,
        actionLink: magicLink,
        type: 'new',
        courseTitle: COHORT_REGISTRY[cohortId].displayName,
      });
    } catch (emailError) {
      console.error('[fulfill cohort] welcome email failed:', emailError);
    }
  }
}

export async function fulfillSubscriptionCheckout(
  supabase: SupabaseClient,
  session: Stripe.Checkout.Session,
): Promise<void> {
  const email = session.customer_details?.email;
  const name = session.customer_details?.name ?? null;
  const tier = session.metadata?.tier;
  const partnerSlug = session.metadata?.partner_slug ?? null;
  const locale = getLocaleFromMetadata(session.metadata?.locale);

  if (!email) {
    console.error('[fulfill subscription] Missing customer_details.email on session', session.id);
    return;
  }

  if (tier !== 'community' && tier !== 'vault') {
    console.error('[fulfill subscription] Unexpected tier:', tier);
    return;
  }

  // 1. Find or create user (idempotent).
  const user = await findOrCreateUserByEmail(supabase, email, name, locale);

  // 1b. Partner membership — explicit partner-landing checkout, so the partner
  //     intent comes from trusted Stripe metadata, not a referral cookie.
  await fulfillPartnerMembership(supabase, {
    userId: user.id,
    partnerSlug,
    sessionId: session.id,
  });

  // 2. Attach Stripe customer ID so handleSubscriptionCreated can match by it
  //    if it fires after we've created the user here. (Out-of-order resilience
  //    on the subscription side is in handleSubscriptionCreated itself.)
  const customerId =
    typeof session.customer === 'string'
      ? session.customer
      : (session.customer?.id ?? null);
  if (customerId && user.stripe_customer_id !== customerId) {
    await supabase
      .from('users')
      .update({ stripe_customer_id: customerId })
      .eq('id', user.id);
  }

  // 3. Mark as Vertice member if attributed to Vertice Society.
  if (partnerSlug === 'vertice-society' && !user.is_vertice_member) {
    await supabase
      .from('users')
      .update({ is_vertice_member: true })
      .eq('id', user.id);
  }

  // 4. Send welcome email with magic link (fire-and-forget). The actual
  //    subscription_tier/status mutations happen in handleSubscriptionCreated.
  const magicLink = await generateMagicLink(supabase, email, locale);
  if (magicLink) {
    try {
      await sendStudentWelcomeEmail({
        locale,
        fullName: name ?? user.full_name ?? email,
        email,
        actionLink: magicLink,
        type: 'new',
        courseTitle:
          tier === 'community'
            ? 'HonuVibe Community'
            : 'HonuVibe Vault',
      });
    } catch (emailError) {
      console.error('[fulfill subscription] welcome email failed:', emailError);
    }
  }
}

/**
 * Look up a Stripe Customer by email. Used by the partner-checkout API route
 * before creating a Checkout Session, to reuse existing customers and avoid
 * duplicate-subscription situations from guest checkout.
 *
 * Returns the customer ID if exactly one matches AND has at least one active
 * subscription. Otherwise returns null and the caller proceeds as a fresh
 * guest checkout.
 */
export async function findReusableStripeCustomerByEmail(
  email: string,
): Promise<string | null> {
  try {
    const results = await stripe.customers.search({
      query: `email:'${email.trim().toLowerCase()}'`,
      limit: 5,
    });

    for (const customer of results.data) {
      const subs = await stripe.subscriptions.list({
        customer: customer.id,
        status: 'all',
        limit: 5,
      });
      const hasActive = subs.data.some(
        (s) => s.status === 'active' || s.status === 'trialing' || s.status === 'past_due',
      );
      if (hasActive) return customer.id;
    }

    return null;
  } catch (error) {
    console.error('[findReusableStripeCustomerByEmail] search failed:', error);
    return null;
  }
}
