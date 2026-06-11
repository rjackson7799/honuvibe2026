import 'server-only';
import { randomBytes, createHash, timingSafeEqual } from 'crypto';
import { cookies } from 'next/headers';
import type { SupabaseClient } from '@supabase/supabase-js';
import { createAdminClient } from '@/lib/supabase/server';

// A discovery session is anonymous: the prospect never authenticates. We gate
// access to their own session with a per-session secret — minted at /start,
// stored only as a sha256 hash on the row, and held by the browser in an
// httpOnly cookie. Every write/read route validates it. This keeps a leaked
// session URL (history, logs, referrers) from exposing the answers/PII.

export const DISCOVER_COOKIE = 'hv_discover';
const THIRTY_DAYS_SECONDS = 60 * 60 * 24 * 30;

export function hashSecret(secret: string): string {
  return createHash('sha256').update(secret).digest('hex');
}

export function newSessionSecret(): { secret: string; hash: string } {
  const secret = randomBytes(32).toString('hex');
  return { secret, hash: hashSecret(secret) };
}

export async function setSessionCookie(sessionId: string, secret: string): Promise<void> {
  const store = await cookies();
  store.set(DISCOVER_COOKIE, `${sessionId}:${secret}`, {
    httpOnly: true,
    sameSite: 'lax',
    secure: process.env.NODE_ENV === 'production',
    path: '/',
    maxAge: THIRTY_DAYS_SECONDS,
  });
}

async function readSessionCookie(): Promise<{ sessionId: string; secret: string } | null> {
  const store = await cookies();
  const raw = store.get(DISCOVER_COOKIE)?.value;
  if (!raw) return null;
  const idx = raw.indexOf(':');
  if (idx === -1) return null;
  const sessionId = raw.slice(0, idx);
  const secret = raw.slice(idx + 1);
  if (!sessionId || !secret) return null;
  return { sessionId, secret };
}

function secretMatches(secret: string, expectedHash: string): boolean {
  const got = Buffer.from(hashSecret(secret), 'hex');
  const exp = Buffer.from(expectedHash, 'hex');
  return got.length === exp.length && timingSafeEqual(got, exp);
}

export interface SessionRow {
  id: string;
  lead_id: string;
  current_step: number;
  locale: string;
  session_secret_hash: string;
}

export type AuthorizeResult =
  | { ok: true; session: SessionRow; supabase: SupabaseClient }
  | { ok: false; status: 403 | 404 | 503 };

/**
 * Authorize access to a discovery session: the request cookie must reference
 * this exact sessionId and carry the secret whose hash matches the stored row.
 * Returns a service-role client for the caller to do its DB work.
 */
export async function authorizeSession(sessionId: string): Promise<AuthorizeResult> {
  if (!process.env.NEXT_PUBLIC_SUPABASE_URL || !process.env.SUPABASE_SERVICE_ROLE_KEY) {
    return { ok: false, status: 503 };
  }
  const cookie = await readSessionCookie();
  if (!cookie || cookie.sessionId !== sessionId) return { ok: false, status: 403 };

  const supabase = createAdminClient();
  const { data, error } = await supabase
    .from('discovery_sessions')
    .select('id, lead_id, current_step, locale, session_secret_hash')
    .eq('id', sessionId)
    .single<SessionRow>();

  if (error || !data) return { ok: false, status: 404 };
  if (!secretMatches(cookie.secret, data.session_secret_hash)) return { ok: false, status: 403 };

  return { ok: true, session: data, supabase };
}
