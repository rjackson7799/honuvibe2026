import { beforeEach, describe, expect, it, vi } from 'vitest';
import { NextRequest } from 'next/server';

// Prospect Finder route tests (Studio, phase 4). Harness copied from
// studio-lead-audit.test.ts: keep NextResponse/NextRequest real, replace
// after() with a recorder. The admin prospects-table mock is a recording
// chainable proxy classified by call shape (upsert / stale-flip / claim /
// CAS score-write / read / patch-write) so the two-pass search contract and
// the run.ts CAS fence are asserted against the REAL orchestrator.

type ChainCall = { method: string; args: unknown[] };
type ChainKind = 'upsert' | 'flip' | 'claim' | 'scoreWrite' | 'read' | 'patchWrite' | 'unknown';

const {
  getUserMock,
  userRoleMock,
  searchPlacesMock,
  scoreProspectWebsiteMock,
  getProspectsMock,
  getScoringCountMock,
  rpcMock,
  afterCbs,
  chains,
  results,
} = vi.hoisted(() => ({
  getUserMock: vi.fn(),
  userRoleMock: vi.fn(),
  searchPlacesMock: vi.fn(),
  scoreProspectWebsiteMock: vi.fn(),
  getProspectsMock: vi.fn(),
  getScoringCountMock: vi.fn(),
  rpcMock: vi.fn(),
  afterCbs: [] as Array<() => unknown>,
  chains: [] as Array<{ kind: string; calls: { method: string; args: unknown[] }[] }>,
  results: {
    upsert: vi.fn(),
    flip: vi.fn(),
    claim: vi.fn(),
    scoreWrite: vi.fn(),
    read: vi.fn(),
    patchWrite: vi.fn(),
  },
}));

function classify(calls: ChainCall[]): ChainKind {
  const methods = calls.map((c) => c.method);
  if (methods[0] === 'upsert') return 'upsert';
  if (methods[0] === 'select') return 'read';
  if (methods[0] === 'update') {
    if (methods.includes('lt')) return 'flip';
    if (methods.includes('in')) return 'claim';
    const eqCols = calls.filter((c) => c.method === 'eq').map((c) => c.args[0]);
    if (methods.includes('is') || eqCols.includes('website')) return 'scoreWrite';
    return 'patchWrite';
  }
  return 'unknown';
}

// A thenable recording builder: every method call chains; awaiting resolves via
// the classified result fn.
function prospectsBuilder() {
  const calls: ChainCall[] = [];
  const proxy: Record<string | symbol, unknown> = new Proxy(
    {},
    {
      get(_t, prop: string | symbol) {
        if (prop === 'then') {
          const kind = classify(calls);
          chains.push({ kind, calls });
          const p = Promise.resolve(results[kind as keyof typeof results]?.(calls));
          return p.then.bind(p);
        }
        return (...args: unknown[]) => {
          calls.push({ method: String(prop), args });
          return proxy;
        };
      },
    },
  );
  return proxy;
}

vi.mock('next/server', async (importOriginal) => {
  const actual = await importOriginal<typeof import('next/server')>();
  return { ...actual, after: (cb: () => unknown) => afterCbs.push(cb) };
});

vi.mock('@/lib/supabase/server', () => ({
  createClient: async () => ({
    auth: { getUser: getUserMock },
    from: (table: string) => {
      if (table === 'users') {
        return { select: () => ({ eq: () => ({ single: userRoleMock }) }) };
      }
      throw new Error(`Unexpected user-client table: ${table}`);
    },
  }),
  createAdminClient: () => ({
    from: (table: string) => {
      if (table === 'prospects') return prospectsBuilder();
      throw new Error(`Unexpected admin table: ${table}`);
    },
    rpc: rpcMock,
  }),
}));

// Keep the real PlacesError class so `instanceof` in the route works.
vi.mock('@/lib/studio/prospecting/places', async (importOriginal) => {
  const actual = await importOriginal<typeof import('@/lib/studio/prospecting/places')>();
  return { ...actual, searchPlaces: searchPlacesMock };
});

// run.ts stays REAL (the CAS fence under test); only the scorer is mocked.
vi.mock('@/lib/studio/prospecting/score', () => ({
  scoreProspectWebsite: scoreProspectWebsiteMock,
  SCORE_FAILED: 40, // run.ts's stale flip imports it
}));

vi.mock('@/lib/admin/queries', () => ({
  getProspects: getProspectsMock,
  getScoringCount: getScoringCountMock,
}));

import { PlacesError } from '@/lib/studio/prospecting/places';
import { POST as SEARCH } from '@/app/api/admin/prospects/search/route';
import { GET as LIST } from '@/app/api/admin/prospects/route';
import { POST as CONVERT } from '@/app/api/admin/prospects/[id]/convert/route';
import { PATCH } from '@/app/api/admin/prospects/[id]/route';

const UUID = '22222222-2222-2222-2222-222222222222';
const LEAD_UUID = '33333333-3333-3333-3333-333333333333';

function searchReq(body: unknown) {
  return new NextRequest('http://localhost/api/admin/prospects/search', {
    method: 'POST',
    body: JSON.stringify(body),
    headers: { 'Content-Type': 'application/json' },
  });
}
function listReq(params = '') {
  return new NextRequest(`http://localhost/api/admin/prospects${params}`);
}
function idCtx(id: string) {
  return { params: Promise.resolve({ id }) };
}
function convertReq(id: string) {
  return new NextRequest(`http://localhost/api/admin/prospects/${id}/convert`, { method: 'POST' });
}
function patchReq(id: string, body: unknown) {
  return new NextRequest(`http://localhost/api/admin/prospects/${id}`, {
    method: 'PATCH',
    body: JSON.stringify(body),
    headers: { 'Content-Type': 'application/json' },
  });
}

function chainsOf(kind: ChainKind) {
  return chains.filter((c) => c.kind === kind);
}
function callArgs(chain: { calls: ChainCall[] }, method: string) {
  return chain.calls.filter((c) => c.method === method).map((c) => c.args);
}

const PLACE_A = {
  placeId: 'pl-a',
  name: 'Acme Plumbing',
  website: 'acme.example', // scheme-less on purpose — upsert must pre-normalize
  phone: '555-0100',
  address: '1 Main St',
  rating: 4.2,
  reviewCount: 31,
};
const PLACE_B = {
  placeId: 'pl-b',
  name: 'No Site Drains',
  website: null,
  phone: null,
  address: null,
  rating: null,
  reviewCount: null,
};

beforeEach(() => {
  vi.clearAllMocks();
  afterCbs.length = 0;
  chains.length = 0;
  vi.spyOn(console, 'error').mockImplementation(() => {});
  vi.spyOn(console, 'log').mockImplementation(() => {});
  // Authenticated admin by default.
  getUserMock.mockResolvedValue({ data: { user: { id: 'admin-1' } } });
  userRoleMock.mockResolvedValue({ data: { role: 'admin' } });
  // Happy-path admin table defaults.
  results.upsert.mockReturnValue({ error: null });
  results.flip.mockReturnValue({ error: null });
  results.claim.mockReturnValue({
    data: [{ id: 'row-a', website: 'https://acme.example/' }],
    error: null,
  });
  results.scoreWrite.mockReturnValue({ data: [{ id: 'row-a' }], error: null });
  results.read.mockReturnValue({ data: null, error: null });
  results.patchWrite.mockReturnValue({ data: [{ id: UUID }], error: null });
  searchPlacesMock.mockResolvedValue([PLACE_A, PLACE_B]);
  scoreProspectWebsiteMock.mockResolvedValue({
    status: 'scored',
    score: 48,
    breakdown: [{ id: 'no_viewport', label: 'Not mobile-friendly', points: 18 }],
    tech: { cms: null, generator: null, socialAsWebsite: false },
  });
  getProspectsMock.mockResolvedValue([]);
  getScoringCountMock.mockResolvedValue(0);
});

describe('POST /api/admin/prospects/search', () => {
  it('401s a signed-out request', async () => {
    getUserMock.mockResolvedValue({ data: { user: null } });
    const res = await SEARCH(searchReq({ industry: 'plumber', location: 'Honolulu' }));
    expect(res.status).toBe(401);
  });

  it('403s a non-admin', async () => {
    userRoleMock.mockResolvedValue({ data: { role: 'student' } });
    const res = await SEARCH(searchReq({ industry: 'plumber', location: 'Honolulu' }));
    expect(res.status).toBe(403);
  });

  it('400s a missing industry or location', async () => {
    expect((await SEARCH(searchReq({ industry: 'plumber' }))).status).toBe(400);
    expect((await SEARCH(searchReq({ location: 'Honolulu' }))).status).toBe(400);
    expect((await SEARCH(searchReq({ industry: '  ', location: 'x' }))).status).toBe(400);
  });

  it('503s with a clear message when the Places key is missing', async () => {
    searchPlacesMock.mockRejectedValue(new PlacesError('no key', 'NO_KEY'));
    const res = await SEARCH(searchReq({ industry: 'plumber', location: 'Honolulu' }));
    expect(res.status).toBe(503);
    expect(((await res.json()) as { error: string }).error).toContain('GOOGLE_PLACES_API_KEY');
  });

  it('502s another Places failure', async () => {
    searchPlacesMock.mockRejectedValue(new PlacesError('Places API returned 500', 'API_ERROR'));
    const res = await SEARCH(searchReq({ industry: 'plumber', location: 'Honolulu' }));
    expect(res.status).toBe(502);
  });

  it('returns 200 { found: 0 } on zero results with no DB writes', async () => {
    searchPlacesMock.mockResolvedValue([]);
    const res = await SEARCH(searchReq({ industry: 'plumber', location: 'Honolulu' }));
    expect(res.status).toBe(200);
    expect(await res.json()).toEqual({ found: 0 });
    expect(chains).toHaveLength(0);
    expect(afterCbs).toHaveLength(0);
  });

  it('500s an upsert failure and does NOT schedule after()', async () => {
    results.upsert.mockReturnValue({ error: { message: 'boom' } });
    const res = await SEARCH(searchReq({ industry: 'plumber', location: 'Honolulu' }));
    expect(res.status).toBe(500);
    expect(((await res.json()) as { error: string }).error).toContain('saving prospects failed');
    expect(afterCbs).toHaveLength(0);
    expect(chainsOf('claim')).toHaveLength(0);
  });

  it('happy path: upsert WITHOUT status, flip before claim, claim excludes terminal statuses, 202', async () => {
    const res = await SEARCH(searchReq({ industry: 'plumber', location: 'Honolulu' }));
    expect(res.status).toBe(202);
    expect(await res.json()).toEqual({ found: 2, scoring: 1 });

    // Upsert payload: Places-refresh columns only — no status/scoring_started_at,
    // scheme-less website pre-normalized.
    const upserts = chainsOf('upsert');
    expect(upserts).toHaveLength(1);
    const [rows, opts] = upserts[0].calls[0].args as [Record<string, unknown>[], unknown];
    expect(opts).toEqual({ onConflict: 'place_id' });
    expect(rows).toHaveLength(2);
    for (const row of rows) {
      expect(row).not.toHaveProperty('status');
      expect(row).not.toHaveProperty('scoring_started_at');
    }
    expect(rows[0]).toMatchObject({
      place_id: 'pl-a',
      website: 'https://acme.example/',
      industry: 'plumber',
      location: 'Honolulu',
      search_query: 'plumber in Honolulu',
    });
    expect(rows[1]).toMatchObject({ place_id: 'pl-b', website: null });

    // Stale flip runs before the claim.
    const kinds = chains.map((c) => c.kind);
    expect(kinds.indexOf('flip')).toBeGreaterThan(kinds.indexOf('upsert'));
    expect(kinds.indexOf('claim')).toBeGreaterThan(kinds.indexOf('flip'));

    // Claim: this search's place_ids, excluding converted/dismissed/scoring.
    const claim = chainsOf('claim')[0];
    expect(callArgs(claim, 'in')[0]).toEqual(['place_id', ['pl-a', 'pl-b']]);
    expect(callArgs(claim, 'not')[0]).toEqual(['status', 'in', '(converted,dismissed,scoring)']);
    const claimPayload = claim.calls[0].args[0] as Record<string, unknown>;
    expect(claimPayload).toMatchObject({ status: 'scoring', score: null, scored_at: null });
    expect(claimPayload.scoring_started_at).toBeTruthy();

    // Background job scheduled but not run.
    expect(afterCbs).toHaveLength(1);
    expect(scoreProspectWebsiteMock).not.toHaveBeenCalled();
  });

  it('a claim that returns no rows (all converted/dismissed/already scoring) skips after()', async () => {
    results.claim.mockReturnValue({ data: [], error: null });
    const res = await SEARCH(searchReq({ industry: 'plumber', location: 'Honolulu' }));
    expect(res.status).toBe(202);
    expect(await res.json()).toEqual({ found: 2, scoring: 0 });
    expect(afterCbs).toHaveLength(0);
  });

  it('the scorer CAS fence discards a mid-flight-refreshed row: no retry-write', async () => {
    const res = await SEARCH(searchReq({ industry: 'plumber', location: 'Honolulu' }));
    expect(res.status).toBe(202);

    // Simulate an overlapping search re-upserting a different website while this
    // batch scored: the CAS UPDATE matches 0 rows.
    results.scoreWrite.mockReturnValue({ data: [], error: null });
    await afterCbs[0]();

    expect(scoreProspectWebsiteMock).toHaveBeenCalledWith('https://acme.example/', expect.any(Number));
    const writes = chainsOf('scoreWrite');
    expect(writes).toHaveLength(1); // exactly one attempt — discarded, never retried
    expect(console.log).toHaveBeenCalledWith(expect.stringContaining('fenced=1'));
  });

  it('the score write is CAS-fenced on status AND the claimed website snapshot', async () => {
    await SEARCH(searchReq({ industry: 'plumber', location: 'Honolulu' }));
    await afterCbs[0]();

    const write = chainsOf('scoreWrite')[0];
    const eqs = callArgs(write, 'eq');
    expect(eqs).toContainEqual(['id', 'row-a']);
    expect(eqs).toContainEqual(['status', 'scoring']);
    expect(eqs).toContainEqual(['website', 'https://acme.example/']);
    expect(console.log).toHaveBeenCalledWith(expect.stringContaining('scored=1'));
  });

  it('a null claimed website is fenced with .is, not .eq', async () => {
    results.claim.mockReturnValue({ data: [{ id: 'row-b', website: null }], error: null });
    scoreProspectWebsiteMock.mockResolvedValue({
      status: 'no_website',
      score: 95,
      breakdown: [{ id: 'no_website', label: 'No website at all', points: 95 }],
      tech: { cms: null, generator: null, socialAsWebsite: false },
    });
    await SEARCH(searchReq({ industry: 'plumber', location: 'Honolulu' }));
    await afterCbs[0]();

    const write = chainsOf('scoreWrite')[0];
    expect(callArgs(write, 'is')[0]).toEqual(['website', null]);
    expect(callArgs(write, 'eq').map((a) => a[0])).not.toContain('website');
  });
});

describe('GET /api/admin/prospects', () => {
  it('401s a signed-out request', async () => {
    getUserMock.mockResolvedValue({ data: { user: null } });
    const res = await LIST(listReq());
    expect(res.status).toBe(401);
  });

  it('400s an unknown status param', async () => {
    const res = await LIST(listReq('?status=bogus'));
    expect(res.status).toBe(400);
    expect(getProspectsMock).not.toHaveBeenCalled();
  });

  it('passes filters through and flips stale scoring rows first', async () => {
    getProspectsMock.mockResolvedValue([{ id: 'p1' }]);
    const res = await LIST(listReq('?status=scored&q=acme'));
    expect(res.status).toBe(200);
    expect(getProspectsMock).toHaveBeenCalledWith({ status: 'scored', search: 'acme' });
    const flips = chainsOf('flip');
    expect(flips).toHaveLength(1);
    const flipPayload = flips[0].calls[0].args[0] as Record<string, unknown>;
    expect(flipPayload).toMatchObject({ status: 'score_failed', score: 40, score_breakdown: null });
    expect(callArgs(flips[0], 'eq')[0]).toEqual(['status', 'scoring']);
  });

  it('returns scoringCount computed unfiltered even when the filter excludes scoring', async () => {
    getScoringCountMock.mockResolvedValue(3);
    const res = await LIST(listReq('?status=scored'));
    const body = (await res.json()) as { prospects: unknown[]; scoringCount: number };
    expect(body.scoringCount).toBe(3);
    expect(getScoringCountMock).toHaveBeenCalledWith(); // no filter args — unfiltered by design
  });

  it('500s (never []) on a query error', async () => {
    getProspectsMock.mockRejectedValue(new Error('rls denied'));
    const res = await LIST(listReq());
    expect(res.status).toBe(500);
  });
});

describe('POST /api/admin/prospects/[id]/convert', () => {
  it('400s a bad UUID', async () => {
    const res = await CONVERT(convertReq('nope'), idCtx('nope'));
    expect(res.status).toBe(400);
    expect(rpcMock).not.toHaveBeenCalled();
  });

  it('404s prospect_not_found from the RPC', async () => {
    rpcMock.mockResolvedValue({ data: null, error: { message: 'prospect_not_found' } });
    const res = await CONVERT(convertReq(UUID), idCtx(UUID));
    expect(res.status).toBe(404);
  });

  it('500s another RPC error', async () => {
    rpcMock.mockResolvedValue({ data: null, error: { message: 'deadlock' } });
    const res = await CONVERT(convertReq(UUID), idCtx(UUID));
    expect(res.status).toBe(500);
  });

  it('converts: passes the id, returns { leadId, existing: false }', async () => {
    rpcMock.mockResolvedValue({
      data: [{ lead_id: LEAD_UUID, already_converted: false }],
      error: null,
    });
    const res = await CONVERT(convertReq(UUID), idCtx(UUID));
    expect(res.status).toBe(200);
    expect(await res.json()).toEqual({ leadId: LEAD_UUID, existing: false });
    expect(rpcMock).toHaveBeenCalledWith('convert_prospect', { p_prospect_id: UUID });
  });

  it('passes already_converted through as existing: true (idempotent double-click)', async () => {
    rpcMock.mockResolvedValue({
      data: [{ lead_id: LEAD_UUID, already_converted: true }],
      error: null,
    });
    const res = await CONVERT(convertReq(UUID), idCtx(UUID));
    expect(await res.json()).toEqual({ leadId: LEAD_UUID, existing: true });
  });
});

describe('PATCH /api/admin/prospects/[id]', () => {
  it('400s an unknown action', async () => {
    const res = await PATCH(patchReq(UUID, { action: 'promote' }), idCtx(UUID));
    expect(res.status).toBe(400);
  });

  it('404s a missing prospect', async () => {
    results.read.mockReturnValue({ data: null, error: null });
    const res = await PATCH(patchReq(UUID, { action: 'dismiss' }), idCtx(UUID));
    expect(res.status).toBe(404);
  });

  it('409s a dismiss on a converted prospect (converted is final)', async () => {
    results.read.mockReturnValue({
      data: { id: UUID, status: 'converted', dismissed_from: null },
      error: null,
    });
    const res = await PATCH(patchReq(UUID, { action: 'dismiss' }), idCtx(UUID));
    expect(res.status).toBe(409);
    expect(chainsOf('patchWrite')).toHaveLength(0);
  });

  it('dismiss stores dismissed_from and fences on the read status', async () => {
    results.read.mockReturnValue({
      data: { id: UUID, status: 'scored', dismissed_from: null },
      error: null,
    });
    const res = await PATCH(patchReq(UUID, { action: 'dismiss' }), idCtx(UUID));
    expect(res.status).toBe(200);
    expect(await res.json()).toEqual({ ok: true });

    const write = chainsOf('patchWrite')[0];
    expect(write.calls[0].args[0]).toEqual({ status: 'dismissed', dismissed_from: 'scored' });
    expect(callArgs(write, 'eq')).toContainEqual(['status', 'scored']); // the fence
  });

  it('dismiss of a scoring row stores dismissed_from=new (no phantom in-flight restore)', async () => {
    results.read.mockReturnValue({
      data: { id: UUID, status: 'scoring', dismissed_from: null },
      error: null,
    });
    const res = await PATCH(patchReq(UUID, { action: 'dismiss' }), idCtx(UUID));
    expect(res.status).toBe(200);
    const write = chainsOf('patchWrite')[0];
    expect(write.calls[0].args[0]).toEqual({ status: 'dismissed', dismissed_from: 'new' });
    expect(callArgs(write, 'eq')).toContainEqual(['status', 'scoring']);
  });

  it('restore returns the row to exactly its dismissed_from status', async () => {
    results.read.mockReturnValue({
      data: { id: UUID, status: 'dismissed', dismissed_from: 'scored' },
      error: null,
    });
    const res = await PATCH(patchReq(UUID, { action: 'restore' }), idCtx(UUID));
    expect(res.status).toBe(200);

    const write = chainsOf('patchWrite')[0];
    expect(write.calls[0].args[0]).toEqual({ status: 'scored', dismissed_from: null });
    expect(callArgs(write, 'eq')).toContainEqual(['status', 'dismissed']);
  });

  it('restore falls back to new when dismissed_from is null', async () => {
    results.read.mockReturnValue({
      data: { id: UUID, status: 'dismissed', dismissed_from: null },
      error: null,
    });
    await PATCH(patchReq(UUID, { action: 'restore' }), idCtx(UUID));
    const write = chainsOf('patchWrite')[0];
    expect(write.calls[0].args[0]).toEqual({ status: 'new', dismissed_from: null });
  });

  it('409s a restore on a non-dismissed prospect', async () => {
    results.read.mockReturnValue({
      data: { id: UUID, status: 'scored', dismissed_from: null },
      error: null,
    });
    const res = await PATCH(patchReq(UUID, { action: 'restore' }), idCtx(UUID));
    expect(res.status).toBe(409);
  });

  it('409s when the fenced write matches 0 rows (lost a race)', async () => {
    results.read.mockReturnValue({
      data: { id: UUID, status: 'scored', dismissed_from: null },
      error: null,
    });
    results.patchWrite.mockReturnValue({ data: [], error: null });
    const res = await PATCH(patchReq(UUID, { action: 'dismiss' }), idCtx(UUID));
    expect(res.status).toBe(409);
  });
});
