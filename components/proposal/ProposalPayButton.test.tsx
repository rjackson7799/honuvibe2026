import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import { fireEvent, render, screen, waitFor } from '@testing-library/react';
import { ProposalPayButton } from './ProposalPayButton';
import { T } from './copy';

const PROPOSAL_ID = '11111111-2222-3333-4444-555555555555';
const INVOICE_ID = '99999999-8888-7777-6666-555555555555';

const assign = vi.fn();
const fetchMock = vi.fn();

function respond(status: number, body: Record<string, unknown>) {
  fetchMock.mockResolvedValueOnce({
    ok: status >= 200 && status < 300,
    status,
    json: async () => body,
  });
}

beforeEach(() => {
  assign.mockClear();
  fetchMock.mockReset();
  vi.stubGlobal('fetch', fetchMock);
  Object.defineProperty(window, 'location', {
    configurable: true,
    value: { assign, href: 'https://honuvibe.ai/proposal/x' },
  });
});

afterEach(() => {
  vi.unstubAllGlobals();
});

function click() {
  fireEvent.click(screen.getByRole('button'));
}

describe('ProposalPayButton', () => {
  it('renders the teal 48px button, the secure-payment note and an empty honeypot', () => {
    render(<ProposalPayButton proposalId={PROPOSAL_ID} invoiceId={INVOICE_ID} kind="deposit" locale="en" />);
    const button = screen.getByRole('button', { name: T.en.depositButton });
    expect(button.className).toContain('min-h-[48px]');
    expect(button.className).toContain('--m-accent-teal');
    expect(screen.getByText(T.en.depositSecureNote)).toBeTruthy();

    const honeypot = document.querySelector('input[name="company_url"]') as HTMLInputElement | null;
    expect(honeypot).not.toBeNull();
    expect(honeypot!.value).toBe('');
    expect(honeypot!.tabIndex).toBe(-1);
  });

  it('POSTs to the mint route with no token and no amount, then navigates to the Stripe URL', async () => {
    respond(200, { url: 'https://checkout.stripe.com/c/pay/cs_test_1' });
    render(<ProposalPayButton proposalId={PROPOSAL_ID} invoiceId={INVOICE_ID} kind="deposit" locale="en" />);
    click();

    await waitFor(() => expect(assign).toHaveBeenCalledWith('https://checkout.stripe.com/c/pay/cs_test_1'));
    expect(fetchMock).toHaveBeenCalledTimes(1);
    const [url, init] = fetchMock.mock.calls[0];
    expect(url).toBe(`/api/engagement/proposal/${PROPOSAL_ID}/deposit`);
    expect(init.method).toBe('POST');
    const body = JSON.parse(init.body as string);
    // Decision 3: the CLIENT names the invoice; the server validates it.
    expect(body).toEqual({ company_url: '', invoice_id: INVOICE_ID });
    expect(body).not.toHaveProperty('token');
    expect(body).not.toHaveProperty('amount');
  });

  it.each([
    [429, {}, T.en.depositRateLimited],
    [403, { error: 'forbidden' }, T.en.depositForbidden],
    [409, { error: 'already_paid' }, T.en.depositAlreadyPaid],
    [409, { error: 'payment_pending' }, T.en.depositPaymentPending],
    [409, { error: 'not_open' }, T.en.depositNotOpen],
    [502, { error: 'checkout_unavailable' }, T.en.depositUnavailable],
    [503, { error: 'unavailable' }, T.en.depositUnavailable],
  ])('maps %i %o to its own message and does not navigate', async (status, body, message) => {
    respond(status as number, body as Record<string, unknown>);
    render(<ProposalPayButton proposalId={PROPOSAL_ID} invoiceId={INVOICE_ID} kind="deposit" locale="en" />);
    click();

    await waitFor(() => expect(screen.getByRole('alert').textContent).toBe(message));
    expect(assign).not.toHaveBeenCalled();
  });

  it('a network error shows the unavailable message and keeps the button usable', async () => {
    fetchMock.mockRejectedValueOnce(new Error('offline'));
    render(<ProposalPayButton proposalId={PROPOSAL_ID} invoiceId={INVOICE_ID} kind="deposit" locale="en" />);
    click();

    await waitFor(() => expect(screen.getByRole('alert').textContent).toBe(T.en.depositUnavailable));
    expect(screen.getByRole('button')).not.toHaveProperty('disabled', true);
  });

  it('renders the Japanese copy for a ja proposal', () => {
    render(<ProposalPayButton proposalId={PROPOSAL_ID} invoiceId={INVOICE_ID} kind="deposit" locale="ja" />);
    expect(screen.getByRole('button', { name: T.ja.depositButton })).toBeTruthy();
    expect(screen.getByText(T.ja.depositSecureNote)).toBeTruthy();
  });

  // ── slice 5 ───────────────────────────────────────────────────────────────

  it('the VISIBLE LABEL follows the kind — a balance never says "deposit"', () => {
    // Without this the balance band ships a button reading "Pay the deposit →",
    // because depositButton is a literal string, not a computed noun.
    const { unmount } = render(
      <ProposalPayButton proposalId={PROPOSAL_ID} invoiceId={INVOICE_ID} kind="balance" locale="en" />,
    );
    expect(screen.getByRole('button', { name: T.en.balanceButton })).toBeTruthy();
    expect(screen.queryByRole('button', { name: T.en.depositButton })).toBeNull();
    expect(screen.getByRole('button').textContent).not.toMatch(/deposit/i);
    unmount();

    render(<ProposalPayButton proposalId={PROPOSAL_ID} invoiceId={INVOICE_ID} kind="balance" locale="ja" />);
    expect(screen.getByRole('button', { name: T.ja.balanceButton })).toBeTruthy();
  });

  it('POSTs whichever invoice id it was rendered with', async () => {
    respond(200, { url: 'https://checkout.stripe.com/c/pay/cs_test_bal' });
    const other = '77777777-6666-5555-4444-333333333333';
    render(<ProposalPayButton proposalId={PROPOSAL_ID} invoiceId={other} kind="balance" locale="en" />);
    click();

    await waitFor(() => expect(assign).toHaveBeenCalled());
    const body = JSON.parse(fetchMock.mock.calls[0][1].body as string);
    expect(body.invoice_id).toBe(other);
  });

  it('409 stale_invoice tells the client to reload, not that payments are down', async () => {
    respond(409, { error: 'stale_invoice' });
    render(<ProposalPayButton proposalId={PROPOSAL_ID} invoiceId={INVOICE_ID} kind="balance" locale="en" />);
    click();

    await waitFor(() => expect(screen.getByRole('alert').textContent).toBe(T.en.payStale));
    expect(screen.getByRole('alert').textContent).not.toBe(T.en.depositUnavailable);
    expect(assign).not.toHaveBeenCalled();
  });
});
