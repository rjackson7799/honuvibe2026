import { beforeEach, describe, expect, it, vi } from 'vitest';

// The proposal cookie exchange (slice 3, slice B) — session.test.ts's shape
// re-pinned for the PROPOSAL scope: the cookie prefix differs from the
// questionnaire's (a proposal cookie never authorizes a questionnaire and
// vice versa), a cookie for proposal A does not authorize proposal B, wrong
// secret / length-mismatched secret (no throw) / revoked → 403, a valid
// secret on an expired token → 410, and presentedTokenHash is the sha256 of
// the cookie value (what the accept route hands to the RPC).

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

import { hashToken, TOKEN_RE } from './questionnaire-token';
import { QUESTIONNAIRE_COOKIE_PREFIX, cookieNameFor } from './session';
import { mintProposalToken, proposalEntryUrl, proposalPath, proposalTokenExpiryFrom } from './proposal-token';
import { PROPOSAL_COOKIE_PREFIX, authorizeProposalSession, proposalCookieNameFor } from './proposal-session';

const A = '11111111-1111-4111-8111-111111111111';
const B = '22222222-2222-4222-8222-222222222222';
const NOW = new Date('2026-09-06T12:00:00Z');

function liveRow(hash: string, overrides: Record<string, unknown> = {}) {
  return {
    id: A,
    status: 'sent',
    access_token_hash: hash,
    token_issued_at: NOW.toISOString(),
    // Relative to the real clock — authorizeProposalSession compares against
    // Date.now(); a fixed future date would be a calendar time bomb.
    token_expires_at: new Date(Date.now() + 86_400_000).toISOString(),
    token_revoked_at: null,
    ...overrides,
  };
}

describe('proposal-token', () => {
  it('mints a 64-hex token whose hash is its sha256; expiry is +45 days', () => {
    const { token, hash } = mintProposalToken();
    expect(token).toMatch(TOKEN_RE);
    expect(hash).toBe(hashToken(token));
    expect(mintProposalToken().token).not.toBe(token);
    expect(proposalTokenExpiryFrom(NOW).toISOString()).toBe('2026-10-21T12:00:00.000Z');
  });

  it('entry URL carries only the token; the page path is locale-prefixed and token-free', () => {
    vi.stubEnv('NEXT_PUBLIC_SITE_URL', 'https://honuvibe.ai/');
    try {
      expect(proposalEntryUrl('ab'.repeat(32))).toBe(`https://honuvibe.ai/api/engagement/proposal/enter/${'ab'.repeat(32)}`);
    } finally {
      vi.unstubAllEnvs();
    }
    expect(proposalPath('en', A)).toBe(`/proposal/${A}`);
    expect(proposalPath('ja', A)).toBe(`/ja/proposal/${A}`);
  });
});

describe('proposalCookieNameFor', () => {
  it('uses a prefix that differs from the questionnaire cookie, so neither authorizes the other', () => {
    expect(PROPOSAL_COOKIE_PREFIX).toBe('hv_engp_');
    expect(PROPOSAL_COOKIE_PREFIX).not.toBe(QUESTIONNAIRE_COOKIE_PREFIX);
    expect(proposalCookieNameFor(A)).toBe(`hv_engp_${A}`);
    expect(proposalCookieNameFor(A)).not.toBe(cookieNameFor(A));
    expect(proposalCookieNameFor(A)).not.toBe(proposalCookieNameFor(B));
  });
});

describe('authorizeProposalSession', () => {
  const { token, hash } = mintProposalToken();

  beforeEach(() => {
    cookieStore.clear();
    rows.clear();
    process.env.NEXT_PUBLIC_SUPABASE_URL = 'http://127.0.0.1:54321';
    process.env.SUPABASE_SERVICE_ROLE_KEY = 'service';
  });

  it("authorizes A with A's cookie, returning the row and presentedTokenHash = sha256(cookie value)", async () => {
    rows.set(A, liveRow(hash));
    cookieStore.set(proposalCookieNameFor(A), token);
    const result = await authorizeProposalSession(A);
    expect(result.ok).toBe(true);
    if (result.ok) {
      expect(result.proposal.id).toBe(A);
      expect(result.presentedTokenHash).toBe(hashToken(token));
      expect(result.presentedTokenHash).toBe(hash);
      expect(result.presentedTokenHash).not.toBe(token);
    }
  });

  it('a QUESTIONNAIRE cookie for the same id does not authorize the proposal (403)', async () => {
    rows.set(A, liveRow(hash));
    cookieStore.set(cookieNameFor(A), token);
    expect(await authorizeProposalSession(A)).toEqual({ ok: false, status: 403 });
  });

  it('a cookie for proposal A does NOT authorize proposal B (403)', async () => {
    rows.set(A, liveRow(hash));
    rows.set(B, { ...liveRow(hash), id: B });
    cookieStore.set(proposalCookieNameFor(A), token);
    expect(await authorizeProposalSession(B)).toEqual({ ok: false, status: 403 });
  });

  it('403 without a cookie, on a wrong secret, on a length-mismatched stored hash (no throw), when revoked; 410 when expired', async () => {
    rows.set(A, liveRow(hash));
    expect(await authorizeProposalSession(A)).toEqual({ ok: false, status: 403 });

    cookieStore.set(proposalCookieNameFor(A), mintProposalToken().token);
    expect(await authorizeProposalSession(A)).toEqual({ ok: false, status: 403 });

    cookieStore.set(proposalCookieNameFor(A), token);
    rows.set(A, liveRow(hash.slice(0, 32)));
    await expect(authorizeProposalSession(A)).resolves.toEqual({ ok: false, status: 403 });

    rows.set(A, liveRow(hash, { token_revoked_at: new Date().toISOString() }));
    expect(await authorizeProposalSession(A)).toEqual({ ok: false, status: 403 });

    rows.set(A, liveRow(hash, { token_expires_at: new Date(Date.now() - 1000).toISOString() }));
    expect(await authorizeProposalSession(A)).toEqual({ ok: false, status: 410 });

    // A wrong secret on an expired token stays 403 (nothing learned about the row).
    cookieStore.set(proposalCookieNameFor(A), mintProposalToken().token);
    expect(await authorizeProposalSession(A)).toEqual({ ok: false, status: 403 });
  });

  it('503 when the service-role configuration is missing', async () => {
    delete process.env.SUPABASE_SERVICE_ROLE_KEY;
    rows.set(A, liveRow(hash));
    cookieStore.set(proposalCookieNameFor(A), token);
    expect(await authorizeProposalSession(A)).toEqual({ ok: false, status: 503 });
  });
});
