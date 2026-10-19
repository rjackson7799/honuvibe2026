import { beforeEach, describe, expect, it, vi } from 'vitest';

const { updates } = vi.hoisted(() => ({
  updates: [] as { table: string; payload: unknown }[],
}));

vi.mock('next/cache', () => ({ revalidatePath: vi.fn() }));

function chain(table: string, row: Record<string, unknown>) {
  const c: Record<string, (...args: unknown[]) => unknown> = {};
  c.select = () => c;
  c.eq = () => c;
  c.single = async () => ({ data: row, error: null });
  c.maybeSingle = async () => ({ data: row, error: null });
  c.update = (payload: unknown) => {
    updates.push({ table, payload });
    return c;
  };
  (c as unknown as PromiseLike<unknown>).then = ((resolve: (v: unknown) => unknown) =>
    resolve({ data: null, error: null })) as PromiseLike<unknown>['then'];
  return c;
}

vi.mock('@/lib/supabase/server', () => ({
  createClient: async () => ({
    auth: { getUser: async () => ({ data: { user: { id: 'admin-1' } } }) },
    from: (table: string) => chain(table, { role: 'admin' }),
  }),
  createAdminClient: () => ({
    from: (table: string) => chain(table, { id: 'c1', status: 'proposal' }),
  }),
}));

import { approveProposal } from '@/lib/instructor-portal/actions';

beforeEach(() => {
  updates.length = 0;
});

describe('approveProposal (B3 D3.5)', () => {
  it('approveProposal sets vault_included and is_published false', async () => {
    await approveProposal('c1');
    const courseUpdates = updates.filter((u) => u.table === 'courses');
    expect(courseUpdates).toHaveLength(1);
    expect(courseUpdates[0].payload).toEqual({
      status: 'draft',
      proposal_review_notes: null,
      vault_included: false,
      is_published: false,
    });
  });
});
