import { afterEach, beforeEach, describe, expect, it } from 'vitest';
import {
  ENGAGEMENT_INVOICE_CHECKOUT_KIND,
  buildEngagementInvoiceSessionParams,
  idempotencyKeyFor,
  isEngagementInvoiceSession,
  isStripeIdempotencyError,
  type EngagementInvoiceCheckoutInput,
} from './engagement-invoice';

const INVOICE_ID = '11111111-2222-3333-4444-555555555555';
const ENGAGEMENT_ID = 'aaaaaaaa-bbbb-cccc-dddd-eeeeeeeeeeee';
const PROPOSAL_ID = '99999999-8888-7777-6666-555555555555';

function input(overrides: Partial<EngagementInvoiceCheckoutInput> = {}): EngagementInvoiceCheckoutInput {
  return {
    invoiceId: INVOICE_ID,
    attempt: 0,
    amount: 43750,
    currency: 'USD',
    label: 'Deposit — Hawaii Palms (50%)',
    recipientEmail: 'client@example.com',
    engagementId: ENGAGEMENT_ID,
    proposalId: PROPOSAL_ID,
    locale: 'en',
    ...overrides,
  };
}

const ORIGINAL_SITE_URL = process.env.NEXT_PUBLIC_SITE_URL;

beforeEach(() => {
  process.env.NEXT_PUBLIC_SITE_URL = 'https://honuvibe.ai';
});
afterEach(() => {
  if (ORIGINAL_SITE_URL === undefined) delete process.env.NEXT_PUBLIC_SITE_URL;
  else process.env.NEXT_PUBLIC_SITE_URL = ORIGINAL_SITE_URL;
});

describe('buildEngagementInvoiceSessionParams', () => {
  it('builds a one-time payment for the exact row amount in USD cents', () => {
    const params = buildEngagementInvoiceSessionParams(input());
    expect(params.mode).toBe('payment');
    expect(params.client_reference_id).toBe(INVOICE_ID);
    expect(params.line_items).toHaveLength(1);
    const item = params.line_items![0];
    expect(item.quantity).toBe(1);
    expect(item.price_data!.currency).toBe('usd');
    expect(item.price_data!.unit_amount).toBe(43750);
    expect(item.price_data!.product_data!.name).toBe('Deposit — Hawaii Palms (50%)');
  });

  it('passes JPY as whole yen (zero-decimal), lower-cased', () => {
    const params = buildEngagementInvoiceSessionParams(
      input({ currency: 'JPY', amount: 66000, locale: 'ja' }),
    );
    expect(params.line_items![0].price_data!.currency).toBe('jpy');
    expect(params.line_items![0].price_data!.unit_amount).toBe(66000);
  });

  it('NEVER passes payment_method_types, allow_promotion_codes, discounts or expires_at', () => {
    const params = buildEngagementInvoiceSessionParams(input()) as Record<string, unknown>;
    expect(params).not.toHaveProperty('payment_method_types');
    expect(params).not.toHaveProperty('allow_promotion_codes');
    expect(params).not.toHaveProperty('discounts');
    expect(params).not.toHaveProperty('expires_at');
    // integration_identifier needs API >= 2026-03-25.dahlia; we stay on clover.
    expect(params).not.toHaveProperty('integration_identifier');
  });

  it('carries exactly the six metadata keys the webhook branch relies on', () => {
    const params = buildEngagementInvoiceSessionParams(input());
    expect(Object.keys(params.metadata!).sort()).toEqual(
      ['checkout_kind', 'currency', 'engagement_id', 'invoice_id', 'locale', 'proposal_id'].sort(),
    );
    expect(params.metadata).toEqual({
      checkout_kind: ENGAGEMENT_INVOICE_CHECKOUT_KIND,
      engagement_id: ENGAGEMENT_ID,
      invoice_id: INVOICE_ID,
      proposal_id: PROPOSAL_ID,
      currency: 'USD',
      locale: 'en',
    });
  });

  it('sets the Stripe locale and the locale-correct return URLs', () => {
    const en = buildEngagementInvoiceSessionParams(input());
    expect(en.locale).toBe('en');
    expect(en.success_url).toBe(`https://honuvibe.ai/proposal/${PROPOSAL_ID}?paid=1`);
    expect(en.cancel_url).toBe(`https://honuvibe.ai/proposal/${PROPOSAL_ID}`);

    const ja = buildEngagementInvoiceSessionParams(input({ locale: 'ja' }));
    expect(ja.locale).toBe('ja');
    expect(ja.success_url).toBe(`https://honuvibe.ai/ja/proposal/${PROPOSAL_ID}?paid=1`);
    expect(ja.cancel_url).toBe(`https://honuvibe.ai/ja/proposal/${PROPOSAL_ID}`);
  });

  it('prefers NEXT_PUBLIC_SITE_URL over the request origin, so two clicks cannot drift', () => {
    const withHeader = buildEngagementInvoiceSessionParams(input(), 'https://www.honuvibe.ai');
    expect(withHeader.success_url).toContain('https://honuvibe.ai/');
    expect(withHeader.success_url).not.toContain('www.');

    delete process.env.NEXT_PUBLIC_SITE_URL;
    const fallback = buildEngagementInvoiceSessionParams(input(), 'https://preview.example.com/');
    expect(fallback.success_url).toBe(`https://preview.example.com/proposal/${PROPOSAL_ID}?paid=1`);
  });

  it('is deterministic: the same input twice yields deep-equal params (idempotency safety)', () => {
    expect(buildEngagementInvoiceSessionParams(input())).toEqual(
      buildEngagementInvoiceSessionParams(input()),
    );
    expect(buildEngagementInvoiceSessionParams(input(), 'https://a.example')).toEqual(
      buildEngagementInvoiceSessionParams(input(), 'https://b.example'),
    );
  });

  it('omits customer_email when the snapshotted address is null or malformed', () => {
    expect(buildEngagementInvoiceSessionParams(input()).customer_email).toBe('client@example.com');
    expect(buildEngagementInvoiceSessionParams(input({ recipientEmail: null }))).not.toHaveProperty(
      'customer_email',
    );
    expect(
      buildEngagementInvoiceSessionParams(input({ recipientEmail: 'not-an-email' })),
    ).not.toHaveProperty('customer_email');
    expect(
      buildEngagementInvoiceSessionParams(input({ recipientEmail: 'a b@c.d' })),
    ).not.toHaveProperty('customer_email');
  });
});

describe('idempotencyKeyFor', () => {
  it('is scoped to the invoice AND the mint attempt', () => {
    expect(idempotencyKeyFor(INVOICE_ID, 0)).toBe(`engagement_invoice:${INVOICE_ID}:0`);
    expect(idempotencyKeyFor(INVOICE_ID, 3)).toBe(`engagement_invoice:${INVOICE_ID}:3`);
    expect(idempotencyKeyFor(INVOICE_ID, 0)).not.toBe(idempotencyKeyFor(INVOICE_ID, 1));
  });
});

describe('isStripeIdempotencyError', () => {
  it('recognises the idempotency error in each shape Stripe reports it', () => {
    expect(isStripeIdempotencyError({ type: 'StripeIdempotencyError' })).toBe(true);
    expect(isStripeIdempotencyError({ rawType: 'idempotency_error' })).toBe(true);
    expect(isStripeIdempotencyError({ code: 'idempotency_key_in_use' })).toBe(true);
  });

  it('is false for a card error, a plain Error, null and undefined', () => {
    expect(isStripeIdempotencyError({ type: 'StripeCardError', code: 'card_declined' })).toBe(false);
    expect(isStripeIdempotencyError(new Error('boom'))).toBe(false);
    expect(isStripeIdempotencyError(null)).toBe(false);
    expect(isStripeIdempotencyError(undefined)).toBe(false);
    expect(isStripeIdempotencyError('StripeIdempotencyError')).toBe(false);
  });
});

describe('isEngagementInvoiceSession', () => {
  it('is true only for our checkout_kind', () => {
    expect(isEngagementInvoiceSession({ metadata: { checkout_kind: 'engagement_invoice' } } as never)).toBe(true);
    expect(isEngagementInvoiceSession({ metadata: { checkout_kind: 'partner' } } as never)).toBe(false);
    expect(isEngagementInvoiceSession({ metadata: { user_id: 'u', course_id: 'c' } } as never)).toBe(false);
    expect(isEngagementInvoiceSession({ metadata: null } as never)).toBe(false);
    expect(isEngagementInvoiceSession({} as never)).toBe(false);
  });
});
