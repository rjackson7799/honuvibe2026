import { beforeEach, describe, expect, it, vi } from 'vitest';

// A recording PostgREST builder: every chained call is logged, and awaiting /
// maybeSingle() hands the call log to the per-test `resolver`.
type Call = [method: string, args: unknown[]];
type Query = { table: string; calls: Call[] };
type Result = { data?: unknown; error?: unknown; count?: number | null };

const { state } = vi.hoisted(() => ({
  state: {
    queries: [] as { table: string; calls: [string, unknown[]][] }[],
    resolver: (() => ({ data: null, error: null })) as (q: {
      table: string;
      calls: [string, unknown[]][];
    }) => { data?: unknown; error?: unknown; count?: number | null },
  },
}));

function builder(table: string) {
  const q: Query = { table, calls: [] };
  state.queries.push(q);
  const chain: Record<string, unknown> = {};
  for (const m of ['select', 'eq', 'in', 'order', 'range', 'limit']) {
    chain[m] = (...args: unknown[]) => {
      q.calls.push([m, args]);
      return chain;
    };
  }
  chain.maybeSingle = async () => {
    q.calls.push(['maybeSingle', []]);
    return state.resolver(q);
  };
  chain.then = (resolve: (v: Result) => unknown, reject?: (e: unknown) => unknown) =>
    Promise.resolve()
      .then(() => state.resolver(q))
      .then(resolve, reject);
  return chain;
}

vi.mock('@/lib/supabase/server', () => ({
  createClient: async () => ({ from: (t: string) => builder(t) }),
  createAdminClient: () => ({ from: (t: string) => builder(t) }),
}));

import { getPreviewSummaries, getPreviewWithFeedback } from '@/lib/previews/admin-queries';

const PREVIEW_ID = '7c9e6679-7425-40de-944b-e07fc1f90ae7';

const PREVIEW_ROW = {
  id: PREVIEW_ID,
  slug: 'okada-5a5c1a2742',
  title: 'Okada',
  mode: 'gated',
  created_at: '2026-10-01T00:00:00Z',
  expires_at: null,
  access_count: 12,
  last_accessed_at: '2026-10-20T03:04:05Z',
  feedback_enabled: true,
};

function method(q: Query, name: string): Call[] {
  return q.calls.filter(([m]) => m === name);
}

function isHead(q: Query): boolean {
  const sel = method(q, 'select')[0];
  const opts = sel?.[1][1] as { head?: boolean } | undefined;
  return q.table === 'preview_feedback' && opts?.head === true;
}

/** Head-count answer keyed by which status filter the query carries. */
function headCount(q: Query, counts: { total: number; new: number; open: number }) {
  if (method(q, 'in').length > 0) return { count: counts.open, error: null };
  if (method(q, 'eq').some(([, a]) => a[0] === 'status')) return { count: counts.new, error: null };
  return { count: counts.total, error: null };
}

function feedbackRow(n: number) {
  return {
    id: `00000000-0000-4000-8000-${String(n).padStart(12, '0')}`,
    created_at: '2026-10-21T00:00:00Z',
    page: '/index.html',
    reviewer_name: 'Aki',
    kind: 'bug',
    message: `note ${n}`,
    viewport_w: 390,
    viewport_h: 844,
    user_agent: 'UA',
    status: 'new',
  };
}

beforeEach(() => {
  state.queries.length = 0;
  state.resolver = () => ({ data: null, error: null });
});

describe('getPreviewSummaries', () => {
  it('counts come from head counts, not rows', async () => {
    state.resolver = (q) => {
      if (q.table === 'client_previews') return { data: [PREVIEW_ROW], error: null };
      if (isHead(q)) return headCount(q, { total: 1500, new: 40, open: 55 });
      throw new Error(`unexpected query on ${q.table}`);
    };

    const [summary] = await getPreviewSummaries();

    expect(summary.counts).toEqual({ total: 1500, new: 40, open: 55 });
    expect(summary).toMatchObject({
      id: PREVIEW_ID,
      slug: 'okada-5a5c1a2742',
      title: 'Okada',
      mode: 'gated',
      createdAt: '2026-10-01T00:00:00Z',
      expiresAt: null,
      accessCount: 12,
      lastAccessedAt: '2026-10-20T03:04:05Z',
      feedbackEnabled: true,
    });

    const feedbackQueries = state.queries.filter((q) => q.table === 'preview_feedback');
    expect(feedbackQueries).toHaveLength(3);
    for (const q of feedbackQueries) {
      expect(isHead(q)).toBe(true);
      expect(method(q, 'select')[0][1]).toEqual(['id', { count: 'exact', head: true }]);
      expect(method(q, 'eq')).toContainEqual(['eq', ['preview_id', PREVIEW_ID]]);
    }
    const open = feedbackQueries.find((q) => method(q, 'in').length > 0);
    expect(method(open!, 'in')[0][1]).toEqual(['status', ['new', 'planned']]);
  });

  it('lists newest first, capped at 200', async () => {
    state.resolver = (q) =>
      q.table === 'client_previews' ? { data: [], error: null } : { count: 0, error: null };

    await getPreviewSummaries();

    const list = state.queries.find((q) => q.table === 'client_previews')!;
    expect(method(list, 'order')[0][1]).toEqual(['created_at', { ascending: false }]);
    expect(method(list, 'range')[0][1]).toEqual([0, 199]);
  });

  it('throws when the preview read fails', async () => {
    state.resolver = () => ({ data: null, error: { message: 'boom' } });
    await expect(getPreviewSummaries()).rejects.toBeTruthy();
  });
});

describe('getPreviewWithFeedback', () => {
  it('getPreviewWithFeedback pages past 1000', async () => {
    const pages = [500, 500, 120];
    let served = 0;
    state.resolver = (q) => {
      if (q.table === 'client_previews') return { data: PREVIEW_ROW, error: null };
      if (isHead(q)) return headCount(q, { total: 1120, new: 1120, open: 1120 });
      const size = pages[served];
      const start = served * 500;
      served += 1;
      return {
        data: Array.from({ length: size }, (_, i) => feedbackRow(start + i)),
        error: null,
      };
    };

    const result = await getPreviewWithFeedback(PREVIEW_ID);

    expect(result).not.toBeNull();
    expect(result!.items).toHaveLength(1120);
    expect(result!.preview.counts.total).toBe(1120);

    const rowQueries = state.queries.filter((q) => q.table === 'preview_feedback' && !isHead(q));
    expect(rowQueries.map((q) => method(q, 'range')[0][1])).toEqual([
      [0, 499],
      [500, 999],
      [1000, 1499],
    ]);
    for (const q of rowQueries) {
      expect(method(q, 'eq')).toContainEqual(['eq', ['preview_id', PREVIEW_ID]]);
      expect(method(q, 'order').map(([, a]) => a[0])).toEqual(['created_at', 'id']);
    }

    expect(result!.items[0]).toEqual({
      id: '00000000-0000-4000-8000-000000000000',
      createdAt: '2026-10-21T00:00:00Z',
      page: '/index.html',
      reviewerName: 'Aki',
      kind: 'bug',
      message: 'note 0',
      viewportW: 390,
      viewportH: 844,
      userAgent: 'UA',
      status: 'new',
    });
  });

  it('returns null when the preview does not exist', async () => {
    state.resolver = () => ({ data: null, error: null });
    await expect(getPreviewWithFeedback(PREVIEW_ID)).resolves.toBeNull();
    expect(state.queries.filter((q) => q.table === 'preview_feedback')).toHaveLength(0);
  });
});

describe('column safety', () => {
  it('never selects password', async () => {
    state.resolver = (q) => {
      if (q.table === 'client_previews') {
        return method(q, 'maybeSingle').length > 0
          ? { data: PREVIEW_ROW, error: null }
          : { data: [PREVIEW_ROW], error: null };
      }
      if (isHead(q)) return { count: 0, error: null };
      return { data: [], error: null };
    };

    await getPreviewSummaries();
    const detail = await getPreviewWithFeedback(PREVIEW_ID);

    const selects = state.queries.flatMap((q) => method(q, 'select').map(([, a]) => a[0]));
    expect(selects.length).toBeGreaterThan(0);
    for (const cols of selects) {
      expect(typeof cols).toBe('string');
      expect(cols).not.toMatch(/password/);
      expect(cols).not.toBe('*');
      expect(cols).not.toMatch(/\*/);
    }
    expect(detail!.preview).not.toHaveProperty('password');
  });
});
