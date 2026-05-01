import type Stripe from 'stripe';
import { createClient } from '@supabase/supabase-js';
import { resolvePartnerIdBySlug } from '@/lib/partner-attribution';
import { persistEnrollmentSplit } from '@/lib/revenue-split/persist';

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
  const userId = session.metadata?.user_id;
  const courseId = session.metadata?.course_id;
  const currency = session.metadata?.currency ?? 'usd';
  const locale = session.metadata?.locale ?? 'en';

  if (!userId || !courseId) {
    console.error('[Stripe Webhook] Missing user_id or course_id in metadata');
    return;
  }

  // Route ESL add-on purchases to separate handler
  if (session.metadata?.type === 'esl_addon') {
    await handleESLPurchaseCompleted(session, userId, courseId, currency);
    return;
  }

  const supabase = getServiceClient();

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
  const partnerId = await resolvePartnerIdBySlug(
    supabase,
    session.metadata?.partner_slug,
  );

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
    console.warn(
      `[Stripe Webhook] No enrollment found for refunded payment intent ${paymentIntentId}`,
    );
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

export async function handleSubscriptionCreated(
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

  if (!user) {
    console.error('[Stripe Webhook] No user found for customer:', customerId);
    return;
  }

  const periodEnd = subscription.items.data[0]?.current_period_end;

  await supabase
    .from('users')
    .update({
      subscription_tier: 'premium',
      subscription_stripe_id: subscription.id,
      subscription_status: subscription.status,
      subscription_expires_at: periodEnd
        ? new Date(periodEnd * 1000).toISOString()
        : null,
    })
    .eq('id', user.id);
}

export async function handleSubscriptionUpdated(
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

  const status = subscription.cancel_at_period_end ? 'cancelled' : subscription.status;
  const periodEnd = subscription.items.data[0]?.current_period_end;

  await supabase
    .from('users')
    .update({
      subscription_status: status,
      subscription_expires_at: periodEnd
        ? new Date(periodEnd * 1000).toISOString()
        : null,
    })
    .eq('id', user.id);
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

  const { data: user } = await supabase
    .from('users')
    .select('id')
    .eq('stripe_customer_id', customerId)
    .single();

  if (!user) return;

  // Determine payment type from invoice lines
  const isSubscription = invoice.lines?.data?.some(
    (line) => line.subscription != null,
  );

  // Check idempotency
  const { data: existing } = await supabase
    .from('payments')
    .select('id')
    .eq('stripe_invoice_id', invoice.id)
    .maybeSingle();

  if (existing) return;

  await supabase.from('payments').insert({
    user_id: user.id,
    type: isSubscription ? 'vault_renewal' : 'course_purchase',
    stripe_invoice_id: invoice.id,
    stripe_payment_intent_id: null,
    amount: invoice.amount_paid,
    currency: invoice.currency,
    status: 'succeeded',
    receipt_url: invoice.hosted_invoice_url ?? null,
    description: isSubscription ? 'The Vault — Monthly Subscription' : (invoice.lines?.data?.[0]?.description ?? null),
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
