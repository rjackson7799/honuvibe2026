import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';

// Port of lib/previews/gate.test.ts for the questionnaire session: hash
// stable, wrong secret fails, LENGTH MISMATCH FAILS WITHOUT THROWING (the
// timingSafeEqual trap), expired (410) and revoked (403) rejected, a cookie
// for questionnaire A does not authorize B, and Sec-Fetch-Site: cross-site is
// rejected while an absent header passes.

const cookieStore = new Map<string, string>();
vi.mock('next/headers', () => ({
  cookies: async () => ({
    get: (name: string) => (cookieStore.has(name) ? { name, value: cookieStore.get(name)! } : undefined),
  }),
}));

const rows = new Map<string, Record<string, unknown>>();
vi.mock('@/lib/supabase/server', () => ({
  createAdminClient: () => ({
    from: () => ({
      select: () => ({
        eq: (_col: string, id: string) => ({
          maybeSingle: async () => ({ data: rows.get(id) ?? null, error: null }),
        }),
      }),
    }),
  }),
  createClient: async () => {
    throw new Error('not used');
  },
}));

import { hashToken, mintQuestionnaireToken, TOKEN_RE, tokenExpiryFrom, TOKEN_TTL_DAYS, discoveryPath, questionnaireEntryUrl } from './questionnaire-token';
import {
  QUESTIONNAIRE_COOKIE_PREFIX,
  authorizeSession,
  cookieMaxAgeSeconds,
  cookieNameFor,
  evaluateSession,
  isCrossSite,
  secretMatches,
  sessionCookieOptions,
} from './session';

const NOW = new Date('2026-09-04T12:00:00Z');
const A = '11111111-1111-4111-8111-111111111111';
const B = '22222222-2222-4222-8222-222222222222';

function liveRow(hash: string, overrides: Record<string, unknown> = {}) {
  return {
    id: A,
    access_token_hash: hash,
    token_issued_at: NOW.toISOString(),
    // Relative to the real clock: authorizeSession compares against Date.now(),
    // so a fixed future date turns into a calendar time bomb.
    token_expires_at: new Date(Date.now() + 86_400_000).toISOString(),
    token_revoked_at: null,
    status: 'sent',
    ...overrides,
  };
}

describe('questionnaire-token', () => {
  it('mints a 64-hex token whose hash is a stable sha256', () => {
    const { token, hash } = mintQuestionnaireToken();
    expect(token).toMatch(TOKEN_RE);
    expect(hash).toMatch(/^[0-9a-f]{64}$/);
    expect(hash).not.toBe(token);
    expect(hashToken(token)).toBe(hash);
    expect(mintQuestionnaireToken().token).not.toBe(token);
  });

  it('expiry is +45 days and the entry URL carries only the token', () => {
    expect(TOKEN_TTL_DAYS).toBe(45);
    expect(tokenExpiryFrom(NOW).toISOString()).toBe('2026-10-19T12:00:00.000Z');
    process.env.NEXT_PUBLIC_SITE_URL = 'https://honuvibe.ai/';
    expect(questionnaireEntryUrl('ab'.repeat(32))).toBe(`https://honuvibe.ai/api/engagement/enter/${'ab'.repeat(32)}`);
    expect(discoveryPath('en', A)).toBe(`/discovery/${A}`);
    expect(discoveryPath('ja', A)).toBe(`/ja/discovery/${A}`);
  });
});

describe('cookieNameFor', () => {
  it('prefixes the questionnaire id', () => {
    expect(cookieNameFor(A)).toBe(`${QUESTIONNAIRE_COOKIE_PREFIX}${A}`);
    expect(cookieNameFor(A)).not.toBe(cookieNameFor(B));
  });
});

describe('secretMatches', () => {
  const { token, hash } = mintQuestionnaireToken();

  it('is true for the minted secret and false for a wrong one', () => {
    expect(secretMatches(token, hash)).toBe(true);
    expect(secretMatches(mintQuestionnaireToken().token, hash)).toBe(false);
  });

  it('fails WITHOUT throwing on a length-mismatched or malformed stored hash', () => {
    expect(() => secretMatches(token, hash.slice(0, 32))).not.toThrow();
    expect(secretMatches(token, hash.slice(0, 32))).toBe(false);
    expect(secretMatches(token, 'not-hex-at-all')).toBe(false);
    expect(secretMatches(token, '')).toBe(false);
    expect(secretMatches(token, null)).toBe(false);
    expect(secretMatches('', hash)).toBe(false);
  });
});

describe('evaluateSession', () => {
  const { token, hash } = mintQuestionnaireToken();

  it('accepts a valid, unrevoked, unexpired secret', () => {
    expect(evaluateSession(liveRow(hash), token, NOW)).toEqual({ ok: true });
  });

  it('403 on a missing row, missing secret, or wrong secret', () => {
    expect(evaluateSession(null, token, NOW)).toEqual({ ok: false, status: 403 });
    expect(evaluateSession(liveRow(hash), null, NOW)).toEqual({ ok: false, status: 403 });
    expect(evaluateSession(liveRow(hash), mintQuestionnaireToken().token, NOW)).toEqual({ ok: false, status: 403 });
    expect(evaluateSession(liveRow(null as unknown as string), token, NOW)).toEqual({ ok: false, status: 403 });
  });

  it('403 when revoked — even if the secret is right', () => {
    expect(evaluateSession(liveRow(hash, { token_revoked_at: NOW.toISOString() }), token, NOW)).toEqual({ ok: false, status: 403 });
  });

  it('410 ONLY for a valid secret on an expired token; a wrong secret on an expired token stays 403', () => {
    const expired = liveRow(hash, { token_expires_at: new Date(NOW.getTime() - 1000).toISOString() });
    expect(evaluateSession(expired, token, NOW)).toEqual({ ok: false, status: 410 });
    expect(evaluateSession(expired, mintQuestionnaireToken().token, NOW)).toEqual({ ok: false, status: 403 });
    // Exactly at expiry is expired; a missing/unparseable expiry never authorizes.
    expect(evaluateSession(liveRow(hash, { token_expires_at: NOW.toISOString() }), token, NOW)).toEqual({ ok: false, status: 410 });
    expect(evaluateSession(liveRow(hash, { token_expires_at: null }), token, NOW)).toEqual({ ok: false, status: 403 });
    expect(evaluateSession(liveRow(hash, { token_expires_at: 'garbage' }), token, NOW)).toEqual({ ok: false, status: 410 });
  });
});

describe('isCrossSite', () => {
  it('rejects only a PRESENT cross-site header; absent / same-origin / same-site / none pass', () => {
    expect(isCrossSite('cross-site')).toBe(true);
    expect(isCrossSite(' Cross-Site ')).toBe(true);
    expect(isCrossSite(null)).toBe(false);
    expect(isCrossSite(undefined)).toBe(false);
    expect(isCrossSite('same-origin')).toBe(false);
    expect(isCrossSite('same-site')).toBe(false);
    expect(isCrossSite('none')).toBe(false);
  });
});

describe('cookie attributes', () => {
  afterEach(() => {
    vi.unstubAllEnvs();
  });

  it('Max-Age aligns to token_expires_at and never goes negative', () => {
    expect(cookieMaxAgeSeconds(new Date(NOW.getTime() + 90_000), NOW)).toBe(90);
    expect(cookieMaxAgeSeconds(new Date(NOW.getTime() - 90_000), NOW)).toBe(0);
    expect(cookieMaxAgeSeconds('garbage', NOW)).toBe(0);
  });

  it('is HttpOnly, Lax, Path=/, and Secure only in production', () => {
    vi.stubEnv('NODE_ENV', 'production');
    expect(sessionCookieOptions(new Date(NOW.getTime() + 60_000), NOW)).toEqual({
      httpOnly: true,
      sameSite: 'lax',
      secure: true,
      path: '/',
      maxAge: 60,
    });
    vi.stubEnv('NODE_ENV', 'development');
    expect(sessionCookieOptions(new Date(NOW.getTime() + 60_000), NOW).secure).toBe(false);
  });
});

describe('authorizeSession (cookie + row lookup)', () => {
  const { token, hash } = mintQuestionnaireToken();

  beforeEach(() => {
    cookieStore.clear();
    rows.clear();
    process.env.NEXT_PUBLIC_SUPABASE_URL = 'http://127.0.0.1:54321';
    process.env.SUPABASE_SERVICE_ROLE_KEY = 'service';
  });

  it('authorizes A with A\'s cookie and returns the row', async () => {
    rows.set(A, liveRow(hash));
    cookieStore.set(cookieNameFor(A), token);
    const result = await authorizeSession(A);
    expect(result.ok).toBe(true);
    if (result.ok) expect(result.questionnaire.id).toBe(A);
  });

  it('a cookie for questionnaire A does NOT authorize questionnaire B (403)', async () => {
    rows.set(A, liveRow(hash));
    rows.set(B, { ...liveRow(hash), id: B });
    cookieStore.set(cookieNameFor(A), token);
    expect(await authorizeSession(B)).toEqual({ ok: false, status: 403 });
  });

  it('403 without a cookie, on a wrong secret, on an unknown id, and when revoked; 410 when expired', async () => {
    rows.set(A, liveRow(hash));
    expect(await authorizeSession(A)).toEqual({ ok: false, status: 403 });

    cookieStore.set(cookieNameFor(A), mintQuestionnaireToken().token);
    expect(await authorizeSession(A)).toEqual({ ok: false, status: 403 });

    cookieStore.set(cookieNameFor(B), token);
    expect(await authorizeSession(B)).toEqual({ ok: false, status: 403 });

    cookieStore.set(cookieNameFor(A), token);
    rows.set(A, liveRow(hash, { token_revoked_at: new Date().toISOString() }));
    expect(await authorizeSession(A)).toEqual({ ok: false, status: 403 });

    rows.set(A, liveRow(hash, { token_expires_at: new Date(Date.now() - 1000).toISOString() }));
    expect(await authorizeSession(A)).toEqual({ ok: false, status: 410 });
  });

  it('503 when the service-role configuration is missing', async () => {
    delete process.env.SUPABASE_SERVICE_ROLE_KEY;
    rows.set(A, liveRow(hash));
    cookieStore.set(cookieNameFor(A), token);
    expect(await authorizeSession(A)).toEqual({ ok: false, status: 503 });
  });
});
