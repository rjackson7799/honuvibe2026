import { describe, it, expect } from 'vitest';
import {
  hasActiveSeatAccess,
  hasCommunityAccess,
  hasVaultAccess,
  type CohortEnrollmentRow,
  type SeatGrantRow,
  type SubscriptionCheckUser,
} from '@/lib/access/checks';
import { ACCESS_CASES, daysFrom, type AccessCase } from '@/lib/access/parity-matrix';

const NOW = new Date('2026-07-24T12:00:00.000Z');

function userFor(c: AccessCase): SubscriptionCheckUser {
  return {
    role: c.user.role,
    subscription_tier: c.user.subscription_tier,
    subscription_status: c.user.subscription_status,
    subscription_expires_at:
      c.user.subscriptionExpiresInDays === null
        ? null
        : daysFrom(NOW, c.user.subscriptionExpiresInDays).toISOString(),
  };
}

function cohortsFor(c: AccessCase): CohortEnrollmentRow[] {
  if (!c.cohort) return [];
  return [
    {
      bundle_access_starts_at: daysFrom(NOW, c.cohort.startDays).toISOString(),
      bundle_access_ends_at: daysFrom(NOW, c.cohort.endDays).toISOString(),
    },
  ];
}

function seatsFor(c: AccessCase): SeatGrantRow[] {
  if (!c.seat) return [];
  return [
    {
      access_starts_at: daysFrom(NOW, c.seat.startDays).toISOString(),
      access_ends_at: daysFrom(NOW, c.seat.endDays).toISOString(),
      revoked_at: c.seat.revoked ? daysFrom(NOW, -1).toISOString() : null,
      block_is_active: c.seat.blockActive,
    },
  ];
}

describe('entitlement parity matrix (TypeScript side)', () => {
  // The SQL side of this matrix lives in
  // supabase/tests/partner_entitlement_parity.test.ts and asserts the same
  // expectations against has_vault_access() / has_community_access().
  for (const c of ACCESS_CASES) {
    it(`${c.id}: ${c.description}`, () => {
      const user = userFor(c);
      expect(hasVaultAccess(user, cohortsFor(c), seatsFor(c), NOW)).toBe(c.expectVault);
      expect(
        hasCommunityAccess(user, cohortsFor(c), c.membership === 'active', NOW),
      ).toBe(c.expectCommunity);
    });
  }

  it('covers every membership state and seat state at least once', () => {
    const memberships = new Set(ACCESS_CASES.map((c) => c.membership));
    expect(memberships).toEqual(new Set(['none', 'active', 'removed']));
    expect(ACCESS_CASES.some((c) => c.seat?.revoked)).toBe(true);
    expect(ACCESS_CASES.some((c) => c.seat && !c.seat.blockActive)).toBe(true);
    expect(ACCESS_CASES.some((c) => c.seat && c.seat.startDays > 0)).toBe(true);
  });
});

describe('hasActiveSeatAccess window boundaries', () => {
  const base = (over: Partial<SeatGrantRow> = {}): SeatGrantRow => ({
    access_starts_at: '2026-07-01T00:00:00.000Z',
    access_ends_at: '2026-08-01T00:00:00.000Z',
    revoked_at: null,
    block_is_active: true,
    ...over,
  });

  it('is inclusive at the start instant', () => {
    expect(hasActiveSeatAccess([base()], new Date('2026-07-01T00:00:00.000Z'))).toBe(true);
  });

  it('is EXCLUSIVE at the end instant — access stops the moment it ends', () => {
    expect(hasActiveSeatAccess([base()], new Date('2026-08-01T00:00:00.000Z'))).toBe(false);
    expect(
      hasActiveSeatAccess([base()], new Date('2026-07-31T23:59:59.999Z')),
    ).toBe(true);
  });

  it('ignores revoked grants and inactive blocks', () => {
    const now = new Date('2026-07-15T00:00:00.000Z');
    expect(hasActiveSeatAccess([base({ revoked_at: '2026-07-10T00:00:00Z' })], now)).toBe(false);
    expect(hasActiveSeatAccess([base({ block_is_active: false })], now)).toBe(false);
  });

  it('any one qualifying grant is enough', () => {
    const now = new Date('2026-07-15T00:00:00.000Z');
    expect(
      hasActiveSeatAccess([base({ block_is_active: false }), base()], now),
    ).toBe(true);
  });
});

describe('hasCommunityAccess membership input', () => {
  const freeUser: SubscriptionCheckUser = {
    role: 'student',
    subscription_tier: 'free',
    subscription_status: null,
    subscription_expires_at: null,
  };

  it('defaults to false so existing callers keep their old behaviour', () => {
    expect(hasCommunityAccess(freeUser)).toBe(false);
  });

  it('grants access on active membership alone (SQL has done this since 042)', () => {
    expect(hasCommunityAccess(freeUser, [], true)).toBe(true);
  });
});

describe('hasVaultAccess seat argument', () => {
  const freeUser: SubscriptionCheckUser = {
    role: 'student',
    subscription_tier: 'free',
    subscription_status: null,
    subscription_expires_at: null,
  };

  it('defaults to no seats', () => {
    expect(hasVaultAccess(freeUser)).toBe(false);
  });
});
