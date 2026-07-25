/**
 * Edit or deactivate a seat block.
 *
 * All edit rules live in `upsert_seat_block` and are enforced transactionally
 * against the live grant count — never here, where a check-then-write would
 * race a concurrent redemption:
 *   - after the first grant, granted_tier / access_starts_at / source are locked
 *   - seats_total can never drop below the active grant count
 *   - access_ends_at extends freely; shortening (or deactivating) needs confirm
 *   - bulk-impact edits write ONE summary audit row with the affected count
 */

import { NextResponse } from 'next/server';
import { z } from 'zod';
import {
  requirePartnerAdminRoute,
  rpcOutcomeResponse,
  invalidUuidResponse,
} from '@/lib/admin/partner-route-guard';
import { validateSeatWindow } from '@/lib/partners/seat-blocks';

const PatchSchema = z.object({
  label: z.string().trim().min(1).max(120),
  seats_total: z.number().int().min(0).max(1_000_000),
  granted_tier: z.literal('vault').default('vault'),
  access_starts_at: z.iso.datetime({ offset: true }),
  access_ends_at: z.iso.datetime({ offset: true }),
  source: z.enum(['sponsored', 'purchased']),
  notes: z.string().trim().max(2000).nullable().optional(),
  is_active: z.boolean(),
  confirm_impact: z.boolean().default(false),
  reason: z.string().trim().max(500).nullable().optional(),
});

export async function PATCH(
  request: Request,
  { params }: { params: Promise<{ id: string; blockId: string }> },
) {
  const gate = await requirePartnerAdminRoute(request, { mutation: true });
  if (!gate.ok) return gate.response;

  const { id: partnerId, blockId } = await params;
  const badId = invalidUuidResponse({ partnerId, blockId });
  if (badId) return badId;

  const parsed = PatchSchema.safeParse(await request.json().catch(() => ({})));
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
    p_block_id: blockId,
    p_label: input.label,
    p_seats_total: input.seats_total,
    p_granted_tier: input.granted_tier,
    p_access_starts_at: input.access_starts_at,
    p_access_ends_at: input.access_ends_at,
    p_block_source: input.source,
    p_notes: input.notes ?? null,
    p_is_active: input.is_active,
    p_actor_id: gate.actorId,
    p_audit_source: 'admin',
    p_confirm_impact: input.confirm_impact,
    p_reason: input.reason ?? null,
  });

  if (error) {
    console.error('[Admin/Partners/SeatBlocks] upsert_seat_block failed:', error);
    return NextResponse.json({ error: 'Failed to update seat block' }, { status: 500 });
  }

  const outcome = (data as { outcome?: string } | null)?.outcome ?? 'invalid';
  const failure = rpcOutcomeResponse(outcome, data as Record<string, unknown>);
  if (failure) return failure;

  return NextResponse.json(data);
}
