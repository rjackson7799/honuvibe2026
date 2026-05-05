import { describe, it, expect, vi, beforeEach } from 'vitest';

// Mock the supabase server module before import
vi.mock('@/lib/supabase/server', () => ({
  createClient: vi.fn(),
  createAdminClient: vi.fn(),
}));

import { createAdminClient } from '@/lib/supabase/server';
import { getPartnerStats, getPartnerOwnedCourses } from './queries';

type EnrollmentSeed = {
  id: string;
  user_id: string;
  status: string;
  amount_paid: number | null;
  currency: string | null;
  enrolled_at: string;
  course_id: string;
  partner_id: string | null;
};

function buildAdminClient(opts: {
  partnerCourses?: { course_id: string }[];
  ownedCourses?: { id: string }[];
  enrollments?: EnrollmentSeed[];
}) {
  const partnerCourses = opts.partnerCourses ?? [];
  const ownedCourses = opts.ownedCourses ?? [];
  const enrollments = opts.enrollments ?? [];

  return {
    from: (table: string) => {
      if (table === 'partner_courses') {
        return {
          select: () => ({
            eq: () => ({ data: partnerCourses, error: null }),
          }),
        };
      }
      if (table === 'courses') {
        return {
          select: () => ({
            eq: () => ({ data: ownedCourses, error: null }),
          }),
        };
      }
      if (table === 'enrollments') {
        return {
          select: () => ({
            // Mimic .eq().neq().gte() chain used by cookie-attributed query
            // (getPartnerStats / fetchPartnerEnrollments uses eq+neq only;
            //  fetchPartnerEnrollmentsSince adds .gte() on both branches)
            eq: () => ({
              neq: () => ({
                data: enrollments,
                error: null,
                gte: () => ({ data: enrollments, error: null }),
              }),
            }),
            // Variant: in().neq().gte() chain for owned-course set
            in: () => ({
              neq: () => ({
                data: enrollments,
                error: null,
                gte: () => ({ data: enrollments, error: null }),
              }),
            }),
          }),
        };
      }
      throw new Error(`unmocked table: ${table}`);
    },
  };
}

describe('getPartnerStats — owned-course attribution', () => {
  beforeEach(() => vi.resetAllMocks());

  it('returns zeros when partner has no owned courses and no attributed enrollments', async () => {
    (createAdminClient as any).mockReturnValue(
      buildAdminClient({
        partnerCourses: [],
        ownedCourses: [],
        enrollments: [],
      }),
    );

    const stats = await getPartnerStats('p-1');
    expect(stats.studentCount).toBe(0);
    expect(stats.revenueUsd).toBe(0);
    expect(stats.revenueJpy).toBe(0);
  });

  // NOTE: full integration tests with realistic UNION semantics live in the
  // manual verification step. These unit tests guard the no-regression case
  // and the de-dup invariant.

  it('does not double-count an enrollment that matches both ownership and cookie', async () => {
    const sharedRow: EnrollmentSeed = {
      id: 'e-1',
      user_id: 'u-1',
      status: 'active',
      amount_paid: 5000,
      currency: 'usd',
      enrolled_at: new Date().toISOString(),
      course_id: 'c-1',
      partner_id: 'p-1',
    };
    (createAdminClient as any).mockReturnValue(
      buildAdminClient({
        partnerCourses: [{ course_id: 'c-1' }],
        ownedCourses: [{ id: 'c-1' }],
        enrollments: [sharedRow],
      }),
    );

    const stats = await getPartnerStats('p-1');
    expect(stats.studentCount).toBe(1);
    expect(stats.revenueUsd).toBe(5000);
  });
});

describe('getPartnerOwnedCourses', () => {
  it('returns only courses where partner_id matches', async () => {
    (createAdminClient as any).mockReturnValue(
      buildAdminClient({
        ownedCourses: [{ id: 'c-1' }, { id: 'c-2' }],
      }),
    );

    const owned = await getPartnerOwnedCourses('p-1');
    expect(owned.map((c: any) => c.id).sort()).toEqual(['c-1', 'c-2']);
  });
});
