import { describe, it, expect, beforeEach, vi } from 'vitest';
import { createStore } from '@/lib/sandbox/miles-chaser/store';
import {
  MOCK_ENROLLMENT_ID,
  mockTrips,
  mockProfile,
  mockMicroVacationRoutes,
} from '@/lib/sandbox/miles-chaser/mock-data';
import type { ProjectionResult } from '@/lib/sandbox/miles-chaser/types/domain';

type TripsBody = {
  data: Array<{ id: string; status: string; notes?: string | null; trip_segments: unknown[] }>;
  pagination: { limit: number; offset: number; total: number };
};
type Body<T> = { data: T };
const KEY = 'honuvibe-sandbox-miles-chaser-v1';

const newTripInput = {
  enrollment_id: MOCK_ENROLLMENT_ID,
  is_earning_flight: true,
  status: 'planned',
  trip_purpose: 'vacation',
  notes: 'Test Hop',
  segments: [
    {
      origin: 'SEA', destination: 'HNL', departure_date: '2031-08-01',
      airline_code: 'AS', fare_class: 'M', is_partner_flight: false,
      estimated_qualifying_miles: 2677, estimated_qualifying_segments: 1,
      estimated_qualifying_dollars: 350,
    },
  ],
};

describe('miles-chaser client store', () => {
  beforeEach(() => sessionStorage.clear());
  const store = () => createStore({ latencyMs: 0 });

  it('seeds trips from mock-data with the pagination envelope', async () => {
    const s = store();
    const list = (await s.read('/api/trips')) as TripsBody;
    expect(list.data).toHaveLength(mockTrips.length);
    expect(list.pagination).toEqual({ limit: 20, offset: 0, total: mockTrips.length });
  });

  it('honors status/limit/offset filters; total counts pre-limit; junk numerics ignored', async () => {
    const s = store();
    const all = (await s.read('/api/trips')) as TripsBody;
    const firstStatus = all.data[0].status;
    const filtered = (await s.read(`/api/trips?status=${firstStatus}`)) as TripsBody;
    expect(filtered.data.every((t) => t.status === firstStatus)).toBe(true);
    expect(filtered.pagination.total).toBe(filtered.data.length + 0);

    const limited = (await s.read('/api/trips?limit=1&offset=1')) as TripsBody;
    expect(limited.data).toHaveLength(1);
    expect(limited.data[0].id).toBe(all.data[1].id);
    expect(limited.pagination.total).toBe(mockTrips.length); // pre-limit count

    const junk = (await s.read('/api/trips?limit=banana')) as TripsBody;
    expect(junk.data).toHaveLength(mockTrips.length); // invalid numeric ignored
  });

  it('honors enrollment_id/is_earning_flight/sort filters', async () => {
    const s = store();
    const byEnrollment = (await s.read(`/api/trips?enrollment_id=${MOCK_ENROLLMENT_ID}`)) as TripsBody;
    expect(byEnrollment.pagination.total).toBe(mockTrips.length); // all seed trips share it
    const noEnrollment = (await s.read('/api/trips?enrollment_id=nope')) as TripsBody;
    expect(noEnrollment.data).toHaveLength(0);

    const earning = (await s.read('/api/trips?is_earning_flight=true')) as TripsBody;
    expect(earning.pagination.total).toBe(mockTrips.length);
    const nonEarning = (await s.read('/api/trips?is_earning_flight=false')) as TripsBody;
    expect(nonEarning.data).toHaveLength(0);

    // Source default sort is '-departure_date' which the source route maps to
    // trip created_at descending (newest first); explicit 'created_at' = asc.
    const asc = (await s.read('/api/trips?sort=created_at')) as TripsBody;
    const desc = (await s.read('/api/trips?sort=-created_at')) as TripsBody;
    expect(asc.data.map((t) => t.id)).toEqual([...desc.data.map((t) => t.id)].reverse());
    const def = (await s.read('/api/trips')) as TripsBody;
    expect(def.data.map((t) => t.id)).toEqual(desc.data.map((t) => t.id)); // default = newest first
  });

  it('trip detail throws for unknown ids (stricter than the source mock)', async () => {
    const s = store();
    await expect(s.read('/api/trips/nope')).rejects.toThrow('Trip not found');
  });

  it('createTrip rejects blank/incomplete segments (the source API validated with zod)', async () => {
    const s = store();
    await expect(s.createTrip({ is_earning_flight: false, segments: [] })).rejects.toThrow(
      'At least one flight segment is required',
    );
    await expect(
      s.createTrip({
        is_earning_flight: false,
        segments: [{ origin: '', destination: '', departure_date: '', airline_code: '' }],
      }),
    ).rejects.toThrow('required for every segment');
    const list = (await s.read('/api/trips')) as TripsBody;
    expect(list.pagination.total).toBe(mockTrips.length); // nothing was created
  });

  it('trip reads return segments sorted by segment_order (source route behavior)', async () => {
    const s = store();
    const created = await s.createTrip({
      ...newTripInput,
      segments: [
        { ...newTripInput.segments[0], segment_order: 2, origin: 'HNL', destination: 'SEA' },
        { ...newTripInput.segments[0], segment_order: 1 },
      ],
    });
    const detail = (await s.read(`/api/trips/${created.id}`)) as Body<{
      trip_segments: Array<{ segment_order: number }>;
    }>;
    expect(detail.data.trip_segments.map((x) => x.segment_order)).toEqual([1, 2]);
    const list = (await s.read('/api/trips')) as TripsBody;
    const inList = list.data.find((t) => t.id === created.id) as unknown as {
      trip_segments: Array<{ segment_order: number }>;
    };
    expect(inList.trip_segments.map((x) => x.segment_order)).toEqual([1, 2]);
  });

  it('createTrip returns a routable id, preserves enrollment_id, appears in list', async () => {
    const s = store();
    const created = await s.createTrip(newTripInput);
    expect(created.id).toBeTruthy();
    expect(created.enrollment_id).toBe(MOCK_ENROLLMENT_ID);
    expect(created.trip_segments).toHaveLength(1);
    const detail = (await s.read(`/api/trips/${created.id}`)) as Body<{ id: string }>;
    expect(detail.data.id).toBe(created.id);
    const list = (await s.read('/api/trips')) as TripsBody;
    expect(list.pagination.total).toBe(mockTrips.length + 1);
  });

  it('update persists; delete removes; delete of unknown id throws; empty state reachable', async () => {
    const s = store();
    const list = (await s.read('/api/trips')) as TripsBody;
    await s.updateTrip(list.data[0].id, { status: 'completed' });
    const updated = (await s.read(`/api/trips/${list.data[0].id}`)) as Body<{ status: string }>;
    expect(updated.data.status).toBe('completed');
    for (const t of list.data) await s.deleteTrip(t.id);
    await expect(s.deleteTrip('already-gone')).rejects.toThrow('Trip not found');
    const empty = (await s.read('/api/trips')) as TripsBody;
    expect(empty.data).toHaveLength(0);
  });

  it('projection recomputes when trips change; unknown enrollment throws', async () => {
    const s = store();
    const before = (await s.read(`/api/projection/${MOCK_ENROLLMENT_ID}`)) as Body<ProjectionResult>;
    await s.createTrip(newTripInput);
    const after = (await s.read(`/api/projection/${MOCK_ENROLLMENT_ID}`)) as Body<ProjectionResult>;
    expect(after.data.projectedQM).toBe(before.data.projectedQM + 2677);
    await expect(s.read('/api/projection/nope')).rejects.toThrow('Enrollment not found');
  });

  it('micro-vacations: filters by origin, applies limit after totalAvailable, no premium', async () => {
    const s = store();
    const home = mockProfile.home_airport;
    const body = (await s.read(
      `/api/micro-vacations?origin=${home}&enrollment_id=${MOCK_ENROLLMENT_ID}&limit=1`,
    )) as Body<{ routes: Array<{ origin: string }>; totalAvailable: number; isPremiumRequired: boolean; gap: { qm: number } }>;
    expect(body.data.routes).toHaveLength(1);
    expect(body.data.routes.every((r) => r.origin === home)).toBe(true);
    expect(body.data.totalAvailable).toBe(mockMicroVacationRoutes.length); // pre-limit count
    expect(body.data.isPremiumRequired).toBe(false);
    expect(body.data.gap.qm).toBeGreaterThanOrEqual(0);
    const wrongOrigin = (await s.read(
      `/api/micro-vacations?origin=ZZZ&enrollment_id=${MOCK_ENROLLMENT_ID}`,
    )) as Body<{ routes: unknown[] }>;
    expect(wrongOrigin.data.routes).toHaveLength(0);
    await expect(s.read('/api/micro-vacations?origin=SEA&enrollment_id=nope')).rejects.toThrow(
      'Enrollment not found',
    );
  });

  it('micro-vacations: tag filter applies to destinationTags; routes re-scored live', async () => {
    const s = store();
    const tagged = (await s.read(
      `/api/micro-vacations?origin=SEA&enrollment_id=${MOCK_ENROLLMENT_ID}&tag=beach`,
    )) as Body<{ routes: Array<{ destinationTags: string[]; gapClosingPct: number }>; totalAvailable: number }>;
    expect(tagged.data.routes.length).toBeGreaterThan(0);
    expect(tagged.data.routes.every((r) => r.destinationTags.includes('beach'))).toBe(true);
    expect(tagged.data.totalAvailable).toBe(tagged.data.routes.length);
  });

  it('state round-trips through sessionStorage in a versioned envelope', async () => {
    const s1 = store();
    const created = await s1.createTrip(newTripInput);
    const raw = sessionStorage.getItem(KEY);
    expect(raw).toBeTruthy();
    expect(JSON.parse(raw!).v).toBe(1);
    const s2 = store(); // fresh instance = reload
    const detail = (await s2.read(`/api/trips/${created.id}`)) as Body<{ id: string }>;
    expect(detail.data.id).toBe(created.id);
  });

  it('malformed and stale-version storage self-recover by reseeding', async () => {
    sessionStorage.setItem(KEY, '{not json');
    let s = store();
    expect(((await s.read('/api/trips')) as TripsBody).data).toHaveLength(mockTrips.length);

    sessionStorage.setItem(KEY, JSON.stringify({ v: 0, trips: 'garbage' }));
    s = store();
    expect(((await s.read('/api/trips')) as TripsBody).data).toHaveLength(mockTrips.length);

    sessionStorage.setItem(KEY, JSON.stringify({ v: 1, trips: [{ bogus: true }] }));
    s = store();
    expect(((await s.read('/api/trips')) as TripsBody).data).toHaveLength(mockTrips.length);
  });

  it('two injected storages (≈ two tabs) do not share state', async () => {
    const mem = () => {
      const m = new Map<string, string>();
      return { getItem: (k: string) => m.get(k) ?? null, setItem: (k: string, v: string) => void m.set(k, v) };
    };
    const tabA = createStore({ latencyMs: 0, storage: mem() });
    const tabB = createStore({ latencyMs: 0, storage: mem() });
    await tabA.createTrip(newTripInput);
    expect(((await tabA.read('/api/trips')) as TripsBody).pagination.total).toBe(mockTrips.length + 1);
    expect(((await tabB.read('/api/trips')) as TripsBody).pagination.total).toBe(mockTrips.length);
  });

  it('deep-clones on read — mutating a returned object cannot corrupt the store', async () => {
    const s = store();
    const list = (await s.read('/api/trips')) as TripsBody;
    list.data[0].notes = 'CORRUPTED';
    const again = (await s.read('/api/trips')) as TripsBody;
    expect(again.data[0].notes).not.toBe('CORRUPTED');
  });

  it('reset() restores the seed', async () => {
    const s = store();
    await s.createTrip(newTripInput);
    s.reset();
    const list = (await s.read('/api/trips')) as TripsBody;
    expect(list.pagination.total).toBe(mockTrips.length);
  });

  it('a storage whose getItem throws → store seeds and operates in memory', async () => {
    const throwing = {
      getItem: () => { throw new Error('storage denied'); },
      setItem: () => { throw new Error('storage denied'); },
    };
    const warn = vi.spyOn(console, 'warn').mockImplementation(() => {});
    try {
      const s = createStore({ latencyMs: 0, storage: throwing });
      const list = (await s.read('/api/trips')) as TripsBody;
      expect(list.data).toHaveLength(mockTrips.length);
    } finally {
      warn.mockRestore();
    }
  });

  it('a storage whose setItem throws → mutations still succeed in memory (warns, no crash)', async () => {
    const mem = new Map<string, string>();
    const flaky = {
      getItem: (k: string) => mem.get(k) ?? null,
      setItem: () => { throw new Error('quota exceeded'); },
    };
    const warn = vi.spyOn(console, 'warn').mockImplementation(() => {});
    try {
      const s = createStore({ latencyMs: 0, storage: flaky });
      const created = await s.createTrip(newTripInput);
      expect(created.id).toBeTruthy();
      expect(warn).toHaveBeenCalled();
      const list = (await s.read('/api/trips')) as TripsBody;
      expect(list.pagination.total).toBe(mockTrips.length + 1);
    } finally {
      warn.mockRestore();
    }
  });
});
