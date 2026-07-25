import type Stripe from 'stripe';
import { createClient } from '@supabase/supabase-js';
import { resolvePartnerIdBySlug } from '@/lib/partner-attribution';
import { resolveEnrollmentPartnerId } from '@/lib/partner-attribution/resolve';
import { persistEnrollmentSplit } from '@/lib/revenue-split/persist';
import {
  fulfillCohortCheckout,
  fulfillSubscriptionCheckout,
} from '@/lib/partner-checkout/fulfill';
import { findOrCreateUserByEmail } from '@/lib/auth/find-or-create';
import { stripe } from '@/lib/stripe/client';
import { resolveSubscriptionTier, paymentTypeForRenewal } from '@/lib/stripe/tiers';
import { trackServerEvent } from '@/lib/analytics-server';

/** Canonical URL for server-side funnel events fired from webhook handlers. */
const WEBHOOK_EVENT_URL = `https://${process.env.NEXT_PUBLIC_PLAUSIBLE_DOMAIN ?? 'honuvibe.ai'}/checkout/completed`;

/** Service role client for webhook handlers — bypasses RLS, no user session */
function getServiceClient() {
  const url = process.env.NEXT_PUBLIC_SUPABASE_URL;
  const serviceKey = process.env.SUPABASE_SERVICE_ROLE_KEY;

  if (!url || !serviceKey) {
    throw new Error('Supabase service role credentials not configured');
  }

  return createClient(url, serviceKey);
}

export async function handleCheckoutCompleted(
  session: Stripe.Checkout.Session,
): Promise<void> {
  const supabase = getServiceClient();

  // STEP 1: Partner-checkout branch. Partner sessions have no user_id /
  // course_id metadata — they identify themselves via checkout_kind='partner'.
  // MUST run before the course-enrollment guard below.
  if (session.metadata?.checkout_kind === 'partner') {
    const tier = session.metadata?.tier;
    if (tier === 'cohort') {
      await fulfillCohortCheckout(supabase, session);
    } else if (tier === 'community' || tier === 'vault') {
      await fulfillSubscriptionCheckout(supabase, session);
    } else {
      console.error('[Stripe Webhook] Unknown partner tier:', tier);
    }
    return;
  }

  const userId = session.metadata?.user_id;
  const courseId = session.metadata?.course_id;
  const currency = session.metadata?.currency ?? 'usd';
  const locale = session.metadata?.locale ?? 'en';

  // STEP 2.5: Direct subscription checkout (community/vault from /api/stripe/subscribe).
  // Fulfillment runs via customer.subscription.created (price-ID → tier). This
  // branch exists only to silence the misleading "Missing user_id or course_id"
  // log that the course-enrollment fall-through would otherwise emit.
  if (
    session.metadata?.type === 'community_subscription' ||
    session.metadata?.type === 'vault_subscription'
  ) {
    return;
  }

  // STEP 2: ESL add-on branch.
  if (session.metadata?.type === 'esl_addon') {
    if (!userId || !courseId) {
      console.error('[Stripe Webhook] ESL session missing user_id/course_id');
      return;
    }
    await handleESLPurchaseCompleted(session, userId, courseId, currency);
    return;
  }

  // STEP 3: Course enrollment (existing flow).
  if (!userId || !courseId) {
    console.error('[Stripe Webhook] Missing user_id or course_id in metadata');
    return;
  }

  // Idempotency: skip if enrollment already exists (handles Stripe retries)
  const { data: existing } = await supabase
    .from('enrollments')
    .select('id')
    .eq('user_id', userId)
    .eq('course_id', courseId)
    .eq('status', 'active')
    .maybeSingle();

  if (existing) {
    console.log('[Stripe Webhook] Enrollment already exists, skipping');
    return;
  }

  // Partner attribution — resolve slug from checkout metadata to partner_id.
  // Attribution is non-critical: a resolve failure logs and continues with
  // partner_id = null so enrollment itself never fails because of it.
  //
  // ATTRIBUTION ONLY — deliberately no membership write here. A generic course
  // checkout carrying an `hv_partner` referral cookie records who referred the
  // purchase (enrollments.partner_id + the revenue-split snapshot); it does NOT
  // elect a tenant. Membership is created only in explicit partner contexts
  // (partner-landing checkout / a cohort purchase with partner_slug), which run
  // through fulfill_partner_membership in lib/partner-checkout/fulfill.ts.
  const cookiePartnerId = await resolvePartnerIdBySlug(
    supabase,
    session.metadata?.partner_slug,
  );

  // Ownership resolution: course.partner_id (owner) wins over cookie.
  // Column added in migration 035; returns null for all rows until applied,
  // so the resolver falls back to the cookie path transparently.
  const { data: courseOwnerRow, error: courseOwnerError } = await supabase
    .from('courses')
    .select('partner_id')
    .eq('id', courseId)
    .maybeSingle();
  if (courseOwnerError) {
    console.error('[Stripe Webhook] Failed to fetch course owner row:', courseOwnerError);
    // Attribution is non-critical — continue with null owner
  }

  const partnerId = resolveEnrollmentPartnerId({
    coursePartnerId: courseOwnerRow?.partner_id ?? null,
    cookiePartnerId,
  });

  // Create enrollment record
  const paymentIntentId =
    typeof session.payment_intent === 'string'
      ? session.payment_intent
      : (session.payment_intent?.id ?? null);

  const { data: enrollment, error: enrollError } = await supabase
    .from('enrollments')
    .insert({
      user_id: userId,
      course_id: courseId,
      stripe_checkout_session_id: session.id,
      stripe_payment_intent_id: paymentIntentId,
      amount_paid: session.amount_total,
      currency,
      status: 'active',
      partner_id: partnerId,
    })
    .select('id, course_id, partner_id, amount_paid, currency')
    .single();

  if (enrollError || !enrollment) {
    console.error(
      '[Stripe Webhook] Failed to create enrollment:',
      enrollError,
    );
    throw enrollError; // Return 500 so Stripe retries
  }

  // Funnel: conversion completed (server-side, ad-block-proof). Fired only on a
  // genuinely new enrollment — the idempotency guard above returns before here
  // on Stripe retries, so this counts each conversion once.
  await trackServerEvent('checkout_completed', {
    url: WEBHOOK_EVENT_URL,
    props: { kind: 'course', currency },
  });

  // First-touch sticky attribution on the user — only set if not already set
  if (partnerId) {
    const { data: existingUser } = await supabase
      .from('users')
      .select('referred_by_partner_id')
      .eq('id', userId)
      .single();

    if (existingUser && !existingUser.referred_by_partner_id) {
      await supabase
        .from('users')
        .update({ referred_by_partner_id: partnerId })
        .eq('id', userId);
    }
  }

  // Increment enrollment count
  const { data: course } = await supabase
    .from('courses')
    .select('current_enrollment')
    .eq('id', courseId)
    .single();

  if (course) {
    await supabase
      .from('courses')
      .update({ current_enrollment: course.current_enrollment + 1 })
      .eq('id', courseId);
  }

  try {
    await persistEnrollmentSplit(
      supabase,
      enrollment.id,
      enrollment.course_id,
      enrollment.partner_id,
      enrollment.amount_paid ?? 0,
      enrollment.currency ?? currency,
    );
  } catch (splitError) {
    console.error(
      `[Stripe Webhook] Failed to persist revenue split for enrollment ${enrollment.id}:`,
      splitError,
    );
  }

  // Send confirmation emails (fire-and-forget)
  try {
    const { data: userProfile } = await supabase
      .from('users')
      .select('full_name, email, locale_preference')
      .eq('id', userId)
      .single();

    const { data: courseData } = await supabase
      .from('courses')
      .select(
        'title_en, title_jp, course_type, start_date, slug, price_usd, price_jpy',
      )
      .eq('id', courseId)
      .single();

    if (userProfile?.email && courseData) {
      const emailLocale = (locale === 'ja' ? 'ja' : 'en') as 'en' | 'ja';
      const courseTitle =
        emailLocale === 'ja'
          ? (courseData.title_jp ?? courseData.title_en)
          : courseData.title_en;

      const { sendEnrollmentConfirmation, sendEnrollmentAdminNotification } =
        await import('@/lib/email/send');

      void Promise.all([
        sendEnrollmentConfirmation({
          locale: emailLocale,
          studentName: userProfile.full_name ?? 'Student',
          studentEmail: userProfile.email,
          courseTitle,
          courseSlug: courseData.slug,
          courseType: (courseData.course_type ?? 'self-study') as
            | 'cohort'
            | 'self-study',
          startDate: courseData.start_date,
          amountPaid: session.amount_total ?? 0,
          currency: currency as 'usd' | 'jpy',
          isManualEnroll: false,
        }),
        sendEnrollmentAdminNotification({
          locale: emailLocale,
          studentName: userProfile.full_name ?? 'Student',
          studentEmail: userProfile.email,
          courseTitle,
          courseSlug: courseData.slug,
          courseType: (courseData.course_type ?? 'self-study') as
            | 'cohort'
            | 'self-study',
          startDate: courseData.start_date,
          amountPaid: session.amount_total ?? 0,
          currency: currency as 'usd' | 'jpy',
          isManualEnroll: false,
        }),
      ]);
    }
  } catch (emailErr) {
    // Don't fail the webhook for email errors
    console.error('[Stripe Webhook] Email send failed:', emailErr);
  }

  // Log payment record for billing history
  await supabase.from('payments').insert({
    user_id: userId,
    type: 'course_purchase',
    course_id: courseId,
    stripe_checkout_session_id: session.id,
    stripe_payment_intent_id: paymentIntentId,
    amount: session.amount_total ?? 0,
    currency,
    status: 'succeeded',
    receipt_url: null,
    description: 'Course enrollment',
  });
}

export async function handleChargeRefunded(
  charge: Stripe.Charge,
): Promise<void> {
  const paymentIntentId =
    typeof charge.payment_intent === 'string'
      ? charge.payment_intent
      : charge.payment_intent?.id;

  if (!paymentIntentId) {
    console.error('[Stripe Webhook] charge.refunded missing payment_intent');
    return;
  }

  const supabase = getServiceClient();

  // Mark any matching payments rows as refunded (covers subscriptions, cohort,
  // course enrollments — anything with a stripe_payment_intent_id).
  // We update first so the billing-history view reflects the refund even if
  // the downstream enrollment/cohort cleanup misses a path.
  const { error: paymentUpdateError } = await supabase
    .from('payments')
    .update({ status: 'refunded' })
    .eq('stripe_payment_intent_id', paymentIntentId)
    .eq('status', 'succeeded');

  if (paymentUpdateError) {
    console.error('[Stripe Webhook] Failed to mark payments refunded:', paymentUpdateError);
  }

  // Course-enrollment branch — unchanged from prior behavior, including the
  // instructor revenue clawback and course capacity decrement.
  const { data: enrollment, error: enrollmentError } = await supabase
    .from('enrollments')
    .select('id, user_id, course_id, status')
    .eq('stripe_payment_intent_id', paymentIntentId)
    .maybeSingle();

  if (enrollmentError) {
    console.error('[Stripe Webhook] Failed to resolve refunded enrollment:', enrollmentError);
    return;
  }

  if (!enrollment) {
    // Not a course enrollment — could be a partner subscription invoice or a
    // cohort purchase. The payments-row update above already handled the
    // billing-history side. Nothing else to claw back for partner tiers.
    return;
  }

  const refundTimestamp = new Date().toISOString();

  const { error: updateEnrollmentError } = await supabase
    .from('enrollments')
    .update({
      status: 'refunded',
      refunded_at: refundTimestamp,
    })
    .eq('id', enrollment.id);

  if (updateEnrollmentError) {
    console.error('[Stripe Webhook] Failed to mark enrollment refunded:', updateEnrollmentError);
  }

  const { error: clawbackError } = await supabase
    .from('enrollment_instructor_shares')
    .update({ status: 'clawed_back' })
    .eq('enrollment_id', enrollment.id);

  if (clawbackError) {
    console.error('[Stripe Webhook] Failed to claw back instructor shares:', clawbackError);
  }

  if (enrollment.status !== 'refunded') {
    const { data: course } = await supabase
      .from('courses')
      .select('current_enrollment')
      .eq('id', enrollment.course_id)
      .single();

    if (course && course.current_enrollment > 0) {
      await supabase
        .from('courses')
        .update({ current_enrollment: course.current_enrollment - 1 })
        .eq('id', enrollment.course_id);
    }
  }

  const { data: existingRefundPayment } = await supabase
    .from('payments')
    .select('id')
    .eq('stripe_payment_intent_id', paymentIntentId)
    .eq('status', 'refunded')
    .maybeSingle();

  if (!existingRefundPayment) {
    await supabase.from('payments').insert({
      user_id: enrollment.user_id,
      type: 'course_purchase',
      course_id: enrollment.course_id,
      stripe_payment_intent_id: paymentIntentId,
      amount: charge.amount_refunded ?? charge.amount ?? 0,
      currency: charge.currency,
      status: 'refunded',
      receipt_url: charge.receipt_url ?? null,
      description: 'Course enrollment refund',
    });
  }
}

/**
 * Resolve a subscription event's user with out-of-order resilience.
 *
 * If the user already has stripe_customer_id set, use that. Otherwise, fetch
 * the Stripe Customer and find-or-create by email — this handles the case
 * where customer.subscription.created fires before checkout.session.completed.
 */
async function resolveSubscriptionUser(
  supabase: ReturnType<typeof getServiceClient>,
  customerId: string,
): Promise<{ id: string; subscription_stripe_id: string | null } | null> {
  const { data: existing } = await supabase
    .from('users')
    .select('id, subscription_stripe_id')
    .eq('stripe_customer_id', customerId)
    .maybeSingle();

  if (existing) return existing;

  // Out-of-order fallback: fetch Stripe Customer for email.
  try {
    const customer = await stripe.customers.retrieve(customerId);
    if (customer.deleted) {
      console.error('[Stripe Webhook] Customer is deleted:', customerId);
      return null;
    }
    if (!customer.email) {
      console.error('[Stripe Webhook] Customer has no email:', customerId);
      return null;
    }

    const user = await findOrCreateUserByEmail(supabase, customer.email, customer.name ?? null);
    await supabase
      .from('users')
      .update({ stripe_customer_id: customerId })
      .eq('id', user.id);

    return { id: user.id, subscription_stripe_id: user.subscription_stripe_id };
  } catch (error) {
    console.error('[Stripe Webhook] resolveSubscriptionUser failed:', error);
    return null;
  }
}

export async function handleSubscriptionCreated(
  subscription: Stripe.Subscription,
): Promise<void> {
  const customerId = typeof subscription.customer === 'string'
    ? subscription.customer
    : subscription.customer.id;

  const supabase = getServiceClient();

  const user = await resolveSubscriptionUser(supabase, customerId);
  if (!user) return;

  // Derive tier from the price ID on the subscription. Unknown price ID = data
  // drift; log and skip rather than guess.
  const priceId = subscription.items.data[0]?.price?.id;
  const tier = priceId ? resolveSubscriptionTier(priceId) : undefined;
  if (!tier) {
    console.error(
      '[Stripe Webhook] Unknown price ID on subscription, skipping tier update:',
      priceId,
    );
    return;
  }

  // Duplicate-subscription guard: if the user already has a different active
  // subscription, log loudly and skip rather than silently downgrade them.
  if (
    user.subscription_stripe_id &&
    user.subscription_stripe_id !== subscription.id
  ) {
    console.error(
      '[Stripe Webhook] User already has subscription_stripe_id',
      user.subscription_stripe_id,
      '— refusing to overwrite with',
      subscription.id,
    );
    return;
  }

  const periodEnd = subscription.items.data[0]?.current_period_end;

  // Count the conversion once: fire only when this subscription id is new to the
  // user (the guard above already returned for a *different* existing sub, so a
  // re-fired identical event has subscription_stripe_id === subscription.id).
  const isNewSubscription = !user.subscription_stripe_id;

  await supabase
    .from('users')
    .update({
      subscription_tier: tier,
      subscription_stripe_id: subscription.id,
      subscription_status: subscription.status,
      subscription_expires_at: periodEnd
        ? new Date(periodEnd * 1000).toISOString()
        : null,
    })
    .eq('id', user.id);

  if (isNewSubscription) {
    await trackServerEvent('checkout_completed', {
      url: WEBHOOK_EVENT_URL,
      props: {
        kind: tier,
        currency: subscription.items.data[0]?.price?.currency ?? 'usd',
      },
    });
  }
}

export async function handleSubscriptionUpdated(
  subscription: Stripe.Subscription,
): Promise<void> {
  const customerId = typeof subscription.customer === 'string'
    ? subscription.customer
    : subscription.customer.id;

  const supabase = getServiceClient();

  const user = await resolveSubscriptionUser(supabase, customerId);
  if (!user) return;

  const priceId = subscription.items.data[0]?.price?.id;
  const tier = priceId ? resolveSubscriptionTier(priceId) : undefined;

  const status = subscription.cancel_at_period_end ? 'cancelled' : subscription.status;
  const periodEnd = subscription.items.data[0]?.current_period_end;

  // Update tier only if we can resolve it; preserve old value on data drift.
  const updates: Record<string, unknown> = {
    subscription_status: status,
    subscription_expires_at: periodEnd
      ? new Date(periodEnd * 1000).toISOString()
      : null,
  };
  if (tier) updates.subscription_tier = tier;

  await supabase.from('users').update(updates).eq('id', user.id);
}

export async function handleSubscriptionDeleted(
  subscription: Stripe.Subscription,
): Promise<void> {
  const customerId = typeof subscription.customer === 'string'
    ? subscription.customer
    : subscription.customer.id;

  const supabase = getServiceClient();

  const { data: user } = await supabase
    .from('users')
    .select('id')
    .eq('stripe_customer_id', customerId)
    .single();

  if (!user) return;

  await supabase
    .from('users')
    .update({
      subscription_tier: 'free',
      subscription_status: 'cancelled',
      subscription_stripe_id: null,
    })
    .eq('id', user.id);
}

export async function handleInvoicePaid(
  invoice: Stripe.Invoice,
): Promise<void> {
  const customerId = typeof invoice.customer === 'string'
    ? invoice.customer
    : invoice.customer?.id;

  if (!customerId) return;

  const supabase = getServiceClient();

  // Out-of-order resilience: invoice.paid may fire before checkout completes
  // for the very first subscription invoice. Find or create by Stripe email.
  const user = await resolveSubscriptionUser(supabase, customerId);
  if (!user) return;

  // Determine payment type and tier-aware description from invoice lines.
  // In Stripe API 2026-04-22+, the subscription field moved to
  // line.parent.subscription_item_details.subscription. The pre-2025 path
  // `line.subscription` no longer exists.
  const isSubscription = invoice.lines?.data?.some(
    (line) => line.parent?.subscription_item_details?.subscription != null,
  );

  let paymentType: string;
  let description: string | null;

  if (isSubscription) {
    const priceField = invoice.lines?.data?.[0]?.pricing?.price_details?.price;
    const priceId =
      typeof priceField === 'string' ? priceField : (priceField?.id ?? undefined);
    const tier = priceId ? resolveSubscriptionTier(priceId) : undefined;
    paymentType = tier ? paymentTypeForRenewal(tier) : 'vault_renewal';
    description =
      tier === 'community'
        ? 'HonuVibe Community — Monthly'
        : 'HonuVibe Vault — Monthly';
  } else {
    paymentType = 'course_purchase';
    description = invoice.lines?.data?.[0]?.description ?? null;
  }

  // Check idempotency.
  const { data: existing } = await supabase
    .from('payments')
    .select('id')
    .eq('stripe_invoice_id', invoice.id)
    .maybeSingle();

  if (existing) return;

  await supabase.from('payments').insert({
    user_id: user.id,
    type: paymentType,
    stripe_invoice_id: invoice.id,
    stripe_payment_intent_id: null,
    amount: invoice.amount_paid,
    currency: invoice.currency,
    status: 'succeeded',
    receipt_url: invoice.hosted_invoice_url ?? null,
    description,
  });
}

async function handleESLPurchaseCompleted(
  session: Stripe.Checkout.Session,
  userId: string,
  courseId: string,
  currency: string,
): Promise<void> {
  const supabase = getServiceClient();

  // Idempotency: skip if purchase already exists
  const { data: existing } = await supabase
    .from('esl_purchases')
    .select('id')
    .eq('user_id', userId)
    .eq('course_id', courseId)
    .maybeSingle();

  if (existing) {
    console.log('[Stripe Webhook] ESL purchase already exists, skipping');
    return;
  }

  // Create ESL purchase record
  const { error: purchaseError } = await supabase.from('esl_purchases').insert({
    user_id: userId,
    course_id: courseId,
    stripe_checkout_session_id: session.id,
    amount_paid: session.amount_total ?? 0,
    currency,
  });

  if (purchaseError) {
    console.error('[Stripe Webhook] Failed to create ESL purchase:', purchaseError);
    throw purchaseError;
  }

  // Log payment record
  await supabase.from('payments').insert({
    user_id: userId,
    type: 'esl_purchase',
    course_id: courseId,
    stripe_checkout_session_id: session.id,
    stripe_payment_intent_id:
      typeof session.payment_intent === 'string'
        ? session.payment_intent
        : (session.payment_intent?.id ?? null),
    amount: session.amount_total ?? 0,
    currency,
    status: 'succeeded',
    receipt_url: null,
    description: 'ESL English Study Add-On',
  });
}
