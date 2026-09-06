/**
 * The Stripe webhook route, driven by SIGNED fixture events (slice 4,
 * migration 075). There was no route test to copy — this file is the
 * precedent, so it exercises the real route module end to end:
 *
 *   stripe.webhooks.generateTestHeaderString → POST → the dispatcher → the
 *   handler → a recording Supabase stub.
 *
 * What it pins, beyond the happy path:
 *   - the engagement branch runs BEFORE the user_id/course_id guard;
 *   - a session that completed UNPAID does not fulfil;
 *   - async_payment_succeeded for a PARTNER cohort session reaches NEITHER
 *     the engagement RPC NOR fulfillCohortCheckout (the double-fulfil trap);
 *   - a course session never enters the engagement branch;
 *   - a tampered signature is rejected before any handler runs;
 *   - no insert anywhere carries event.data or a checkout.stripe.com string.
 */
import Stripe from 'stripe';
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';

// Every test re-imports the route module (vi.resetModules below), which
// costs seconds under full-suite load. The 5 s default made the FIRST test
// in the file flaky, and a timed-out test's in-flight call then leaked into
// the next one's mock queue. Same 30 s ceiling the RLS suites use.
vi.setConfig({ testTimeout: 30_000 });

const WEBHOOK_SECRET = 'whsec_test_engagement_invoice_fixture';
const INVOICE_ID = '11111111-2222-3333-4444-555555555555';
const ENGAGEMENT_ID = 'aaaaaaaa-bbbb-cccc-dddd-eeeeeeeeeeee';
const PROPOSAL_ID = '99999999-8888-7777-6666-555555555555';

// ── The recording Supabase stub ─────────────────────────────────────────────

type RpcCall = { name: string; args: Record<string, unknown> };
type InsertCall = { table: string; rows: unknown };

const rpcCalls: RpcCall[] = [];
const insertCalls: InsertCall[] = [];
/** name → the {data, error} the stub should return for that RPC. */
const rpcResults = new Map<string, { data: unknown; error: { message: string } | null }>();
/** table → the row `.maybeSingle()` should resolve with. */
const selectRows = new Map<string, Record<string, unknown> | null>();

/**
 * A chainable query stub: every builder method returns the same object, which
 * is itself thenable, so `.insert(x)`, `.insert(x).select()`,
 * `.update(x).eq(...)` and `.select().eq().maybeSingle()` all resolve.
 * Chainability matters — a stub that throws mid-chain would make "the course
 * branch was not entered" pass for the wrong reason.
 */
function makeQuery(table: string) {
  const result = { data: selectRows.get(table) ?? null, error: null };
  const query: Record<string, unknown> = {
    select: () => query,
    eq: () => query,
    in: () => query,
    order: () => query,
    limit: () => query,
    maybeSingle: async () => result,
    single: async () => result,
    insert: (rows: unknown) => {
      insertCalls.push({ table, rows });
      return query;
    },
    update: () => query,
    upsert: () => query,
    delete: () => query,
    then: (resolve: (v: unknown) => unknown) => Promise.resolve(result).then(resolve),
  };
  return query;
}

const supabaseStub = {
  from: (table: string) => makeQuery(table),
  rpc: async (name: string, args: Record<string, unknown>) => {
    rpcCalls.push({ name, args });
    return rpcResults.get(name) ?? { data: { applied: true }, error: null };
  },
};

vi.mock('@supabase/supabase-js', () => ({
  createClient: () => supabaseStub,
}));

const fulfillCohortCheckout = vi.fn(async () => {});
const fulfillSubscriptionCheckout = vi.fn(async () => {});
vi.mock('@/lib/partner-checkout/fulfill', () => ({
  fulfillCohortCheckout,
  fulfillSubscriptionCheckout,
}));

const sendInvoicePaidAdminNotification = vi.fn(
  async (_data: Record<string, unknown>) => ({ ok: true, providerId: 'em_1' }),
);
vi.mock('@/lib/studio/engagement/emails', async (importOriginal) => {
  const actual = await importOriginal<Record<string, unknown>>();
  return { ...actual, sendInvoicePaidAdminNotification };
});

// Attribution / analytics helpers the course branch would reach for.
vi.mock('@/lib/analytics-server', () => ({ trackServerEvent: vi.fn(async () => {}) }));

// ── Fixtures ────────────────────────────────────────────────────────────────

const stripeForSigning = new Stripe('sk_test_fixture', { apiVersion: '2026-02-25.clover' });

function engagementSession(overrides: Record<string, unknown> = {}) {
  return {
    id: 'cs_test_engagement_1',
    object: 'checkout.session',
    amount_total: 43750,
    currency: 'usd',
    client_reference_id: INVOICE_ID,
    payment_status: 'paid',
    payment_intent: 'pi_test_1',
    metadata: {
      checkout_kind: 'engagement_invoice',
      engagement_id: ENGAGEMENT_ID,
      invoice_id: INVOICE_ID,
      proposal_id: PROPOSAL_ID,
      currency: 'USD',
      locale: 'en',
    },
    ...overrides,
  };
}

function partnerCohortSession() {
  return {
    id: 'cs_test_partner_1',
    object: 'checkout.session',
    amount_total: 50000,
    currency: 'usd',
    payment_status: 'paid',
    payment_intent: 'pi_partner_1',
    metadata: { checkout_kind: 'partner', tier: 'cohort', partner_slug: 'acme' },
  };
}

function courseSession() {
  return {
    id: 'cs_test_course_1',
    object: 'checkout.session',
    amount_total: 19900,
    currency: 'usd',
    payment_status: 'paid',
    payment_intent: 'pi_course_1',
    metadata: { user_id: 'u_1', course_id: 'c_1', currency: 'usd', locale: 'en' },
  };
}

function eventBody(type: string, object: Record<string, unknown>) {
  return JSON.stringify({
    id: `evt_${Math.random().toString(36).slice(2)}`,
    object: 'event',
    api_version: '2026-02-25.clover',
    created: Math.floor(Date.now() / 1000),
    type,
    data: { object },
  });
}

async function post(type: string, object: Record<string, unknown>, opts: { tamper?: boolean } = {}) {
  const { POST } = await import('@/app/api/stripe/webhook/route');
  const payload = eventBody(type, object);
  const signature = stripeForSigning.webhooks.generateTestHeaderString({
    payload,
    secret: opts.tamper ? 'whsec_wrong_secret' : WEBHOOK_SECRET,
  });
  const request = new Request('https://honuvibe.ai/api/stripe/webhook', {
    method: 'POST',
    headers: { 'stripe-signature': signature, 'content-type': 'application/json' },
    body: payload,
  });
  // The route only reads .text() and .headers, so a plain Request is enough.
  return POST(request as never);
}

const rpcNamed = (name: string) => rpcCalls.filter((c) => c.name === name);

beforeEach(() => {
  vi.resetModules();
  rpcCalls.length = 0;
  insertCalls.length = 0;
  rpcResults.clear();
  selectRows.clear();
  fulfillCohortCheckout.mockClear();
  fulfillSubscriptionCheckout.mockClear();
  sendInvoicePaidAdminNotification.mockClear();

  process.env.STRIPE_WEBHOOK_SECRET = WEBHOOK_SECRET;
  process.env.STRIPE_SECRET_KEY = 'sk_test_fixture';
  process.env.NEXT_PUBLIC_SUPABASE_URL = 'https://stub.supabase.co';
  process.env.SUPABASE_SERVICE_ROLE_KEY = 'service-role-stub';

  selectRows.set('engagement_invoices', {
    engagement_id: ENGAGEMENT_ID,
    proposal_id: PROPOSAL_ID,
    kind: 'deposit',
    pct_of_build: 50,
    amount: 43750,
    currency: 'USD',
  });
  selectRows.set('engagements', {
    title: 'Hawaii Palms',
    client_contact_name: 'Kai',
    client_contact_email: 'kai@example.com',
  });
  selectRows.set('engagement_proposals', { version: 2 });
});

afterEach(() => {
  vi.restoreAllMocks();
});

// ── checkout.session.completed ──────────────────────────────────────────────

describe('checkout.session.completed — engagement invoice', () => {
  it('marks the invoice paid with the session figures and notifies Ryan', async () => {
    rpcResults.set('mark_engagement_invoice_paid', {
      data: { applied: true, engagement_id: ENGAGEMENT_ID, kind: 'deposit', amount: 43750, currency: 'USD', on_void: false },
      error: null,
    });

    const res = await post('checkout.session.completed', engagementSession());
    expect(res.status).toBe(200);

    const paid = rpcNamed('mark_engagement_invoice_paid');
    expect(paid).toHaveLength(1);
    expect(paid[0].args).toEqual({
      p_invoice_id: INVOICE_ID,
      p_session_id: 'cs_test_engagement_1',
      p_payment_intent_id: 'pi_test_1',
      p_amount_total: 43750,
      p_currency: 'usd',
    });
    expect(sendInvoicePaidAdminNotification).toHaveBeenCalledTimes(1);
    expect(sendInvoicePaidAdminNotification.mock.calls[0][0]).toMatchObject({
      variant: 'paid',
      amount: '$437.50',
      kind: 'Deposit',
      paymentIntentId: 'pi_test_1',
    });
  });

  it('resolves the invoice id from client_reference_id when metadata omits it', async () => {
    rpcResults.set('mark_engagement_invoice_paid', { data: { applied: true, on_void: false }, error: null });
    const session = engagementSession();
    delete (session.metadata as Record<string, unknown>).invoice_id;

    await post('checkout.session.completed', session);
    expect(rpcNamed('mark_engagement_invoice_paid')[0].args.p_invoice_id).toBe(INVOICE_ID);
  });

  it('a session completed UNPAID stamps awaiting and does NOT fulfil', async () => {
    const res = await post(
      'checkout.session.completed',
      engagementSession({ payment_status: 'unpaid', payment_intent: null }),
    );
    expect(res.status).toBe(200);
    expect(rpcNamed('mark_engagement_invoice_paid')).toHaveLength(0);
    const awaiting = rpcNamed('mark_engagement_invoice_awaiting_async');
    expect(awaiting).toHaveLength(1);
    expect(awaiting[0].args).toEqual({
      p_invoice_id: INVOICE_ID,
      p_session_id: 'cs_test_engagement_1',
      p_clear: false,
    });
    expect(sendInvoicePaidAdminNotification).not.toHaveBeenCalled();
  });

  it('already_paid is a quiet no-op: 200, no notification, no event insert', async () => {
    rpcResults.set('mark_engagement_invoice_paid', { data: { applied: false, reason: 'already_paid' }, error: null });
    const res = await post('checkout.session.completed', engagementSession());
    expect(res.status).toBe(200);
    expect(sendInvoicePaidAdminNotification).not.toHaveBeenCalled();
    expect(insertCalls.filter((c) => c.table === 'engagement_events')).toHaveLength(0);
  });

  it('duplicate_payment notifies Ryan and still returns 200', async () => {
    rpcResults.set('mark_engagement_invoice_paid', {
      data: { applied: false, reason: 'duplicate_payment', payment_intent_id: 'pi_test_1' },
      error: null,
    });
    const res = await post('checkout.session.completed', engagementSession());
    expect(res.status).toBe(200);
    expect(sendInvoicePaidAdminNotification.mock.calls[0][0]).toMatchObject({ variant: 'duplicate_payment' });
  });

  it('not_found notifies Ryan and returns 200 — there is no row to retry into', async () => {
    rpcResults.set('mark_engagement_invoice_paid', { data: { applied: false, reason: 'not_found' }, error: null });
    selectRows.set('engagement_invoices', null);
    selectRows.set('engagements', null);
    const res = await post('checkout.session.completed', engagementSession());
    expect(res.status).toBe(200);
    expect(sendInvoicePaidAdminNotification.mock.calls[0][0]).toMatchObject({ variant: 'not_found' });
  });

  it('on_void notifies with the paid_on_void variant', async () => {
    rpcResults.set('mark_engagement_invoice_paid', { data: { applied: true, on_void: true }, error: null });
    await post('checkout.session.completed', engagementSession());
    expect(sendInvoicePaidAdminNotification.mock.calls[0][0]).toMatchObject({ variant: 'paid_on_void' });
  });

  it('invoice_amount_mismatch writes invoice_payment_failed and returns 200 (no Stripe retry loop)', async () => {
    rpcResults.set('mark_engagement_invoice_paid', {
      data: null,
      error: { message: 'invoice_amount_mismatch' },
    });
    const res = await post('checkout.session.completed', engagementSession({ amount_total: 1 }));
    expect(res.status).toBe(200);
    const inserted = insertCalls.filter((c) => c.table === 'engagement_events');
    expect(inserted).toHaveLength(1);
    expect(inserted[0].rows).toMatchObject({
      kind: 'invoice_payment_failed',
      actor: 'system',
      needs_attention: true,
      data: { invoice_id: INVOICE_ID, reason: 'amount_mismatch' },
    });
  });

  it('any other RPC error throws → 500 so Stripe retries into the no-op', async () => {
    rpcResults.set('mark_engagement_invoice_paid', { data: null, error: { message: 'deadlock detected' } });
    const res = await post('checkout.session.completed', engagementSession());
    expect(res.status).toBe(500);
  });

  it('a course session runs the enrollment path and never enters the engagement branch', async () => {
    selectRows.set('enrollments', null);
    selectRows.set('courses', { partner_id: null });
    // The stub is deliberately thin — it models the engagement tables, not the
    // enrollment pipeline — so the course branch does not run to completion
    // here and the response status is not meaningful. What IS meaningful:
    // the engagement guard is a BRANCH, not an early return for everything, so
    // the course session skips it and still reaches the enrollment insert.
    await post('checkout.session.completed', courseSession());
    expect(rpcNamed('mark_engagement_invoice_paid')).toHaveLength(0);
    expect(rpcNamed('mark_engagement_invoice_awaiting_async')).toHaveLength(0);
    expect(insertCalls.map((c) => c.table)).toContain('enrollments');
  });
});

// ── The three new event types ───────────────────────────────────────────────

describe('the delayed-payment and expiry events', () => {
  it('async_payment_succeeded fulfils an engagement invoice', async () => {
    rpcResults.set('mark_engagement_invoice_paid', { data: { applied: true, on_void: false }, error: null });
    const res = await post('checkout.session.async_payment_succeeded', engagementSession());
    expect(res.status).toBe(200);
    expect(rpcNamed('mark_engagement_invoice_paid')).toHaveLength(1);
  });

  it('async_payment_succeeded for a PARTNER cohort session calls neither the engagement RPC nor fulfillCohortCheckout', async () => {
    const res = await post('checkout.session.async_payment_succeeded', partnerCohortSession());
    expect(res.status).toBe(200);
    expect(rpcNamed('mark_engagement_invoice_paid')).toHaveLength(0);
    expect(rpcNamed('mark_engagement_invoice_awaiting_async')).toHaveLength(0);
    expect(fulfillCohortCheckout).not.toHaveBeenCalled();
    expect(fulfillSubscriptionCheckout).not.toHaveBeenCalled();
  });

  it('async_payment_failed clears the flag and writes the attention event, with no paid RPC', async () => {
    const res = await post('checkout.session.async_payment_failed', engagementSession({ payment_status: 'unpaid' }));
    expect(res.status).toBe(200);
    expect(rpcNamed('mark_engagement_invoice_paid')).toHaveLength(0);
    expect(rpcNamed('mark_engagement_invoice_awaiting_async')[0].args).toEqual({
      p_invoice_id: INVOICE_ID,
      p_session_id: 'cs_test_engagement_1',
      p_clear: true,
    });
    const inserted = insertCalls.filter((c) => c.table === 'engagement_events');
    expect(inserted).toHaveLength(1);
    expect(inserted[0].rows).toMatchObject({
      kind: 'invoice_payment_failed',
      needs_attention: true,
      data: { reason: 'async_payment_failed' },
    });
  });

  it('expired re-arms the mint WITH the session id, and writes no event', async () => {
    const res = await post('checkout.session.expired', engagementSession({ payment_status: 'unpaid' }));
    expect(res.status).toBe(200);
    expect(rpcNamed('rearm_engagement_invoice_checkout')[0].args).toEqual({
      p_invoice_id: INVOICE_ID,
      p_session_id: 'cs_test_engagement_1',
    });
    expect(insertCalls.filter((c) => c.table === 'engagement_events')).toHaveLength(0);
  });

  it('the three new events ignore a partner session entirely', async () => {
    for (const type of [
      'checkout.session.async_payment_failed',
      'checkout.session.expired',
    ]) {
      await post(type, partnerCohortSession());
    }
    expect(rpcCalls).toHaveLength(0);
    expect(fulfillCohortCheckout).not.toHaveBeenCalled();
  });
});

// ── charge.refunded ─────────────────────────────────────────────────────────

describe('charge.refunded', () => {
  function charge(overrides: Record<string, unknown> = {}) {
    return {
      id: 'ch_1',
      object: 'charge',
      payment_intent: 'pi_test_1',
      amount_refunded: 43750,
      ...overrides,
    };
  }

  it.each(['applied', 'not_paid', 'already_refunded'] as const)(
    'a %s verdict means the charge was ours: the enrollment lookup is never reached',
    async (verdict) => {
      rpcResults.set('mark_engagement_invoice_refunded', {
        data: verdict === 'applied' ? { applied: true } : { applied: false, reason: verdict },
        error: null,
      });
      const res = await post('charge.refunded', charge());
      expect(res.status).toBe(200);
      expect(rpcNamed('mark_engagement_invoice_refunded')[0].args).toEqual({
        p_payment_intent_id: 'pi_test_1',
        p_amount_refunded: 43750,
      });
      // Returning early means no `payments` or `enrollments` traffic at all.
      expect(insertCalls).toHaveLength(0);
    },
  );

  it('a genuine refund-RPC error throws → 500, so Stripe retries instead of losing the refund', async () => {
    rpcResults.set('mark_engagement_invoice_refunded', {
      data: null,
      error: { message: 'deadlock detected' },
    });
    const res = await post('charge.refunded', charge());
    expect(res.status).toBe(500);
  });

  it('not_found falls through to the existing course/partner path', async () => {
    rpcResults.set('mark_engagement_invoice_refunded', {
      data: { applied: false, reason: 'not_found' },
      error: null,
    });
    selectRows.set('enrollments', null);
    const res = await post('charge.refunded', charge({ payment_intent: 'pi_course_1' }));
    expect(res.status).toBe(200);
    expect(rpcNamed('mark_engagement_invoice_refunded')).toHaveLength(1);
  });
});

// ── Signature + hygiene ─────────────────────────────────────────────────────

describe('signature verification and hygiene', () => {
  it('a tampered signature is rejected with 400 before any handler runs', async () => {
    const res = await post('checkout.session.completed', engagementSession(), { tamper: true });
    expect(res.status).toBe(400);
    expect(rpcCalls).toHaveLength(0);
    expect(insertCalls).toHaveLength(0);
  });

  it('no insert carries the raw event body or a checkout.stripe.com URL', async () => {
    rpcResults.set('mark_engagement_invoice_paid', { data: null, error: { message: 'invoice_amount_mismatch' } });
    await post('checkout.session.completed', engagementSession({ url: 'https://checkout.stripe.com/c/pay/cs_test' }));
    await post('checkout.session.async_payment_failed', engagementSession({ url: 'https://checkout.stripe.com/c/pay/cs_test' }));

    expect(insertCalls.length).toBeGreaterThan(0);
    for (const call of insertCalls) {
      const serialized = JSON.stringify(call.rows);
      expect(serialized).not.toContain('checkout.stripe.com');
      expect(serialized).not.toContain('"object":"event"');
      expect(serialized).not.toContain('payment_method');
    }
  });
});
