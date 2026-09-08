/**
 * The shared invoice selector + band precedence (slice 5, migration 077).
 *
 * The point of this module is that the proposal PAGE and the pay ROUTE cannot
 * disagree about which invoice is payable, so the ordering rule is pinned here
 * rather than trusted. The tied-`created_at` fixture is the important one:
 * issue_engagement_deposit inserts the deposit and the balance in ONE
 * transaction, so now() — and therefore created_at — is byte-identical on both
 * rows, and any ordering that leans on it is non-deterministic.
 */
import { describe, expect, test } from 'vitest';
import {
  selectBandState,
  selectDepositInvoice,
  selectLatestSettledInvoice,
  selectPayableInvoice,
  pickPayable,
  pickDeposit,
  pickLatestSettled,
} from './invoice-selection';
import type { EngagementInvoice } from '@/lib/admin/types';

// Both rows share this instant on purpose — see the file header.
const TIED = '2026-09-06T10:00:00.000Z';

function inv(over: Partial<EngagementInvoice> & { id: string }): EngagementInvoice {
  return {
    created_at: TIED,
    updated_at: TIED,
    engagement_id: 'e1',
    proposal_id: 'p1',
    kind: 'deposit',
    pct_of_build: 50,
    label: 'Deposit — Biz (50%)',
    currency: 'USD',
    amount: 43750,
    recipient_email: 'client@example.com',
    status: 'sent',
    sent_at: TIED,
    paid_at: null,
    refunded_at: null,
    voided_at: null,
    void_reason: null,
    invoice_email_sent_at: null,
    stripe_checkout_session_id: null,
    checkout_session_expires_at: null,
    awaiting_async_payment_at: null,
    mint_attempt: 0,
    checkout_count: 0,
    stripe_payment_intent_id: null,
    amount_refunded: null,
    stripe_subscription_id: null,
    ...over,
  } as EngagementInvoice;
}

const deposit = (over: Partial<EngagementInvoice> = {}) => inv({ id: 'i-deposit', kind: 'deposit', ...over });
const balance = (over: Partial<EngagementInvoice> = {}) =>
  inv({ id: 'i-balance', kind: 'balance', pct_of_build: 50, label: 'Balance — Biz (50%)', sent_at: null, status: 'draft', ...over });

describe('pickPayable — deterministic under tied created_at', () => {
  test('deposit and balance BOTH sent with byte-identical created_at → the deposit, every time', () => {
    const d = deposit({ created_at: TIED, sent_at: '2026-09-06T10:00:00.000Z' });
    const b = balance({ created_at: TIED, status: 'sent', sent_at: '2026-09-06T10:00:00.000Z' });
    // Repeated calls, and both input orders: the answer never moves.
    for (const rows of [[d, b], [b, d]]) {
      for (let i = 0; i < 5; i++) {
        expect(pickPayable(rows)?.id).toBe('i-deposit');
      }
    }
  });

  test('a later-sent balance still loses to an earlier-sent deposit', () => {
    const d = deposit({ sent_at: '2026-09-06T10:00:00.000Z' });
    const b = balance({ status: 'sent', sent_at: '2026-09-20T10:00:00.000Z' });
    expect(pickPayable([b, d])?.id).toBe('i-deposit');
  });

  test('only the balance is sent → the balance', () => {
    const d = deposit({ status: 'paid', paid_at: '2026-09-07T00:00:00.000Z' });
    const b = balance({ status: 'sent', sent_at: '2026-09-20T10:00:00.000Z' });
    expect(pickPayable([d, b])?.id).toBe('i-balance');
  });

  test('nothing sent → null; a draft balance is not payable', () => {
    expect(pickPayable([deposit({ status: 'paid' }), balance()])).toBeNull();
    expect(pickPayable([])).toBeNull();
  });

  test('a voided row is NEVER payable, even when its status still says sent', () => {
    const v = deposit({ status: 'sent', voided_at: '2026-09-08T00:00:00.000Z', void_reason: 'Engagement marked lost' });
    expect(pickPayable([v])).toBeNull();
  });

  test('paid, refunded and void rows are never payable', () => {
    for (const status of ['paid', 'refunded', 'void', 'draft'] as const) {
      expect(pickPayable([deposit({ status })])).toBeNull();
    }
  });
});

describe('pickDeposit / pickLatestSettled', () => {
  test('pickDeposit ignores kind balance', () => {
    expect(pickDeposit([balance({ status: 'sent', sent_at: TIED })])).toBeNull();
    expect(pickDeposit([balance({ status: 'sent' }), deposit()])?.id).toBe('i-deposit');
  });

  test('pickDeposit ignores a voided deposit', () => {
    expect(pickDeposit([deposit({ voided_at: TIED })])).toBeNull();
  });

  test('pickLatestSettled returns a REFUNDED row — which "newest paid" could not', () => {
    const d = deposit({ status: 'refunded', paid_at: '2026-09-07T00:00:00.000Z', refunded_at: '2026-09-25T00:00:00.000Z', amount_refunded: 20000 });
    expect(pickLatestSettled([d])?.id).toBe('i-deposit');
  });

  test('pickLatestSettled prefers the most recently settled row', () => {
    const d = deposit({ status: 'paid', paid_at: '2026-09-07T00:00:00.000Z' });
    const b = balance({ status: 'paid', sent_at: '2026-09-20T00:00:00.000Z', paid_at: '2026-09-22T00:00:00.000Z' });
    expect(pickLatestSettled([d, b])?.id).toBe('i-balance');
    expect(pickLatestSettled([b, d])?.id).toBe('i-balance');
  });

  test('pickLatestSettled ignores sent, draft and voided rows', () => {
    expect(pickLatestSettled([deposit({ status: 'sent' }), balance()])).toBeNull();
    expect(pickLatestSettled([deposit({ status: 'paid', voided_at: TIED })])).toBeNull();
  });
});

describe('selectBandState — the precedence the client sees', () => {
  const paidDeposit = deposit({ status: 'paid', paid_at: '2026-09-07T00:00:00.000Z' });
  const sentBalance = balance({ status: 'sent', sent_at: '2026-09-20T00:00:00.000Z' });

  test('a payable invoice wins over everything else', () => {
    expect(
      selectBandState({ payable: sentBalance, deposit: paidDeposit, settled: paidDeposit, paidParam: null }),
    ).toMatchObject({ kind: 'due', invoice: sentBalance, depositPaidAt: '2026-09-07T00:00:00.000Z' });
  });

  test('a balance due with an UNPAID deposit never claims a deposit was received', () => {
    const state = selectBandState({
      payable: sentBalance,
      deposit: deposit({ status: 'sent' }),
      settled: null,
      paidParam: null,
    });
    expect(state).toMatchObject({ kind: 'due', depositPaidAt: null });
  });

  test('a REFUNDED deposit does not count as received, despite keeping paid_at', () => {
    const refunded = deposit({ status: 'refunded', paid_at: '2026-09-07T00:00:00.000Z', refunded_at: '2026-09-10T00:00:00.000Z' });
    expect(refunded.paid_at).not.toBeNull();
    expect(
      selectBandState({ payable: sentBalance, deposit: refunded, settled: refunded, paidParam: null }),
    ).toMatchObject({ kind: 'due', depositPaidAt: null });
  });

  test('an outstanding async payment beats the thanks and due bands', () => {
    const pending = balance({ status: 'sent', sent_at: TIED, awaiting_async_payment_at: TIED });
    expect(selectBandState({ payable: pending, deposit: paidDeposit, settled: null, paidParam: pending.id }))
      .toMatchObject({ kind: 'pending', invoice: pending });
  });

  test('?paid=<id> matching the payable row shows thanks; a NON-matching id does not', () => {
    expect(selectBandState({ payable: sentBalance, deposit: paidDeposit, settled: null, paidParam: sentBalance.id }))
      .toMatchObject({ kind: 'thanks', invoice: sentBalance });
    expect(selectBandState({ payable: sentBalance, deposit: paidDeposit, settled: null, paidParam: 'i-deposit' }))
      .toMatchObject({ kind: 'due' });
  });

  test('the LEGACY ?paid=1 shows thanks for a DEPOSIT — a pre-deploy Stripe session returns here', () => {
    const sentDeposit = deposit({ status: 'sent', sent_at: TIED });
    expect(selectBandState({ payable: sentDeposit, deposit: sentDeposit, settled: null, paidParam: '1' }))
      .toMatchObject({ kind: 'thanks', invoice: sentDeposit });
  });

  test('the legacy ?paid=1 is IGNORED when the payable row is a balance', () => {
    // Slice 4 could only ever mint for a deposit, so a bare `1` cannot have
    // come from a balance payment. Honouring it here would replay exactly the
    // swallowing this slice exists to remove: an old URL showing "thank you"
    // against money the client has not paid.
    expect(selectBandState({ payable: sentBalance, deposit: paidDeposit, settled: null, paidParam: '1' }))
      .toMatchObject({ kind: 'due', invoice: sentBalance });
  });

  test('nothing payable + balance paid + deposit paid → settled IN FULL', () => {
    const paidBalance = balance({ status: 'paid', sent_at: '2026-09-20T00:00:00.000Z', paid_at: '2026-09-22T00:00:00.000Z' });
    expect(selectBandState({ payable: null, deposit: paidDeposit, settled: paidBalance, paidParam: null }))
      .toMatchObject({ kind: 'balance_paid', inFull: true, invoice: paidBalance });
  });

  test('nothing payable + balance paid + deposit REFUNDED → received, but NOT in full', () => {
    // Only the balance is actually held; announcing full settlement would be a
    // lie the client can check against their own bank statement.
    const refundedDeposit = deposit({ status: 'refunded', paid_at: '2026-09-07T00:00:00.000Z', refunded_at: '2026-09-10T00:00:00.000Z', amount_refunded: 43750 });
    const paidBalance = balance({ status: 'paid', sent_at: '2026-09-20T00:00:00.000Z', paid_at: '2026-09-22T00:00:00.000Z' });
    expect(selectBandState({ payable: null, deposit: refundedDeposit, settled: paidBalance, paidParam: null }))
      .toMatchObject({ kind: 'balance_paid', inFull: false });
  });

  test('nothing payable + only the deposit paid → 4A deposit-paid band, unchanged', () => {
    expect(selectBandState({ payable: null, deposit: paidDeposit, settled: paidDeposit, paidParam: null }))
      .toMatchObject({ kind: 'deposit_paid', invoice: paidDeposit });
  });

  test('a refunded settled row carries BOTH the refunded and the original amount', () => {
    const partial = deposit({ status: 'refunded', paid_at: '2026-09-07T00:00:00.000Z', refunded_at: '2026-09-25T00:00:00.000Z', amount: 43750, amount_refunded: 20000 });
    expect(selectBandState({ payable: null, deposit: partial, settled: partial, paidParam: null })).toMatchObject({
      kind: 'refunded',
      refundedAmount: 20000,
      originalAmount: 43750,
      partial: true,
    });
  });

  test('a FULL refund is the same band, flagged not-partial', () => {
    const full = deposit({ status: 'refunded', paid_at: '2026-09-07T00:00:00.000Z', refunded_at: '2026-09-25T00:00:00.000Z', amount: 43750, amount_refunded: 43750 });
    expect(selectBandState({ payable: null, deposit: full, settled: full, paidParam: null })).toMatchObject({
      kind: 'refunded',
      refundedAmount: 43750,
      originalAmount: 43750,
      partial: false,
    });
  });

  test('nothing at all → the plain accepted band', () => {
    expect(selectBandState({ payable: null, deposit: null, settled: null, paidParam: null })).toEqual({ kind: 'accepted' });
  });
});

describe('the async selectors are thin wrappers over the pure pickers', () => {
  /** Minimal stub of the PostgREST builder chain the selectors use. */
  function db(rows: EngagementInvoice[], error: unknown = null) {
    const chain = {
      select: () => chain,
      eq: () => chain,
      is: () => chain,
      then: (resolve: (v: { data: EngagementInvoice[] | null; error: unknown }) => unknown) =>
        Promise.resolve(resolve({ data: error ? null : rows, error })),
    };
    return { from: () => chain } as never;
  }

  test('each selector reads once and delegates', async () => {
    const rows = [deposit({ status: 'paid', paid_at: TIED }), balance({ status: 'sent', sent_at: TIED })];
    expect((await selectPayableInvoice(db(rows), 'p1'))?.id).toBe('i-balance');
    expect((await selectDepositInvoice(db(rows), 'p1'))?.id).toBe('i-deposit');
    expect((await selectLatestSettledInvoice(db(rows), 'p1'))?.id).toBe('i-deposit');
  });

  test('a read error yields null rather than throwing — a band we cannot compute must not blank the page', async () => {
    expect(await selectPayableInvoice(db([], { message: 'boom' }), 'p1')).toBeNull();
    expect(await selectDepositInvoice(db([], { message: 'boom' }), 'p1')).toBeNull();
    expect(await selectLatestSettledInvoice(db([], { message: 'boom' }), 'p1')).toBeNull();
  });
});
