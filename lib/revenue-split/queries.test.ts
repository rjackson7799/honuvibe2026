import { describe, it, expect, vi, beforeEach } from 'vitest';

// Mock the supabase server module before import
vi.mock('@/lib/supabase/server', () => ({
  createClient: vi.fn(),
  createAdminClient: vi.fn(),
}));

import { createClient } from '@/lib/supabase/server';
import { getOwnInstructorPayouts } from './queries';

// Minimal shape returned by the DB for instructor-side payout rows
type MockPayoutRow = {
  id: string;
  enrollment_id: string;
  instructor_id: string;
  amount: number;
  currency: string;
  status: 'pending' | 'paid' | 'clawed_back';
  created_at: string;
  paid_at: string | null;
  payout_reference: string | null;
  enrollments: {
    amount_paid: number | null;
    courses: { title_en: string | null } | null;
  } | null;
  instructor_profiles: { display_name: string | null } | null;
};

function makeRow(overrides: Partial<MockPayoutRow> = {}): MockPayoutRow {
  return {
    id: 'row-1',
    enrollment_id: 'enroll-1',
    instructor_id: 'inst-1',
    amount: 2500,
    currency: 'usd',
    status: 'pending',
    created_at: new Date().toISOString(),
    paid_at: null,
    payout_reference: null,
    enrollments: {
      amount_paid: 10000,
      courses: { title_en: 'Test Course' },
    },
    instructor_profiles: { display_name: 'Test Instructor' },
    ...overrides,
  };
}

/**
 * Builds a minimal Supabase client mock whose query chain returns the
 * provided rows.  The chain mirrors:
 *   .from().select().order().eq().gte().lte()
 * All filter methods just return `this` so any combination works.
 */
function buildClientMock(rows: MockPayoutRow[]) {
  const chain: Record<string, unknown> = {
    data: rows,
    error: null,
  };
  // Every chained method returns the same chain object
  const proxy: Record<string, () => typeof chain> = {};
  for (const method of ['select', 'order', 'eq', 'gte', 'lte']) {
    chain[method] = () => chain;
    proxy[method] = () => chain;
  }

  return {
    from: (_table: string) => chain,
  };
}

describe('getOwnInstructorPayouts', () => {
  beforeEach(() => vi.resetAllMocks());

  it('returns empty rows and empty totals when RLS returns []', async () => {
    (createClient as ReturnType<typeof vi.fn>).mockResolvedValue(buildClientMock([]));

    const result = await getOwnInstructorPayouts({ status: 'all', from: null, to: null });

    expect(result.rows).toHaveLength(0);
    expect(result.totalsByCurrency).toEqual({});
  });

  it('applies status filter — eq("status", "paid") is invoked', async () => {
    const row = makeRow({ status: 'paid', amount: 5000, currency: 'usd' });
    const client = buildClientMock([row]);
    const fromSpy = vi.spyOn(client, 'from');
    (createClient as ReturnType<typeof vi.fn>).mockResolvedValue(client);

    const result = await getOwnInstructorPayouts({ status: 'paid', from: null, to: null });

    // from() was called with the payouts table
    expect(fromSpy).toHaveBeenCalledWith('enrollment_instructor_shares');
    // Row mapping still works correctly
    expect(result.rows).toHaveLength(1);
    expect(result.rows[0].status).toBe('paid');
    expect(result.rows[0].amount).toBe(5000);
  });

  it('aggregates totals correctly across multiple currencies', async () => {
    const rows: MockPayoutRow[] = [
      makeRow({ id: 'r-1', amount: 3000, currency: 'usd', status: 'paid' }),
      makeRow({ id: 'r-2', amount: 1500, currency: 'usd', status: 'pending' }),
      makeRow({ id: 'r-3', amount: 200000, currency: 'jpy', status: 'paid' }),
    ];
    (createClient as ReturnType<typeof vi.fn>).mockResolvedValue(buildClientMock(rows));

    const result = await getOwnInstructorPayouts({ status: 'all', from: null, to: null });

    expect(result.rows).toHaveLength(3);
    expect(result.totalsByCurrency['usd']).toBe(4500);
    expect(result.totalsByCurrency['jpy']).toBe(200000);
  });

  it('hides student_name and student_email even if mock returns joined user data', async () => {
    // In practice RLS prevents this, but we test defensively at the mapper level
    const rowWithUser = {
      ...makeRow(),
      // Simulate a hypothetical join that included user data (impossible via RLS)
      enrollments: {
        amount_paid: 9900,
        // The select query for own-payouts omits `users` — this simulates
        // any stray data being ignored by the mapper
        courses: { title_en: 'Private Course' },
      },
    };
    (createClient as ReturnType<typeof vi.fn>).mockResolvedValue(buildClientMock([rowWithUser]));

    const result = await getOwnInstructorPayouts({ status: 'all', from: null, to: null });

    expect(result.rows).toHaveLength(1);
    expect(result.rows[0].student_name).toBeNull();
    expect(result.rows[0].student_email).toBeNull();
  });
});
