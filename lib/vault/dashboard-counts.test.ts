import { beforeEach, describe, expect, it, vi } from 'vitest';

vi.mock('@/lib/supabase/server', () => ({
  createClient: vi.fn(),
  createAdminClient: vi.fn(),
}));

import { createClient } from '@/lib/supabase/server';
import { getVaultBookmarkCount, getVaultNewThisWeekCount } from './queries';

type Call = [string, ...unknown[]];

/**
 * Records the builder chain and resolves to a fixed { count, error }. These
 * helpers are count-only (head:true), so the test asserts the FILTERS sent —
 * the bookmark_type='bookmark' and is_published='true' guards the plan calls
 * load-bearing — rather than re-implementing PostgREST.
 */
function useClient({ count = 0, error = null as { message: string } | null } = {}) {
  const calls: Call[] = [];
  const builder: Record<string, unknown> = {
    then: (onFulfilled: (v: unknown) => unknown) =>
      Promise.resolve(onFulfilled({ count, error, data: null })),
  };
  for (const method of ['select', 'eq', 'gte']) {
    builder[method] = (...args: unknown[]) => {
      calls.push([method, ...args]);
      return builder;
    };
  }
  const client = { from: vi.fn((t: string) => { calls.push(['from', t]); return builder; }) };
  (createClient as ReturnType<typeof vi.fn>).mockResolvedValue(client);
  return { calls };
}

const has = (calls: Call[], c: Call) =>
  calls.some((x) => x.length === c.length && x.every((v, i) => v === c[i]));

beforeEach(() => {
  vi.resetAllMocks();
  vi.spyOn(console, 'error').mockImplementation(() => {});
});

describe('getVaultBookmarkCount', () => {
  it('counts only true bookmarks on published items', async () => {
    const { calls } = useClient({ count: 4 });
    await expect(getVaultBookmarkCount('user-1')).resolves.toBe(4);

    expect(has(calls, ['from', 'vault_bookmarks'])).toBe(true);
    expect(has(calls, ['eq', 'user_id', 'user-1'])).toBe(true);
    // Overloaded column: watch_later / completed must not inflate "saved".
    expect(has(calls, ['eq', 'bookmark_type', 'bookmark'])).toBe(true);
    // An unpublished item's bookmark must not count.
    expect(has(calls, ['eq', 'content_items.is_published', true])).toBe(true);
  });

  it('returns null on error, never throwing (the hero hides an unknown count)', async () => {
    useClient({ error: { message: 'boom' } });
    // null, not 0: a failed read must not look like a real "0 saved" in the hero.
    await expect(getVaultBookmarkCount('user-1')).resolves.toBeNull();
  });

  it('returns a real 0 when the user genuinely has no bookmarks', async () => {
    useClient({ count: 0 });
    await expect(getVaultBookmarkCount('user-1')).resolves.toBe(0);
  });
});

describe('getVaultNewThisWeekCount', () => {
  const now = new Date('2026-07-15T22:00:00Z'); // Wed; Hawaii week starts Mon 07-13 10:00Z

  it('counts published items since the Hawaii week start', async () => {
    const { calls } = useClient({ count: 3 });
    await expect(getVaultNewThisWeekCount(now)).resolves.toBe(3);

    expect(has(calls, ['from', 'content_items'])).toBe(true);
    expect(has(calls, ['eq', 'is_published', true])).toBe(true);
    // Same boundary as the hero's "lessons done this week": Monday 10:00Z.
    expect(has(calls, ['gte', 'created_at', '2026-07-13T10:00:00.000Z'])).toBe(true);
  });

  it('returns null on error', async () => {
    useClient({ error: { message: 'boom' } });
    await expect(getVaultNewThisWeekCount(now)).resolves.toBeNull();
  });
});
