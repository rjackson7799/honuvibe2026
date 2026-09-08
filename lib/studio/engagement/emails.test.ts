// @vitest-environment node
//
// sendInvoiceRequestEmail — ONE sender with a `variant`, not a second sender
// (decision 4). The rules that matter here are safety rules, not copy taste:
//
//   * the CTA is the tokenized PROPOSAL entry URL, NEVER a Stripe URL — no
//     durable payment link may exist in an inbox;
//   * the balance variant names the deposit only when the deposit was actually
//     KEPT. A refunded deposit still carries paid_at (the 075 guard freezes it
//     and permits paid -> refunded), so keying on the timestamp would tell a
//     refunded client their deposit had been received.
import { beforeEach, describe, expect, test, vi } from 'vitest';

const client = vi.hoisted(() => ({ send: vi.fn(), enabled: true }));
vi.mock('@/lib/email/client', () => ({
  getResendClient: () => (client.enabled ? { emails: { send: client.send } } : null),
  getAdminEmail: () => 'admin@example.com',
  getFromAddress: () => 'HonuVibe <hello@example.com>',
}));

import { sendInvoiceRequestEmail } from './emails';

const BASE = {
  locale: 'en' as const,
  email: 'client@example.com',
  contactName: 'Kai',
  businessName: 'Kailua Café',
  amount: '$437.50',
  pct: 50,
  entryUrl: 'https://honuvibe.ai/proposal/enter/abc123',
  linkExpiresOn: 'October 21, 2026',
  version: 1,
};

function lastSend() {
  return client.send.mock.calls.at(-1)![0] as { subject: string; html: string; to: string };
}

beforeEach(() => {
  client.enabled = true;
  client.send.mockReset().mockResolvedValue({ data: { id: 'em_1' }, error: null });
});

describe('variant shapes the subject and heading', () => {
  test('the deposit variant asks for a deposit', async () => {
    await sendInvoiceRequestEmail({ ...BASE, variant: 'deposit' });
    const sent = lastSend();
    expect(sent.subject).toContain('deposit');
    expect(sent.html).toContain('deposit');
    expect(sent.html).not.toContain('balance');
  });

  test('the balance variant asks for the balance, and differs from the deposit', async () => {
    await sendInvoiceRequestEmail({ ...BASE, variant: 'deposit' });
    const depositMail = lastSend();
    await sendInvoiceRequestEmail({ ...BASE, variant: 'balance', depositStatus: null, depositAmount: null });
    const balanceMail = lastSend();

    expect(balanceMail.subject).toContain('balance');
    expect(balanceMail.subject).not.toBe(depositMail.subject);
    expect(balanceMail.html).not.toBe(depositMail.html);
    expect(balanceMail.html).toContain('balance');
  });

  test('both variants are sent in JA with a JA subject', async () => {
    for (const variant of ['deposit', 'balance'] as const) {
      await sendInvoiceRequestEmail({ ...BASE, locale: 'ja', variant, depositStatus: null, depositAmount: null });
      expect(lastSend().subject).toContain('HonuVibe Studio');
      expect(lastSend().html).toMatch(/[ぁ-んァ-ン一-龯]/);
    }
  });
});

describe('the CTA is the entry URL, never Stripe', () => {
  test.each(['deposit', 'balance'] as const)('%s variant links only to the proposal page', async (variant) => {
    await sendInvoiceRequestEmail({ ...BASE, variant, depositStatus: 'paid', depositAmount: '$437.50' });
    const { html } = lastSend();
    expect(html).toContain(BASE.entryUrl);
    expect(html).not.toContain('checkout.stripe.com');
    expect(html).not.toContain('stripe.com');
  });
});

describe('the balance variant never assumes a deposit was received', () => {
  test('omits the deposit sentence when no deposit has been paid', async () => {
    await sendInvoiceRequestEmail({ ...BASE, variant: 'balance', depositStatus: 'sent', depositAmount: '$437.50' });
    expect(lastSend().html).not.toMatch(/received|Deposit of/i);
  });

  test('omits it when there is no deposit row at all', async () => {
    await sendInvoiceRequestEmail({ ...BASE, variant: 'balance', depositStatus: null, depositAmount: null });
    expect(lastSend().html).not.toMatch(/received|Deposit of/i);
  });

  test('omits it for a REFUNDED deposit, which still carries paid_at', async () => {
    // The regression the plan's rev 2 wording would have shipped: keying the
    // sentence on depositPaidAt instead of the status.
    await sendInvoiceRequestEmail({ ...BASE, variant: 'balance', depositStatus: 'refunded', depositAmount: '$437.50' });
    expect(lastSend().html).not.toMatch(/received/i);
  });

  test('includes it, with the amount, only when the deposit is PAID', async () => {
    await sendInvoiceRequestEmail({ ...BASE, variant: 'balance', depositStatus: 'paid', depositAmount: '$437.50' });
    const { html } = lastSend();
    expect(html).toMatch(/received/i);
    expect(html).toContain('$437.50');
  });

  test('the JA balance variant follows the same rule', async () => {
    await sendInvoiceRequestEmail({ ...BASE, locale: 'ja', variant: 'balance', depositStatus: 'sent', depositAmount: '¥66,000' });
    expect(lastSend().html).not.toContain('受領');
    await sendInvoiceRequestEmail({ ...BASE, locale: 'ja', variant: 'balance', depositStatus: 'paid', depositAmount: '¥66,000' });
    expect(lastSend().html).toContain('受領');
  });
});

describe('escaping and failure results', () => {
  test('every dynamic value is escaped', async () => {
    await sendInvoiceRequestEmail({
      ...BASE,
      variant: 'balance',
      businessName: '<b>Café</b>',
      contactName: '<script>x</script>',
      depositStatus: 'paid',
      depositAmount: '$1.00',
    });
    const { html } = lastSend();
    expect(html).not.toContain('<b>Café</b>');
    expect(html).not.toContain('<script>x</script>');
    expect(html).toContain('&lt;b&gt;Caf');
  });

  test('no provider configured, no recipient, and a provider error each return a typed failure', async () => {
    client.enabled = false;
    expect(await sendInvoiceRequestEmail({ ...BASE, variant: 'balance' })).toEqual({ ok: false, error: 'email_not_configured' });

    client.enabled = true;
    expect(await sendInvoiceRequestEmail({ ...BASE, variant: 'balance', email: '' })).toEqual({ ok: false, error: 'no_recipient' });

    client.send.mockResolvedValueOnce({ data: null, error: { message: 'rejected' } });
    expect(await sendInvoiceRequestEmail({ ...BASE, variant: 'balance' })).toEqual({ ok: false, error: 'rejected' });

    client.send.mockRejectedValueOnce(new Error('network down'));
    expect(await sendInvoiceRequestEmail({ ...BASE, variant: 'balance' })).toEqual({ ok: false, error: 'network down' });
  });

  test('success returns the provider id', async () => {
    expect(await sendInvoiceRequestEmail({ ...BASE, variant: 'deposit' })).toEqual({ ok: true, providerId: 'em_1' });
  });
});
