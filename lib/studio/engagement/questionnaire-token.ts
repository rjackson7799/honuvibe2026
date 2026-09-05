// The magic-link token for a client questionnaire. 256-bit random, stored ONLY
// as its sha256 (the discovery_sessions.session_secret_hash idiom); the
// plaintext exists exactly once — in the entry URL returned from send/resend —
// and is never logged or written to an event (the RLS suite scans event data
// for 64-hex strings). Pure: no DB, no Next imports, so it is unit-testable and
// shared by the server action (mint) and the entry route (lookup by hash).

import { createHash, randomBytes } from 'crypto';
import type { EngagementLocale } from './types';

/** Default validity of a freshly minted (or rotated) link. */
export const TOKEN_TTL_DAYS = 45;
const DAY_MS = 86_400_000;

/** Raw token: 32 random bytes as 64 lowercase hex chars. */
export const TOKEN_RE = /^[0-9a-f]{64}$/;

export function hashToken(token: string): string {
  return createHash('sha256').update(token, 'utf8').digest('hex');
}

export function mintQuestionnaireToken(): { token: string; hash: string } {
  const token = randomBytes(32).toString('hex');
  return { token, hash: hashToken(token) };
}

export function tokenExpiryFrom(now: Date = new Date()): Date {
  return new Date(now.getTime() + TOKEN_TTL_DAYS * DAY_MS);
}

function siteUrl(): string {
  return (process.env.NEXT_PUBLIC_SITE_URL ?? 'https://honuvibe.ai').replace(/\/+$/, '');
}

/** The URL that goes in the client email. The token lives ONLY here. */
export function questionnaireEntryUrl(token: string): string {
  return `${siteUrl()}/api/engagement/enter/${token}`;
}

/** Locale-correct path of the questionnaire page (no token — the cookie authorizes). */
export function discoveryPath(locale: EngagementLocale, questionnaireId: string): string {
  return `${locale === 'ja' ? '/ja' : ''}/discovery/${questionnaireId}`;
}
