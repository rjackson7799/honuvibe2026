/**
 * Activate / deactivate a single join code. Delegates to
 * `set_join_code_active`, which flips the flag and writes the audit row in one
 * transaction.
 */

import { NextResponse } from 'next/server';
import { z } from 'zod';
import {
  requirePartnerAdminRoute,
  rpcOutcomeResponse,
  invalidUuidResponse,
} from '@/lib/admin/partner-route-guard';

const PatchSchema = z.object({
  is_active: z.boolean(),
  reason: z.string().trim().max(500).optional(),
});

export async function PATCH(
  request: Request,
  { params }: { params: Promise<{ id: string; codeId: string }> },
) {
  const gate = await requirePartnerAdminRoute(request, { mutation: true });
  if (!gate.ok) return gate.response;

  const { id: partnerId, codeId } = await params;
  const badId = invalidUuidResponse({ partnerId, codeId });
  if (badId) return badId;

  const parsed = PatchSchema.safeParse(await request.json().catch(() => ({})));
  if (!parsed.success) {
    return NextResponse.json({ error: 'Invalid payload' }, { status: 400 });
  }

  // Scope check: the RPC keys on the code id alone, so confirm the code really
  // belongs to the partner in the URL before touching it.
  const { data: owned } = await gate.admin
    .from('partner_join_codes')
    .select('id')
    .eq('id', codeId)
    .eq('partner_id', partnerId)
    .maybeSingle();

  if (!owned) {
    return NextResponse.json({ error: 'Not found' }, { status: 404 });
  }

  const { data, error } = await gate.admin.rpc('set_join_code_active', {
    p_code_id: codeId,
    p_is_active: parsed.data.is_active,
    p_actor_id: gate.actorId,
    p_audit_source: 'admin',
    p_reason: parsed.data.reason ?? null,
  });

  if (error) {
    console.error('[Admin/Partners/JoinCodes] set_join_code_active failed:', error);
    return NextResponse.json({ error: 'Failed to update join code' }, { status: 500 });
  }

  const outcome = (data as { outcome?: string } | null)?.outcome ?? 'invalid';
  const failure = rpcOutcomeResponse(outcome);
  if (failure) return failure;

  return NextResponse.json(data);
}
