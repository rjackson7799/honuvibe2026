import { beforeEach, describe, expect, it, vi } from 'vitest';

vi.mock('@/lib/supabase/server', () => ({
  createClient: vi.fn(),
  createAdminClient: vi.fn(),
}));

import { createClient } from '@/lib/supabase/server';
import { getWorkbenchSummary } from './queries';

type Result = { data: unknown; error: unknown };

/**
 * getWorkbenchSummary fires two reads in parallel: all of the caller's attempts
 * (scenario_id only), and the top featured/published scenario. Dispatch by table.
 */
function useClient(attempts: { scenario_id: string }[], featured: unknown) {
  const make = (result: Result, methods: string[]) => {
    const b: Record<string, unknown> = {
      then: (f: (v: unknown) => unknown) => Promise.resolve(f(result)),
    };
    for (const m of methods) b[m] = () => b;
    return b;
  };
  const client = {
    from: vi.fn((table: string) => {
      if (table === 'workbench_attempts') {
        return make({ data: attempts, error: null }, ['select']);
      }
      if (table === 'workbench_scenarios') {
        return make({ data: featured, error: null }, [
          'select', 'eq', 'order', 'limit', 'maybeSingle',
        ]);
      }
      throw new Error(`unmocked table: ${table}`);
    }),
  };
  (createClient as ReturnType<typeof vi.fn>).mockResolvedValue(client);
}

beforeEach(() => vi.resetAllMocks());

describe('getWorkbenchSummary', () => {
  it('counts DISTINCT scenarios, not raw attempts', async () => {
    useClient(
      [
        { scenario_id: 'a' },
        { scenario_id: 'a' }, // second attempt at the same scenario
        { scenario_id: 'b' },
      ],
      null,
    );
    const summary = await getWorkbenchSummary();
    expect(summary.scenariosPracticed).toBe(2);
  });

  it('surfaces a featured scenario for the empty state', async () => {
    useClient([], { slug: 'prompt-basics', title_en: 'Prompt Basics', title_jp: null });
    const summary = await getWorkbenchSummary();
    expect(summary).toEqual({
      scenariosPracticed: 0,
      featured: { slug: 'prompt-basics', title_en: 'Prompt Basics', title_jp: null },
    });
  });

  it('returns null featured when nothing is published', async () => {
    useClient([{ scenario_id: 'a' }], null);
    const summary = await getWorkbenchSummary();
    expect(summary).toEqual({ scenariosPracticed: 1, featured: null });
  });

  it('never exposes a score field', async () => {
    useClient([{ scenario_id: 'a' }], null);
    const summary = await getWorkbenchSummary();
    // A best score on the dashboard home is exactly what this tile omits.
    expect(Object.keys(summary)).toEqual(['scenariosPracticed', 'featured']);
  });
});
