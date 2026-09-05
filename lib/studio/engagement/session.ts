// Client questionnaire session — lib/discover/session.ts ported in structure
// (copying beats generalizing a shipped module), with ONE deliberate change:
// (No `import 'server-only'` here ON PURPOSE: session.test.ts imports the pure
// helpers directly; the Next-only pieces are reached through dynamic imports.
// Never import this module from a client component.)
// the cookie is QUESTIONNAIRE-SCOPED (`hv_engq_<questionnaireId>`, the
// lib/previews/gate.ts cookieNameFor pattern) so entering questionnaire B
// never drops authorization for A — bad for Ryan's testing, worse for a repeat
// client. The value is the raw secret only: the id is in the cookie NAME and
// the route param, and authorizeSession(id) reads exactly the cookie for that id.
//
// Auth is a cookie exchange, not a bearer per request: /api/engagement/enter/
// [token] verifies sha256(token) against the row, sets the cookie, and 303s to
// a UUID-only URL, so the secret never lands in history, analytics or a
// Referer. token_revoked_at and token_expires_at are checked INSIDE
// authorizeSession — not just at entry — so revoking kills an open tab.
// Expired-on-a-valid-secret is 410 (the page may say "ask Ryan for a new
// link"); unknown id / bad secret / revoked are all 403, deliberately not
// distinguished. NO token-in-body fallback: two auth paths is how one rots.
//
// The pure pieces (cookieNameFor, secretMatches, evaluateSession, isCrossSite,
// cookieMaxAgeSeconds) have no Next imports so session.test.ts can pin them;
// authorizeSession is the only function that touches cookies() and the DB.

import { timingSafeEqual } from 'crypto';
import type { SupabaseClient } from '@supabase/supabase-js';
import { hashToken } from './questionnaire-token';
import type { EngagementQuestionnaire } from '@/lib/admin/types';

export const QUESTIONNAIRE_COOKIE_PREFIX = 'hv_engq_';

/** Per-questionnaire cookie name so one browser can hold several at once. */
export function cookieNameFor(questionnaireId: string): string {
  return `${QUESTIONNAIRE_COOKIE_PREFIX}${questionnaireId}`;
}

/** Timing-safe compare of a presented secret against the stored sha256 hex hash. */
export function secretMatches(secret: string, expectedHash: string | null): boolean {
  if (!expectedHash) return false;
  const got = Buffer.from(hashToken(secret), 'hex');
  const exp = Buffer.from(expectedHash, 'hex');
  // Length check first: timingSafeEqual THROWS on unequal lengths, and a
  // malformed stored hash must read as "no match", never as a 500.
  return got.length === exp.length && got.length > 0 && timingSafeEqual(got, exp);
}

export type SessionTokenRow = Pick<
  EngagementQuestionnaire,
  'access_token_hash' | 'token_expires_at' | 'token_revoked_at'
>;

export type SessionVerdict = { ok: true } | { ok: false; status: 403 | 410 };

/**
 * The authorization decision for a presented secret against a row, pure so it
 * is testable. Order matters: a wrong secret is 403 even if the token also
 * expired (the caller learns nothing about a row it cannot open); a revoked
 * token is 403 (Ryan pulled it — same "open from your email again" state as a
 * missing cookie, and the entry route will refuse too); only a VALID secret on
 * an expired token is 410.
 */
export function evaluateSession(
  row: SessionTokenRow | null | undefined,
  secret: string | null | undefined,
  now: Date = new Date(),
): SessionVerdict {
  if (!row || !secret) return { ok: false, status: 403 };
  if (!secretMatches(secret, row.access_token_hash)) return { ok: false, status: 403 };
  if (row.token_revoked_at) return { ok: false, status: 403 };
  if (!row.token_expires_at) return { ok: false, status: 403 };
  const expires = new Date(row.token_expires_at).getTime();
  if (Number.isNaN(expires) || expires <= now.getTime()) return { ok: false, status: 410 };
  return { ok: true };
}

/**
 * Cookie-authenticated WRITES reject Sec-Fetch-Site when it is PRESENT and
 * `cross-site`. An absent header passes (Safari < 16.4 never sends it and this
 * is a client-facing page). Defence-in-depth on top of SameSite=Lax, which is
 * the actual CSRF control; a sendBeacon from the page itself is same-origin.
 */
export function isCrossSite(secFetchSite: string | null | undefined): boolean {
  return typeof secFetchSite === 'string' && secFetchSite.trim().toLowerCase() === 'cross-site';
}

/** Max-Age aligned to token_expires_at (never negative; 0 deletes). */
export function cookieMaxAgeSeconds(expiresAt: string | Date, now: Date = new Date()): number {
  const t = expiresAt instanceof Date ? expiresAt.getTime() : new Date(expiresAt).getTime();
  if (Number.isNaN(t)) return 0;
  return Math.max(0, Math.floor((t - now.getTime()) / 1000));
}

/** Attributes for the session cookie (HttpOnly, Secure in prod, Lax, Path=/). */
export function sessionCookieOptions(expiresAt: string | Date, now: Date = new Date()) {
  return {
    httpOnly: true,
    sameSite: 'lax' as const,
    secure: process.env.NODE_ENV === 'production',
    path: '/',
    maxAge: cookieMaxAgeSeconds(expiresAt, now),
  };
}

export type AuthorizeResult =
  | { ok: true; questionnaire: EngagementQuestionnaire; supabase: SupabaseClient }
  | { ok: false; status: 403 | 410 | 503 };

/**
 * Authorize a request to questionnaire `questionnaireId`: the request must
 * carry the cookie for THIS id, and its secret must hash to the stored token
 * which must be neither revoked nor expired. Returns the full row and a
 * service-role client for the caller's DB work (RLS has no anon policy on
 * these tables by design — an RLS predicate cannot see a cookie).
 */
export async function authorizeSession(questionnaireId: string): Promise<AuthorizeResult> {
  if (!process.env.NEXT_PUBLIC_SUPABASE_URL || !process.env.SUPABASE_SERVICE_ROLE_KEY) {
    return { ok: false, status: 503 };
  }
  const { cookies } = await import('next/headers');
  const { createAdminClient } = await import('@/lib/supabase/server');

  const store = await cookies();
  const secret = store.get(cookieNameFor(questionnaireId))?.value ?? null;
  if (!secret) return { ok: false, status: 403 };

  const supabase = createAdminClient();
  const { data, error } = await supabase
    .from('engagement_questionnaires')
    .select('*')
    .eq('id', questionnaireId)
    .maybeSingle();
  if (error) {
    console.error('[engagement/session] questionnaire lookup failed:', error.message);
    return { ok: false, status: 503 };
  }
  const row = (data ?? null) as EngagementQuestionnaire | null;
  const verdict = evaluateSession(row, secret);
  if (!verdict.ok) return verdict;
  return { ok: true, questionnaire: row!, supabase };
}
