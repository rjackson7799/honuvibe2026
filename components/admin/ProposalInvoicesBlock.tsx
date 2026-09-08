'use client';

// The Invoices block inside the ACCEPTED state of EngagementProposalPanel
// (slices 4 + 5, migrations 075/077). Two <dl> cells — Deposit and Balance —
// plus the action buttons, driven by the engagement's invoices.
//
// "Request deposit" opens an INLINE confirm rather than window.confirm,
// because it carries a choice: 50% (preselected) or 100%. The confirm shows
// the exact deposit and balance computed by invoice-math.ts — the TS twin of
// issue_engagement_deposit's arithmetic — plus the recipient, so Ryan sees
// the figures he is about to commit to before the RPC runs. The RPC is still
// the authority; everything shown here is a mirror of its rules.
//
// "Send balance" mirrors send_engagement_invoice's stage gate: billable at
// `launch` or `care`, refused before and refused on a terminal stage. The
// button is disabled (with the reason) rather than hidden before launch, and
// absent entirely once terminal — there the cell states a FACT instead.
//
// THE CELL WORDING ON A CLOSED ENGAGEMENT (judgment call 2). 077 stopped the
// terminal sweep voiding anything on `closed`, which makes closing fully
// reversible — but it also means a two-years-closed engagement would sit there
// reading "Balance … not billed yet", and the word "yet" reads like an open
// task. So on a terminal stage the cell reads "not billed (engagement closed)"
// instead: a statement of fact, not a nag. Reopening restores the normal
// wording, because the stage drives it.
//
// THE ALERT STRIPS ARE PER-INVOICE (slice 5). Slice 4 filtered both strips on
// `invoice_id === deposit?.id`, so a duplicate or failed payment on a BALANCE
// was silently invisible — money you would never be told about. They now match
// any live invoice on the proposal and name which one it was.

import { useMemo, useState, useTransition } from 'react';
import { useRouter } from 'next/navigation';
import { StatusBadge } from './StatusBadge';
import { issueDeposit, resendInvoiceEmail, sendBalanceInvoice } from '@/lib/studio/engagement/invoice-actions';
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

/** The stages send_engagement_invoice will accept. Mirrors the RPC exactly. */
const BILLABLE_STAGES = ['launch', 'care'] as const;
const TERMINAL_STAGES = ['lost', 'closed'] as const;

export function isTerminalStage(stage: string): boolean {
  return (TERMINAL_STAGES as readonly string[]).includes(stage);
}
export function isBalanceBillable(stage: string): boolean {
  return (BILLABLE_STAGES as readonly string[]).includes(stage);
}

/** The newest non-void row of a kind — what "live" means everywhere in 075. */
function liveOf(invoices: EngagementInvoice[], kind: 'deposit' | 'balance'): EngagementInvoice | null {
  return invoices.find((i) => i.kind === kind && i.voided_at === null) ?? null;
}

/** The money sentence shared by both cells, for every status the DB can hold. */
function settledText(invoice: EngagementInvoice): string | null {
  const amount = formatMinorUnits(invoice.amount, invoice.currency);
  const pct = invoice.pct_of_build ? ` (${invoice.pct_of_build}%)` : '';

  if (invoice.status === 'refunded') {
    const refunded = formatMinorUnits(invoice.amount_refunded ?? 0, invoice.currency);
    const partial = (invoice.amount_refunded ?? 0) < invoice.amount;
    return `${refunded} of ${amount} refunded ${invoice.refunded_at ? formatShortDate(invoice.refunded_at) : ''}${partial ? ' (partial)' : ''}`.trim();
  }
  if (invoice.status === 'paid') {
    return `${amount}${pct} paid ${invoice.paid_at ? formatShortDate(invoice.paid_at) : ''} ✓`;
  }
  return null;
}

/** The `sent` sentence: billed when, paid or not, and how often Checkout opened. */
function sentText(invoice: EngagementInvoice, verb: string): string {
  const amount = formatMinorUnits(invoice.amount, invoice.currency);
  const pct = invoice.pct_of_build ? ` (${invoice.pct_of_build}%)` : '';
  const parts = [`${amount}${pct} ${verb} ${invoice.sent_at ? formatShortDate(invoice.sent_at) : ''}`.trim()];
  parts.push(invoice.awaiting_async_payment_at ? 'payment started, awaiting confirmation' : 'not paid');
  if (invoice.checkout_count > 0) parts.push(`checkout opened ${invoice.checkout_count}×`);
  return parts.join(' · ');
}

/**
 * The deposit cell's sentence. Every branch is a state the DB can actually be
 * in, so a reader of the panel can always tell what Stripe knows.
 */
export function depositCellText(deposit: EngagementInvoice | null): string {
  if (!deposit) return 'Not requested';
  const settled = settledText(deposit);
  if (settled) return settled;
  if (deposit.status === 'sent') return sentText(deposit, 'requested');
  const amount = formatMinorUnits(deposit.amount, deposit.currency);
  const pct = deposit.pct_of_build ? ` (${deposit.pct_of_build}%)` : '';
  return `${invoiceNoun(deposit.kind, deposit.pct_of_build)} ${amount}${pct} — ${deposit.status}`;
}

/**
 * The balance cell's sentence. `stage` matters for exactly one branch: a
 * `draft` balance on a terminal engagement is a FACT, not a to-do — see the
 * header on judgment call 2.
 */
export function balanceCellText(balance: EngagementInvoice, stage: string): string {
  const settled = settledText(balance);
  if (settled) return settled;
  if (balance.status === 'sent') return sentText(balance, 'billed');
  if (balance.status === 'draft') {
    const amount = formatMinorUnits(balance.amount, balance.currency);
    return isTerminalStage(stage)
      ? `${amount} — not billed (engagement ${stage})`
      : `${amount} — not billed yet`;
  }
  return `${formatMinorUnits(balance.amount, balance.currency)} — ${balance.status}`;
}

export function ProposalInvoicesBlock({
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
  const terminal = isTerminalStage(engagement.stage);
  const balanceBillable = isBalanceBillable(engagement.stage);

  /** Both strips key on ANY live invoice on this proposal, and name it. */
  const liveById = useMemo(() => {
    const map = new Map<string, EngagementInvoice>();
    for (const i of [deposit, balance]) if (i) map.set(i.id, i);
    return map;
  }, [deposit, balance]);

  const nounFor = (id: string | undefined): string => {
    const row = id ? liveById.get(id) : undefined;
    return row ? invoiceNoun(row.kind, row.pct_of_build).toLowerCase() : 'invoice';
  };

  // An unresolved duplicate payment is the one thing on this panel that costs
  // real money if it is missed — on EITHER invoice.
  const duplicate = useMemo(
    () =>
      events.find(
        (e) =>
          e.kind === 'invoice_duplicate_payment' &&
          !e.resolved_at &&
          liveById.has(String((e.data as { invoice_id?: string } | null)?.invoice_id ?? '')),
      ) ?? null,
    [events, liveById],
  );

  /** The live invoices whose most recent payment event was a failure. */
  const failedIds = useMemo(() => {
    const failed = new Set<string>();
    for (const [id, row] of liveById) {
      if (row.status !== 'sent') continue;
      const relevant = events.filter(
        (e) =>
          (e.kind === 'invoice_payment_failed' || e.kind === 'invoice_paid') &&
          (e.data as { invoice_id?: string } | null)?.invoice_id === id,
      );
      if (relevant[0]?.kind === 'invoice_payment_failed') failed.add(id);
    }
    return failed;
  }, [events, liveById]);

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

  /** The Resend button, shared by both invoices. Absent once terminal. */
  function resendButton(invoice: EngagementInvoice) {
    const noun = invoiceNoun(invoice.kind, invoice.pct_of_build);
    return (
      <button
        type="button"
        onClick={() =>
          run(`Resend ${noun.toLowerCase()} email`, async () => {
            const r = await resendInvoiceEmail(invoice.id);
            return r.emailed
              ? `${noun} email resent with a fresh link.`
              : `The ${noun.toLowerCase()} email FAILED again — check RESEND_API_KEY / the contact email.`;
          })
        }
        disabled={working || !hasEmail}
        title={hasEmail ? undefined : 'Add a client contact email first'}
        className={ghostBtn}
        data-resend={invoice.kind}
      >
        Resend {noun.toLowerCase()} email
      </button>
    );
  }

  /** "<Noun> email sent <date>" or the coral "not sent — resend below". */
  function emailLine(invoice: EngagementInvoice) {
    const noun = invoiceNoun(invoice.kind, invoice.pct_of_build);
    return (
      <p
        className={
          invoice.invoice_email_sent_at
            ? 'mt-1 text-[12px] text-fg-tertiary'
            : 'mt-1 text-[12px] font-medium text-[color:var(--accent-coral)]'
        }
        data-email-line={invoice.kind}
      >
        {invoice.invoice_email_sent_at
          ? `${noun} email sent ${formatShortDate(invoice.invoice_email_sent_at)}`
          : `${noun} email not sent — resend below`}
      </p>
    );
  }

  return (
    <div className="space-y-3" data-deposit-block data-invoices-block>
      {duplicate && (
        <div className="rounded-lg border border-[color:var(--accent-coral)]/40 bg-[color:var(--accent-coral-subtle)] px-4 py-2.5 text-[13px] text-fg-secondary">
          <span className="font-semibold text-[color:var(--accent-coral)]">
            A second payment landed on the {nounFor((duplicate.data as { invoice_id?: string } | null)?.invoice_id)}
          </span>{' '}
          — refund {(duplicate.data as { payment_intent_id?: string } | null)?.payment_intent_id ?? 'the newer payment intent'} in Stripe.
        </div>
      )}

      <div>
        <dt className="text-xs text-fg-tertiary">Deposit</dt>
        <dd
          className={
            deposit?.status === 'refunded' || (deposit && failedIds.has(deposit.id))
              ? 'text-[color:var(--accent-coral)] font-medium'
              : 'text-fg-secondary'
          }
          data-deposit-state
        >
          {depositCellText(deposit)}
          {deposit && failedIds.has(deposit.id) && ' · last payment attempt failed'}
          {deposit && (
            <>
              {' '}
              <StatusBadge status={deposit.status} />
            </>
          )}
        </dd>
        {deposit?.status === 'sent' && emailLine(deposit)}
      </div>

      {/* The balance cell exists only for a part payment — at 100% there is no
          balance row at all, so there is nothing to say. */}
      {balance && (
        <div>
          <dt className="text-xs text-fg-tertiary">Balance</dt>
          <dd
            className={
              balance.status === 'refunded' || failedIds.has(balance.id)
                ? 'text-[color:var(--accent-coral)] font-medium'
                : 'text-fg-secondary'
            }
            data-balance-state
          >
            {balanceCellText(balance, engagement.stage)}
            {failedIds.has(balance.id) && ' · last payment attempt failed'}{' '}
            <StatusBadge status={balance.status} />
          </dd>
          {balance.status === 'sent' && emailLine(balance)}
        </div>
      )}

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
                {pct < 100 && ' (created as a draft, billed at launch)'}
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

      {/* Send balance. Absent on a terminal stage — the RPC refuses there and
          the cell already says so — and disabled, with the reason, before the
          engagement reaches Launch. */}
      {balance?.status === 'draft' && !terminal && (
        <button
          type="button"
          onClick={() =>
            run('Send balance', async () => {
              const r = await sendBalanceInvoice(balance.id);
              return r.emailed
                ? `Balance billed — ${formatMinorUnits(r.amount, r.currency)} and the client has been emailed a fresh link.`
                : `Balance billed — ${formatMinorUnits(r.amount, r.currency)}, but the email did not go out. Resend below.`;
            })
          }
          disabled={working || !balanceBillable || !hasEmail}
          title={
            !balanceBillable
              ? 'Billable once the engagement reaches Launch'
              : !hasEmail
                ? 'Add a client contact email first'
                : undefined
          }
          className={primaryBtn}
          data-send-balance
        >
          {pending ? 'Sending…' : 'Send balance'}
        </button>
      )}

      {/* Resend is suppressed once terminal: 077 keeps a `sent` invoice alive
          through a close, and emailing a fresh link there would invite a
          payment begin_engagement_invoice_checkout is going to refuse. */}
      {!terminal && deposit?.status === 'sent' && resendButton(deposit)}
      {!terminal && balance?.status === 'sent' && resendButton(balance)}

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
