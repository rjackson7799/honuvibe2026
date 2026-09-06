// POST /api/engagement/proposal/[id]/accept — the client's click-wrap accept
// (slice 3, slice B). In order:
//
//   rate limit 10 / 1 h per IP (the in-memory bucket is per function
//   instance — the token is the real defense; the IP is a transient key,
//   never stored) → Sec-Fetch-Site (reject a PRESENT cross-site) → honeypot
//   `company_url` (silent fake success, the repo's convention) →
//   authorizeProposalSession (cookie for THIS id, hash matches, not revoked,
//   not expired; 403 / 410) → zod body {accepted_by_name 1..200, accepted:
//   literal true} → accept_engagement_proposal(id, name, 'client',
//   PRESENTED token hash) — the RPC locks engagement → proposal and
//   re-validates the credential on the locked row, so a Revoke or rotate
//   that committed first wins; it is the single transaction that writes the
//   money and moves the stage → on applied:true ONLY: after() Ryan's
//   notification (best-effort; the needs_attention event is the durable
//   signal). applied:false maps already_accepted → 409, not_open → 409,
//   expired → 410, forbidden → 403. No IP or user agent is stored.

import { NextResponse, type NextRequest, after } from 'next/server';
import { z } from 'zod';
import { tryConsume } from '@/lib/community/rate-limit';
import { authorizeProposalSession, isCrossSite } from '@/lib/studio/engagement/proposal-session';
import { notifyProposalAccepted } from '@/lib/studio/engagement/proposal-notify';
import { acceptedByNameSchema } from '@/lib/studio/engagement/proposal-schema';
import type { Engagement, EngagementProposal } from '@/lib/admin/types';

export const runtime = 'nodejs';
export const dynamic = 'force-dynamic';

const ACCEPT_LIMIT = 10;
const ACCEPT_WINDOW_MS = 60 * 60_000;

const UUID_RE = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i;

const bodySchema = z.object({
  accepted_by_name: acceptedByNameSchema,
  accepted: z.literal(true),
  company_url: z.string().max(2000).optional(),
});

const NO_STORE = { 'Cache-Control': 'no-store, max-age=0' };

function json(body: Record<string, unknown>, status: number) {
  return NextResponse.json(body, { status, headers: NO_STORE });
}

function clientIp(request: NextRequest): string {
  return request.headers.get('x-forwarded-for')?.split(',')[0]?.trim() || request.headers.get('x-real-ip') || 'unknown';
}

export async function POST(request: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  const { id } = await params;
  if (!UUID_RE.test(id)) return json({ error: 'forbidden' }, 403);

  if (!tryConsume(`engp-accept:${clientIp(request)}`, ACCEPT_LIMIT, ACCEPT_WINDOW_MS)) {
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
  // Honeypot first (before auth): a bot filled the hidden field. Pretend it worked.
  const hp = payload && typeof payload === 'object' ? (payload as { company_url?: unknown }).company_url : undefined;
  if (typeof hp === 'string' && hp.trim() !== '') return json({ ok: true, applied: true }, 200);

  // 410 here is the LINK's 45-day expiry (distinct from the proposal's own
  // valid_until, which the RPC reports as `expired` below).
  const auth = await authorizeProposalSession(id);
  if (!auth.ok) {
    const error = auth.status === 410 ? 'link_expired' : auth.status === 503 ? 'unavailable' : 'forbidden';
    return json({ error }, auth.status);
  }
  const { proposal, supabase, presentedTokenHash } = auth;

  const parsed = bodySchema.safeParse(payload);
  if (!parsed.success) return json({ error: 'invalid_input' }, 400);

  const { data, error } = await supabase.rpc('accept_engagement_proposal', {
    p_proposal_id: proposal.id,
    p_accepted_by_name: parsed.data.accepted_by_name,
    p_via: 'client',
    p_token_hash: presentedTokenHash,
  });
  if (error) {
    if (error.message.includes('engagement_terminal')) return json({ error: 'not_open' }, 409);
    if (error.message.includes('accepted_by_required')) return json({ error: 'invalid_input' }, 400);
    console.error('[engagement/proposal/accept] RPC failed:', error.message);
    return json({ error: 'accept_failed' }, 500);
  }
  const result = (data ?? {}) as { applied?: boolean; reason?: string; engagement_id?: string; stage_moved?: boolean };
  if (!result.applied) {
    switch (result.reason) {
      case 'already_accepted':
        return json({ error: 'already_accepted' }, 409);
      case 'expired':
        return json({ error: 'expired' }, 410);
      case 'forbidden':
        return json({ error: 'forbidden' }, 403);
      default:
        return json({ error: 'not_open' }, 409);
    }
  }

  // Ryan's notification runs AFTER the response (best-effort; stamps
  // notification_sent_at only on provider success — proposal-notify.ts).
  const engagementId = result.engagement_id ?? proposal.engagement_id;
  const stageMoved = result.stage_moved === true;
  after(async () => {
    const [{ data: freshP }, { data: eRow }] = await Promise.all([
      supabase.from('engagement_proposals').select('*').eq('id', proposal.id).maybeSingle(),
      supabase.from('engagements').select('*').eq('id', engagementId).maybeSingle(),
    ]);
    if (freshP && eRow) {
      await notifyProposalAccepted(supabase, freshP as unknown as EngagementProposal, eRow as unknown as Engagement, stageMoved);
    }
  });

  return json({ ok: true, applied: true }, 200);
}
