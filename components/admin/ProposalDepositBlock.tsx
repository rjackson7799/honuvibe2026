'use client';

// The Deposit block inside the ACCEPTED state of EngagementProposalPanel
// (slice 4, migration 075). One <dl> cell plus the action buttons, driven by
// the engagement's invoices.
//
// "Request deposit" opens an INLINE confirm rather than window.confirm,
// because it carries a choice: 50% (preselected) or 100%. The confirm shows
// the exact deposit and balance computed by invoice-math.ts — the TS twin of
// issue_engagement_deposit's arithmetic — plus the recipient, so Ryan sees
// the figures he is about to commit to before the RPC runs. The RPC is still
// the authority; everything shown here is a mirror of its rules.
//
// The duplicate-payment strip is deliberately loud: money Stripe took twice
// needs a hand refund, and nothing else on this page says so.

import { useMemo, useState, useTransition } from 'react';
import { useRouter } from 'next/navigation';
import { StatusBadge } from './StatusBadge';
import { issueDeposit, resendDepositEmail } from '@/lib/studio/engagement/invoice-actions';
import { formatMinorUnits, formatShortDate } from '@/lib/studio/engagement/format';
import { depositIssuable, invoiceNoun } from '@/lib/studio/engagement/invoice-math';
import { DEPOSIT_PCTS } from '@/lib/studio/engagement/types';
import type {
  Engagement,
  EngagementEvent,
  EngagementInvoice,
  EngagementProposal,
} from '@/lib/admin/types';

const ghostBtn =
  'inline-flex items-center justify-center gap-1.5 min-h-[44px] px-4 rounded-lg bg-bg-primary border border-border-default text-fg-secondary text-[12.5px] font-semibold hover:text-fg-primary hover:border-border-hover disabled:opacity-50 transition-colors';
const primaryBtn =
  'inline-flex items-center justify-center gap-1.5 min-h-[44px] px-4 rounded-lg bg-[color:var(--accent-teal)] hover:bg-[color:var(--accent-teal-hover)] text-white text-[12.5px] font-semibold shadow-sm disabled:opacity-50 disabled:pointer-events-none transition-all';

/** The newest non-void row of a kind — what "live" means everywhere in 075. */
function liveOf(invoices: EngagementInvoice[], kind: 'deposit' | 'balance'): EngagementInvoice | null {
  return invoices.find((i) => i.kind === kind && i.voided_at === null) ?? null;
}

/**
 * The deposit cell's sentence. Every branch is a state the DB can actually be
 * in, so a reader of the panel can always tell what Stripe knows.
 */
export function depositCellText(deposit: EngagementInvoice | null, balance: EngagementInvoice | null): string {
  if (!deposit) return 'Not requested';
  const noun = invoiceNoun(deposit.kind, deposit.pct_of_build);
  const amount = formatMinorUnits(deposit.amount, deposit.currency);
  const pct = deposit.pct_of_build ? ` (${deposit.pct_of_build}%)` : '';

  if (deposit.status === 'refunded') {
    const refunded = formatMinorUnits(deposit.amount_refunded ?? 0, deposit.currency);
    const partial = (deposit.amount_refunded ?? 0) < deposit.amount;
    return `${refunded} of ${amount} refunded ${deposit.refunded_at ? formatShortDate(deposit.refunded_at) : ''}${partial ? ' (partial)' : ''}`.trim();
  }
  if (deposit.status === 'paid') {
    const paid = `${amount}${pct} paid ${deposit.paid_at ? formatShortDate(deposit.paid_at) : ''} ✓`;
    if (balance && balance.status === 'draft') {
      return `${paid} · Balance ${formatMinorUnits(balance.amount, balance.currency)} not yet billed`;
    }
    return paid;
  }
  if (deposit.status === 'sent') {
    const parts = [`${amount}${pct} requested ${deposit.sent_at ? formatShortDate(deposit.sent_at) : ''}`];
    parts.push(deposit.awaiting_async_payment_at ? 'payment started, awaiting confirmation' : 'not paid');
    if (deposit.checkout_count > 0) parts.push(`checkout opened ${deposit.checkout_count}×`);
    return parts.join(' · ');
  }
  return `${noun} ${amount}${pct} — ${deposit.status}`;
}

export function ProposalDepositBlock({
  engagement,
  proposal,
  invoices,
  events,
  disabled,
}: {
  engagement: Engagement;
  /** The ACCEPTED proposal this block bills against. */
  proposal: EngagementProposal;
  /** Every invoice on the engagement, newest first. */
  invoices: EngagementInvoice[];
  /** The engagement timeline, used only to surface unresolved payment flags. */
  events: EngagementEvent[];
  /** True while another action on the panel is running. */
  disabled: boolean;
}) {
  const router = useRouter();
  const [pending, startTransition] = useTransition();
  const [error, setError] = useState('');
  const [notice, setNotice] = useState('');
  const [confirming, setConfirming] = useState(false);
  const [pct, setPct] = useState<number>(DEPOSIT_PCTS[0]);

  const forProposal = useMemo(
    () => invoices.filter((i) => i.proposal_id === proposal.id),
    [invoices, proposal.id],
  );
  const deposit = liveOf(forProposal, 'deposit');
  const balance = liveOf(forProposal, 'balance');

  const issuable = depositIssuable(proposal.total_build, pct);
  const hasEmail = !!engagement.client_contact_email?.trim();
  const nothingToBill = proposal.total_build === 0;

  // An unresolved duplicate payment is the one thing on this panel that costs
  // real money if it is missed.
  const duplicate = useMemo(
    () =>
      events.find(
        (e) => e.kind === 'invoice_duplicate_payment' && !e.resolved_at &&
          (e.data as { invoice_id?: string } | null)?.invoice_id === deposit?.id,
      ) ?? null,
    [events, deposit?.id],
  );
  const lastPaymentFailed = useMemo(() => {
    if (!deposit || deposit.status !== 'sent') return false;
    const relevant = events.filter(
      (e) =>
        (e.kind === 'invoice_payment_failed' || e.kind === 'invoice_paid') &&
        (e.data as { invoice_id?: string } | null)?.invoice_id === deposit.id,
    );
    return relevant[0]?.kind === 'invoice_payment_failed';
  }, [events, deposit]);

  const working = pending || disabled;

  function run(label: string, fn: () => Promise<string>) {
    setError('');
    setNotice('');
    startTransition(async () => {
      try {
        setNotice(await fn());
        setConfirming(false);
        router.refresh();
      } catch (e) {
        setError(e instanceof Error ? e.message : `${label} failed.`);
      }
    });
  }

  const requestDisabledReason = nothingToBill
    ? 'Nothing to invoice on a performance offer'
    : !hasEmail
      ? 'Add a client contact email first'
      : !issuable.ok
        ? 'That amount is below the minimum Stripe will charge ($0.50 / ¥50)'
        : undefined;

  return (
    <div className="space-y-3" data-deposit-block>
      {duplicate && (
        <div className="rounded-lg border border-[color:var(--accent-coral)]/40 bg-[color:var(--accent-coral-subtle)] px-4 py-2.5 text-[13px] text-fg-secondary">
          <span className="font-semibold text-[color:var(--accent-coral)]">A second payment landed on this invoice</span>{' '}
          — refund {(duplicate.data as { payment_intent_id?: string } | null)?.payment_intent_id ?? 'the newer payment intent'} in Stripe.
        </div>
      )}

      <div>
        <dt className="text-xs text-fg-tertiary">Deposit</dt>
        <dd
          className={
            deposit?.status === 'refunded' || lastPaymentFailed
              ? 'text-[color:var(--accent-coral)] font-medium'
              : 'text-fg-secondary'
          }
          data-deposit-state
        >
          {depositCellText(deposit, balance)}
          {lastPaymentFailed && ' · last payment attempt failed'}
          {deposit && (
            <>
              {' '}
              <StatusBadge status={deposit.status} />
            </>
          )}
        </dd>
        {deposit?.status === 'sent' && (
          <p
            className={
              deposit.invoice_email_sent_at
                ? 'mt-1 text-[12px] text-fg-tertiary'
                : 'mt-1 text-[12px] font-medium text-[color:var(--accent-coral)]'
            }
          >
            {deposit.invoice_email_sent_at
              ? `Deposit email sent ${formatShortDate(deposit.invoice_email_sent_at)}`
              : 'Deposit email not sent — resend below'}
          </p>
        )}
      </div>

      {!deposit && !confirming && (
        <button
          type="button"
          onClick={() => setConfirming(true)}
          disabled={working || !!requestDisabledReason}
          title={requestDisabledReason}
          className={primaryBtn}
        >
          Request deposit
        </button>
      )}

      {!deposit && confirming && (
        <div className="rounded-lg border border-border-default bg-bg-primary p-3 space-y-3">
          <p className="text-[12px] font-semibold text-fg-tertiary">How much is due now?</p>
          <div role="radiogroup" aria-label="Deposit percentage" className="flex gap-2 flex-wrap">
            {DEPOSIT_PCTS.map((option) => (
              <button
                key={option}
                type="button"
                role="radio"
                aria-checked={pct === option}
                onClick={() => setPct(option)}
                disabled={working}
                className={`min-h-[44px] px-4 rounded-lg border text-[12.5px] font-semibold transition-colors ${
                  pct === option
                    ? 'border-[color:var(--accent-teal)] bg-[color:var(--accent-teal-subtle)] text-[color:var(--accent-teal)]'
                    : 'border-border-default text-fg-secondary hover:border-border-hover'
                }`}
              >
                {option}%
              </button>
            ))}
          </div>
          <p className="text-[13px] text-fg-secondary" data-deposit-preview>
            {issuable.ok ? (
              <>
                Deposit {formatMinorUnits(issuable.split.deposit, proposal.currency)}
                {' · '}
                Balance {formatMinorUnits(issuable.split.balance, proposal.currency)}
                {pct < 100 && ' (created as a draft, not billed yet)'}
              </>
            ) : (
              'That amount is below the minimum Stripe will charge ($0.50 / ¥50).'
            )}
          </p>
          <p className="text-[12px] text-fg-tertiary">
            To {engagement.client_contact_email}. Sends a fresh proposal link — any open tab will ask the client
            to reopen from the email.
          </p>
          <div className="flex items-center gap-2 flex-wrap">
            <button
              type="button"
              onClick={() =>
                run('Request deposit', async () => {
                  const r = await issueDeposit(proposal.id, pct);
                  return r.emailed
                    ? `Deposit requested — ${formatMinorUnits(r.amount, r.currency)} and the client has been emailed a fresh link.`
                    : `Deposit requested — ${formatMinorUnits(r.amount, r.currency)}, but the email FAILED. Resend it below.`;
                })
              }
              disabled={working || !issuable.ok}
              className={primaryBtn}
            >
              {pending ? 'Requesting…' : 'Request'}
            </button>
            <button type="button" onClick={() => setConfirming(false)} disabled={working} className={ghostBtn}>
              Cancel
            </button>
          </div>
        </div>
      )}

      {deposit?.status === 'sent' && (
        <button
          type="button"
          onClick={() =>
            run('Resend deposit email', async () => {
              const r = await resendDepositEmail(deposit.id);
              return r.emailed
                ? 'Deposit email resent with a fresh link.'
                : 'The deposit email FAILED again — check RESEND_API_KEY / the contact email.';
            })
          }
          disabled={working || !hasEmail}
          title={hasEmail ? undefined : 'Add a client contact email first'}
          className={ghostBtn}
        >
          Resend deposit email
        </button>
      )}

      {notice && (
        <div className="rounded-lg border border-[color:var(--accent-teal)]/30 bg-[color:var(--accent-teal-subtle)] px-4 py-2.5 text-[13px] text-fg-secondary">
          {notice}
        </div>
      )}
      {error && (
        <div className="rounded-lg border border-[color:var(--accent-coral)]/40 bg-[color:var(--accent-coral-subtle)] px-4 py-2.5 text-[13px] text-fg-secondary">
          {error}
        </div>
      )}
    </div>
  );
}

/** True while a paid invoice blocks voiding the acceptance (the RPC enforces it). */
export function paidDepositBlocksVoid(invoices: EngagementInvoice[], proposalId: string): boolean {
  return invoices.some((i) => i.proposal_id === proposalId && i.status === 'paid');
}
