/**
 * Accept a partner invite.
 *
 * The raw token arrives in the POST body, is hashed here, and never leaves this
 * function — it is not logged, not persisted, and not sent to analytics. Only
 * the sha256 hash reaches the RPC.
 *
 * The RPC reads the canonical email from public.users by the SERVER-derived
 * session user id, so no email is ever accepted from the request body and a
 * signed-in user cannot accept someone else's invite.
 */

import { NextResponse } from 'next/server';
import { createClient, createAdminClient } from '@/lib/supabase/server';
import { tryConsume } from '@/lib/community/rate-limit';
import { isSameOriginRequest, clientIp } from '@/lib/http/same-origin';
import {
  hashInviteToken,
  isPlausibleInviteToken,
  type JoinRpcResult,
} from '@/lib/partners/join';

// See app/api/join/redeem/route.ts for why the IP ceiling is coarse: a partner
// onboarding a cohort from one office IP must not be locked out.
const IP_LIMIT = { limit: 300, windowMs: 60 * 60 * 1000 };
const USER_LIMIT = { limit: 15, windowMs: 60 * 60 * 1000 };
const TOKEN_LIMIT = { limit: 10, windowMs: 60 * 60 * 1000 };

export async function POST(request: Request) {
  if (!isSameOriginRequest(request)) {
    return NextResponse.json({ error: 'forbidden' }, { status: 403 });
  }

  if (!tryConsume(`invite:ip:${clientIp(request)}`, IP_LIMIT.limit, IP_LIMIT.windowMs)) {
    return NextResponse.json({ error: 'rate_limited' }, { status: 429 });
  }

  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) {
    return NextResponse.json({ error: 'unauthorized' }, { status: 401 });
  }

  if (!tryConsume(`invite:user:${user.id}`, USER_LIMIT.limit, USER_LIMIT.windowMs)) {
    return NextResponse.json({ error: 'rate_limited' }, { status: 429 });
  }

  const body = (await request.json().catch(() => null)) as { token?: unknown } | null;
  const rawToken = typeof body?.token === 'string' ? body.token : null;
  if (!isPlausibleInviteToken(rawToken)) {
    return NextResponse.json({ outcome: 'invalid' });
  }

  const tokenHash = hashInviteToken(rawToken!);

  // Keyed on the hash, never the raw token — rate-limit keys are the kind of
  // thing that ends up in a debug dump.
  if (!tryConsume(`invite:token:${tokenHash}`, TOKEN_LIMIT.limit, TOKEN_LIMIT.windowMs)) {
    return NextResponse.json({ error: 'rate_limited' }, { status: 429 });
  }

  const admin = createAdminClient();
  const { data, error } = await admin.rpc('accept_partner_invite', {
    p_user_id: user.id,
    p_token_hash: tokenHash,
  });

  if (error) {
    console.error('[join/accept-invite] accept_partner_invite failed:', error.message);
    return NextResponse.json({ error: 'server_error' }, { status: 500 });
  }

  const result = (data ?? { outcome: 'invalid' }) as JoinRpcResult;
  return NextResponse.json({ outcome: result.outcome, reason: result.reason ?? null });
}
