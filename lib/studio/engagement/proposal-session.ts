// Client PROPOSAL session — session.ts (the questionnaire's cookie exchange)
// applied to engagement_proposals. The pure helpers are IMPORTED from
// session.ts (secretMatches, evaluateSession, isCrossSite,
// cookieMaxAgeSeconds, sessionCookieOptions — all row-shaped and
// questionnaire-agnostic); what is new here is the scope:
//
//   - the cookie is `hv_engp_<proposalId>` — a DIFFERENT prefix from the
//     questionnaire's `hv_engq_`, so a proposal cookie never authorizes a
//     questionnaire and vice versa, and one browser can hold both;
//   - authorizeProposalSession(id) returns the row, a service-role client AND
//     presentedTokenHash — the sha256 of the cookie value — which the accept
//     route hands to accept_engagement_proposal so the RPC re-validates the
//     credential on the LOCKED row (the cookie check here is UX; the RPC is
//     the enforcement, and a revoke that commits first wins).
//
// Same verdicts, verbatim: token_revoked_at / token_expires_at are checked
// INSIDE authorizeProposalSession so Revoke kills an open tab; 410 only for a
// valid secret on an expired token; 403 for everything else; NO token-in-body
// fallback. (No `import 'server-only'` on purpose — the test imports this
// module directly; the Next-only pieces are reached through dynamic imports.
// Never import it from a client component.)

import type { SupabaseClient } from '@supabase/supabase-js';
import { hashToken } from './questionnaire-token';
import { evaluateSession } from './session';
import type { EngagementProposal } from '@/lib/admin/types';

export { cookieMaxAgeSeconds, evaluateSession, isCrossSite, secretMatches, sessionCookieOptions } from './session';

export const PROPOSAL_COOKIE_PREFIX = 'hv_engp_';

/** Per-proposal cookie name so one browser can hold several at once. */
export function proposalCookieNameFor(proposalId: string): string {
  return `${PROPOSAL_COOKIE_PREFIX}${proposalId}`;
}

export type ProposalAuthorizeResult =
  | { ok: true; proposal: EngagementProposal; supabase: SupabaseClient; presentedTokenHash: string }
  | { ok: false; status: 403 | 410 | 503 };

/**
 * Authorize a request to proposal `proposalId`: the request must carry the
 * cookie for THIS id, and its secret must hash to the stored token which must
 * be neither revoked nor expired. Returns the full row, a service-role client
 * (RLS has no anon policy on engagement_proposals by design) and the
 * presented hash for the accept RPC.
 */
export async function authorizeProposalSession(proposalId: string): Promise<ProposalAuthorizeResult> {
  if (!process.env.NEXT_PUBLIC_SUPABASE_URL || !process.env.SUPABASE_SERVICE_ROLE_KEY) {
    return { ok: false, status: 503 };
  }
  const { cookies } = await import('next/headers');
  const { createAdminClient } = await import('@/lib/supabase/server');

  const store = await cookies();
  const secret = store.get(proposalCookieNameFor(proposalId))?.value ?? null;
  if (!secret) return { ok: false, status: 403 };

  const supabase = createAdminClient();
  const { data, error } = await supabase.from('engagement_proposals').select('*').eq('id', proposalId).maybeSingle();
  if (error) {
    console.error('[engagement/proposal-session] proposal lookup failed:', error.message);
    return { ok: false, status: 503 };
  }
  const row = (data ?? null) as EngagementProposal | null;
  const verdict = evaluateSession(row, secret);
  if (!verdict.ok) return verdict;
  return { ok: true, proposal: row!, supabase, presentedTokenHash: hashToken(secret) };
}
