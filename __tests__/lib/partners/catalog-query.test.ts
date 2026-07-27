import { describe, it, expect, vi, beforeEach } from 'vitest';
import type { SupabaseClient } from '@supabase/supabase-js';
import { getPartnerCatalog } from '@/lib/partners/catalog';

type ChainCall = { method: string; args: unknown[] };
type Outcome =
  | { kind: 'rows'; rows: unknown[] }
  | { kind: 'error'; message: string }
  | { kind: 'throw' };

/**
 * Thenable recording builder — the catalog awaits the query object directly
 * (no terminal method), so the fake must resolve through `then`.
 */
function makeQuery(outcome: Outcome) {
  const calls: ChainCall[] = [];
  const chain: Record<string, unknown> = {};

  for (const m of ['select', 'eq', 'order', 'limit']) {
    chain[m] = (...args: unknown[]) => {
      calls.push({ method: m, args });
      return chain;
    };
  }
  chain.then = (onFulfilled: unknown, onRejected: unknown) => {
    const settled =
      outcome.kind === 'throw'
        ? Promise.reject(new Error('boom'))
        : Promise.resolve(
            outcome.kind === 'error'
              ? { data: null, error: { message: outcome.message } }
              : { data: outcome.rows, error: null },
          );
    return settled.then(
      onFulfilled as (v: unknown) => unknown,
      onRejected as (e: unknown) => unknown,
    );
  };

  return {
    chain,
    calls,
    argsFor: (m: string) => calls.filter((c) => c.method === m).map((c) => c.args),
  };
}

function makeClient(featured: Outcome, owned: Outcome) {
  const featuredQ = makeQuery(featured);
  const ownedQ = makeQuery(owned);
  const client = {
    from: (table: string) => {
      if (table === 'partner_courses') return featuredQ.chain;
      if (table === 'courses') return ownedQ.chain;
      throw new Error(`Unexpected table: ${table}`);
    },
  } as unknown as SupabaseClient;
  return { client, featuredQ, ownedQ };
}

const courseRow = (id: string) => ({
  id,
  slug: `slug-${id}`,
  title_en: `Course ${id}`,
  title_jp: null,
  description_en: null,
  description_jp: null,
  thumbnail_url: null,
  level: null,
  total_weeks: null,
  language: 'en',
});

const featuredRows = (ids: string[]) =>
  ids.map((id, i) => ({ display_order: i, courses: courseRow(id) }));

beforeEach(() => {
  vi.spyOn(console, 'error').mockImplementation(() => {});
  vi.spyOn(console, 'warn').mockImplementation(() => {});
});

describe('getPartnerCatalog — SQL contract', () => {
  it('filters is_published on BOTH sources', async () => {
    const { client, featuredQ, ownedQ } = makeClient(
      { kind: 'rows', rows: [] },
      { kind: 'rows', rows: [] },
    );
    await getPartnerCatalog(client, 'p-1', 'en');

    expect(featuredQ.argsFor('eq')).toContainEqual(['courses.is_published', true]);
    expect(ownedQ.argsFor('eq')).toContainEqual(['is_published', true]);
  });

  it('scopes both sources to the partner', async () => {
    const { client, featuredQ, ownedQ } = makeClient(
      { kind: 'rows', rows: [] },
      { kind: 'rows', rows: [] },
    );
    await getPartnerCatalog(client, 'p-1', 'en');

    expect(featuredQ.argsFor('eq')).toContainEqual(['partner_id', 'p-1']);
    expect(ownedQ.argsFor('eq')).toContainEqual(['partner_id', 'p-1']);
  });

  it('uses an !inner embed so an unpublished course excludes its parent row', async () => {
    const { client, featuredQ } = makeClient(
      { kind: 'rows', rows: [] },
      { kind: 'rows', rows: [] },
    );
    await getPartnerCatalog(client, 'p-1', 'en');

    expect(String(featuredQ.argsFor('select')[0][0])).toContain('courses:course_id!inner');
  });

  it('does NOT filter is_private (D6)', async () => {
    const { client, featuredQ, ownedQ } = makeClient(
      { kind: 'rows', rows: [] },
      { kind: 'rows', rows: [] },
    );
    await getPartnerCatalog(client, 'p-1', 'en');

    const allEq = [...featuredQ.argsFor('eq'), ...ownedQ.argsFor('eq')].flat();
    expect(allEq).not.toContain('is_private');
  });

  it('orders featured by display_order (nulls last) then course_id', async () => {
    const { client, featuredQ } = makeClient(
      { kind: 'rows', rows: [] },
      { kind: 'rows', rows: [] },
    );
    await getPartnerCatalog(client, 'p-1', 'en');

    expect(featuredQ.argsFor('order')).toEqual([
      ['display_order', { ascending: true, nullsFirst: false }],
      ['course_id', { ascending: true }],
    ]);
  });

  it('orders owned by title_en then id', async () => {
    const { client, ownedQ } = makeClient(
      { kind: 'rows', rows: [] },
      { kind: 'rows', rows: [] },
    );
    await getPartnerCatalog(client, 'p-1', 'en');

    expect(ownedQ.argsFor('order')).toEqual([
      ['title_en', { ascending: true }],
      ['id', { ascending: true }],
    ]);
  });

  it('limits each source to 51', async () => {
    const { client, featuredQ, ownedQ } = makeClient(
      { kind: 'rows', rows: [] },
      { kind: 'rows', rows: [] },
    );
    await getPartnerCatalog(client, 'p-1', 'en');

    expect(featuredQ.argsFor('limit')).toEqual([[51]]);
    expect(ownedQ.argsFor('limit')).toEqual([[51]]);
  });
});

describe('getPartnerCatalog — partial failure semantics', () => {
  it('returns ok when both sources succeed', async () => {
    const { client } = makeClient(
      { kind: 'rows', rows: featuredRows(['a']) },
      { kind: 'rows', rows: [courseRow('b')] },
    );
    const result = await getPartnerCatalog(client, 'p-1', 'en');
    expect(result.status).toBe('ok');
    expect(result.items).toHaveLength(2);
  });

  it('returns ok with zero items when both succeed and the partner has no courses', async () => {
    const { client } = makeClient({ kind: 'rows', rows: [] }, { kind: 'rows', rows: [] });
    const result = await getPartnerCatalog(client, 'p-1', 'en');
    expect(result.status).toBe('ok');
    expect(result.items).toEqual([]);
  });

  it('returns partial when the featured source errors', async () => {
    const { client } = makeClient(
      { kind: 'error', message: 'featured down' },
      { kind: 'rows', rows: [courseRow('b')] },
    );
    const result = await getPartnerCatalog(client, 'p-1', 'en');
    expect(result.status).toBe('partial');
    expect(result.items).toHaveLength(1);
  });

  it('returns partial when the owned source THROWS', async () => {
    const { client } = makeClient(
      { kind: 'rows', rows: featuredRows(['a']) },
      { kind: 'throw' },
    );
    const result = await getPartnerCatalog(client, 'p-1', 'en');
    expect(result.status).toBe('partial');
    expect(result.items).toHaveLength(1);
  });

  it('returns partial — NOT ok — when one source fails and the survivor has zero rows', async () => {
    // The easy bug: checking items.length before status renders coming-soon copy
    // over an operational failure.
    const { client } = makeClient(
      { kind: 'error', message: 'featured down' },
      { kind: 'rows', rows: [] },
    );
    const result = await getPartnerCatalog(client, 'p-1', 'en');
    expect(result.status).toBe('partial');
    expect(result.items).toEqual([]);
  });

  it('returns error with no rows when both sources fail', async () => {
    const { client } = makeClient(
      { kind: 'error', message: 'a' },
      { kind: 'throw' },
    );
    const result = await getPartnerCatalog(client, 'p-1', 'en');
    expect(result.status).toBe('error');
    expect(result.items).toEqual([]);
  });
});

describe('getPartnerCatalog — merge, truncation and logging', () => {
  it('dedupes a course present in both sources', async () => {
    const { client } = makeClient(
      { kind: 'rows', rows: featuredRows(['dup']) },
      { kind: 'rows', rows: [courseRow('dup'), courseRow('other')] },
    );
    const result = await getPartnerCatalog(client, 'p-1', 'en');
    expect(result.items.map((i) => i.course.id)).toEqual(['dup', 'other']);
  });

  it('drops a featured row whose embed is null', async () => {
    const { client } = makeClient(
      { kind: 'rows', rows: [{ display_order: 0, courses: null }] },
      { kind: 'rows', rows: [] },
    );
    const result = await getPartnerCatalog(client, 'p-1', 'en');
    expect(result.items).toEqual([]);
    expect(result.status).toBe('ok');
  });

  it('parses a featured embed returned as an array', async () => {
    const { client } = makeClient(
      { kind: 'rows', rows: [{ display_order: 3, courses: [courseRow('a')] }] },
      { kind: 'rows', rows: [] },
    );
    const result = await getPartnerCatalog(client, 'p-1', 'en');
    expect(result.items[0].course.id).toBe('a');
    expect(result.items[0].displayOrder).toBe(3);
  });

  it('reports truncated:false at exactly 50 unique courses', async () => {
    const rows = Array.from({ length: 50 }, (_, i) => courseRow(`c${String(i).padStart(3, '0')}`));
    const { client } = makeClient({ kind: 'rows', rows: [] }, { kind: 'rows', rows });
    const result = await getPartnerCatalog(client, 'p-1', 'en');
    expect(result.items).toHaveLength(50);
    expect(result).toMatchObject({ truncated: false });
    expect(console.warn).not.toHaveBeenCalled();
  });

  it('reports truncated:true at 51 and logs partner id + returned counts, never the slug', async () => {
    const rows = Array.from({ length: 51 }, (_, i) => courseRow(`c${String(i).padStart(3, '0')}`));
    const { client } = makeClient({ kind: 'rows', rows: [] }, { kind: 'rows', rows });
    const result = await getPartnerCatalog(client, 'p-1', 'en');

    expect(result.items).toHaveLength(50);
    expect(result).toMatchObject({ truncated: true });

    const logged = (console.warn as unknown as { mock: { calls: unknown[][] } }).mock.calls
      .flat()
      .join(' ');
    expect(logged).toContain('p-1');
    expect(logged).toContain('ownedReturned=51');
    expect(logged).not.toContain('vertice-society');
    expect(logged).not.toContain('slug-');
  });

  it('leaves every item unknown until the page enriches it', async () => {
    const { client } = makeClient(
      { kind: 'rows', rows: featuredRows(['a']) },
      { kind: 'rows', rows: [] },
    );
    const result = await getPartnerCatalog(client, 'p-1', 'en');
    expect(result.items[0].enrollment).toEqual({ state: 'unknown' });
  });
});
