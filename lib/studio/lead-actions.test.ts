import { beforeEach, describe, expect, it, vi } from 'vitest';

const { revalidatePathMock } = vi.hoisted(() => ({ revalidatePathMock: vi.fn() }));

vi.mock('next/cache', () => ({ revalidatePath: revalidatePathMock }));
vi.mock('@/lib/supabase/server', () => ({
  createClient: vi.fn(),
  createAdminClient: vi.fn(),
}));

import { createClient, createAdminClient } from '@/lib/supabase/server';
import { updateLead } from './lead-actions';

const LEAD_ID = '11111111-1111-4111-8111-111111111111';

type Call = [string, ...unknown[]];

/**
 * A chainable PostgREST stand-in. `engagement` controls what the
 * findEngagementForLead lookup on `engagements` resolves to; every write to
 * `leads` is captured in `updates` so the test can inspect the exact row that
 * reached .update().
 */
function useClients({
  engagement = null,
  updateError = null,
}: {
  engagement?: { id: string; stage: string } | null;
  updateError?: { message: string } | null;
} = {}) {
  const updates: Record<string, unknown>[] = [];

  const sessionClient = {
    auth: { getUser: vi.fn(async () => ({ data: { user: { id: 'admin-1' } } })) },
    from: vi.fn(() => {
      const builder: Record<string, unknown> = {
        then: (onFulfilled: (v: unknown) => unknown) =>
          Promise.resolve(onFulfilled({ data: { role: 'admin' }, error: null })),
      };
      for (const m of ['select', 'eq', 'maybeSingle']) builder[m] = () => builder;
      return builder;
    }),
  };

  const adminClient = {
    from: vi.fn((table: string) => {
      const calls: Call[] = [];
      const resolve = () => {
        if (table === 'engagements') {
          return { data: engagement ? { ...engagement, lead_id: LEAD_ID } : null, error: null };
        }
        const update = calls.find(([m]) => m === 'update');
        if (update) updates.push(update[1] as Record<string, unknown>);
        return { data: null, error: updateError };
      };
      const builder: Record<string, unknown> = {
        then: (onFulfilled: (v: unknown) => unknown) => Promise.resolve(onFulfilled(resolve())),
      };
      for (const m of ['select', 'eq', 'maybeSingle', 'update']) {
        builder[m] = (...args: unknown[]) => {
          calls.push([m, ...args]);
          return builder;
        };
      }
      return builder;
    }),
  };

  (createClient as ReturnType<typeof vi.fn>).mockResolvedValue(sessionClient);
  (createAdminClient as ReturnType<typeof vi.fn>).mockReturnValue(adminClient);
  return { updates, adminClient };
}

const base = {
  company: 'Hawaii Palms Café',
  full_name: 'Kai',
  email: 'kai@example.com',
  phone: '',
  industry: 'restaurant',
  existing_url: 'https://palms.example',
  notes: 'hi',
  preview_url: '',
  preview_password: '',
};

beforeEach(() => {
  vi.resetAllMocks();
});

describe('updateLead — status is engagement-derived once an engagement exists', () => {
  it('with status omitted, the row passed to .update() has NO sales_stage key (absent, not undefined)', async () => {
    const { updates, adminClient } = useClients();

    await updateLead(LEAD_ID, base);

    expect(updates).toHaveLength(1);
    const row = updates[0];
    expect('sales_stage' in row).toBe(false);
    expect(Object.keys(row)).not.toContain('sales_stage');
    // The rest of the alias→column translation still happens.
    expect(row).toMatchObject({ business_name: 'Hawaii Palms Café', name: 'Kai', notes: 'hi' });
    // No engagement lookup is needed when status is not being changed.
    expect(adminClient.from).not.toHaveBeenCalledWith('engagements');
    expect(revalidatePathMock).toHaveBeenCalledWith(`/admin/studio/leads/${LEAD_ID}`);
  });

  it('with status present and no engagement, sales_stage is emitted', async () => {
    const { updates } = useClients({ engagement: null });

    await updateLead(LEAD_ID, { ...base, status: 'qualified' });

    expect(updates).toHaveLength(1);
    expect(updates[0].sales_stage).toBe('qualified');
  });

  it('with a status that DIFFERS from the mirror and a live engagement, the save is refused and nothing is written', async () => {
    const { updates } = useClients({ engagement: { id: 'eng-1', stage: 'build' } });

    await expect(updateLead(LEAD_ID, { ...base, status: 'new' })).rejects.toThrow(
      /managed by its engagement/,
    );
    expect(updates).toHaveLength(0);
    expect(revalidatePathMock).not.toHaveBeenCalled();
  });

  it('with a status EQUAL to the mirrored value (a stale tab), the key is dropped and the save proceeds', async () => {
    const { updates } = useClients({ engagement: { id: 'eng-1', stage: 'build' } });

    await updateLead(LEAD_ID, { ...base, status: 'won', notes: 'from a stale tab' });

    expect(updates).toHaveLength(1);
    expect('sales_stage' in updates[0]).toBe(false);
    expect(updates[0].notes).toBe('from a stale tab');
  });

  it('maps the DB guard (the race where an engagement starts between lookup and write) to the friendly message', async () => {
    const { updates } = useClients({
      engagement: null,
      updateError: { message: 'lead_sales_stage_is_engagement_derived' },
    });

    await expect(updateLead(LEAD_ID, { ...base, status: 'new' })).rejects.toThrow(
      /managed by its engagement/,
    );
    expect(updates).toHaveLength(1);
    expect(revalidatePathMock).not.toHaveBeenCalled();
  });

  it('a lead with an engagement can still save its other fields when status is omitted', async () => {
    const { updates } = useClients({ engagement: { id: 'eng-1', stage: 'build' } });

    await updateLead(LEAD_ID, { ...base, notes: 'updated' });

    expect(updates).toHaveLength(1);
    expect('sales_stage' in updates[0]).toBe(false);
    expect(updates[0].notes).toBe('updated');
  });
});
