'use server';

// Studio invoices — admin server actions (slices 4 + 5, migrations 075/077).
// The proposal-actions.ts shape: requireAdmin(), zod parseInput, the
// service-role client, translateDbError (shared, from proposal-internals.ts),
// and revalidatePath on the engagement page + the list.
//
//   issueDeposit        the 075 RPC (which is the authority on the arithmetic,
//                       the slot and the minimums), then the delivery steps.
//   sendBalanceInvoice  the 077 RPC — draft -> sent on the balance row — then
//                       the SAME delivery steps.
//   resendInvoiceEmail  the delivery steps alone, for any `sent` invoice.
//
// Delivery is, in order: ROTATE the proposal token -> email the client the
// TOKENED ENTRY URL -> record the outcome truthfully. Rotation happens on
// EVERY issue and send on purpose (judgment call 10): a manually-accepted
// proposal has no token, a 45-day token may have expired, and the client may
// pay from another device — one path covers all three.
//
// THE FAILURE CONTRACT (slice 5). The invoice is `sent` the moment the RPC
// commits, and NOTHING after that may tell Ryan otherwise:
//
//   fails at the RPC            -> nothing changed; throw the translated error
//   fails at a post-commit read -> sent, { emailed: false, lookup_failed }
//   fails at the rotation       -> sent, old token valid, link_rotation_failed
//   fails at the email          -> sent, token rotated, email_failed
//   fails at the stamp          -> sent AND emailed; logged only
//
// Only the first row throws. Slice 4 got this wrong by accident: issueDeposit
// performed three THROWING reads after its RPC had already committed, which
// would have reported failure on an invoice that was live.
//
// invoice_email_sent_at means "THE CURRENT LINK has been delivered", not "an
// email once went out" — so a send that rotates the token and then fails to
// deliver CLEARS it, handing the panel's coral "not sent — resend below"
// branch the truth. A send whose ROTATION failed leaves it alone: the old
// token still works, so the earlier email still reaches something.
//
// The plaintext token exists in this scope and the outgoing email ONLY — never
// in the DB, an event or a log. The email links to the PROPOSAL PAGE, never to
// Stripe: the Checkout Session is minted on demand behind the cookie, so no
// durable payment URL ever reaches an inbox.

import { revalidatePath } from 'next/cache';
import { z } from 'zod';
import type { SupabaseClient } from '@supabase/supabase-js';
import { createClient, createAdminClient } from '@/lib/supabase/server';
import { sendInvoiceRequestEmail } from './emails';
import { formatMinorUnits } from './format';
import { invoiceNoun } from './invoice-math';
import { selectDepositInvoice } from './invoice-selection';
import { formatClientDate, rotateProposalToken, translateDbError } from './proposal-internals';
import { proposalEntryUrl } from './proposal-token';
import { DEPOSIT_PCTS } from './types';
import type { Engagement, EngagementInvoice, EngagementProposal } from '@/lib/admin/types';

async function requireAdmin(): Promise<void> {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) throw new Error('Not authenticated');
  const { data: profile } = await supabase.from('users').select('role').eq('id', user.id).maybeSingle();
  if (profile?.role !== 'admin') throw new Error('Not authorized');
}

function parseInput<S extends z.ZodTypeAny>(schema: S, input: unknown): z.infer<S> {
  const result = schema.safeParse(input);
  if (!result.success) throw new Error(`Invalid input — ${result.error.issues.map((i) => i.message).join(' ')}`);
  return result.data;
}

const uuidSchema = z.string().uuid();
const pctSchema = z.union([z.literal(50), z.literal(100)]);

function revalidate(engagementId: string): void {
  revalidatePath(`/admin/studio/engagements/${engagementId}`);
  revalidatePath('/admin/studio/engagements');
}

async function loadInvoice(admin: SupabaseClient, invoiceId: string): Promise<EngagementInvoice> {
  const { data, error } = await admin.from('engagement_invoices').select('*').eq('id', invoiceId).maybeSingle();
  if (error) {
    console.error('[invoice] load failed:', error);
    throw new Error('Failed to load the invoice.');
  }
  if (!data) throw new Error('Invoice not found.');
  return data as unknown as EngagementInvoice;
}

async function loadProposal(admin: SupabaseClient, proposalId: string): Promise<EngagementProposal> {
  const { data, error } = await admin.from('engagement_proposals').select('*').eq('id', proposalId).maybeSingle();
  if (error) {
    console.error('[invoice] proposal load failed:', error);
    throw new Error('Failed to load the proposal.');
  }
  if (!data) throw new Error('Proposal not found.');
  return data as unknown as EngagementProposal;
}

async function loadEngagement(admin: SupabaseClient, engagementId: string): Promise<Engagement> {
  const { data, error } = await admin.from('engagements').select('*').eq('id', engagementId).maybeSingle();
  if (error) {
    console.error('[invoice] engagement load failed:', error);
    throw new Error('Failed to load the engagement.');
  }
  if (!data) throw new Error('Engagement not found.');
  return data as unknown as Engagement;
}

export interface InvoiceEmailResult {
  invoiceId: string;
  amount: number;
  currency: 'USD' | 'JPY';
  /** True once the RPC committed — the invoice IS billed, whatever follows. */
  sent: boolean;
  emailed: boolean;
  /** Why the client was not emailed. Absent when `emailed` is true. */
  reason?: 'lookup_failed' | 'link_rotation_failed' | 'email_failed' | 'no_recipient';
}

/** Slice 4's name for the same shape, kept so no call site breaks. */
export type DepositEmailResult = InvoiceEmailResult;

/** engagement_events is append-only, so a failure is a NEW row, never an edit. */
async function recordNotificationFailure(
  admin: SupabaseClient,
  engagementId: string,
  invoiceId: string,
  noun: string,
  detail: string,
): Promise<void> {
  const { error } = await admin.from('engagement_events').insert({
    engagement_id: engagementId,
    kind: 'notification_failed',
    actor: 'system',
    summary: `${noun} email FAILED (${detail}) — resend from the proposal panel`,
    data: { invoice_id: invoiceId, emailed: false },
  });
  if (error) console.error('[invoice] notification_failed insert failed:', error);
}

/**
 * The delivery steps, shared by every action: rotate the token, email the
 * client the tokened entry URL, then record the outcome TRUTHFULLY. NEVER
 * throws — by the time it runs the invoice is already live, so a failure here
 * is a delivery fact to report, not an operation to abort.
 */
async function sendInvoiceLink(
  admin: SupabaseClient,
  invoice: EngagementInvoice,
  proposal: EngagementProposal,
  engagement: Engagement,
  deposit: EngagementInvoice | null,
): Promise<{ emailed: boolean; reason?: InvoiceEmailResult['reason'] }> {
  const noun = invoiceNoun(invoice.kind, invoice.pct_of_build);
  const email = invoice.recipient_email?.trim() || engagement.client_contact_email?.trim() || '';
  if (!email) {
    await recordNotificationFailure(admin, engagement.id, invoice.id, noun, 'no contact email');
    return { emailed: false, reason: 'no_recipient' };
  }

  const now = new Date();
  let rotated: Awaited<ReturnType<typeof rotateProposalToken>>;
  try {
    rotated = await rotateProposalToken(admin, proposal, now);
  } catch (err) {
    // The old token still works, so the PREVIOUS email — and its stamp — are
    // still valid. Leave invoice_email_sent_at alone.
    console.error('[invoice] token rotation failed:', err);
    await recordNotificationFailure(admin, engagement.id, invoice.id, noun, 'the link could not be rotated');
    return { emailed: false, reason: 'link_rotation_failed' };
  }

  const sent = await sendInvoiceRequestEmail({
    variant: invoice.kind === 'balance' ? 'balance' : 'deposit',
    locale: proposal.locale,
    email,
    contactName: engagement.client_contact_name,
    businessName: engagement.title,
    amount: formatMinorUnits(invoice.amount, invoice.currency),
    pct: invoice.pct_of_build ?? 100,
    entryUrl: proposalEntryUrl(rotated.token),
    linkExpiresOn: formatClientDate(rotated.expires, proposal.locale),
    version: proposal.version,
    // The STATUS, not paid_at: a refunded deposit keeps its timestamp, and the
    // client must never be told that refunded money was received.
    depositStatus: deposit?.status ?? null,
    depositAmount: deposit ? formatMinorUnits(deposit.amount, deposit.currency) : null,
  });

  if (sent.ok) {
    const { error } = await admin
      .from('engagement_invoices')
      .update({ invoice_email_sent_at: now.toISOString() })
      .eq('id', invoice.id);
    // The email DID go out; a failed stamp is a bookkeeping miss, not a
    // delivery failure, so it is logged and nothing more.
    if (error) console.error('[invoice] invoice_email_sent_at stamp failed:', error);
    return { emailed: true };
  }

  // The token rotated, so any earlier email now carries a DEAD link. Clearing
  // the stamp is what stops the panel reporting a delivery that no longer
  // reaches anything.
  console.error('[invoice] request email failed:', sent.error);
  const { error: clearError } = await admin
    .from('engagement_invoices')
    .update({ invoice_email_sent_at: null })
    .eq('id', invoice.id);
  if (clearError) console.error('[invoice] invoice_email_sent_at clear failed:', clearError);
  await recordNotificationFailure(admin, engagement.id, invoice.id, noun, `to ${email}`);
  return { emailed: false, reason: 'email_failed' };
}

/**
 * The three post-commit reads, plus the deposit the balance copy needs. Never
 * throws: by the time this runs the invoice is live, and an unreadable row
 * must not be reported to Ryan as a failure to bill.
 */
async function loadDeliveryContext(
  admin: SupabaseClient,
  invoiceId: string,
  proposalId: string,
): Promise<{
  invoice: EngagementInvoice;
  proposal: EngagementProposal;
  engagement: Engagement;
  deposit: EngagementInvoice | null;
} | null> {
  try {
    const invoice = await loadInvoice(admin, invoiceId);
    const proposal = await loadProposal(admin, proposalId);
    const engagement = await loadEngagement(admin, invoice.engagement_id);
    const deposit = invoice.kind === 'balance' ? await selectDepositInvoice(admin, proposalId) : null;
    return { invoice, proposal, engagement, deposit };
  } catch (err) {
    console.error('[invoice] post-commit read failed:', err);
    return null;
  }
}

/**
 * Everything after a committed RPC: read the context, deliver the link, and
 * report what actually happened. `sent` is true unconditionally — the money
 * row exists, and that is the fact Ryan is owed.
 */
async function deliverAfterCommit(
  admin: SupabaseClient,
  billed: { invoiceId: string; proposalId: string | null; amount: number; currency: 'USD' | 'JPY' },
): Promise<InvoiceEmailResult> {
  const base = {
    invoiceId: billed.invoiceId,
    amount: billed.amount,
    currency: billed.currency,
    sent: true,
  };

  const ctx = billed.proposalId ? await loadDeliveryContext(admin, billed.invoiceId, billed.proposalId) : null;
  if (!ctx) return { ...base, emailed: false, reason: 'lookup_failed' };

  const delivery = await sendInvoiceLink(admin, ctx.invoice, ctx.proposal, ctx.engagement, ctx.deposit);
  revalidate(ctx.engagement.id);
  return { ...base, amount: ctx.invoice.amount, currency: ctx.invoice.currency, ...delivery };
}

/**
 * "Request deposit" on the accepted proposal. The RPC is the authority: it
 * locks engagement -> proposal, refuses a terminal engagement, an unaccepted
 * proposal, a bad percentage, a zero build, a second live deposit and an
 * amount under the Stripe minimum, and it writes both invoice rows plus the
 * invoice_issued event in one transaction.
 */
export async function issueDeposit(proposalId: string, pct: number): Promise<InvoiceEmailResult> {
  await requireAdmin();
  const pid = parseInput(uuidSchema, proposalId);
  const percentage = parseInput(pctSchema, pct);
  if (!(DEPOSIT_PCTS as readonly number[]).includes(percentage)) {
    throw new Error('Choose 50% or 100% — no other split is supported.');
  }
  const admin = createAdminClient();

  const { data, error } = await admin.rpc('issue_engagement_deposit', {
    p_proposal_id: pid,
    p_pct: percentage,
  });
  if (error) throw translateDbError(error, 'Failed to request the deposit.');
  const result = (data ?? {}) as { invoice_id?: string; amount?: number; currency?: 'USD' | 'JPY' };
  if (!result.invoice_id) throw new Error('Failed to request the deposit.');

  return deliverAfterCommit(admin, {
    invoiceId: result.invoice_id,
    proposalId: pid,
    amount: result.amount ?? 0,
    currency: result.currency ?? 'USD',
  });
}

/**
 * "Send balance" on the accepted proposal, once the build has shipped. The 077
 * RPC is the authority: it locks engagement -> proposal -> invoice, refuses a
 * terminal engagement, refuses anything before `launch`, refuses an unaccepted
 * proposal, and returns a TRUTHFUL verdict per invoice status rather than a
 * blanket "already sent".
 */
export async function sendBalanceInvoice(invoiceId: string): Promise<InvoiceEmailResult> {
  await requireAdmin();
  const iid = parseInput(uuidSchema, invoiceId);
  const admin = createAdminClient();

  const { data, error } = await admin.rpc('send_engagement_invoice', { p_invoice_id: iid });
  if (error) throw translateDbError(error, 'Failed to send the balance.');

  const result = (data ?? {}) as {
    applied?: boolean;
    reason?: string;
    invoice_id?: string;
    amount?: number;
    currency?: 'USD' | 'JPY';
  };
  if (!result.applied) {
    // Verdicts, not DB errors — mapped here the way voidProposalAcceptance
    // maps invoice_paid. Each says which of the four states it actually is.
    throw new Error(
      result.reason === 'already_sent'
        ? 'The balance has already been sent — use Resend balance email instead.'
        : result.reason === 'already_paid'
          ? 'The balance has already been paid.'
          : result.reason === 'voided'
            ? 'That balance was voided — it cannot be sent.'
            : 'Failed to send the balance.',
    );
  }

  // Past this line the invoice IS `sent`. Nothing below may throw.
  const billedId = (result.invoice_id as string | undefined) ?? iid;
  let proposalId: string | null = null;
  try {
    proposalId = (await loadInvoice(admin, billedId)).proposal_id;
  } catch (err) {
    console.error('[invoice] post-commit invoice read failed:', err);
  }

  return deliverAfterCommit(admin, {
    invoiceId: billedId,
    proposalId,
    amount: result.amount ?? 0,
    currency: result.currency ?? 'USD',
  });
}

/**
 * Resend the request email for any `sent` invoice — deposit or balance.
 * Rotates the link again (the same reasoning as issue), so an open client tab
 * is asked to reopen from the email, which the proposal page already says in
 * so many words.
 */
export async function resendInvoiceEmail(invoiceId: string): Promise<InvoiceEmailResult> {
  await requireAdmin();
  const iid = parseInput(uuidSchema, invoiceId);
  const admin = createAdminClient();

  const invoice = await loadInvoice(admin, iid);
  const noun = invoiceNoun(invoice.kind, invoice.pct_of_build).toLowerCase();
  if (invoice.status !== 'sent') {
    throw new Error(
      invoice.status === 'draft'
        ? 'This invoice has not been issued yet.'
        : `A ${noun} that is ${invoice.status} has nothing to request.`,
    );
  }
  if (!invoice.proposal_id) throw new Error('This invoice is not attached to a proposal.');

  const proposal = await loadProposal(admin, invoice.proposal_id);
  if (proposal.status !== 'accepted') throw new Error('The proposal is no longer accepted.');
  const engagement = await loadEngagement(admin, invoice.engagement_id);
  // 077 keeps invoices alive through a close, so `sent` + terminal is now a
  // reachable state that 075 could never produce. Emailing a fresh link there
  // would invite a payment begin_engagement_invoice_checkout is going to
  // refuse.
  if (engagement.stage === 'lost' || engagement.stage === 'closed') {
    throw new Error('This engagement is closed — reopen it before sending payment links.');
  }
  if (!engagement.client_contact_email?.trim() && !invoice.recipient_email) {
    throw new Error('Add a client contact email to the engagement before sending a link.');
  }

  const deposit = invoice.kind === 'balance' ? await selectDepositInvoice(admin, invoice.proposal_id) : null;
  const delivery = await sendInvoiceLink(admin, invoice, proposal, engagement, deposit);
  revalidate(invoice.engagement_id);
  return {
    invoiceId: invoice.id,
    amount: invoice.amount,
    currency: invoice.currency,
    sent: true,
    ...delivery,
  };
}

/** Slice 4's name, kept so no call site breaks. */
export async function resendDepositEmail(invoiceId: string): Promise<InvoiceEmailResult> {
  return resendInvoiceEmail(invoiceId);
}
