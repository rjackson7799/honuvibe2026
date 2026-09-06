/**
 * The deposit mint route (slice 4, migration 075). What matters most here is
 * the recovery path: a Stripe `idempotency_error` must re-arm the invoice for
 * a FRESH key and retry exactly ONCE — never in a loop, and never by reusing
 * the key that just failed.
 */
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';

// Every test re-imports the route module (vi.resetModules below), which
// costs seconds under full-suite load. The 5 s default made the FIRST test
// in the file flaky, and a timed-out test's in-flight call then leaked into
// the next one's mock queue (a 3rd `create` call in test 2). Same 30 s
// ceiling the RLS suites use.
vi.setConfig({ testTimeout: 30_000 });

const PROPOSAL_ID = '11111111-2222-3333-4444-555555555555';
const INVOICE_ID = '99999999-8888-7777-6666-555555555555';
const ENGAGEMENT_ID = 'aaaaaaaa-bbbb-cccc-dddd-eeeeeeeeeeee';
const TOKEN_HASH = 'a'.repeat(64);

type RpcCall = { name: string; args: Record<string, unknown> };
const rpcCalls: RpcCall[] = [];
const rpcResults = new Map<string, { data: unknown; error: { message: string } | null }>();
/** begin_engagement_invoice_checkout returns a NEW attempt on each call. */
let beginAttempts: number[] = [];

const create = vi.fn();
vi.mock('@/lib/stripe/client', () => ({
  getStripe: () => ({ checkout: { sessions: { create } } }),
  stripe: {},
}));

let invoiceLookup: { data: { id: string } | null; error: { message: string } | null } = {
  data: { id: INVOICE_ID },
  error: null,
};

const supabaseStub = {
  from: () => {
    const q: Record<string, unknown> = {
      select: () => q,
      eq: () => q,
      is: () => q,
      order: () => q,
      limit: () => q,
      maybeSingle: async () => invoiceLookup,
    };
    return q;
  },
  rpc: async (name: string, args: Record<string, unknown>) => {
    rpcCalls.push({ name, args });
    if (name === 'begin_engagement_invoice_checkout') {
      const override = rpcResults.get(name);
      if (override) return override;
      const attempt = beginAttempts.shift() ?? 0;
      return {
        data: {
          applied: true,
          attempt,
          invoice_id: INVOICE_ID,
          amount: 43750,
          currency: 'USD',
          label: 'Deposit — Hawaii Palms (50%)',
          recipient_email: 'client@example.com',
          engagement_id: ENGAGEMENT_ID,
          proposal_id: PROPOSAL_ID,
          locale: 'en',
        },
        error: null,
      };
    }
    return rpcResults.get(name) ?? { data: { applied: true }, error: null };
  },
};

let authResult: Record<string, unknown> = {};
vi.mock('@/lib/studio/engagement/proposal-session', () => ({
  authorizeProposalSession: async () => authResult,
  isCrossSite: (v: string | null) => v === 'cross-site',
}));

const tryConsume = vi.fn(() => true);
vi.mock('@/lib/community/rate-limit', () => ({ tryConsume }));

function post(body: Record<string, unknown> = {}, headers: Record<string, string> = {}) {
  return new Request(`https://honuvibe.ai/api/engagement/proposal/${PROPOSAL_ID}/deposit`, {
    method: 'POST',
    headers: { 'content-type': 'application/json', ...headers },
    body: JSON.stringify(body),
  });
}

async function call(request = post()) {
  const { POST } = await import('./route');
  return POST(request as never, { params: Promise.resolve({ id: PROPOSAL_ID }) });
}

const session = (id: string) => ({
  id,
  url: `https://checkout.stripe.com/c/pay/${id}`,
  expires_at: Math.floor(Date.now() / 1000) + 86_400,
});

const rpcNamed = (name: string) => rpcCalls.filter((c) => c.name === name);

beforeEach(() => {
  vi.resetModules();
  rpcCalls.length = 0;
  rpcResults.clear();
  beginAttempts = [];
  create.mockReset();
  tryConsume.mockReset();
  tryConsume.mockReturnValue(true);
  invoiceLookup = { data: { id: INVOICE_ID }, error: null };
  authResult = {
    ok: true,
    proposal: { id: PROPOSAL_ID, locale: 'en' },
    supabase: supabaseStub,
    presentedTokenHash: TOKEN_HASH,
  };
  process.env.NEXT_PUBLIC_SITE_URL = 'https://honuvibe.ai';
});

afterEach(() => {
  vi.restoreAllMocks();
});

describe('POST /api/engagement/proposal/[id]/deposit', () => {
  it('mints a session under the attempt-scoped key and records it, returning no-store', async () => {
    create.mockResolvedValueOnce(session('cs_1'));
    const res = await call();

    expect(res.status).toBe(200);
    expect(await res.json()).toEqual({ url: 'https://checkout.stripe.com/c/pay/cs_1' });
    expect(res.headers.get('Cache-Control')).toContain('no-store');

    expect(create).toHaveBeenCalledTimes(1);
    expect(create.mock.calls[0][1]).toEqual({ idempotencyKey: `engagement_invoice:${INVOICE_ID}:0` });
    expect(rpcNamed('begin_engagement_invoice_checkout')[0].args).toEqual({
      p_invoice_id: INVOICE_ID,
      p_token_hash: TOKEN_HASH,
    });
    const recorded = rpcNamed('record_engagement_invoice_checkout')[0];
    expect(recorded.args.p_invoice_id).toBe(INVOICE_ID);
    expect(recorded.args.p_attempt).toBe(0);
    expect(recorded.args.p_session_id).toBe('cs_1');
  });

  it('an idempotency_error re-arms with a NULL session id and retries exactly once', async () => {
    beginAttempts = [0, 1];
    create.mockRejectedValueOnce({ type: 'StripeIdempotencyError', requestId: 'req_1' });
    create.mockResolvedValueOnce(session('cs_2'));

    const res = await call();
    expect(res.status).toBe(200);
    expect(await res.json()).toEqual({ url: 'https://checkout.stripe.com/c/pay/cs_2' });

    const rearms = rpcNamed('rearm_engagement_invoice_checkout');
    expect(rearms).toHaveLength(1);
    expect(rearms[0].args).toEqual({ p_invoice_id: INVOICE_ID, p_session_id: null });

    expect(create).toHaveBeenCalledTimes(2);
    expect(create.mock.calls[0][1]).toEqual({ idempotencyKey: `engagement_invoice:${INVOICE_ID}:0` });
    expect(create.mock.calls[1][1]).toEqual({ idempotencyKey: `engagement_invoice:${INVOICE_ID}:1` });
    expect(rpcNamed('record_engagement_invoice_checkout')[0].args.p_attempt).toBe(1);
  });

  it('two consecutive idempotency errors give up with 502 — never a retry loop', async () => {
    beginAttempts = [0, 1];
    create.mockRejectedValueOnce({ type: 'StripeIdempotencyError' });
    create.mockRejectedValueOnce({ type: 'StripeIdempotencyError' });

    const res = await call();
    expect(res.status).toBe(502);
    expect(await res.json()).toEqual({ error: 'checkout_unavailable' });
    expect(create).toHaveBeenCalledTimes(2);
    expect(rpcNamed('rearm_engagement_invoice_checkout')).toHaveLength(1);
  });

  it('a card-shaped Stripe error is a 502 with NO re-arm and no retry', async () => {
    create.mockRejectedValueOnce({ type: 'StripeCardError', code: 'card_declined', requestId: 'req_2' });
    const res = await call();
    expect(res.status).toBe(502);
    expect(create).toHaveBeenCalledTimes(1);
    expect(rpcNamed('rearm_engagement_invoice_checkout')).toHaveLength(0);
  });

  it.each([
    ['payment_pending', 409],
    ['already_paid', 409],
    ['not_open', 409],
    ['forbidden', 403],
  ])('maps the begin verdict %s to %i and never calls Stripe', async (reason, status) => {
    rpcResults.set('begin_engagement_invoice_checkout', { data: { applied: false, reason }, error: null });
    const res = await call();
    expect(res.status).toBe(status);
    expect(await res.json()).toEqual({ error: reason });
    expect(create).not.toHaveBeenCalled();
  });

  it('404s when there is no live sent deposit, without touching Stripe', async () => {
    invoiceLookup = { data: null, error: null };
    const res = await call();
    expect(res.status).toBe(404);
    expect(await res.json()).toEqual({ error: 'no_invoice' });
    expect(rpcCalls).toHaveLength(0);
    expect(create).not.toHaveBeenCalled();
  });

  it('rejects a bad UUID, a cross-site POST and a rate-limited caller before any work', async () => {
    const { POST } = await import('./route');
    const bad = await POST(post() as never, { params: Promise.resolve({ id: 'not-a-uuid' }) });
    expect(bad.status).toBe(403);

    const cross = await call(post({}, { 'sec-fetch-site': 'cross-site' }));
    expect(cross.status).toBe(403);

    tryConsume.mockReturnValueOnce(false);
    const limited = await call();
    expect(limited.status).toBe(429);
    expect(await limited.json()).toEqual({ error: 'rate_limited' });

    expect(create).not.toHaveBeenCalled();
  });

  it('a filled honeypot gets a silent fake success and NO Checkout URL', async () => {
    const res = await call(post({ company_url: 'https://spam.example' }));
    expect(res.status).toBe(200);
    const body = await res.json();
    expect(body).toEqual({ ok: true });
    expect(body).not.toHaveProperty('url');
    expect(create).not.toHaveBeenCalled();
    expect(rpcCalls).toHaveLength(0);
  });

  it('propagates the session verdicts: 403 forbidden, 410 link_expired, 503 unavailable', async () => {
    for (const [status, error] of [
      [403, 'forbidden'],
      [410, 'link_expired'],
      [503, 'unavailable'],
    ] as const) {
      vi.resetModules();
      authResult = { ok: false, status };
      const res = await call();
      expect(res.status).toBe(status);
      expect(await res.json()).toEqual({ error });
    }
    expect(create).not.toHaveBeenCalled();
  });

  it('a failed record CAS is logged, not surfaced — the session still works', async () => {
    create.mockResolvedValueOnce(session('cs_3'));
    rpcResults.set('record_engagement_invoice_checkout', {
      data: { applied: false, reason: 'stale' },
      error: null,
    });
    const res = await call();
    expect(res.status).toBe(200);
    expect(await res.json()).toEqual({ url: 'https://checkout.stripe.com/c/pay/cs_3' });
  });
});
