// Per-tab simulated backend for the MilesChaser demo. No server, no API
// routes: state lives in this module + sessionStorage (survives reload,
// ends with the tab — mirrored by the chrome tooltip copy).
//
// Contract stance: speaks the source dev-mock API's paths and body shapes,
// but deliberately STRICTER where the source mock was sloppy — unknown
// trip/enrollment IDs throw ('not found') instead of falling back to the
// first fixture. This is a defined sandbox contract, not parity drift.
import { runProjection } from './engine/projectionEngine';
import { scoreRoutes } from './engine/microVacationScorer';
import {
  MOCK_ENROLLMENT_ID,
  mockEnrollment,
  mockProfile,
  mockTrips,
  mockMicroVacationRoutes,
} from './mock-data';
import type { Trip, TripSegment, TierDefinition } from './types/database';
import type {
  ProjectionInput,
  RouteForScoring,
  SegmentEarningInput,
  TierInfo,
} from './types/domain';

export type TripWithSegments = Trip & { trip_segments: TripSegment[] };

const KEY = 'honuvibe-sandbox-miles-chaser-v1';
const SCHEMA_V = 1;

type State = { trips: TripWithSegments[] };
type Envelope = { v: number; trips: TripWithSegments[] };

export type StoreOptions = {
  latencyMs?: number;
  storage?: Pick<Storage, 'getItem' | 'setItem'> | null;
};

const clone = <T,>(v: T): T => structuredClone(v);
const newId = () =>
  globalThis.crypto?.randomUUID?.() ?? `mc-${Date.now()}-${Math.floor(Math.random() * 1e6)}`;
const seedTrips = () => clone(mockTrips) as TripWithSegments[];

// Narrow structural guard — enough to reject junk without a schema library.
function isValidEnvelope(x: unknown): x is Envelope {
  if (typeof x !== 'object' || x === null) return false;
  const e = x as Envelope;
  return (
    e.v === SCHEMA_V &&
    Array.isArray(e.trips) &&
    e.trips.every(
      (t) => typeof t?.id === 'string' && typeof t?.status === 'string' && Array.isArray(t?.trip_segments),
    )
  );
}

function defaultStorage(): StoreOptions['storage'] {
  try { return typeof sessionStorage !== 'undefined' ? sessionStorage : null; } catch { return null; }
}

export type MilesChaserStore = {
  read: (path: string) => Promise<unknown>;
  createTrip: (input: Record<string, unknown>) => Promise<TripWithSegments>;
  updateTrip: (id: string, input: Record<string, unknown>) => Promise<TripWithSegments>;
  deleteTrip: (id: string) => Promise<void>;
  reset: () => void;
};

export function createStore(opts?: StoreOptions): MilesChaserStore {
  const storage = opts?.storage !== undefined ? opts.storage : defaultStorage();
  const latency = opts?.latencyMs ?? null;
  const wait = () => new Promise((r) => setTimeout(r, latency ?? 150 + Math.random() * 150));

  function load(): State {
    try {
      const raw = storage?.getItem(KEY);
      if (raw) {
        const parsed: unknown = JSON.parse(raw);
        if (isValidEnvelope(parsed)) return { trips: parsed.trips };
      }
    } catch { /* malformed or storage denied — fall through to reseed */ }
    return { trips: seedTrips() };
  }

  let state = load();

  function save() {
    try {
      storage?.setItem(KEY, JSON.stringify({ v: SCHEMA_V, trips: state.trips } satisfies Envelope));
    } catch (err) {
      // Private mode / quota — demo still works in-memory for this page life.
      console.warn('[sandbox:miles-chaser] persistence unavailable:', err);
    }
  }

  function requireEnrollment(id: string) {
    if (id !== MOCK_ENROLLMENT_ID) throw new Error('Enrollment not found');
  }

  // Projection assembly — same mapping the source API route performed
  // (src/app/api/projection/[enrollmentId]/route.ts), now client-side.
  function computeProjection(enrollmentId: string) {
    requireEnrollment(enrollmentId);
    const tiers = (mockEnrollment.loyalty_programs?.tiers ?? []) as TierDefinition[];
    const targetTierDef = tiers.find((t) => t.key === mockEnrollment.target_tier);
    if (!targetTierDef) throw new Error('Target tier not found');
    const targetTier: TierInfo = {
      key: targetTierDef.key, name: targetTierDef.name,
      qm: targetTierDef.qm, qs: targetTierDef.qs, qd: targetTierDef.qd,
    };
    const earningTrips = state.trips
      .filter((t) => t.enrollment_id === enrollmentId && t.is_earning_flight && t.status !== 'cancelled')
      .map((trip) => ({
        tripId: trip.id,
        status: trip.status,
        segments: trip.trip_segments.map((seg): SegmentEarningInput => ({
          estimatedQM: seg.estimated_qualifying_miles,
          estimatedQS: seg.estimated_qualifying_segments,
          estimatedQD: Number(seg.estimated_qualifying_dollars),
          actualQM: seg.actual_qualifying_miles,
          actualQS: seg.actual_qualifying_segments,
          actualQD: seg.actual_qualifying_dollars !== null ? Number(seg.actual_qualifying_dollars) : null,
          fareClass: seg.fare_class,
          isPartnerFlight: seg.is_partner_flight,
        })),
      }));
    const input: ProjectionInput = {
      enrollment: {
        id: mockEnrollment.id,
        currentQM: mockEnrollment.current_qualifying_miles,
        currentQS: mockEnrollment.current_qualifying_segments,
        currentQD: Number(mockEnrollment.current_qualifying_dollars),
        targetTierKey: mockEnrollment.target_tier,
        yearStart: mockEnrollment.qualification_year_start,
        yearEnd: mockEnrollment.qualification_year_end,
      },
      targetTier,
      earningTrips,
    };
    return runProjection(input);
  }

  const num = (v: string | null): number | null => {
    if (v === null) return null;
    const n = Number(v);
    return Number.isFinite(n) && n >= 0 ? n : null; // junk → ignored
  };

  async function read(path: string): Promise<unknown> {
    await wait();
    const [pathname, query = ''] = path.split('?');
    const params = new URLSearchParams(query);

    if (pathname === '/api/profile') return { data: clone(mockProfile) };
    if (pathname === '/api/enrollments') return { data: [clone(mockEnrollment)] };
    if (pathname.startsWith('/api/enrollments/')) {
      requireEnrollment(pathname.slice('/api/enrollments/'.length));
      return { data: clone(mockEnrollment) };
    }

    if (pathname === '/api/trips') {
      let trips = clone(state.trips);
      const status = params.get('status');
      if (status) trips = trips.filter((t) => t.status === status);
      const enrollmentId = params.get('enrollment_id');
      if (enrollmentId) trips = trips.filter((t) => t.enrollment_id === enrollmentId);
      const earning = params.get('is_earning_flight');
      if (earning !== null && earning !== '') {
        trips = trips.filter((t) => t.is_earning_flight === (earning === 'true'));
      }
      // Sort semantics mirror the source GET /api/trips route: leading '-'
      // means descending, default '-departure_date', and 'departure_date'
      // maps to trip created_at (the source's Supabase fallback).
      const sort = params.get('sort') ?? '-departure_date';
      const descending = sort.startsWith('-');
      const rawField = descending ? sort.slice(1) : sort;
      const field = (rawField === 'departure_date' ? 'created_at' : rawField) as keyof Trip;
      trips = [...trips].sort((a, b) => {
        const cmp = String(a[field] ?? '').localeCompare(String(b[field] ?? ''));
        return descending ? -cmp : cmp;
      });
      const total = trips.length;
      const offset = num(params.get('offset')) ?? 0;
      const limit = Math.min(num(params.get('limit')) ?? 20, 100); // source clamps at 100
      trips = trips.slice(offset, offset + limit);
      return { data: trips, pagination: { limit, offset, total } };
    }
    if (pathname.startsWith('/api/trips/')) {
      const id = pathname.slice('/api/trips/'.length);
      const trip = state.trips.find((t) => t.id === id);
      if (!trip) throw new Error('Trip not found');
      return { data: clone(trip) };
    }

    if (pathname.startsWith('/api/projection/')) {
      return { data: computeProjection(pathname.slice('/api/projection/'.length)) };
    }

    if (pathname === '/api/micro-vacations') {
      const enrollmentId = params.get('enrollment_id');
      if (enrollmentId) requireEnrollment(enrollmentId);
      const origin = params.get('origin');
      const tag = params.get('tag');
      const p = computeProjection(enrollmentId ?? MOCK_ENROLLMENT_ID);
      // Mirror the source GET /api/micro-vacations route: filter by origin,
      // RE-score against the live gap, tag-filter on destinationTags, count
      // totalAvailable BEFORE the limit. isPremiumRequired is always false —
      // billing is excluded from the demo.
      const routesForScoring: RouteForScoring[] = mockMicroVacationRoutes
        .filter((r) => !origin || r.origin === origin)
        .map((r) => ({
          id: r.id,
          origin: r.origin,
          destination: r.destination,
          typicalFareLow: r.typicalFareLow,
          typicalFareHigh: r.typicalFareHigh,
          currentFareEstimate: r.currentFareEstimate,
          estimatedQualifyingMiles: r.estimatedQualifyingMiles,
          flightDurationMinutes: r.flightDurationMinutes,
          destinationTags: [...r.destinationTags],
        }));
      let scored = scoreRoutes(routesForScoring, { gapQM: p.gapQM, gapQS: p.gapQS, gapQD: p.gapQD });
      if (tag) scored = scored.filter((r) => r.destinationTags.includes(tag));
      const totalAvailable = scored.length;
      const limit = num(params.get('limit'));
      if (limit !== null) scored = scored.slice(0, limit);
      return {
        data: {
          routes: scored,
          totalAvailable,
          isPremiumRequired: false,
          gap: { qm: p.gapQM, qs: p.gapQS, qd: p.gapQD },
        },
      };
    }
    throw new Error(`MilesChaser demo store: no handler for ${path}`);
  }

  async function createTrip(input: Record<string, unknown>): Promise<TripWithSegments> {
    await wait();
    const id = newId();
    const now = new Date().toISOString();
    const rawSegments = (input.segments as Array<Record<string, unknown>>) ?? [];
    // Explicit normalization — every TripSegment column gets a value.
    // Defaults reconciled against types/database.ts + the source
    // segmentSchema (is_partner_flight/segment_order defaults); the form
    // supplies origin/destination/departure_date/airline_code + estimates.
    const segments = rawSegments.map((s, i): TripSegment => ({
      return_date: null,
      marketing_carrier: null,
      flight_number: null,
      fare_class: null,
      is_partner_flight: false,
      estimated_qualifying_miles: 0,
      estimated_qualifying_segments: 1,
      estimated_qualifying_dollars: 0,
      ...(clone(s) as Partial<TripSegment>),
      id: newId(),
      trip_id: id,
      segment_order: (s.segment_order as number) ?? i + 1,
      actual_qualifying_miles: null,
      actual_qualifying_segments: null,
      actual_qualifying_dollars: null,
      created_at: now,
    }) as TripSegment);
    const { segments: _drop, ...tripFields } = input;
    void _drop;
    const trip = {
      // Defaults mirror the source createTripSchema (status/trip_type) and
      // the Trip columns' nullables.
      status: 'planned',
      trip_type: 'booked',
      trip_purpose: null,
      notes: null,
      is_earning_flight: false,
      imported_from_csv: false,
      csv_import_date: null,
      ...(clone(tripFields) as Partial<Trip>),
      id,
      user_id: mockProfile.id,
      // Preserve caller intent: the form omits enrollment_id for non-earning
      // trips — keep it null/undefined→null rather than forcing the mock id.
      enrollment_id: (tripFields.enrollment_id as string | null | undefined) ?? null,
      created_at: now,
      updated_at: now,
      trip_segments: segments,
    } as TripWithSegments;
    state = { ...state, trips: [clone(trip), ...state.trips] };
    save();
    return clone(trip);
  }

  async function updateTrip(id: string, input: Record<string, unknown>): Promise<TripWithSegments> {
    await wait();
    const idx = state.trips.findIndex((t) => t.id === id);
    if (idx === -1) throw new Error('Trip not found');
    const updated = {
      ...state.trips[idx],
      ...(clone(input) as Partial<TripWithSegments>),
      id,
      updated_at: new Date().toISOString(),
    };
    state = { ...state, trips: state.trips.map((t, i) => (i === idx ? updated : t)) };
    save();
    return clone(updated);
  }

  async function deleteTrip(id: string): Promise<void> {
    await wait();
    if (!state.trips.some((t) => t.id === id)) throw new Error('Trip not found');
    state = { ...state, trips: state.trips.filter((t) => t.id !== id) };
    save();
  }

  function reset() {
    state = { trips: seedTrips() };
    save();
  }

  return { read, createTrip, updateTrip, deleteTrip, reset };
}

let singleton: MilesChaserStore | null = null;
export function getStore(): MilesChaserStore {
  if (!singleton) singleton = createStore();
  return singleton;
}
