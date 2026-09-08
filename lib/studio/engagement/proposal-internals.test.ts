// @vitest-environment node
//
// rotateProposalToken's compare-and-set (slice 5 fixes a live 4A defect).
//
// WHAT THIS PINS, precisely: the UPDATE carries a CAS on the PREVIOUS token
// hash as well as on status, so two rotations built from the SAME observed row
// cannot both commit — the loser matches zero rows and is told to reload,
// instead of silently shipping an email whose token is already dead.
//
// WHAT IT DELIBERATELY DOES NOT PIN: rotation-plus-send as one serialized
// operation. With staggered reads (A rotates H0->H1 and stalls, B reads H1 and
// rotates to H2, A then sends its H1 link) both CAS operations legitimately
// succeed. That is accepted behaviour, not a bug: every issue and resend
// rotates on purpose, only the newest link ever works, and the client copy
// says so in both locales. A test asserting otherwise would pin a guarantee
// this system does not make.
import { describe, expect, test, vi } from 'vitest';
import { rotateProposalToken, translateDbError } from './proposal-internals';
import type { EngagementProposal } from '@/lib/admin/types';

type Filter = { op: 'eq' | 'is'; column: string; value: unknown };

/** Records the filter chain so the CAS predicates can be asserted. */
function stubDb(result: { data: unknown[] | null; error: unknown }) {
  const filters: Filter[] = [];
  let patch: Record<string, unknown> = {};
  const chain = {
    update(next: Record<string, unknown>) {
      patch = next;
      return chain;
    },
    eq(column: string, value: unknown) {
      filters.push({ op: 'eq', column, value });
      return chain;
    },
    is(column: string, value: unknown) {
      filters.push({ op: 'is', column, value });
      return chain;
    },
    select() {
      return Promise.resolve(result);
    },
  };
  return { db: { from: () => chain } as never, filters, patch: () => patch };
}

function proposal(over: Partial<EngagementProposal> = {}): EngagementProposal {
  return {
    id: 'p1',
    status: 'accepted',
    valid_until: '2026-10-01',
    access_token_hash: 'a'.repeat(64),
    ...over,
  } as EngagementProposal;
}

const NOW = new Date('2026-09-07T00:00:00.000Z');

describe('the CAS predicates', () => {
  test('CASes on id, status AND the previous token hash', async () => {
    const { db, filters } = stubDb({ data: [{ id: 'p1' }], error: null });
    await rotateProposalToken(db, proposal(), NOW);

    expect(filters).toEqual([
      { op: 'eq', column: 'id', value: 'p1' },
      { op: 'eq', column: 'status', value: 'accepted' },
      { op: 'eq', column: 'access_token_hash', value: 'a'.repeat(64) },
    ]);
  });

  test('a MANUALLY accepted proposal has no hash, so the CAS asserts null instead', async () => {
    const { db, filters } = stubDb({ data: [{ id: 'p1' }], error: null });
    await rotateProposalToken(db, proposal({ access_token_hash: null }), NOW);

    expect(filters).toContainEqual({ op: 'is', column: 'access_token_hash', value: null });
    expect(filters.filter((f) => f.column === 'access_token_hash')).toHaveLength(1);
  });

  test('zero matched rows — the loser of a concurrent rotation — is told to reload, not left silent', async () => {
    const { db } = stubDb({ data: [], error: null });
    await expect(rotateProposalToken(db, proposal(), NOW)).rejects.toThrow(/changed underneath you|reload/i);
  });
});

describe('what the rotation writes', () => {
  test('a NEW hash replaces the old one, the expiry resets and any revoke clears', async () => {
    const { db, patch } = stubDb({ data: [{ id: 'p1' }], error: null });
    const result = await rotateProposalToken(db, proposal(), NOW);
    const written = patch();

    expect(written.access_token_hash).not.toBe('a'.repeat(64));
    expect(String(written.access_token_hash)).toMatch(/^[0-9a-f]{64}$/);
    expect(written.token_revoked_at).toBeNull();
    expect(new Date(String(written.token_expires_at)).getTime()).toBeGreaterThan(NOW.getTime());

    // The plaintext is returned to the caller and never written.
    expect(result.token).toMatch(/^[0-9a-f]{64}$/);
    expect(JSON.stringify(written)).not.toContain(result.token);
  });

  test('valid_until is only ever extended, never shortened', async () => {
    const far = stubDb({ data: [{ id: 'p1' }], error: null });
    await rotateProposalToken(far.db, proposal({ valid_until: '2099-01-01' }), NOW);
    expect(far.patch().valid_until).toBe('2099-01-01');

    const near = stubDb({ data: [{ id: 'p1' }], error: null });
    await rotateProposalToken(near.db, proposal({ valid_until: '2020-01-01' }), NOW);
    expect(String(near.patch().valid_until) > '2026-09-07').toBe(true);
  });
});

describe('translateDbError covers 077 RAISE names', () => {
  test.each([
    ['invoice_not_billable_yet', /launch/i],
    ['invoice_not_found', /not found/i],
  ])('%s becomes an operator-readable sentence', (needle, shape) => {
    const message = translateDbError({ message: `error: ${needle}` }, 'fallback').message;
    expect(message).not.toContain(needle);
    expect(message).toMatch(shape);
  });

  test('an unmapped error keeps the caller fallback', () => {
    vi.spyOn(console, 'error').mockImplementation(() => {});
    expect(translateDbError({ message: 'something else' }, 'Failed to send the balance.').message)
      .toBe('Failed to send the balance.');
  });
});
