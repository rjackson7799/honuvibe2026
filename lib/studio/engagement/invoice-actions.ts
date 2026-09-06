'use server';

// Studio deposit — admin server actions (slice 4, migration 075). The
// proposal-actions.ts shape: requireAdmin(), zod parseInput, the service-role
// client, translateDbError (shared, from proposal-internals.ts), and
// revalidatePath on the engagement page + the list.
//
//   issueDeposit        the RPC (which is the authority on the arithmetic,
//                       the slot and the minimums), then, in order:
//                       ROTATE the proposal token → email the client the
//                       TOKENED ENTRY URL → stamp invoice_email_sent_at on
//                       provider success, or write notification_failed.
//                       Rotation happens on EVERY issue on purpose (judgment
//                       call 10): a manually-accepted proposal has no token,
//                       a 45-day token may have expired, and the client may
//                       pay from another device — one path covers all three.
//   resendDepositEmail  the same steps 2–4 for a deposit already issued.
//
// The plaintext token exists in this scope and the outgoing email ONLY — never
// in the DB, an event or a log. The email links to the PROPOSAL PAGE, never to
// Stripe: the Checkout Session is minted on demand behind the cookie, so no
// durable payment URL ever reaches an inbox.

import { revalidatePath } from 'next/cache';
import { z } from 'zod';
import type { SupabaseClient } from '@supabase/supabase-js';
import { createClient, createAdminClient } from '@/lib/supabase/server';
import { sendDepositRequestEmail } from './emails';
import { formatMinorUnits } from './format';
import { invoiceNoun } from './invoice-math';
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

export interface DepositEmailResult {
  invoiceId: string;
  amount: number;
  currency: 'USD' | 'JPY';
  emailed: boolean;
}

/**
 * Steps 2–4, shared by issueDeposit and resendDepositEmail: rotate the token,
 * send the client the tokened entry URL, then record the delivery TRUTHFULLY
 * — invoice_email_sent_at on provider success (engagement_events is
 * append-only, so delivery state is a column), a notification_failed event
 * otherwise, exactly as emailProposalLink's failure branch does.
 */
async function sendDepositLink(
  admin: SupabaseClient,
  invoice: EngagementInvoice,
  proposal: EngagementProposal,
  engagement: Engagement,
): Promise<boolean> {
  const email = invoice.recipient_email?.trim() || engagement.client_contact_email?.trim() || '';
  const now = new Date();
  const { token, expires } = await rotateProposalToken(admin, proposal, now);

  const sent = email
    ? await sendDepositRequestEmail({
        locale: proposal.locale,
        email,
        contactName: engagement.client_contact_name,
        businessName: engagement.title,
        amount: formatMinorUnits(invoice.amount, invoice.currency),
        pct: invoice.pct_of_build ?? 100,
        entryUrl: proposalEntryUrl(token),
        linkExpiresOn: formatClientDate(expires, proposal.locale),
        version: proposal.version,
      })
    : { ok: false, error: 'no_recipient' };

  if (sent.ok) {
    const { error } = await admin
      .from('engagement_invoices')
      .update({ invoice_email_sent_at: now.toISOString() })
      .eq('id', invoice.id);
    if (error) console.error('[invoice] invoice_email_sent_at stamp failed:', error);
    return true;
  }

  console.error('[invoice] deposit email failed:', sent.error);
  const { error } = await admin.from('engagement_events').insert({
    engagement_id: engagement.id,
    kind: 'notification_failed',
    actor: 'system',
    summary: `Deposit email to ${email || '(no contact email)'} FAILED — resend from the proposal panel`,
    data: { invoice_id: invoice.id, emailed: false },
  });
  if (error) console.error('[invoice] notification_failed insert failed:', error);
  return false;
}

/**
 * "Request deposit" on the accepted proposal. The RPC is the authority: it
 * locks engagement → proposal, refuses a terminal engagement, an unaccepted
 * proposal, a bad percentage, a zero build, a second live deposit and an
 * amount under the Stripe minimum, and it writes both invoice rows plus the
 * invoice_issued event in one transaction.
 */
export async function issueDeposit(proposalId: string, pct: number): Promise<DepositEmailResult> {
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

  const invoice = await loadInvoice(admin, result.invoice_id);
  const proposal = await loadProposal(admin, pid);
  const engagement = await loadEngagement(admin, invoice.engagement_id);
  const emailed = await sendDepositLink(admin, invoice, proposal, engagement);

  revalidate(invoice.engagement_id);
  return {
    invoiceId: invoice.id,
    amount: invoice.amount,
    currency: invoice.currency,
    emailed,
  };
}

/**
 * Resend the deposit request. Rotates the link again (the same reasoning as
 * issue), so an open client tab is asked to reopen from the email — which the
 * proposal page already says in so many words.
 */
export async function resendDepositEmail(invoiceId: string): Promise<DepositEmailResult> {
  await requireAdmin();
  const iid = parseInput(uuidSchema, invoiceId);
  const admin = createAdminClient();

  const invoice = await loadInvoice(admin, iid);
  if (invoice.status !== 'sent') {
    throw new Error(
      invoice.status === 'draft'
        ? 'This invoice has not been issued yet.'
        : `A ${invoiceNoun(invoice.kind, invoice.pct_of_build).toLowerCase()} that is ${invoice.status} has nothing to request.`,
    );
  }
  if (!invoice.proposal_id) throw new Error('This invoice is not attached to a proposal.');

  const proposal = await loadProposal(admin, invoice.proposal_id);
  if (proposal.status !== 'accepted') throw new Error('The proposal is no longer accepted.');
  const engagement = await loadEngagement(admin, invoice.engagement_id);
  if (!engagement.client_contact_email?.trim() && !invoice.recipient_email) {
    throw new Error('Add a client contact email to the engagement before sending a link.');
  }

  const emailed = await sendDepositLink(admin, invoice, proposal, engagement);
  revalidate(invoice.engagement_id);
  return { invoiceId: invoice.id, amount: invoice.amount, currency: invoice.currency, emailed };
}
