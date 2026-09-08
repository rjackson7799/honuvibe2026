// Which invoice the client may pay, and which band they see (slice 5,
// migration 077). ONE module, used by the proposal PAGE and the pay ROUTE, so
// the two cannot disagree about what is due — decision 3.
//
// Rev 1 of the plan let the page and the route each pick "the oldest unpaid"
// independently. That is broken twice over: the orderings are only equal by
// luck, and across two tabs a client could be SHOWN one invoice and CHARGED
// another. Here the page renders a specific invoice id, the button POSTs it,
// and the route re-runs this same selector and refuses anything else.
//
// The pure pickers are exported alongside the async readers because the band
// precedence is eleven states that would otherwise live only inside an async
// server component, where no unit test can reach them.

import type { SupabaseClient } from '@supabase/supabase-js';
import type { EngagementInvoice } from '@/lib/admin/types';

/** Live means voided_at IS NULL — the same slot uq_engagement_invoices_one_live enforces. */
function live(rows: EngagementInvoice[]): EngagementInvoice[] {
  return rows.filter((r) => r.voided_at === null);
}

/** Sorts nulls last, so an unsent row never outranks a sent one. */
function byIso(a: string | null, b: string | null): number {
  if (a === b) return 0;
  if (a === null) return 1;
  if (b === null) return -1;
  return a < b ? -1 : 1;
}

/**
 * The invoice the client may pay right now, or null.
 *
 * Ordering is `sent_at, deposit-first, id` — NOT created_at.
 * issue_engagement_deposit inserts the deposit and the balance in ONE
 * transaction, so now() and therefore created_at are IDENTICAL on both rows;
 * ordering by it is non-deterministic and the page and the route could pick
 * different invoices. sent_at is genuinely ordered (the deposit is `sent` at
 * issue, the balance only at send) and the two remaining keys make the order
 * TOTAL, so the answer cannot move between two calls on the same data.
 */
export function pickPayable(rows: EngagementInvoice[]): EngagementInvoice | null {
  const payable = live(rows).filter((r) => r.status === 'sent');
  if (payable.length === 0) return null;
  return [...payable].sort(
    (a, b) =>
      byIso(a.sent_at, b.sent_at) ||
      Number(a.kind !== 'deposit') - Number(b.kind !== 'deposit') ||
      (a.id < b.id ? -1 : a.id > b.id ? 1 : 0),
  )[0];
}

/** The live deposit row, for the "deposit already received" framing. */
export function pickDeposit(rows: EngagementInvoice[]): EngagementInvoice | null {
  return live(rows).find((r) => r.kind === 'deposit') ?? null;
}

/**
 * The newest live invoice in a terminal money state, for the closing bands.
 * `refunded` counts: rev 1's "newest paid" could not describe a refund at all.
 */
export function pickLatestSettled(rows: EngagementInvoice[]): EngagementInvoice | null {
  const settled = live(rows).filter((r) => r.status === 'paid' || r.status === 'refunded');
  if (settled.length === 0) return null;
  const at = (r: EngagementInvoice) => r.refunded_at ?? r.paid_at;
  return [...settled].sort(
    (a, b) => byIso(at(b), at(a)) || (a.id < b.id ? -1 : a.id > b.id ? 1 : 0),
  )[0];
}

/**
 * Every live invoice on the proposal, with the read outcome kept.
 *
 * The PAGE cannot tell "nothing is payable" from "the database is down" and
 * does not need to — both render the plain accepted band, which is true either
 * way. The ROUTE must: it owes a stale client "reload" and an outage "try
 * again in a few minutes", and those are different HTTP statuses.
 */
export async function readLiveInvoices(
  db: SupabaseClient,
  proposalId: string,
): Promise<{ ok: boolean; rows: EngagementInvoice[] }> {
  const { data, error } = await db
    .from('engagement_invoices')
    .select('*')
    .eq('proposal_id', proposalId)
    .is('voided_at', null);
  if (error) {
    // Never log the row contents — recipient_email lives on these rows.
    console.error(`[invoice-selection] read failed for proposal ${proposalId}`);
    return { ok: false, rows: [] };
  }
  return { ok: true, rows: (data ?? []) as unknown as EngagementInvoice[] };
}

/** One read, three answers. A failed read is an empty result for the page. */
async function liveInvoicesOf(db: SupabaseClient, proposalId: string): Promise<EngagementInvoice[]> {
  return (await readLiveInvoices(db, proposalId)).rows;
}

export async function selectPayableInvoice(
  db: SupabaseClient,
  proposalId: string,
): Promise<EngagementInvoice | null> {
  return pickPayable(await liveInvoicesOf(db, proposalId));
}

export async function selectDepositInvoice(
  db: SupabaseClient,
  proposalId: string,
): Promise<EngagementInvoice | null> {
  return pickDeposit(await liveInvoicesOf(db, proposalId));
}

export async function selectLatestSettledInvoice(
  db: SupabaseClient,
  proposalId: string,
): Promise<EngagementInvoice | null> {
  return pickLatestSettled(await liveInvoicesOf(db, proposalId));
}

// ── Band precedence ─────────────────────────────────────────────────────────

export type BandState =
  /** Payable now. `depositPaidAt` is non-null ONLY when a deposit was actually kept. */
  | { kind: 'due'; invoice: EngagementInvoice; depositPaidAt: string | null }
  /** A voucher is outstanding; the mint RPC would refuse a second session anyway. */
  | { kind: 'pending'; invoice: EngagementInvoice }
  /** Just came back from Stripe. */
  | { kind: 'thanks'; invoice: EngagementInvoice }
  /** Nothing payable, the balance is settled. `inFull` is EARNED, not assumed. */
  | { kind: 'balance_paid'; invoice: EngagementInvoice; inFull: boolean }
  /** Nothing payable, only the deposit is settled — 4A's band, unchanged. */
  | { kind: 'deposit_paid'; invoice: EngagementInvoice }
  /** Money went back. Carries BOTH amounts so a partial refund reads as one. */
  | { kind: 'refunded'; invoice: EngagementInvoice; refundedAmount: number; originalAmount: number; partial: boolean }
  /** Accepted, no money story to tell. */
  | { kind: 'accepted' };

/**
 * Which band the client sees, from rows already fetched. Pure — no I/O.
 *
 * Precedence: a payable invoice wins; otherwise the latest settled one;
 * otherwise the plain accepted band.
 */
export function selectBandState(input: {
  payable: EngagementInvoice | null;
  deposit: EngagementInvoice | null;
  settled: EngagementInvoice | null;
  /** `?paid=<id>`, or the LEGACY `'1'` minted before this slice deployed. */
  paidParam: string | null;
}): BandState {
  const { payable, deposit, settled, paidParam } = input;

  if (payable) {
    if (payable.awaiting_async_payment_at) return { kind: 'pending', invoice: payable };
    // '1' is the pre-077 success_url, honoured so a Checkout session minted
    // before the deploy still lands on thanks rather than back on "pay now".
    // It is accepted ONLY for a deposit, because slice 4 could only ever mint
    // for a deposit — that is where such a session came from. Without the
    // guard, an old `?paid=1` URL replayed later would show "thank you"
    // against the BALANCE, which is exactly the swallowing this slice removes.
    const legacyDepositReturn = paidParam === '1' && payable.kind === 'deposit';
    if (paidParam && (paidParam === payable.id || legacyDepositReturn)) {
      return { kind: 'thanks', invoice: payable };
    }
    return {
      kind: 'due',
      invoice: payable,
      // The STATUS, not paid_at: the guard freezes paid_at once set and
      // permits paid -> refunded, so a refunded deposit still carries one and
      // would otherwise be announced to the client as received.
      depositPaidAt: deposit?.status === 'paid' ? deposit.paid_at : null,
    };
  }

  if (settled) {
    if (settled.status === 'refunded') {
      const refundedAmount = settled.amount_refunded ?? 0;
      return {
        kind: 'refunded',
        invoice: settled,
        refundedAmount,
        originalAmount: settled.amount,
        partial: refundedAmount < settled.amount,
      };
    }
    if (settled.kind === 'balance') {
      // "Settles the project in full" has to be earned. A refunded deposit
      // followed by a paid balance means only half the money is held.
      return { kind: 'balance_paid', invoice: settled, inFull: deposit?.status === 'paid' };
    }
    return { kind: 'deposit_paid', invoice: settled };
  }

  return { kind: 'accepted' };
}
