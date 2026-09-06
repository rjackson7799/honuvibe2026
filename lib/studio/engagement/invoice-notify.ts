// Ryan's "money moved" notification. A plain server module (NOT 'use
// server') — the notify.ts rule: it takes a Supabase client and rows, so
// exporting it from an actions file would make it a public server-action
// endpoint with attacker-controlled arguments. Called from the Stripe webhook
// handler AFTER the RPC commits.
//
// Best-effort, not transactional: the durable "Ryan must look at this" signal
// is the needs_attention event the RPC already wrote. An email failure must
// never turn the webhook into a 500 — Stripe would retry and re-hit the
// no-op RPC anyway — so every path here swallows its error into an event.

import type { SupabaseClient } from '@supabase/supabase-js';
import { sendInvoicePaidAdminNotification } from './emails';
import { formatMinorUnits } from './format';
import { invoiceNoun } from './invoice-math';
import { adminEngagementUrl } from './notify';
import type { EngagementCurrency } from './types';

export type InvoiceNotifyVariant = 'paid' | 'paid_on_void' | 'duplicate_payment' | 'not_found';

export interface InvoiceNotifyInput {
  engagementId: string | null;
  /** Falls back to a placeholder when the engagement is already gone. */
  businessName: string;
  contactName: string | null;
  contactEmail: string | null;
  kind: string;
  pct: number | null;
  amount: number;
  currency: EngagementCurrency;
  version: number | null;
  paymentIntentId: string | null;
}

/**
 * Send Ryan the notification for one money event and record the outcome on
 * the timeline. `notification_sent` / `notification_failed` are written only
 * when there is still an engagement to attach them to (the `not_found`
 * variant fires precisely because there is not).
 */
export async function notifyInvoicePaid(
  admin: SupabaseClient,
  input: InvoiceNotifyInput,
  variant: InvoiceNotifyVariant,
): Promise<{ ok: boolean; error?: string }> {
  const amount = formatMinorUnits(input.amount, input.currency);
  const sent = await sendInvoicePaidAdminNotification({
    businessName: input.businessName,
    contactName: input.contactName,
    contactEmail: input.contactEmail,
    kind: invoiceNoun(input.kind, input.pct),
    amount,
    currency: input.currency,
    pct: input.pct,
    version: input.version,
    variant,
    paymentIntentId: input.paymentIntentId,
    engagementUrl: input.engagementId ? adminEngagementUrl(input.engagementId) : '',
  });

  if (!input.engagementId) {
    if (!sent.ok) console.error('[invoice] orphan payment notification failed:', sent.error);
    return sent.ok ? { ok: true } : { ok: false, error: sent.error };
  }

  const label = `${invoiceNoun(input.kind, input.pct)} ${amount}`;
  if (sent.ok) {
    const { error } = await admin.from('engagement_events').insert({
      engagement_id: input.engagementId,
      kind: 'notification_sent',
      actor: 'system',
      summary: `Payment notification (${variant}) for ${label} emailed to the studio`,
      data: { variant, amount: input.amount, currency: input.currency },
    });
    if (error) console.error('[invoice] notification_sent insert failed:', error);
    return { ok: true };
  }

  console.error('[invoice] payment notification failed:', sent.error);
  const { error } = await admin.from('engagement_events').insert({
    engagement_id: input.engagementId,
    kind: 'notification_failed',
    actor: 'system',
    summary: `Payment notification (${variant}) for ${label} FAILED — the payment is recorded; check RESEND_API_KEY / ADMIN_EMAIL`,
    data: { variant, amount: input.amount, currency: input.currency },
  });
  if (error) console.error('[invoice] notification_failed insert failed:', error);
  return { ok: false, error: sent.error };
}
