/**
 * Remove a member from a partner (HonuVibe admin).
 *
 * Delegates to `remove_partner_member`, which flips the membership to
 * 'removed', revokes every unrevoked seat grant on that partner's blocks, and
 * writes the audit rows — all in one transaction. Idempotent.
 *
 * An independently paid subscription is NOT touched: losing partner membership
 * takes away the sponsored seat, not something the member bought themselves.
 *
 * (The partner-portal roster UI that also needs this is Unit 3.)
 */

import { NextResponse } from 'next/server';
import { z } from 'zod';
import {
  requirePartnerAdminRoute,
  invalidUuidResponse,
} from '@/lib/admin/partner-route-guard';

const BodySchema = z.object({
  reason: z.string().trim().max(500).optional(),
});

export async function DELETE(
  request: Request,
  { params }: { params: Promise<{ id: string; userId: string }> },
) {
  const gate = await requirePartnerAdminRoute(request, { mutation: true });
  if (!gate.ok) return gate.response;

  const { id: partnerId, userId } = await params;
  const badId = invalidUuidResponse({ partnerId, userId });
  if (badId) return badId;

  const parsed = BodySchema.safeParse(await request.json().catch(() => ({})));
  const reason = parsed.success ? (parsed.data.reason ?? null) : null;

  const { data, error } = await gate.admin.rpc('remove_partner_member', {
    p_partner_id: partnerId,
    p_user_id: userId,
    p_actor_id: gate.actorId,
    p_source: 'admin',
    p_reason: reason,
  });

  if (error) {
    console.error('[Admin/Partners/Members] remove_partner_member failed:', error);
    return NextResponse.json({ error: 'Failed to remove member' }, { status: 500 });
  }

  const result = (data ?? {}) as { outcome?: string; seats_revoked?: number };

  if (result.outcome === 'not_found') {
    return NextResponse.json({ error: 'Not a member of this partner' }, { status: 404 });
  }
  if (result.outcome === 'invalid') {
    return NextResponse.json({ error: 'Invalid request' }, { status: 400 });
  }

  return NextResponse.json(result);
}
