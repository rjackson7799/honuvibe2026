import { beforeEach, describe, expect, it, vi } from 'vitest';

const { calls, result, cacheCalls } = vi.hoisted(() => ({
  calls: [] as [string, ...unknown[]][],
  result: { data: [] as unknown[] | null, error: null as unknown },
  cacheCalls: [] as unknown[][],
}));

vi.mock('next/cache', () => ({
  // Pass-through: the test exercises the query, not Next's cache.
  unstable_cache: (fn: () => unknown, ...rest: unknown[]) => {
    cacheCalls.push(rest);
    return fn;
  },
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

import {
  COURSE_CATALOG_TAG,
  getPublicCourseCatalog,
  PUBLIC_COURSE_COLUMNS,
} from '@/lib/learn/public-courses';

beforeEach(() => {
  calls.length = 0;
  result.data = [];
  result.error = null;
});

describe('getPublicCourseCatalog', () => {
  it('reads course_catalog with the exact public columns', async () => {
    await getPublicCourseCatalog();
    expect(calls).toContainEqual(['from', 'course_catalog']);
    expect(calls).toContainEqual(['select', PUBLIC_COURSE_COLUMNS]);
    expect(PUBLIC_COURSE_COLUMNS.split(',').map((s) => s.trim())).toEqual([
      'id', 'slug', 'title_en', 'title_jp', 'description_en', 'description_jp', 'level',
      'language', 'total_weeks', 'thumbnail_url', 'price_usd', 'price_jpy', 'is_featured',
      'created_at', 'track', 'vault_included',
    ]);
    for (const banned of [
      'zoom_link',
      'community_link',
      'proposal_review_notes',
      'esl_settings_json',
      'instructor_revenue_share_pct',
      '*',
    ]) {
      expect(PUBLIC_COURSE_COLUMNS).not.toContain(banned);
    }
  });

  it('filters published, non-private, newest first', async () => {
    await getPublicCourseCatalog();
    expect(calls).toContainEqual(['eq', 'is_published', true]);
    expect(calls).toContainEqual(['eq', 'is_private', false]);
    expect(calls).toContainEqual(['order', 'created_at', { ascending: false }]);
  });

  it('returns [] and logs on error', async () => {
    const spy = vi.spyOn(console, 'error').mockImplementation(() => {});
    result.data = null;
    result.error = { message: 'x' };
    await expect(getPublicCourseCatalog()).resolves.toEqual([]);
    expect(spy).toHaveBeenCalledTimes(1);
    spy.mockRestore();
  });

  it('caches under the course-catalog tag for 600s', () => {
    expect(COURSE_CATALOG_TAG).toBe('course-catalog');
    expect(cacheCalls).toContainEqual([
      ['learn-public-courses'],
      { revalidate: 600, tags: ['course-catalog'] },
    ]);
  });
});
