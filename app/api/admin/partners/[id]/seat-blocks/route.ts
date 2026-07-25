/**
 * Admin seat-block management for a partner.
 *
 * GET  — blocks plus their live active-grant counts.
 * POST — create a block via `upsert_seat_block` (write + audit, one transaction).
 *
 * v1 is Vault-only: `granted_tier` accepts nothing else, at the schema level.
 */

import { NextResponse } from 'next/server';
import { z } from 'zod';
import {
  requirePartnerAdminRoute,
  rpcOutcomeResponse,
  invalidUuidResponse,
} from '@/lib/admin/partner-route-guard';
import { validateSeatWindow } from '@/lib/partners/seat-blocks';

const CreateSchema = z.object({
  label: z.string().trim().min(1).max(120),
  seats_total: z.number().int().min(0).max(1_000_000),
  granted_tier: z.literal('vault').default('vault'),
  access_starts_at: z.iso.datetime({ offset: true }),
  access_ends_at: z.iso.datetime({ offset: true }),
  source: z.enum(['sponsored', 'purchased']),
  notes: z.string().trim().max(2000).nullable().optional(),
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

  const { data: blocks, error } = await gate.admin
    .from('partner_seat_blocks')
    .select(
      'id, label, seats_total, granted_tier, access_starts_at, access_ends_at, source, notes, is_active, created_at',
    )
    .eq('partner_id', partnerId)
    .order('created_at', { ascending: false });

  if (error) {
    console.error('[Admin/Partners/SeatBlocks] list failed:', error);
    return NextResponse.json({ error: 'Failed to load seat blocks' }, { status: 500 });
  }

  const ids = (blocks ?? []).map((b) => b.id);
  const used = new Map<string, number>();
  if (ids.length > 0) {
    const { data: grants } = await gate.admin
      .from('partner_seat_grants')
      .select('seat_block_id')
      .in('seat_block_id', ids)
      .is('revoked_at', null);
    for (const row of grants ?? []) {
      used.set(row.seat_block_id, (used.get(row.seat_block_id) ?? 0) + 1);
    }
  }

  return NextResponse.json({
    blocks: (blocks ?? []).map((b) => ({ ...b, seats_used: used.get(b.id) ?? 0 })),
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
    return NextResponse.json({ error: 'Invalid seat-block payload' }, { status: 400 });
  }

  const input = parsed.data;
  const windowError = validateSeatWindow(input.access_starts_at, input.access_ends_at);
  if (windowError) {
    return NextResponse.json({ error: windowError }, { status: 400 });
  }

  const { data, error } = await gate.admin.rpc('upsert_seat_block', {
    p_partner_id: partnerId,
    p_block_id: null,
    p_label: input.label,
    p_seats_total: input.seats_total,
    p_granted_tier: input.granted_tier,
    p_access_starts_at: input.access_starts_at,
    p_access_ends_at: input.access_ends_at,
    p_block_source: input.source,
    p_notes: input.notes ?? null,
    p_is_active: true,
    p_actor_id: gate.actorId,
    p_audit_source: 'admin',
    p_confirm_impact: false,
    p_reason: null,
  });

  if (error) {
    console.error('[Admin/Partners/SeatBlocks] upsert_seat_block failed:', error);
    return NextResponse.json({ error: 'Failed to create seat block' }, { status: 500 });
  }

  const outcome = (data as { outcome?: string } | null)?.outcome ?? 'invalid';
  const failure = rpcOutcomeResponse(outcome, data as Record<string, unknown>);
  if (failure) return failure;

  return NextResponse.json(data, { status: 201 });
}
