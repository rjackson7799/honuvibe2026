import { describe, expect, it } from 'vitest';
// Plain ESM script (allowJs); importing must not run main().
import { purgePrefix, reconcile } from '../../scripts/preview-images.mjs';

type Obj = { name: string; created_at: string };

// In-memory fake: storage bucket (list/remove) + preview_feedback table (.in('id')).
function fake(opts: { objects: Record<string, Obj[]>; rowIds?: string[] }) {
  const store = new Map<string, Obj[]>(Object.entries(opts.objects).map(([k, v]) => [k, [...v]]));
  const rowIds = new Set(opts.rowIds ?? []);
  const removeCalls: string[][] = [];
  const inCalls: string[][] = [];
  const bucket = {
    async list(prefix: string, o: { limit?: number; offset?: number } = {}) {
      const limit = o.limit ?? 100;
      const offset = o.offset ?? 0;
      if (!prefix) {
        const folders = [...store.keys()].map((name) => ({ name, id: null, created_at: null }));
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
      select: () => ({
        in: async (_col: string, ids: string[]) => {
          inCalls.push(ids);
          return { data: ids.filter((i) => rowIds.has(i)).map((id) => ({ id })), error: null };
        },
      }),
    }),
  };
  return { client, store, removeCalls, inCalls };
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
