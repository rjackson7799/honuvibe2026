// The deposit split — the TS twin of issue_engagement_deposit's arithmetic
// (migration 075). Pure: no DB, no React. The RPC is the authority; this
// module exists so the admin confirm can show the exact figures Ryan is about
// to commit to, and so the "Request deposit" button knows when to disable
// itself. Both sides must agree, so the rules are stated once here and
// asserted against the SQL by supabase/tests/engagement_invoices_rls.test.ts.
//
// Money is INTEGER MINOR UNITS in the proposal's currency (USD cents, JPY
// whole yen — zero-decimal). Never floats: `(total * pct + 50) / 100` with
// integer truncation is round-half-up on positive inputs, and the balance is
// `total - deposit`, so the two halves sum to the total EXACTLY.

import type { EngagementCurrency } from './types';

/**
 * Stripe's minimum charge, in minor units, for both currencies we accept:
 * $0.50 = 50 cents and ¥50 = 50 yen. Also excludes zero. Mirrored by the
 * `amount >= 50` table CHECK and by the RPC's invoice_below_minimum.
 */
export const STRIPE_MINIMUM_MINOR = 50;

export interface DepositSplit {
  deposit: number;
  balance: number;
}

/**
 * Split `totalBuild` into deposit + balance at `pct`, round-half-up in
 * integers. At 100 the balance is 0 and no balance row is created.
 * Throws on a pct outside the allowlist or a negative/non-integer total —
 * the callers all pass validated values, and a silent wrong number here
 * would become a wrong Stripe charge.
 */
export function splitDeposit(totalBuild: number, pct: number): DepositSplit {
  if (!Number.isInteger(totalBuild) || totalBuild < 0) {
    throw new Error('splitDeposit: totalBuild must be a non-negative integer of minor units.');
  }
  if (pct !== 50 && pct !== 100) {
    throw new Error('splitDeposit: pct must be 50 or 100.');
  }
  const deposit = Math.floor((totalBuild * pct + 50) / 100);
  return { deposit, balance: totalBuild - deposit };
}

export type DepositIssuable =
  | { ok: true; split: DepositSplit }
  | { ok: false; reason: 'nothing_to_bill' | 'below_minimum' };

/**
 * Can a deposit at `pct` actually be issued? Mirrors the RPC's refusals in
 * the order the RPC applies them: `total_build = 0` (a performance or hybrid
 * offer has nothing to invoice) first, then the Stripe minimum — and a
 * deposit whose BALANCE could never be billed is refused now rather than
 * discovered when the balance unit ships.
 */
export function depositIssuable(totalBuild: number, pct: number): DepositIssuable {
  if (totalBuild === 0) return { ok: false, reason: 'nothing_to_bill' };
  const split = splitDeposit(totalBuild, pct);
  if (split.deposit < STRIPE_MINIMUM_MINOR) return { ok: false, reason: 'below_minimum' };
  if (pct < 100 && split.balance < STRIPE_MINIMUM_MINOR) return { ok: false, reason: 'below_minimum' };
  return { ok: true, split };
}

/** The Checkout label the RPC builds, mirrored for the admin confirm. */
export function depositLabel(businessName: string, pct: number): string {
  const word = pct === 100 ? 'Build investment' : 'Deposit';
  return `${word} — ${businessName.slice(0, 150)} (${pct}%)`;
}

/** "Deposit" / "Build investment" / "Balance" — the noun for a row's kind. */
export function invoiceNoun(kind: string, pct: number | null): string {
  if (kind === 'balance') return 'Balance';
  if (kind === 'care_month') return 'Care';
  return pct === 100 ? 'Build investment' : 'Deposit';
}

export type { EngagementCurrency };
