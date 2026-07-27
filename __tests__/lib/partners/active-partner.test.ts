import { describe, it, expect, vi, beforeEach } from 'vitest';
import type { SupabaseClient } from '@supabase/supabase-js';
import { getActivePartnerContext } from '@/lib/partners/active-partner';

type ChainCall = { method: string; args: unknown[] };

/**
 * Recording chain fake. Every builder method records and returns itself;
 * `maybeSingle` terminates with the configured response. Same copy-forward
 * convention as __tests__/api/prospects.test.ts.
 */
function makeClient(response: unknown, opts: { throwOn?: string } = {}) {
  const calls: ChainCall[] = [];
  const tables: string[] = [];

  const chain: Record<string, unknown> = {};
  const record = (method: string) => (...args: unknown[]) => {
    calls.push({ method, args });
    if (opts.throwOn === method) throw new Error('boom');
    if (method === 'maybeSingle') return Promise.resolve(response);
    return chain;
  };
  for (const m of ['select', 'eq', 'limit', 'order', 'maybeSingle']) {
    chain[m] = record(m);
  }

  const client = {
    from: (table: string) => {
      tables.push(table);
      if (opts.throwOn === 'from') throw new Error('boom');
      return chain;
    },
  } as unknown as SupabaseClient;

  const argsFor = (method: string) => calls.filter((c) => c.method === method).map((c) => c.args);
  return { client, calls, tables, argsFor };
}

const PARTNER = {
  id: 'p-1',
  slug: 'vertice-society',
  name_en: 'Vertice Society',
  name_jp: 'ヴェルティス・ソサエティ',
  logo_url: null,
  primary_color: '#1a2b33',
  secondary_color: '#0fa9a0',
  is_active: true,
};

beforeEach(() => {
  vi.spyOn(console, 'error').mockImplementation(() => {});
  vi.spyOn(console, 'warn').mockImplementation(() => {});
});

describe('getActivePartnerContext — query contract', () => {
  it('queries partner_members with the membership and partner filters', async () => {
    const { client, tables, argsFor } = makeClient({
      data: { partner_id: 'p-1', partners: PARTNER },
      error: null,
    });

    await getActivePartnerContext(client, 'u-1', 'en');

    expect(tables).toEqual(['partner_members']);
    expect(argsFor('eq')).toEqual([
      ['user_id', 'u-1'],
      ['status', 'active'],
      ['partners.is_active', true],
    ]);
    expect(argsFor('limit')).toEqual([[1]]);
    expect(argsFor('maybeSingle')).toHaveLength(1);
  });

  it('selects is_active so the contingency path needs no shape change', async () => {
    const { client, argsFor } = makeClient({
      data: { partner_id: 'p-1', partners: PARTNER },
      error: null,
    });

    await getActivePartnerContext(client, 'u-1', 'en');

    const selected = String(argsFor('select')[0][0]);
    expect(selected).toContain('is_active');
    expect(selected).toContain('partners!inner');
  });

  it('selects only the columns the contract lists', async () => {
    const { client, argsFor } = makeClient({
      data: { partner_id: 'p-1', partners: PARTNER },
      error: null,
    });

    await getActivePartnerContext(client, 'u-1', 'en');

    const selected = String(argsFor('select')[0][0]);
    for (const forbidden of ['is_public', 'revenue_share_pct', 'contact_email']) {
      expect(selected).not.toContain(forbidden);
    }
  });
});

describe('getActivePartnerContext — result shapes', () => {
  it('parses an embedded partner returned as an OBJECT', async () => {
    const { client } = makeClient({
      data: { partner_id: 'p-1', partners: PARTNER },
      error: null,
    });
    const ctx = await getActivePartnerContext(client, 'u-1', 'en');
    expect(ctx?.partnerId).toBe('p-1');
    expect(ctx?.name).toBe('Vertice Society');
  });

  it('parses an embedded partner returned as a single-element ARRAY', async () => {
    const { client } = makeClient({
      data: { partner_id: 'p-1', partners: [PARTNER] },
      error: null,
    });
    const ctx = await getActivePartnerContext(client, 'u-1', 'en');
    expect(ctx?.partnerId).toBe('p-1');
    expect(ctx?.slug).toBe('vertice-society');
  });

  it('returns null when there is no membership row', async () => {
    const { client } = makeClient({ data: null, error: null });
    expect(await getActivePartnerContext(client, 'u-1', 'en')).toBeNull();
  });

  it('returns null when the embed is absent (partner filtered by RLS)', async () => {
    const { client } = makeClient({ data: { partner_id: 'p-1', partners: null }, error: null });
    expect(await getActivePartnerContext(client, 'u-1', 'en')).toBeNull();
  });

  it('returns null for an inactive partner even if the embedded filter did not apply', async () => {
    // The TypeScript contingency: same shape, is_active checked in code.
    const { client } = makeClient({
      data: { partner_id: 'p-1', partners: { ...PARTNER, is_active: false } },
      error: null,
    });
    expect(await getActivePartnerContext(client, 'u-1', 'en')).toBeNull();
  });

  it('returns null on an error response and logs the message only', async () => {
    const { client } = makeClient({ data: null, error: { message: 'db exploded' } });
    expect(await getActivePartnerContext(client, 'u-1', 'en')).toBeNull();

    const logged = (console.error as unknown as { mock: { calls: unknown[][] } }).mock.calls
      .flat()
      .join(' ');
    expect(logged).toContain('db exploded');
    expect(logged).not.toContain('vertice-society');
    expect(logged).not.toContain('u-1');
  });

  it('returns null (not a rejected promise) when the client THROWS', async () => {
    const { client } = makeClient(null, { throwOn: 'from' });
    await expect(getActivePartnerContext(client, 'u-1', 'en')).resolves.toBeNull();
  });

  it('returns null when a mid-chain builder call throws', async () => {
    const { client } = makeClient(null, { throwOn: 'eq' });
    await expect(getActivePartnerContext(client, 'u-1', 'en')).resolves.toBeNull();
  });
});

describe('getActivePartnerContext — locale and branding', () => {
  it('picks name_jp on /ja', async () => {
    const { client } = makeClient({
      data: { partner_id: 'p-1', partners: PARTNER },
      error: null,
    });
    const ctx = await getActivePartnerContext(client, 'u-1', 'ja');
    expect(ctx?.name).toBe('ヴェルティス・ソサエティ');
  });

  it('falls back to name_en on /ja when name_jp is null', async () => {
    const { client } = makeClient({
      data: { partner_id: 'p-1', partners: { ...PARTNER, name_jp: null } },
      error: null,
    });
    const ctx = await getActivePartnerContext(client, 'u-1', 'ja');
    expect(ctx?.name).toBe('Vertice Society');
  });

  it('keeps a dark accent that is safe on the learn-zone surfaces', async () => {
    const { client } = makeClient({
      data: { partner_id: 'p-1', partners: PARTNER },
      error: null,
    });
    const ctx = await getActivePartnerContext(client, 'u-1', 'en');
    // #1a2b33 is ~14:1 on white and would be rejected by the dark-card guard.
    expect(ctx?.accent).toBe('#1a2b33');
  });

  it('nulls an accent that fails the contrast bar', async () => {
    const { client } = makeClient({
      data: { partner_id: 'p-1', partners: { ...PARTNER, primary_color: '#fffffe' } },
      error: null,
    });
    const ctx = await getActivePartnerContext(client, 'u-1', 'en');
    expect(ctx?.accent).toBeNull();
  });

  it('nulls an unparseable accent', async () => {
    const { client } = makeClient({
      data: { partner_id: 'p-1', partners: { ...PARTNER, primary_color: 'not-a-color' } },
      error: null,
    });
    const ctx = await getActivePartnerContext(client, 'u-1', 'en');
    expect(ctx?.accent).toBeNull();
  });

  it('keeps a renderable https logo', async () => {
    const url = 'https://project.supabase.co/storage/v1/object/public/logos/x.png';
    const { client } = makeClient({
      data: { partner_id: 'p-1', partners: { ...PARTNER, logo_url: url } },
      error: null,
    });
    const ctx = await getActivePartnerContext(client, 'u-1', 'en');
    expect(ctx?.logoUrl).toBe(url);
  });

  it('nulls a root-relative logo so the caller degrades to the monogram (D12)', async () => {
    const { client } = makeClient({
      data: { partner_id: 'p-1', partners: { ...PARTNER, logo_url: '/logo.svg' } },
      error: null,
    });
    const ctx = await getActivePartnerContext(client, 'u-1', 'en');
    expect(ctx?.logoUrl).toBeNull();
  });

  it('nulls an off-pattern logo on an allowed host', async () => {
    const { client } = makeClient({
      data: {
        partner_id: 'p-1',
        partners: { ...PARTNER, logo_url: 'https://project.supabase.co/not-storage/x.png' },
      },
      error: null,
    });
    const ctx = await getActivePartnerContext(client, 'u-1', 'en');
    expect(ctx?.logoUrl).toBeNull();
  });

  it('caps the decorative wash alpha at 6%', async () => {
    const { client } = makeClient({
      data: { partner_id: 'p-1', partners: PARTNER },
      error: null,
    });
    const ctx = await getActivePartnerContext(client, 'u-1', 'en');
    expect(ctx?.accentWash).toBe('rgba(15, 169, 160, 0.06)');
  });

  it('falls back through secondary then primary when secondary_color is absent', async () => {
    const { client } = makeClient({
      data: { partner_id: 'p-1', partners: { ...PARTNER, secondary_color: null } },
      error: null,
    });
    const ctx = await getActivePartnerContext(client, 'u-1', 'en');
    expect(ctx?.accentWash).toBe('rgba(26, 43, 51, 0.06)');
  });
});
