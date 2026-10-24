import { describe, expect, it } from 'vitest';
// Plain ESM script (allowJs); importing must not run main().
import { purgePrefix, reconcile } from '../../scripts/preview-images.mjs';

type Obj = { name: string; created_at: string; updated_at?: string };

// In-memory fake: storage bucket (list/remove) + preview_feedback table (.in('id')).
// `rowIds` are rows whose image_path points at <PREVIEW>/<id>.jpg; `rows` sets
// image_path explicitly (null = a note without a screenshot).
function fake(opts: {
  objects: Record<string, Obj[]>;
  rowIds?: string[];
  rows?: { id: string; image_path: string | null }[];
  rootFiles?: string[];
  listError?: (prefix: string) => boolean;
  lookup?: () => { data: unknown; error: unknown };
}) {
  const store = new Map<string, Obj[]>(Object.entries(opts.objects).map(([k, v]) => [k, [...v]]));
  const rows = new Map<string, string | null>([
    ...(opts.rowIds ?? []).map((id): [string, string | null] => [id, `${PREVIEW}/${id}.jpg`]),
    ...(opts.rows ?? []).map((r): [string, string | null] => [r.id, r.image_path]),
  ]);
  const removeCalls: string[][] = [];
  const inCalls: string[][] = [];
  const selectCols: string[] = [];
  const bucket = {
    async list(prefix: string, o: { limit?: number; offset?: number } = {}) {
      const limit = o.limit ?? 100;
      const offset = o.offset ?? 0;
      if (opts.listError?.(prefix ?? '')) return { data: null, error: { message: 'list boom' } };
      if (!prefix) {
        const folders = [
          ...[...store.keys()].map((name) => ({ name, id: null, created_at: null })),
          ...(opts.rootFiles ?? []).map((name) => ({ name, id: 'root', created_at: old })),
        ];
        return { data: folders.slice(offset, offset + limit), error: null };
      }
      const list = (store.get(prefix) ?? []).slice().sort((a, b) => a.name.localeCompare(b.name));
      return {
        data: list.slice(offset, offset + limit).map((x) => ({ ...x, id: 'obj' })),
        error: null,
      };
    },
    async remove(paths: string[]) {
      removeCalls.push(paths);
      for (const p of paths) {
        const [folder, ...rest] = p.split('/');
        const name = rest.join('/');
        const cur = store.get(folder);
        if (cur) store.set(folder, cur.filter((o) => o.name !== name));
      }
      return { data: paths.map((name) => ({ name })), error: null };
    },
  };
  const client = {
    storage: { from: () => bucket },
    from: () => ({
      select: (cols: string) => {
        selectCols.push(cols);
        return {
          in: async (_col: string, ids: string[]) => {
            inCalls.push(ids);
            if (opts.lookup) return opts.lookup();
            return {
              data: ids.filter((i) => rows.has(i)).map((id) => ({ id, image_path: rows.get(id) ?? null })),
              error: null,
            };
          },
        };
      },
    }),
  };
  return { client, store, removeCalls, inCalls, selectCols };
}

const uuid = (n: number) => `00000000-0000-4000-8000-${String(n).padStart(12, '0')}`;
const PREVIEW = '11111111-1111-4111-8111-111111111111';
const now = Date.parse('2026-10-23T12:00:00Z');
const old = new Date(now - 48 * 3600_000).toISOString();
const fresh = new Date(now - 3600_000).toISOString();

function pair(n: number, created: string): Obj[] {
  return [
    { name: `${uuid(n)}.jpg`, created_at: created },
    { name: `${uuid(n)}.thumb.jpg`, created_at: created },
  ];
}

describe('purgePrefix', () => {
  it('removes more than 100 objects in batches of <= 100, and a second run removes 0', async () => {
    const objs = Array.from({ length: 125 }, (_, i) => pair(i, old)).flat(); // 250
    const f = fake({ objects: { [PREVIEW]: objs } });

    const first = await purgePrefix(f.client, PREVIEW);
    expect(first.removed).toBe(250);
    expect(f.store.get(PREVIEW)).toHaveLength(0);
    expect(f.removeCalls.every((c) => c.length <= 100)).toBe(true);
    expect(f.removeCalls.flat().every((p) => p.startsWith(`${PREVIEW}/`))).toBe(true);

    const second = await purgePrefix(f.client, PREVIEW);
    expect(second.removed).toBe(0);
  });

  it('leaves other prefixes alone', async () => {
    const other = '22222222-2222-4222-8222-222222222222';
    const f = fake({ objects: { [PREVIEW]: pair(1, old), [other]: pair(2, old) } });
    await purgePrefix(f.client, PREVIEW);
    expect(f.store.get(other)).toHaveLength(2);
  });
});

describe('reconcile', () => {
  it('removes only old orphans; keeps rows and fresh orphans', async () => {
    const f = fake({
      objects: {
        [PREVIEW]: [
          ...pair(1, old), // has a row -> keep
          ...pair(2, old), // old orphan -> remove
          ...pair(3, fresh), // fresh orphan -> keep
          { name: 'stray.txt', created_at: old }, // unparseable -> ignored
        ],
      },
      rowIds: [uuid(1)],
    });

    const r = await reconcile(f.client, { graceHours: 24, now });

    expect(r.removed).toBe(2);
    expect(f.removeCalls.flat().sort()).toEqual(
      [`${PREVIEW}/${uuid(2)}.jpg`, `${PREVIEW}/${uuid(2)}.thumb.jpg`].sort(),
    );
    const left = f.store.get(PREVIEW)!.map((o) => o.name);
    expect(left).toContain(`${uuid(1)}.jpg`);
    expect(left).toContain(`${uuid(3)}.thumb.jpg`);
    expect(left).toContain('stray.txt');
    expect(r.ignored).toBe(1);
  });

  it('grace 0 treats fresh orphans as removable', async () => {
    const f = fake({ objects: { [PREVIEW]: pair(3, fresh) } });
    const r = await reconcile(f.client, { graceHours: 0, now });
    expect(r.removed).toBe(2);
  });

  it('handles > 100 objects and ids, batching lookups and removals <= 100', async () => {
    const objs = Array.from({ length: 130 }, (_, i) => pair(i, old)).flat(); // 260 objects
    const keep = Array.from({ length: 30 }, (_, i) => uuid(i)); // first 30 ids have rows
    const f = fake({ objects: { [PREVIEW]: objs }, rowIds: keep });

    const r = await reconcile(f.client, { graceHours: 24, now });

    expect(r.removed).toBe(200); // 100 orphan ids x 2 objects
    expect(f.store.get(PREVIEW)).toHaveLength(60);
    expect(f.removeCalls.every((c) => c.length <= 100)).toBe(true);
    expect(f.inCalls.every((c) => c.length <= 100)).toBe(true);

    const again = await reconcile(f.client, { graceHours: 24, now });
    expect(again.removed).toBe(0);
  });
});

describe('reconcile hardening', () => {
  it('ages by the later of created_at and updated_at (a re-upload is fresh)', async () => {
    const f = fake({
      objects: {
        [PREVIEW]: [
          { name: `${uuid(1)}.jpg`, created_at: old, updated_at: fresh },
          { name: `${uuid(1)}.thumb.jpg`, created_at: old, updated_at: fresh },
          ...pair(2, old).map((o) => ({ ...o, updated_at: old })),
        ],
      },
    });
    const r = await reconcile(f.client, { graceHours: 24, now });
    expect(r.removed).toBe(2);
    expect(f.removeCalls.flat().every((p) => p.includes(uuid(2)))).toBe(true);
  });

  it('keeps objects it cannot date', async () => {
    const f = fake({ objects: { [PREVIEW]: [{ name: `${uuid(1)}.jpg`, created_at: 'garbage' }] } });
    const r = await reconcile(f.client, { graceHours: 0, now });
    expect(r.removed).toBe(0);
  });

  it('a row lookup error removes nothing and throws', async () => {
    const f = fake({
      objects: { [PREVIEW]: pair(1, old) },
      lookup: () => ({ data: null, error: { message: 'db down' } }),
    });
    await expect(reconcile(f.client, { graceHours: 0, now })).rejects.toThrow(/row lookup failed/);
    expect(f.removeCalls).toHaveLength(0);
  });

  it('a null lookup result without an error also removes nothing and throws', async () => {
    const f = fake({
      objects: { [PREVIEW]: pair(1, old) },
      lookup: () => ({ data: null, error: null }),
    });
    await expect(reconcile(f.client, { graceHours: 0, now })).rejects.toThrow(/row lookup failed/);
    expect(f.removeCalls).toHaveLength(0);
  });

  it('a list error during reconcile removes nothing and throws', async () => {
    const f = fake({ objects: { [PREVIEW]: pair(1, old) }, listError: (p) => p === PREVIEW });
    await expect(reconcile(f.client, { graceHours: 0, now })).rejects.toThrow(/list failed/);
    expect(f.removeCalls).toHaveLength(0);
  });

  it('pages more than 100 top-level folders', async () => {
    const objects: Record<string, Obj[]> = {};
    for (let i = 0; i < 130; i++) objects[uuid(1000 + i)] = pair(i, old);
    const f = fake({ objects });
    const r = await reconcile(f.client, { graceHours: 0, now });
    expect(r.scanned).toBe(260);
    expect(r.removed).toBe(260);
  });

  it('keeps an object whose mixed-case uuid matches a lowercase row id', async () => {
    const upper = uuid(1).replace(/[0-9a-f]/g, (c) => c.toUpperCase());
    const f = fake({
      objects: { [PREVIEW]: [{ name: `${upper}.jpg`, created_at: old }, { name: `${upper}.thumb.jpg`, created_at: old }] },
      rowIds: [uuid(1)],
    });
    const r = await reconcile(f.client, { graceHours: 0, now });
    expect(r.removed).toBe(0);
    expect(r.kept).toBe(2);
  });

  it('counts root-level objects as ignored and never removes them', async () => {
    const f = fake({ objects: {}, rootFiles: ['stray.jpg', `${uuid(5)}.jpg`] });
    const r = await reconcile(f.client, { graceHours: 0, now });
    expect(r.ignored).toBe(2);
    expect(r.scanned).toBe(2);
    expect(r.removed).toBe(0);
    expect(f.removeCalls).toHaveLength(0);
  });
});

describe('reconcile matches image_path (M1)', () => {
  it('an old object whose row has image_path NULL is an orphan (a removed screenshot does not linger)', async () => {
    const f = fake({ objects: { [PREVIEW]: pair(1, old) }, rows: [{ id: uuid(1), image_path: null }] });
    const r = await reconcile(f.client, { graceHours: 24, now });
    expect(r.removed).toBe(2);
    expect(f.removeCalls.flat().sort()).toEqual([`${PREVIEW}/${uuid(1)}.jpg`, `${PREVIEW}/${uuid(1)}.thumb.jpg`].sort());
    expect(f.selectCols).toEqual(['id, image_path']);
  });

  it('an old object whose row points at a different path is an orphan', async () => {
    const other = '22222222-2222-4222-8222-222222222222';
    const f = fake({
      objects: { [PREVIEW]: pair(1, old) },
      rows: [{ id: uuid(1), image_path: `${other}/${uuid(1)}.jpg` }],
    });
    const r = await reconcile(f.client, { graceHours: 24, now });
    expect(r.removed).toBe(2);
  });

  it('keeps the full image and its thumb when the row points at the full image', async () => {
    const f = fake({
      objects: { [PREVIEW]: pair(1, old) },
      rows: [{ id: uuid(1), image_path: `${PREVIEW}/${uuid(1)}.jpg` }],
    });
    const r = await reconcile(f.client, { graceHours: 24, now });
    expect(r.removed).toBe(0);
    expect(r.kept).toBe(2);
    expect(f.removeCalls).toHaveLength(0);
  });

  it('a fresh object whose row has image_path NULL is kept (grace still applies)', async () => {
    const f = fake({ objects: { [PREVIEW]: pair(1, fresh) }, rows: [{ id: uuid(1), image_path: null }] });
    const r = await reconcile(f.client, { graceHours: 24, now });
    expect(r.removed).toBe(0);
  });
});

describe('purgePrefix failures', () => {
  it('a list error removes nothing and throws', async () => {
    const f = fake({ objects: { [PREVIEW]: pair(1, old) }, listError: () => true });
    await expect(purgePrefix(f.client, PREVIEW)).rejects.toThrow(/list failed/);
    expect(f.removeCalls).toHaveLength(0);
  });
});
