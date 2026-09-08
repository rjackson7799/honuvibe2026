// The Balance cell and the per-invoice alert strips (slice 5, migration 077).
//
// Two things here are regressions waiting to happen rather than ordinary UI:
//
//   1. the CLOSED wording. 077 stops the terminal sweep voiding anything on a
//      close, which is what makes closing reversible — but it also means a
//      long-closed engagement would otherwise sit there reading "not billed
//      YET", which reads like an open task forever.
//   2. the alert strips. Slice 4 filtered both on the DEPOSIT's id, so a
//      duplicate or failed payment on a balance was invisible. That is money
//      Stripe took twice and nobody was told about.
import { describe, expect, it, vi } from 'vitest';
import { render, screen } from '@testing-library/react';
import { ProposalInvoicesBlock, balanceCellText, depositCellText } from './ProposalInvoicesBlock';
import type { Engagement, EngagementEvent, EngagementInvoice, EngagementProposal } from '@/lib/admin/types';

vi.mock('next/navigation', () => ({ useRouter: () => ({ refresh: vi.fn() }) }));
vi.mock('@/lib/studio/engagement/invoice-actions', () => ({
  issueDeposit: vi.fn(),
  resendInvoiceEmail: vi.fn(),
  sendBalanceInvoice: vi.fn(),
}));

const PID = 'p-1';
const EID = 'e-1';

function invoice(over: Partial<EngagementInvoice> & { id: string }): EngagementInvoice {
  return {
    created_at: '2026-09-06T10:00:00.000Z',
    updated_at: '2026-09-06T10:00:00.000Z',
    engagement_id: EID,
    proposal_id: PID,
    kind: 'deposit',
    pct_of_build: 50,
    label: 'Deposit — Biz (50%)',
    currency: 'USD',
    amount: 43750,
    recipient_email: 'client@example.com',
    status: 'sent',
    sent_at: '2026-09-06T10:00:00.000Z',
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

const deposit = (over: Partial<EngagementInvoice> = {}) => invoice({ id: 'i-dep', kind: 'deposit', ...over });
const balance = (over: Partial<EngagementInvoice> = {}) =>
  invoice({ id: 'i-bal', kind: 'balance', label: 'Balance — Biz (50%)', status: 'draft', sent_at: null, ...over });

function engagement(stage = 'launch'): Engagement {
  return { id: EID, stage, title: 'Kailua Café', client_contact_email: 'client@example.com', client_contact_name: 'Kai' } as Engagement;
}
const proposal = { id: PID, total_build: 87500, currency: 'USD' } as EngagementProposal;

function event(over: Partial<EngagementEvent>): EngagementEvent {
  return { id: `ev-${Math.random()}`, engagement_id: EID, created_at: '2026-09-20T00:00:00.000Z', resolved_at: null, ...over } as EngagementEvent;
}

function renderBlock(opts: { stage?: string; invoices: EngagementInvoice[]; events?: EngagementEvent[] }) {
  return render(
    <ProposalInvoicesBlock
      engagement={engagement(opts.stage)}
      proposal={proposal}
      invoices={opts.invoices}
      events={opts.events ?? []}
      disabled={false}
    />,
  );
}

const balanceCell = () => document.querySelector('[data-balance-state]');
const sendBalance = () => document.querySelector('[data-send-balance]') as HTMLButtonElement | null;

describe('the Balance cell — eight states', () => {
  it('is NOT rendered at 100% (there is no balance row)', () => {
    renderBlock({ invoices: [deposit({ pct_of_build: 100, status: 'paid', paid_at: '2026-09-07T00:00:00.000Z' })] });
    expect(balanceCell()).toBeNull();
  });

  it('draft before launch: "not billed yet", Send balance DISABLED with the reason', () => {
    renderBlock({ stage: 'build', invoices: [deposit({ status: 'paid', paid_at: '2026-09-07T00:00:00.000Z' }), balance()] });
    expect(balanceCell()!.textContent).toContain('$437.50 — not billed yet');
    expect(sendBalance()!.disabled).toBe(true);
    expect(sendBalance()!.title).toBe('Billable once the engagement reaches Launch');
  });

  it.each(['launch', 'care'])('draft at %s: Send balance ENABLED', (stage) => {
    renderBlock({ stage, invoices: [deposit({ status: 'paid' }), balance()] });
    expect(balanceCell()!.textContent).toContain('not billed yet');
    expect(sendBalance()!.disabled).toBe(false);
  });

  it('draft on a CLOSED engagement: a fact, not a to-do, and NO button', () => {
    // Judgment call 2. The word "yet" is the whole problem being fixed here.
    renderBlock({ stage: 'closed', invoices: [deposit({ status: 'paid' }), balance()] });
    expect(balanceCell()!.textContent).toContain('$437.50 — not billed (engagement closed)');
    expect(balanceCell()!.textContent).not.toContain('not billed yet');
    expect(sendBalance()).toBeNull();
  });

  it('draft on a LOST engagement reads the same way, naming lost', () => {
    renderBlock({ stage: 'lost', invoices: [deposit({ status: 'paid' }), balance()] });
    expect(balanceCell()!.textContent).toContain('not billed (engagement lost)');
    expect(sendBalance()).toBeNull();
  });

  it('sent: billed date, not paid, checkout count, and the email line', () => {
    renderBlock({
      invoices: [deposit({ status: 'paid' }), balance({ status: 'sent', sent_at: '2026-09-20T00:00:00.000Z', checkout_count: 2 })],
    });
    const text = balanceCell()!.textContent ?? '';
    expect(text).toContain('billed');
    expect(text).toContain('not paid');
    expect(text).toContain('checkout opened 2×');
    expect(document.querySelector('[data-email-line="balance"]')!.textContent).toContain('Balance email not sent');
  });

  it('sent + awaiting async: says the payment started', () => {
    renderBlock({
      invoices: [balance({ status: 'sent', sent_at: '2026-09-20T00:00:00.000Z', awaiting_async_payment_at: '2026-09-21T00:00:00.000Z' })],
    });
    expect(balanceCell()!.textContent).toContain('payment started, awaiting confirmation');
    expect(balanceCell()!.textContent).not.toContain('not paid');
  });

  it('sent with a delivered email names the date instead of the coral warning', () => {
    renderBlock({
      invoices: [balance({ status: 'sent', sent_at: '2026-09-20T00:00:00.000Z', invoice_email_sent_at: '2026-09-20T00:00:00.000Z' })],
    });
    const line = document.querySelector('[data-email-line="balance"]')!;
    expect(line.textContent).toContain('Balance email sent');
    expect(line.className).not.toContain('accent-coral');
  });

  it('paid: the amount, the date and a tick', () => {
    renderBlock({ invoices: [balance({ status: 'paid', paid_at: '2026-09-22T00:00:00.000Z' })] });
    expect(balanceCell()!.textContent).toContain('$437.50');
    expect(balanceCell()!.textContent).toContain('✓');
    expect(sendBalance()).toBeNull();
  });

  it('refunded: both amounts, flagged partial, in coral', () => {
    renderBlock({
      invoices: [balance({ status: 'refunded', paid_at: '2026-09-22T00:00:00.000Z', refunded_at: '2026-09-25T00:00:00.000Z', amount_refunded: 20000 })],
    });
    expect(balanceCell()!.textContent).toContain('$200.00 of $437.50 refunded');
    expect(balanceCell()!.textContent).toContain('(partial)');
    expect(balanceCell()!.className).toContain('accent-coral');
  });

  it('a FULL refund omits the partial flag', () => {
    renderBlock({
      invoices: [balance({ status: 'refunded', refunded_at: '2026-09-25T00:00:00.000Z', amount_refunded: 43750 })],
    });
    expect(balanceCell()!.textContent).not.toContain('(partial)');
  });
});

describe('Resend is suppressed on a terminal engagement', () => {
  it.each(['closed', 'lost'])('no resend buttons at %s, even for a SENT invoice', (stage) => {
    // 075 voided a sent invoice on close, so this state is new in 077.
    renderBlock({
      stage,
      invoices: [deposit({ status: 'sent' }), balance({ status: 'sent', sent_at: '2026-09-20T00:00:00.000Z' })],
    });
    expect(document.querySelectorAll('[data-resend]')).toHaveLength(0);
  });

  it('both resend buttons appear at launch', () => {
    renderBlock({
      invoices: [deposit({ status: 'sent' }), balance({ status: 'sent', sent_at: '2026-09-20T00:00:00.000Z' })],
    });
    expect(document.querySelector('[data-resend="deposit"]')).not.toBeNull();
    expect(document.querySelector('[data-resend="balance"]')).not.toBeNull();
    expect(screen.getByRole('button', { name: /resend balance email/i })).toBeTruthy();
  });
});

describe('the alert strips are per-invoice and NAME the invoice', () => {
  it('a duplicate payment on the BALANCE renders the strip and says "balance"', () => {
    // Slice 4 filtered on the deposit id, so this strip never appeared.
    renderBlock({
      invoices: [deposit({ status: 'paid' }), balance({ status: 'paid', paid_at: '2026-09-22T00:00:00.000Z' })],
      events: [event({ kind: 'invoice_duplicate_payment', data: { invoice_id: 'i-bal', payment_intent_id: 'pi_dupe' } })],
    });
    const strip = screen.getByText(/a second payment landed on the balance/i);
    expect(strip).toBeTruthy();
    expect(strip.parentElement!.textContent).toContain('pi_dupe');
  });

  it('a duplicate payment on the DEPOSIT still says "deposit"', () => {
    renderBlock({
      invoices: [deposit({ status: 'paid' }), balance()],
      events: [event({ kind: 'invoice_duplicate_payment', data: { invoice_id: 'i-dep', payment_intent_id: 'pi_dupe' } })],
    });
    expect(screen.getByText(/a second payment landed on the deposit/i)).toBeTruthy();
  });

  it('a RESOLVED duplicate, and one on a voided invoice, render nothing', () => {
    renderBlock({
      invoices: [deposit({ status: 'paid' }), balance()],
      events: [
        event({ kind: 'invoice_duplicate_payment', resolved_at: '2026-09-26T00:00:00.000Z', data: { invoice_id: 'i-dep' } }),
        event({ kind: 'invoice_duplicate_payment', data: { invoice_id: 'i-gone' } }),
      ],
    });
    expect(screen.queryByText(/a second payment landed/i)).toBeNull();
  });

  it('a failed payment on the BALANCE marks the balance cell, not the deposit', () => {
    renderBlock({
      invoices: [deposit({ status: 'sent' }), balance({ status: 'sent', sent_at: '2026-09-20T00:00:00.000Z' })],
      events: [event({ kind: 'invoice_payment_failed', data: { invoice_id: 'i-bal' } })],
    });
    expect(balanceCell()!.textContent).toContain('last payment attempt failed');
    expect(document.querySelector('[data-deposit-state]')!.textContent).not.toContain('last payment attempt failed');
  });

  it('a payment that later SUCCEEDED clears the failed flag', () => {
    renderBlock({
      invoices: [balance({ status: 'sent', sent_at: '2026-09-20T00:00:00.000Z' })],
      events: [
        event({ kind: 'invoice_paid', created_at: '2026-09-22T00:00:00.000Z', data: { invoice_id: 'i-bal' } }),
        event({ kind: 'invoice_payment_failed', created_at: '2026-09-21T00:00:00.000Z', data: { invoice_id: 'i-bal' } }),
      ],
    });
    expect(balanceCell()!.textContent).not.toContain('last payment attempt failed');
  });
});

describe('the cell text helpers', () => {
  it('depositCellText no longer speaks for the balance — the Balance cell does', () => {
    const text = depositCellText(deposit({ status: 'paid', paid_at: '2026-09-07T00:00:00.000Z' }));
    expect(text).toContain('paid');
    expect(text).not.toContain('Balance');
  });

  it('depositCellText handles a missing deposit', () => {
    expect(depositCellText(null)).toBe('Not requested');
  });

  it('balanceCellText is driven by the stage for the draft branch only', () => {
    const draft = balance();
    expect(balanceCellText(draft, 'build')).toContain('not billed yet');
    expect(balanceCellText(draft, 'closed')).toContain('not billed (engagement closed)');

    // A sent or paid balance says the same thing whatever the stage.
    const sent = balance({ status: 'sent', sent_at: '2026-09-20T00:00:00.000Z' });
    expect(balanceCellText(sent, 'closed')).toBe(balanceCellText(sent, 'launch'));
  });
});
