import { beforeEach, describe, expect, it, vi } from 'vitest';

const { calls, result } = vi.hoisted(() => ({
  calls: [] as [string, ...unknown[]][],
  result: { data: [] as unknown[] | null, error: null as unknown },
}));

vi.mock('next/cache', () => ({
  // Pass-through: the test exercises the query, not Next's cache.
  unstable_cache: (fn: () => unknown) => fn,
}));

vi.mock('@supabase/supabase-js', () => ({
  createClient: () => {
    const chain: Record<string, (...args: unknown[]) => unknown> = {};
    for (const m of ['from', 'select', 'eq', 'is', 'order']) {
      chain[m] = (...args: unknown[]) => {
        calls.push([m, ...args]);
        return chain;
      };
    }
    (chain as unknown as PromiseLike<unknown>).then = ((resolve: (v: unknown) => unknown) =>
      resolve(result)) as PromiseLike<unknown>['then'];
    return chain;
  },
}));

import { getPublicCatalog, PUBLIC_CATALOG_COLUMNS, sortByTrack } from '@/lib/vault/catalog';

beforeEach(() => {
  calls.length = 0;
  result.data = [];
  result.error = null;
});

describe('getPublicCatalog', () => {
  it('never selects url or embed_url (premium content can live there)', () => {
    const cols = PUBLIC_CATALOG_COLUMNS.split(',').map((c) => c.trim());
    expect(cols).not.toContain('url');
    expect(cols).not.toContain('embed_url');
    expect(cols).toContain('track');
  });

  it('reads published, HonuVibe-owned content_items with the explicit column list', async () => {
    await getPublicCatalog();
    expect(calls).toContainEqual(['from', 'content_items']);
    expect(calls).toContainEqual(['select', PUBLIC_CATALOG_COLUMNS]);
    expect(calls).toContainEqual(['eq', 'is_published', true]);
    expect(calls).toContainEqual(['is', 'partner_id', null]);
    expect(calls.filter((c) => c[0] === 'select')).toHaveLength(1);
  });

  it('orders by track in product order (not alphabetical), untracked last, keeping DB order within a track', async () => {
    result.data = [
      { slug: 'a', track: null },
      { slug: 'b', track: 'build_with_ai' },
      { slug: 'c', track: 'marketing_growth' },
      { slug: 'd', track: 'ai_essentials' },
      { slug: 'e', track: 'marketing_growth' },
    ];
    const out = (await getPublicCatalog()) as unknown as { slug: string }[];
    expect(out.map((r) => r.slug)).toEqual(['d', 'c', 'e', 'b', 'a']);
    expect(calls.find((c) => c[0] === 'order')).toEqual(['order', 'is_featured', { ascending: false }]);
    expect(sortByTrack([])).toEqual([]);
  });

  it('returns [] and logs on a query error', async () => {
    const spy = vi.spyOn(console, 'error').mockImplementation(() => {});
    result.data = null;
    result.error = { message: 'boom' };
    await expect(getPublicCatalog()).resolves.toEqual([]);
    expect(spy).toHaveBeenCalled();
    spy.mockRestore();
  });
});
