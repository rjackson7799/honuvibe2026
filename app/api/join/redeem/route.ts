/**
 * Redeem a partner join code.
 *
 * The route authenticates the session and passes the SERVER-derived user id to
 * `redeem_partner_code()`. A client-supplied user id is never accepted, and the
 * RPC itself is service-role-only, so user A can never redeem for user B.
 *
 * Rate limiting is per-IP AND per-code using the existing in-memory limiter.
 * ACCEPTED MVP LIMITATION: that limiter is per function instance, so on
 * serverless it is best-effort only. The real backstops are the generic error
 * responses, the auth requirement on redemption, and ledger uniqueness — not
 * this counter. Revisit a shared limiter only if abuse materializes.
 */

import { NextResponse } from 'next/server';
import { createClient, createAdminClient } from '@/lib/supabase/server';
import { tryConsume } from '@/lib/community/rate-limit';
import { isSameOriginRequest, clientIp } from '@/lib/http/same-origin';
import { normalizeJoinCode, type JoinRpcResult } from '@/lib/partners/join';

// The IP ceiling is deliberately coarse: a partner onboarding a cohort from one
// office egress IP is the PRIMARY use case, so a tight per-IP cap would break
// the product before it stopped anyone. Real per-actor throttling is the
// per-user bucket below; per-IP only catches a flood.
const IP_LIMIT = { limit: 300, windowMs: 60 * 60 * 1000 };
const USER_LIMIT = { limit: 15, windowMs: 60 * 60 * 1000 };
const CODE_LIMIT = { limit: 1000, windowMs: 60 * 60 * 1000 };

export async function POST(request: Request) {
  if (!isSameOriginRequest(request)) {
    return NextResponse.json({ error: 'forbidden' }, { status: 403 });
  }

  if (!tryConsume(`join:ip:${clientIp(request)}`, IP_LIMIT.limit, IP_LIMIT.windowMs)) {
    return NextResponse.json({ error: 'rate_limited' }, { status: 429 });
  }

  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) {
    return NextResponse.json({ error: 'unauthorized' }, { status: 401 });
  }

  if (!tryConsume(`join:user:${user.id}`, USER_LIMIT.limit, USER_LIMIT.windowMs)) {
    return NextResponse.json({ error: 'rate_limited' }, { status: 429 });
  }

  const body = (await request.json().catch(() => null)) as { code?: unknown } | null;
  const code = normalizeJoinCode(typeof body?.code === 'string' ? body.code : null);
  if (!code) {
    // Same shape as a genuine miss — the client can't distinguish "malformed"
    // from "no such code".
    return NextResponse.json({ outcome: 'invalid' });
  }

  if (!tryConsume(`join:code:${code}`, CODE_LIMIT.limit, CODE_LIMIT.windowMs)) {
    return NextResponse.json({ error: 'rate_limited' }, { status: 429 });
  }

  const admin = createAdminClient();
  const { data, error } = await admin.rpc('redeem_partner_code', {
    p_user_id: user.id,
    p_code: code,
  });

  if (error) {
    console.error('[join/redeem] redeem_partner_code failed:', error.message);
    return NextResponse.json({ error: 'server_error' }, { status: 500 });
  }

  const result = (data ?? { outcome: 'invalid' }) as JoinRpcResult;
  return NextResponse.json({ outcome: result.outcome });
}
