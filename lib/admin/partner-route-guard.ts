/**
 * Shared gate for the partner-admin API routes added in Unit 1.
 *
 * Two checks, both required on every mutation:
 *   1. HonuVibe admin role, resolved from the session (never from the payload).
 *   2. Same-origin, because the session lives in a cookie.
 *
 * Routes validate and authorize; the RPCs mutate and audit atomically. No route
 * here writes a table directly — a table write followed by a separate audit
 * insert is not atomic, and invariant 3 forbids it.
 */

import { NextResponse } from 'next/server';
import { createClient, createAdminClient } from '@/lib/supabase/server';
import { isSameOriginRequest } from '@/lib/http/same-origin';

export type AdminGate =
  | { ok: true; actorId: string; admin: ReturnType<typeof createAdminClient> }
  | { ok: false; response: NextResponse };

export async function requirePartnerAdminRoute(
  request: Request,
  options: { mutation: boolean },
): Promise<AdminGate> {
  if (options.mutation && !isSameOriginRequest(request)) {
    return {
      ok: false,
      response: NextResponse.json({ error: 'Forbidden' }, { status: 403 }),
    };
  }

  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();

  if (!user) {
    return {
      ok: false,
      response: NextResponse.json({ error: 'Not authenticated' }, { status: 401 }),
    };
  }

  const { data: profile } = await supabase
    .from('users')
    .select('role')
    .eq('id', user.id)
    .single();

  if (profile?.role !== 'admin') {
    return {
      ok: false,
      response: NextResponse.json({ error: 'Not authorized' }, { status: 403 }),
    };
  }

  return { ok: true, actorId: user.id, admin: createAdminClient() };
}

const UUID_RE =
  /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i;

/**
 * Route path params reach the RPCs as uuid arguments. Validate them here or a
 * junk segment surfaces as a Postgres 22P02 and a 500 instead of a clean 400.
 */
export function invalidUuidResponse(
  values: Record<string, string>,
): NextResponse | null {
  for (const [name, value] of Object.entries(values)) {
    if (!UUID_RE.test(value)) {
      return NextResponse.json({ error: `Invalid ${name}` }, { status: 400 });
    }
  }
  return null;
}

/** Maps an RPC outcome that is not a success onto an HTTP response. */
export function rpcOutcomeResponse(
  outcome: string,
  extra: Record<string, unknown> = {},
): NextResponse | null {
  const conflicts: Record<string, string> = {
    already_pending: 'An invite is already pending for that address — resend it instead.',
    code_taken: 'That code is already in use. Generate another.',
    below_active_usage: 'Seats cannot drop below the number currently in use.',
    immutable_field: 'Tier, start date and source are locked once seats have been granted.',
    confirm_required: 'This shortens or disables access for members already using seats.',
    not_pending: 'That invite is no longer pending.',
  };

  if (outcome === 'not_found') {
    return NextResponse.json({ error: 'Not found' }, { status: 404 });
  }
  if (outcome === 'invalid' || outcome === 'invalid_code') {
    return NextResponse.json({ error: 'Invalid request' }, { status: 400 });
  }
  if (conflicts[outcome]) {
    return NextResponse.json({ error: conflicts[outcome], outcome, ...extra }, { status: 409 });
  }
  return null;
}
