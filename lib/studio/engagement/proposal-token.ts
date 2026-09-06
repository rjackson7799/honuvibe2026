// The magic-link token for a client PROPOSAL (slice 3, slice B) —
// questionnaire-token.ts's mould with the proposal's URLs. Same hygiene:
// 256-bit random, stored ONLY as sha256 (hashToken is shared so the entry
// route and the accept RPC agree on the hash), the plaintext exists exactly
// once — in the URL returned from issue/resend and the client email — and
// is never logged or written to an event (the RLS suite scans event data for
// 64-hex strings). Pure: no DB, no Next imports.

import { randomBytes } from 'crypto';
import { TOKEN_TTL_DAYS, hashToken } from './questionnaire-token';
import type { EngagementLocale } from './types';

export { hashToken, TOKEN_RE, TOKEN_TTL_DAYS } from './questionnaire-token';

const DAY_MS = 86_400_000;

export function mintProposalToken(): { token: string; hash: string } {
  const token = randomBytes(32).toString('hex');
  return { token, hash: hashToken(token) };
}

/** +45 days — the link's life, separate from the proposal's valid_until (decision #12). */
export function proposalTokenExpiryFrom(now: Date = new Date()): Date {
  return new Date(now.getTime() + TOKEN_TTL_DAYS * DAY_MS);
}

function siteUrl(): string {
  return (process.env.NEXT_PUBLIC_SITE_URL ?? 'https://honuvibe.ai').replace(/\/+$/, '');
}

/** The URL that goes in the client email. The token lives ONLY here. */
export function proposalEntryUrl(token: string): string {
  return `${siteUrl()}/api/engagement/proposal/enter/${token}`;
}

/** Locale-correct path of the proposal page (no token — the cookie authorizes). */
export function proposalPath(locale: EngagementLocale, proposalId: string): string {
  return `${locale === 'ja' ? '/ja' : ''}/proposal/${proposalId}`;
}
