// POST /api/engagement/proposal/[id]/deposit — mint a Stripe Checkout Session
// for the invoice the CLIENT named (slices 4 + 5, migrations 075/077).
//
// THE PATH STILL SAYS `deposit`, DELIBERATELY. Since slice 5 this route mints
// for any payable invoice — the balance as readily as the deposit — so the
// name undersells it. It is not renamed because a rename breaks every client
// page already open in a browser, and the honest alternatives are worse: a
// compatibility shim would have to guess an invoice on the client's behalf,
// which is exactly the ambiguity decision 3 exists to remove, and a permanent
// tombstone route is two routes where one belongs. The rename becomes free the
// first time a token-scheme change invalidates every open tab; do it then.
//
// The accept route's shape, in order:
//
//   UUID check → rate limit 6 / 15 min per IP (a mint costs a Stripe call;
//   six per quarter hour is generous for one human, and the token is the real
//   defence — the IP is a transient key, never stored) → Sec-Fetch-Site
//   (reject a PRESENT cross-site) → honeypot `company_url` (silent fake
//   success) → authorizeProposalSession (cookie for THIS id; 403 / 410 / 503)
//   → VALIDATE THE POSTED invoice_id against the shared pickPayable →
//   begin_engagement_invoice_checkout with the PRESENTED token hash, which
//   locks engagement → proposal → invoice and re-validates the credential and
//   every status under those locks → build the params from ONLY the immutable
//   columns it returned → create the session under
//   `engagement_invoice:<invoice>:<attempt>` → record the session id + expiry
//   → return {url}, no-store.
//
// THE SERVER NEVER CHOOSES THE INVOICE (decision 3). The page renders one
// specific invoice, the button POSTs its id, and this route re-runs the SAME
// selector and refuses anything else with 409 `stale_invoice`. Slice 4 let the
// server pick "the live deposit" independently; with a balance in play that
// would let a client be SHOWN one invoice and CHARGED another across two tabs.
//
// A Stripe idempotency_error (params differed under a reused key — which the
// immutable-columns rule should make impossible; this is the belt) re-arms the
// mint for a fresh key and retries ONCE. A second failure is a 502.
//
// The Checkout URL is returned to the cookie holder and NOWHERE else: not the
// DB, not an event, not a log, not an email.

import { NextResponse, type NextRequest } from 'next/server';
import { tryConsume } from '@/lib/community/rate-limit';
import { getStripe } from '@/lib/stripe/client';
import {
  buildEngagementInvoiceSessionParams,
  idempotencyKeyFor,
  isStripeIdempotencyError,
  type EngagementInvoiceCheckoutInput,
} from '@/lib/stripe/engagement-invoice';
import { authorizeProposalSession, isCrossSite } from '@/lib/studio/engagement/proposal-session';
import { pickPayable, readLiveInvoices } from '@/lib/studio/engagement/invoice-selection';

export const runtime = 'nodejs';
export const dynamic = 'force-dynamic';

const DEPOSIT_LIMIT = 6;
const DEPOSIT_WINDOW_MS = 15 * 60_000;

const UUID_RE = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i;
const NO_STORE = { 'Cache-Control': 'no-store, max-age=0' };

function json(body: Record<string, unknown>, status: number) {
  return NextResponse.json(body, { status, headers: NO_STORE });
}

function clientIp(request: NextRequest): string {
  return (
    request.headers.get('x-forwarded-for')?.split(',')[0]?.trim() ||
    request.headers.get('x-real-ip') ||
    'unknown'
  );
}

/** The Stripe request id is the only part of an error worth logging. */
function stripeRequestId(err: unknown): string {
  if (err && typeof err === 'object' && 'requestId' in err) {
    const id = (err as { requestId?: unknown }).requestId;
    if (typeof id === 'string') return id;
  }
  return '(no request id)';
}

export async function POST(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> },
): Promise<NextResponse> {
  const { id } = await params;
  if (!UUID_RE.test(id)) return json({ error: 'forbidden' }, 403);

  if (!tryConsume(`engp-deposit:${clientIp(request)}`, DEPOSIT_LIMIT, DEPOSIT_WINDOW_MS)) {
    return json({ error: 'rate_limited' }, 429);
  }
  if (isCrossSite(request.headers.get('sec-fetch-site'))) return json({ error: 'forbidden' }, 403);

  let payload: unknown = {};
  try {
    const text = await request.text();
    payload = text.trim() === '' ? {} : JSON.parse(text);
  } catch {
    return json({ error: 'invalid_json' }, 400);
  }
  // Honeypot first (before auth): a bot filled the hidden field. Pretend it
  // worked, but hand back no URL — there is nothing for a bot to pay.
  const hp = payload && typeof payload === 'object' ? (payload as { company_url?: unknown }).company_url : undefined;
  if (typeof hp === 'string' && hp.trim() !== '') return json({ ok: true }, 200);

  const auth = await authorizeProposalSession(id);
  if (!auth.ok) {
    const error = auth.status === 410 ? 'link_expired' : auth.status === 503 ? 'unavailable' : 'forbidden';
    return json({ error }, auth.status);
  }
  const { proposal, supabase, presentedTokenHash } = auth;

  // The invoice the client says it is paying. An ABSENT id is the
  // already-deployed slice-4 button, which sends no invoice_id at all: that
  // tab genuinely IS stale, and 409 is the answer it already knows how to
  // render ("no longer open — reply to the email"), where a 400 would surface
  // as the false "payments are temporarily unavailable". A MALFORMED id keeps
  // its 400: only a broken or hostile client sends one.
  const postedInvoiceId =
    payload && typeof payload === 'object' ? (payload as { invoice_id?: unknown }).invoice_id : undefined;
  if (postedInvoiceId === undefined || postedInvoiceId === null || postedInvoiceId === '') {
    return json({ error: 'stale_invoice' }, 409);
  }
  if (typeof postedInvoiceId !== 'string' || !UUID_RE.test(postedInvoiceId)) {
    return json({ error: 'invalid_invoice_id' }, 400);
  }

  // The SAME selector the page used — one module, so the two cannot disagree
  // about what is payable. A read failure stays a 503: telling a client to
  // reload while the database is down sends them into the same wall again.
  const { ok: invoicesRead, rows: liveInvoices } = await readLiveInvoices(supabase, proposal.id);
  if (!invoicesRead) return json({ error: 'unavailable' }, 503);

  // Nothing payable, or not the row the client was looking at: either way that
  // page is out of date. ONE verdict covers every stale case, including a UUID
  // lifted from another proposal — the rows are scoped to this one.
  //
  // Deliberately NOT filtered further here: begin_engagement_invoice_checkout
  // owns the per-status verdict, so a stale tab clicking Pay on an
  // already-paid invoice still gets `already_paid` rather than this.
  const payable = pickPayable(liveInvoices);
  if (!payable || payable.id !== postedInvoiceId) return json({ error: 'stale_invoice' }, 409);
  const invoiceId = payable.id;

  // A tagged union, not `'fail' in x`: `in`-narrowing over a heterogeneous
  // union widens the accessed property, which loses the NextResponse type.
  type BeginResult =
    | { ok: false; response: NextResponse }
    | { ok: true; input: EngagementInvoiceCheckoutInput };

  async function begin(): Promise<BeginResult> {
    const { data, error } = await supabase.rpc('begin_engagement_invoice_checkout', {
      p_invoice_id: invoiceId,
      p_token_hash: presentedTokenHash,
    });
    if (error) {
      console.error('[engagement/proposal/deposit] begin RPC failed:', error.message);
      return { ok: false, response: json({ error: 'checkout_unavailable' }, 502) };
    }
    const result = (data ?? {}) as Record<string, unknown> & { applied?: boolean; reason?: string };
    if (!result.applied) {
      switch (result.reason) {
        case 'forbidden':
          return { ok: false, response: json({ error: 'forbidden' }, 403) };
        case 'already_paid':
          return { ok: false, response: json({ error: 'already_paid' }, 409) };
        case 'payment_pending':
          return { ok: false, response: json({ error: 'payment_pending' }, 409) };
        default:
          return { ok: false, response: json({ error: 'not_open' }, 409) };
      }
    }
    const input: EngagementInvoiceCheckoutInput = {
      invoiceId: result.invoice_id as string,
      attempt: result.attempt as number,
      amount: result.amount as number,
      currency: result.currency as 'USD' | 'JPY',
      label: result.label as string,
      recipientEmail: (result.recipient_email as string | null) ?? null,
      engagementId: result.engagement_id as string,
      proposalId: result.proposal_id as string,
      locale: result.locale as 'en' | 'ja',
    };
    return { ok: true, input };
  }

  const first = await begin();
  if (!first.ok) return first.response;
  let input = first.input;

  const stripe = getStripe();
  const requestOrigin = request.headers.get('origin');
  let session: { id: string; url: string | null; expires_at: number } | null = null;

  try {
    session = await stripe.checkout.sessions.create(
      buildEngagementInvoiceSessionParams(input, requestOrigin),
      { idempotencyKey: idempotencyKeyFor(input.invoiceId, input.attempt) },
    );
  } catch (err) {
    if (!isStripeIdempotencyError(err)) {
      console.error('[engagement/proposal/deposit] Stripe create failed:', stripeRequestId(err));
      return json({ error: 'checkout_unavailable' }, 502);
    }
    // The key was reused with different params. Force a fresh key and retry
    // exactly once — never in a loop.
    console.error('[engagement/proposal/deposit] idempotency conflict, re-arming:', stripeRequestId(err));
    const { error: rearmError } = await supabase.rpc('rearm_engagement_invoice_checkout', {
      p_invoice_id: input.invoiceId,
      p_session_id: null,
    });
    if (rearmError) console.error('[engagement/proposal/deposit] rearm failed:', rearmError.message);

    const retry = await begin();
    if (!retry.ok) return retry.response;
    input = retry.input;
    try {
      session = await stripe.checkout.sessions.create(
        buildEngagementInvoiceSessionParams(input, requestOrigin),
        { idempotencyKey: idempotencyKeyFor(input.invoiceId, input.attempt) },
      );
    } catch (retryErr) {
      console.error('[engagement/proposal/deposit] Stripe create failed twice:', stripeRequestId(retryErr));
      return json({ error: 'checkout_unavailable' }, 502);
    }
  }

  if (!session?.url) {
    console.error('[engagement/proposal/deposit] Stripe returned no URL for', input.invoiceId);
    return json({ error: 'checkout_unavailable' }, 502);
  }

  // Best-effort bookkeeping: applied:false means a void or a concurrent
  // re-arm won the CAS. The session Stripe just made still works and expires
  // on its own, so this is logged, never surfaced.
  const { data: recorded, error: recordError } = await supabase.rpc('record_engagement_invoice_checkout', {
    p_invoice_id: input.invoiceId,
    p_attempt: input.attempt,
    p_session_id: session.id,
    p_expires_at: new Date(session.expires_at * 1000).toISOString(),
  });
  if (recordError) console.error('[engagement/proposal/deposit] record failed:', recordError.message);
  else if (!(recorded as { applied?: boolean } | null)?.applied) {
    console.log('[engagement/proposal/deposit] session not recorded (stale attempt):', input.invoiceId);
  }

  return json({ url: session.url }, 200);
}
