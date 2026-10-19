import { describe, it, expect } from 'vitest';
import {
  canReadCourseContent,
  hasActiveSeatAccess,
  hasCommunityAccess,
  hasVaultAccess,
  type CohortEnrollmentRow,
  type SeatGrantRow,
  type SubscriptionCheckUser,
} from '@/lib/access/checks';
import {
  ACCESS_CASES,
  COURSE_ACCESS_CASES,
  daysFrom,
  vaultStateFixture,
  type AccessCase,
} from '@/lib/access/parity-matrix';

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

describe('course access matrix (TypeScript side)', () => {
  // The SQL side lives in supabase/tests/course_material_access_rls.test.ts and
  // asserts the same expectations against can_read_course_materials() /
  // can_access_course_esl(). Cases with an enrollment on another course are
  // driven through hasCourseAccess in __tests__/lib/enrollments/course-access.test.ts.
  for (const c of COURSE_ACCESS_CASES) {
    it(`${c.id}: ${c.description}`, () => {
      const fixture = vaultStateFixture(c.vault, NOW);
      const hasVault = fixture
        ? hasVaultAccess(fixture.user, fixture.cohort, fixture.seats, NOW)
        : false;
      const enrolled =
        !c.enrollmentOnOtherCourse &&
        (c.enrollment === 'active' || c.enrollment === 'completed');
      expect(
        canReadCourseContent({
          enrolled,
          hasVault,
          course: { is_published: c.course.published, vault_included: c.course.vaultIncluded },
        }),
      ).toBe(c.expectCourse);
    });
  }

  it('has unique ids and at least 17 cases', () => {
    const ids = COURSE_ACCESS_CASES.map((c) => c.id);
    expect(new Set(ids).size).toBe(ids.length);
    expect(COURSE_ACCESS_CASES.length).toBeGreaterThanOrEqual(17);
  });

  it('anon has no fixture; every other state does', () => {
    expect(vaultStateFixture('anon', NOW)).toBeNull();
    expect(vaultStateFixture('none', NOW)).not.toBeNull();
  });
});

describe('canReadCourseContent', () => {
  const published = { is_published: true, vault_included: true };

  it('an enrollment reads any course, included or not', () => {
    expect(canReadCourseContent({ enrolled: true, hasVault: false, course: { is_published: true, vault_included: false } })).toBe(true);
  });

  it('Vault reads only a published, included course', () => {
    expect(canReadCourseContent({ enrolled: false, hasVault: true, course: published })).toBe(true);
    expect(canReadCourseContent({ enrolled: false, hasVault: true, course: { ...published, is_published: false } })).toBe(false);
    expect(canReadCourseContent({ enrolled: false, hasVault: true, course: { ...published, vault_included: false } })).toBe(false);
  });

  it('nothing reads nothing', () => {
    expect(canReadCourseContent({ enrolled: false, hasVault: false, course: published })).toBe(false);
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

describe('Honu Community is free (migration 078)', () => {
  const freeUser: SubscriptionCheckUser = {
    role: 'student',
    subscription_tier: 'free',
    subscription_status: null,
    subscription_expires_at: null,
  };

  it('a free account with nothing else gets Community but not Vault', () => {
    expect(hasCommunityAccess(freeUser)).toBe(true);
    expect(hasVaultAccess(freeUser)).toBe(false);
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
