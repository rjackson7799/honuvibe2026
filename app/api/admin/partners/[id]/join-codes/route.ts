/**
 * Admin join-code management for a partner.
 *
 * GET  — list codes with usage taken from the redemption ledger (there is no
 *        mutable counter anywhere in this system).
 * POST — create a code. The write + its audit row happen inside
 *        `upsert_join_code`, in one transaction (invariant 3).
 */

import { NextResponse } from 'next/server';
import { z } from 'zod';
import {
  requirePartnerAdminRoute,
  rpcOutcomeResponse,
  invalidUuidResponse,
} from '@/lib/admin/partner-route-guard';
import { generateJoinCode, JOIN_CODE_PATTERN } from '@/lib/partners/join';

const MAX_WINDOW_DAYS = 366 * 3;

const CreateSchema = z.object({
  // Omit to auto-generate. Supplied codes are normalized before validation.
  code: z.string().trim().toUpperCase().regex(JOIN_CODE_PATTERN).optional(),
  seat_block_id: z.uuid().nullable().optional(),
  max_uses: z.number().int().min(1).max(100_000).nullable().optional(),
  expires_at: z.iso.datetime({ offset: true }).nullable().optional(),
});

export async function GET(
  request: Request,
  { params }: { params: Promise<{ id: string }> },
) {
  const gate = await requirePartnerAdminRoute(request, { mutation: false });
  if (!gate.ok) return gate.response;

  const { id: partnerId } = await params;
  const badId = invalidUuidResponse({ partnerId });
  if (badId) return badId;

  const { data: codes, error } = await gate.admin
    .from('partner_join_codes')
    .select('id, code, seat_block_id, max_uses, expires_at, is_active, created_at')
    .eq('partner_id', partnerId)
    .order('created_at', { ascending: false });

  if (error) {
    console.error('[Admin/Partners/JoinCodes] list failed:', error);
    return NextResponse.json({ error: 'Failed to load join codes' }, { status: 500 });
  }

  const ids = (codes ?? []).map((c) => c.id);
  const usage = new Map<string, number>();
  if (ids.length > 0) {
    const { data: ledger } = await gate.admin
      .from('partner_code_redemptions')
      .select('code_id')
      .in('code_id', ids);
    for (const row of ledger ?? []) {
      usage.set(row.code_id, (usage.get(row.code_id) ?? 0) + 1);
    }
  }

  return NextResponse.json({
    codes: (codes ?? []).map((c) => ({ ...c, uses: usage.get(c.id) ?? 0 })),
  });
}

export async function POST(
  request: Request,
  { params }: { params: Promise<{ id: string }> },
) {
  const gate = await requirePartnerAdminRoute(request, { mutation: true });
  if (!gate.ok) return gate.response;

  const { id: partnerId } = await params;
  const badId = invalidUuidResponse({ partnerId });
  if (badId) return badId;

  const parsed = CreateSchema.safeParse(await request.json().catch(() => ({})));
  if (!parsed.success) {
    return NextResponse.json({ error: 'Invalid join-code payload' }, { status: 400 });
  }

  const { code, seat_block_id, max_uses, expires_at } = parsed.data;

  if (expires_at) {
    const ms = new Date(expires_at).getTime() - Date.now();
    if (ms <= 0) {
      return NextResponse.json({ error: 'Expiry must be in the future' }, { status: 400 });
    }
    if (ms > MAX_WINDOW_DAYS * 24 * 60 * 60 * 1000) {
      return NextResponse.json({ error: 'Expiry is too far out' }, { status: 400 });
    }
  }

  // Collision retry: the code column is globally unique, so a fresh draw on
  // 'code_taken' is cheaper than pre-checking.
  const attempts = code ? [code] : [generateJoinCode(), generateJoinCode(), generateJoinCode()];

  for (const candidate of attempts) {
    const { data, error } = await gate.admin.rpc('upsert_join_code', {
      p_partner_id: partnerId,
      p_code_id: null,
      p_code: candidate,
      p_seat_block_id: seat_block_id ?? null,
      p_max_uses: max_uses ?? null,
      p_expires_at: expires_at ?? null,
      p_actor_id: gate.actorId,
      p_audit_source: 'admin',
    });

    if (error) {
      console.error('[Admin/Partners/JoinCodes] upsert_join_code failed:', error);
      // A cross-partner seat block trips the composite FK, not a CHECK.
      if (error.code === '23503') {
        return NextResponse.json(
          { error: 'That seat block belongs to another partner' },
          { status: 400 },
        );
      }
      return NextResponse.json({ error: 'Failed to create join code' }, { status: 500 });
    }

    const outcome = (data as { outcome?: string } | null)?.outcome ?? 'invalid';
    if (outcome === 'code_taken') {
      // An admin-supplied code that collides is a user error, not something a
      // retry can fix — say so instead of falling through to the generator
      // exhaustion message below.
      if (code) {
        return NextResponse.json(
          { error: 'That code is already in use. Choose another.', outcome },
          { status: 409 },
        );
      }
      continue;
    }

    const failure = rpcOutcomeResponse(outcome);
    if (failure) return failure;

    return NextResponse.json(data, { status: 201 });
  }

  return NextResponse.json(
    { error: 'Could not generate a free code — try again' },
    { status: 409 },
  );
}
