// Studio engagement invoices on Stripe (slice 4, migration 075): the pure
// Checkout-params builder and the four webhook handlers.
//
// THE ONE RULE: every Checkout param is built from IMMUTABLE invoice and
// proposal columns handed back by begin_engagement_invoice_checkout — never
// read live. The request carries an idempotency key of
// `engagement_invoice:<invoice_id>:<attempt>`, so Stripe replays the same
// session for 24 h; if any param could drift between two clicks (a title Ryan
// edited, a contact email he corrected, a header-derived origin) Stripe would
// reject the second call with an idempotency_error. Hence the snapshotted
// recipient_email on the row and NEXT_PUBLIC_SITE_URL before the request
// origin — the reverse of the course checkout route, deliberately.
//
// THE WEBHOOK IS THE TRUTH. Nothing here trusts the client: the session's
// metadata.checkout_kind + a UUID invoice id are the only inputs, and the RPC
// re-derives amount, currency and status from the row.
//
// NOT passed, on purpose: `payment_method_types` (dynamic payment methods are
// the Stripe rule); `allow_promotion_codes` / `discounts` (the charge must
// equal the invoice row exactly); `expires_at` (Stripe's 24 h default, and
// the row stores what the response reports); `integration_identifier` (needs
// API >= 2026-03-25.dahlia and we stay pinned on 2026-02-25.clover).
//
// NEVER stored anywhere: the Checkout URL, any card detail, the customer id,
// the raw event body.

import type Stripe from 'stripe';
import type { SupabaseClient } from '@supabase/supabase-js';
import { notifyInvoicePaid, type InvoiceNotifyVariant } from '@/lib/studio/engagement/invoice-notify';
import type { EngagementCurrency } from '@/lib/studio/engagement/types';

export const ENGAGEMENT_INVOICE_CHECKOUT_KIND = 'engagement_invoice';

const UUID_RE = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i;
const EMAIL_RE = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;

/** Exactly what begin_engagement_invoice_checkout returns on applied:true. */
export interface EngagementInvoiceCheckoutInput {
  invoiceId: string;
  attempt: number;
  amount: number;
  currency: EngagementCurrency;
  label: string;
  recipientEmail: string | null;
  engagementId: string;
  proposalId: string;
  locale: 'en' | 'ja';
}

/** `engagement_invoice:<invoice id>:<mint attempt>` — one session per attempt. */
export function idempotencyKeyFor(invoiceId: string, attempt: number): string {
  return `engagement_invoice:${invoiceId}:${attempt}`;
}

/** True for the Stripe error raised when a key is reused with different params. */
export function isStripeIdempotencyError(err: unknown): boolean {
  if (!err || typeof err !== 'object') return false;
  const e = err as { type?: unknown; code?: unknown; rawType?: unknown };
  return (
    e.type === 'StripeIdempotencyError' ||
    e.rawType === 'idempotency_error' ||
    e.code === 'idempotency_key_in_use'
  );
}

/**
 * The origin for the success/cancel URLs. NEXT_PUBLIC_SITE_URL FIRST (the
 * reverse of app/api/stripe/checkout/route.ts): a header-derived origin could
 * differ between two clicks (www vs apex) and break the idempotency key.
 */
function originFor(requestOrigin?: string | null): string {
  const configured = process.env.NEXT_PUBLIC_SITE_URL?.trim();
  const base = configured || requestOrigin?.trim() || 'http://localhost:3000';
  return base.replace(/\/+$/, '');
}

/**
 * The Checkout Session params for one engagement invoice. PURE and
 * DETERMINISTIC: the same input always produces deep-equal params, which is
 * what makes the idempotency key safe.
 */
export function buildEngagementInvoiceSessionParams(
  input: EngagementInvoiceCheckoutInput,
  requestOrigin?: string | null,
): Stripe.Checkout.SessionCreateParams {
  const origin = originFor(requestOrigin);
  const localePrefix = input.locale === 'ja' ? '/ja' : '';
  const email = input.recipientEmail && EMAIL_RE.test(input.recipientEmail) ? input.recipientEmail : undefined;

  return {
    mode: 'payment',
    client_reference_id: input.invoiceId,
    ...(email ? { customer_email: email } : {}),
    line_items: [
      {
        quantity: 1,
        price_data: {
          currency: input.currency.toLowerCase(),
          unit_amount: input.amount, // minor units: cents, or whole yen (zero-decimal)
          product_data: { name: input.label },
        },
      },
    ],
    metadata: {
      checkout_kind: ENGAGEMENT_INVOICE_CHECKOUT_KIND,
      engagement_id: input.engagementId,
      invoice_id: input.invoiceId,
      proposal_id: input.proposalId,
      currency: input.currency,
      locale: input.locale,
    },
    locale: input.locale,
    success_url: `${origin}${localePrefix}/proposal/${input.proposalId}?paid=1`,
    cancel_url: `${origin}${localePrefix}/proposal/${input.proposalId}`,
  };
}

// ── Webhook side ────────────────────────────────────────────────────────────

/** True only for a session this module minted. */
export function isEngagementInvoiceSession(session: Stripe.Checkout.Session): boolean {
  return session.metadata?.checkout_kind === ENGAGEMENT_INVOICE_CHECKOUT_KIND;
}

function invoiceIdOf(session: Stripe.Checkout.Session): string | null {
  const candidate = session.metadata?.invoice_id ?? session.client_reference_id ?? null;
  return candidate && UUID_RE.test(candidate) ? candidate : null;
}

function paymentIntentIdOf(session: Stripe.Checkout.Session): string | null {
  const pi = session.payment_intent;
  if (typeof pi === 'string') return pi;
  return pi?.id ?? null;
}

/** The rows the notification needs, loaded after the RPC committed. */
async function notifyContext(
  supabase: SupabaseClient,
  invoiceId: string,
  session: Stripe.Checkout.Session,
) {
  const { data: invoice } = await supabase
    .from('engagement_invoices')
    .select('engagement_id, proposal_id, kind, pct_of_build, amount, currency')
    .eq('id', invoiceId)
    .maybeSingle();

  const engagementId = (invoice?.engagement_id as string | undefined) ?? session.metadata?.engagement_id ?? null;
  const [{ data: engagement }, { data: proposal }] = await Promise.all([
    engagementId
      ? supabase.from('engagements').select('title, client_contact_name, client_contact_email').eq('id', engagementId).maybeSingle()
      : Promise.resolve({ data: null }),
    invoice?.proposal_id
      ? supabase.from('engagement_proposals').select('version').eq('id', invoice.proposal_id as string).maybeSingle()
      : Promise.resolve({ data: null }),
  ]);

  const fallbackAmount = session.amount_total ?? 0;
  const fallbackCurrency = (session.currency ?? 'usd').toUpperCase() === 'JPY' ? 'JPY' : 'USD';
  return {
    engagementId,
    businessName: (engagement?.title as string | undefined) ?? '(engagement no longer exists)',
    contactName: (engagement?.client_contact_name as string | null | undefined) ?? null,
    contactEmail: (engagement?.client_contact_email as string | null | undefined) ?? null,
    kind: (invoice?.kind as string | undefined) ?? 'deposit',
    pct: (invoice?.pct_of_build as number | null | undefined) ?? null,
    amount: (invoice?.amount as number | undefined) ?? fallbackAmount,
    currency: ((invoice?.currency as EngagementCurrency | undefined) ?? fallbackCurrency) as EngagementCurrency,
    version: (proposal?.version as number | null | undefined) ?? null,
    paymentIntentId: paymentIntentIdOf(session),
  };
}

async function notify(
  supabase: SupabaseClient,
  invoiceId: string,
  session: Stripe.Checkout.Session,
  variant: InvoiceNotifyVariant,
): Promise<void> {
  try {
    const ctx = await notifyContext(supabase, invoiceId, session);
    await notifyInvoicePaid(supabase, ctx, variant);
  } catch (err) {
    // An email failure must never become a 500: Stripe would retry into a
    // no-op RPC and the money is already recorded.
    console.error('[engagement-invoice] notification failed:', err);
  }
}

/**
 * `checkout.session.completed` / `async_payment_succeeded` for an engagement
 * invoice. Order matters:
 *   1. resolve the invoice id (metadata, then client_reference_id);
 *   2. a session that completed UNPAID is a delayed payment method — stamp
 *      the row so it refuses a second mint, and return;
 *   3. call the RPC;
 *   4. map applied:false — `already_paid` is a replay (quiet), and
 *      `duplicate_payment` / `not_found` each email Ryan and return 200
 *      (retrying cannot help either of them);
 *   5. `invoice_amount_mismatch` writes invoice_payment_failed and returns
 *      200 — Stripe must not retry into the same wall. Anything else THROWS
 *      so Stripe retries.
 */
export async function fulfillEngagementInvoiceCheckout(
  supabase: SupabaseClient,
  session: Stripe.Checkout.Session,
): Promise<void> {
  const invoiceId = invoiceIdOf(session);
  if (!invoiceId) {
    console.error('[engagement-invoice] session has no usable invoice id:', session.id);
    return;
  }

  if (session.payment_status === 'unpaid') {
    const { error } = await supabase.rpc('mark_engagement_invoice_awaiting_async', {
      p_invoice_id: invoiceId,
      p_session_id: session.id,
      p_clear: false,
    });
    if (error) console.error('[engagement-invoice] awaiting_async RPC failed:', error.message);
    return;
  }

  const paymentIntentId = paymentIntentIdOf(session);
  const { data, error } = await supabase.rpc('mark_engagement_invoice_paid', {
    p_invoice_id: invoiceId,
    p_session_id: session.id,
    p_payment_intent_id: paymentIntentId,
    p_amount_total: session.amount_total,
    p_currency: session.currency,
  });

  if (error) {
    if (error.message.includes('invoice_amount_mismatch')) {
      console.error('[engagement-invoice] amount/currency mismatch on', invoiceId);
      const { data: row } = await supabase
        .from('engagement_invoices').select('engagement_id').eq('id', invoiceId).maybeSingle();
      const engagementId = (row?.engagement_id as string | undefined) ?? session.metadata?.engagement_id;
      if (engagementId) {
        await supabase.from('engagement_events').insert({
          engagement_id: engagementId,
          kind: 'invoice_payment_failed',
          actor: 'system',
          summary: 'A payment arrived for an amount that does not match the invoice — check it in Stripe',
          data: {
            invoice_id: invoiceId,
            reason: 'amount_mismatch',
            session_id: session.id,
            amount_total: session.amount_total,
            currency: session.currency,
          },
          needs_attention: true,
        });
      }
      return; // 200: retrying cannot help.
    }
    throw new Error(`mark_engagement_invoice_paid failed: ${error.message}`);
  }

  const result = (data ?? {}) as { applied?: boolean; reason?: string; on_void?: boolean };
  if (!result.applied) {
    switch (result.reason) {
      case 'already_paid':
        return; // A replay of the same payment intent.
      case 'duplicate_payment':
        await notify(supabase, invoiceId, session, 'duplicate_payment');
        return;
      case 'not_found':
        await notify(supabase, invoiceId, session, 'not_found');
        return;
      default:
        console.error('[engagement-invoice] unexpected mark_paid verdict:', result.reason);
        return;
    }
  }

  await notify(supabase, invoiceId, session, result.on_void ? 'paid_on_void' : 'paid');
}

/**
 * `checkout.session.async_payment_succeeded`. ENGAGEMENT-ONLY: it must never
 * fall through to handleCheckoutCompleted, whose partner branch re-runs
 * fulfillPartnerMembership and whose subscription branch re-sends the welcome
 * email on every call. Course and partner sessions keep today's behaviour of
 * being ignored for this event.
 */
export async function handleEngagementInvoiceAsyncSucceeded(
  supabase: SupabaseClient,
  session: Stripe.Checkout.Session,
): Promise<void> {
  if (!isEngagementInvoiceSession(session)) {
    console.log('[engagement-invoice] async_payment_succeeded ignored (not an engagement invoice):', session.id);
    return;
  }
  await fulfillEngagementInvoiceCheckout(supabase, session);
}

/**
 * `checkout.session.async_payment_failed`. Clears the pending flag so the
 * client can pay again and writes the attention event. The row stays `sent`
 * and the band offers Pay again. No email — the flag is enough for a rare
 * event (judgment call 7).
 */
export async function handleEngagementInvoiceAsyncFailed(
  supabase: SupabaseClient,
  session: Stripe.Checkout.Session,
): Promise<void> {
  if (!isEngagementInvoiceSession(session)) return;
  const invoiceId = invoiceIdOf(session);
  if (!invoiceId) {
    console.error('[engagement-invoice] async_payment_failed has no usable invoice id:', session.id);
    return;
  }

  const { error } = await supabase.rpc('mark_engagement_invoice_awaiting_async', {
    p_invoice_id: invoiceId,
    p_session_id: session.id,
    p_clear: true,
  });
  if (error) console.error('[engagement-invoice] clear awaiting_async failed:', error.message);

  const engagementId = session.metadata?.engagement_id ?? null;
  if (engagementId) {
    await supabase.from('engagement_events').insert({
      engagement_id: engagementId,
      kind: 'invoice_payment_failed',
      actor: 'system',
      summary: "The client's delayed payment did not go through — they can pay again from the proposal page",
      data: { invoice_id: invoiceId, reason: 'async_payment_failed', session_id: session.id },
      needs_attention: true,
    });
  }
}

/**
 * `checkout.session.expired`. Re-arms the mint WITH the session id, so a
 * stale event for a session the 60 s margin already replaced matches nothing.
 * No event — an expired session is not a business fact.
 */
export async function handleEngagementInvoiceExpired(
  supabase: SupabaseClient,
  session: Stripe.Checkout.Session,
): Promise<void> {
  if (!isEngagementInvoiceSession(session)) return;
  const invoiceId = invoiceIdOf(session);
  if (!invoiceId) return;

  const { error } = await supabase.rpc('rearm_engagement_invoice_checkout', {
    p_invoice_id: invoiceId,
    p_session_id: session.id,
  });
  if (error) console.error('[engagement-invoice] rearm on expiry failed:', error.message);
}

/**
 * The `charge.refunded` block. Returns TRUE when the charge belonged to an
 * engagement invoice (whatever the verdict) so the caller returns without
 * touching the `payments` table or the enrollment branch; FALSE means "not
 * ours" and today's course/partner code runs unchanged.
 *
 * No email: the needs_attention invoice_refunded event the RPC wrote is the
 * signal (judgment call 7).
 */
export async function handleEngagementInvoiceRefunded(
  supabase: SupabaseClient,
  paymentIntentId: string,
  amountRefunded: number,
): Promise<boolean> {
  const { data, error } = await supabase.rpc('mark_engagement_invoice_refunded', {
    p_payment_intent_id: paymentIntentId,
    p_amount_refunded: amountRefunded,
  });
  if (error) {
    // A genuine RPC failure is NOT "the charge wasn't ours". Throw so the
    // route 500s and Stripe retries: the RPC is idempotent (a replay of the
    // same cumulative figure is `already_refunded`), and silently falling
    // through would leave a real refund recorded only inside Stripe. Same
    // reasoning as mark_engagement_invoice_paid's unexpected-error path.
    throw new Error(`mark_engagement_invoice_refunded failed: ${error.message}`);
  }
  const result = (data ?? {}) as { applied?: boolean; reason?: string };
  if (result.applied) return true;
  return result.reason === 'not_paid' || result.reason === 'already_refunded';
}
