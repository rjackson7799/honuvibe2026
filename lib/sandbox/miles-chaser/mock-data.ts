/**
 * Ported from MilesChaser src/lib/devMockData.ts (fictional demo data only —
 * "Demo User", "Alaska Airlines Atmos") — trimmed to the sandbox slice.
 * Skipped: mockProjection (recomputed live by the store), mockSubscription,
 * mockNotifications, mockHelpArticles, mockAuditRecords, getMockResponse.
 *
 * The raw literals below are kept verbatim (2026 qualification year) so
 * diffing against the source stays easy; the exports are year-shifted to the
 * CURRENT year at module init so the public demo stays evergreen (pacing math
 * needs "today" inside the qualification window).
 */
import type {
  LoyaltyProgram,
  Profile,
  Trip,
  TripSegment,
  UserProgramEnrollment,
} from './types/database';
import type { ScoredRoute } from './types/domain';

export const MOCK_USER_ID = 'dev-user-00000000-0000-0000-0000-000000000001';
export const MOCK_PROGRAM_ID = 'dev-prog-00000000-0000-0000-0000-000000000001';
export const MOCK_ENROLLMENT_ID = 'dev-enrl-00000000-0000-0000-0000-000000000001';

export type TripWithSegments = Trip & { trip_segments: TripSegment[] };
export type EnrollmentWithProgram = UserProgramEnrollment & {
  loyalty_programs: LoyaltyProgram;
};

const rawProgram: LoyaltyProgram = {
  id: MOCK_PROGRAM_ID,
  program_key: 'alaska_atmos',
  display_name: 'Alaska Airlines Atmos',
  qualification_year_type: 'calendar',
  tiers: [
    { key: 'silver', name: 'MVP', qm: 20000, qs: 15, qd: 2000 },
    { key: 'gold', name: 'MVP Gold', qm: 40000, qs: 30, qd: 4000 },
    { key: 'platinum', name: 'MVP Gold 75K', qm: 75000, qs: 60, qd: 7500 },
    { key: '100k', name: 'MVP Gold 100K', qm: 100000, qs: 75, qd: 12000 },
  ],
  earning_rules: {
    default_earning_rate: 1.0,
    fare_class_rates: { Y: 1.5, J: 2.0, F: 3.0, B: 1.25, M: 1.0, S: 0.5 },
    qd_per_dollar_spent: 1.0,
    qs_per_segment: 1,
  },
  partner_airlines: ['AA', 'BA', 'CX', 'JL', 'QF'],
  rules_version: '2026.1',
  rules_updated_at: '2026-01-01T00:00:00Z',
  is_active: true,
  created_at: '2025-01-01T00:00:00Z',
};

const rawEnrollment: EnrollmentWithProgram = {
  id: MOCK_ENROLLMENT_ID,
  user_id: MOCK_USER_ID,
  program_id: MOCK_PROGRAM_ID,
  current_tier: 'silver',
  target_tier: 'gold',
  qualification_year_start: '2026-01-01',
  qualification_year_end: '2026-12-31',
  current_qualifying_miles: 18450,
  current_qualifying_segments: 14,
  current_qualifying_dollars: 2180,
  last_synced_at: '2026-02-05T10:30:00Z',
  last_sync_method: 'manual',
  created_at: '2026-01-02T08:00:00Z',
  updated_at: '2026-02-05T10:30:00Z',
  loyalty_programs: rawProgram,
};

function makeTripId(n: number) {
  return `dev-trip-00000000-0000-0000-0000-00000000000${n}`;
}
function makeSegId(n: number) {
  return `dev-segm-00000000-0000-0000-0000-00000000000${n}`;
}

const rawTrips: TripWithSegments[] = [
  {
    id: makeTripId(1),
    user_id: MOCK_USER_ID,
    enrollment_id: MOCK_ENROLLMENT_ID,
    is_earning_flight: true,
    status: 'completed',
    trip_type: 'booked',
    trip_purpose: 'business',
    notes: 'Q1 client meeting',
    imported_from_csv: false,
    csv_import_date: null,
    created_at: '2026-01-10T08:00:00Z',
    updated_at: '2026-01-18T10:00:00Z',
    trip_segments: [
      {
        id: makeSegId(1),
        trip_id: makeTripId(1),
        origin: 'SEA',
        destination: 'SFO',
        departure_date: '2026-01-15',
        return_date: null,
        airline_code: 'AS',
        marketing_carrier: null,
        flight_number: 'AS 234',
        fare_class: 'Y',
        is_partner_flight: false,
        estimated_qualifying_miles: 680,
        estimated_qualifying_segments: 1,
        estimated_qualifying_dollars: 320,
        actual_qualifying_miles: 680,
        actual_qualifying_segments: 1,
        actual_qualifying_dollars: 318,
        segment_order: 1,
        created_at: '2026-01-10T08:00:00Z',
      },
      {
        id: makeSegId(2),
        trip_id: makeTripId(1),
        origin: 'SFO',
        destination: 'SEA',
        departure_date: '2026-01-18',
        return_date: null,
        airline_code: 'AS',
        marketing_carrier: null,
        flight_number: 'AS 471',
        fare_class: 'Y',
        is_partner_flight: false,
        estimated_qualifying_miles: 680,
        estimated_qualifying_segments: 1,
        estimated_qualifying_dollars: 310,
        actual_qualifying_miles: 680,
        actual_qualifying_segments: 1,
        actual_qualifying_dollars: 310,
        segment_order: 2,
        created_at: '2026-01-10T08:05:00Z',
      },
    ],
  },
  {
    id: makeTripId(2),
    user_id: MOCK_USER_ID,
    enrollment_id: MOCK_ENROLLMENT_ID,
    is_earning_flight: true,
    status: 'completed',
    trip_type: 'booked',
    trip_purpose: 'vacation',
    notes: 'Weekend getaway',
    imported_from_csv: false,
    csv_import_date: null,
    created_at: '2026-01-25T12:00:00Z',
    updated_at: '2026-02-02T14:00:00Z',
    trip_segments: [
      {
        id: makeSegId(3),
        trip_id: makeTripId(2),
        origin: 'SEA',
        destination: 'LAX',
        departure_date: '2026-01-31',
        return_date: null,
        airline_code: 'AS',
        marketing_carrier: null,
        flight_number: 'AS 512',
        fare_class: 'B',
        is_partner_flight: false,
        estimated_qualifying_miles: 955,
        estimated_qualifying_segments: 1,
        estimated_qualifying_dollars: 189,
        actual_qualifying_miles: 955,
        actual_qualifying_segments: 1,
        actual_qualifying_dollars: 189,
        segment_order: 1,
        created_at: '2026-01-25T12:00:00Z',
      },
      {
        id: makeSegId(4),
        trip_id: makeTripId(2),
        origin: 'LAX',
        destination: 'SEA',
        departure_date: '2026-02-02',
        return_date: null,
        airline_code: 'AS',
        marketing_carrier: null,
        flight_number: 'AS 543',
        fare_class: 'B',
        is_partner_flight: false,
        estimated_qualifying_miles: 955,
        estimated_qualifying_segments: 1,
        estimated_qualifying_dollars: 175,
        actual_qualifying_miles: 955,
        actual_qualifying_segments: 1,
        actual_qualifying_dollars: 175,
        segment_order: 2,
        created_at: '2026-01-25T12:05:00Z',
      },
    ],
  },
  {
    id: makeTripId(3),
    user_id: MOCK_USER_ID,
    enrollment_id: MOCK_ENROLLMENT_ID,
    is_earning_flight: true,
    status: 'planned',
    trip_type: 'booked',
    trip_purpose: 'business',
    notes: 'Spring conference',
    imported_from_csv: false,
    csv_import_date: null,
    created_at: '2026-02-01T09:00:00Z',
    updated_at: '2026-02-01T09:00:00Z',
    trip_segments: [
      {
        id: makeSegId(5),
        trip_id: makeTripId(3),
        origin: 'SEA',
        destination: 'JFK',
        departure_date: '2026-03-10',
        return_date: null,
        airline_code: 'AS',
        marketing_carrier: null,
        flight_number: 'AS 18',
        fare_class: 'Y',
        is_partner_flight: false,
        estimated_qualifying_miles: 2422,
        estimated_qualifying_segments: 1,
        estimated_qualifying_dollars: 580,
        actual_qualifying_miles: null,
        actual_qualifying_segments: null,
        actual_qualifying_dollars: null,
        segment_order: 1,
        created_at: '2026-02-01T09:00:00Z',
      },
      {
        id: makeSegId(6),
        trip_id: makeTripId(3),
        origin: 'JFK',
        destination: 'SEA',
        departure_date: '2026-03-14',
        return_date: null,
        airline_code: 'AS',
        marketing_carrier: null,
        flight_number: 'AS 19',
        fare_class: 'Y',
        is_partner_flight: false,
        estimated_qualifying_miles: 2422,
        estimated_qualifying_segments: 1,
        estimated_qualifying_dollars: 580,
        actual_qualifying_miles: null,
        actual_qualifying_segments: null,
        actual_qualifying_dollars: null,
        segment_order: 2,
        created_at: '2026-02-01T09:05:00Z',
      },
    ],
  },
];

const rawProfile: Profile = {
  id: MOCK_USER_ID,
  display_name: 'Demo User',
  home_airport: 'SEA',
  timezone: 'America/Los_Angeles',
  preferred_destinations: ['LAX', 'SFO', 'HNL'],
  travel_flexibility: 'flexible_weekdays',
  subscription_tier: 'premium',
  stripe_customer_id: null,
  stripe_subscription_id: null,
  role: 'user',
  notification_prefs: {
    pacing_update: { email: true, in_app: true },
    micro_vacation: { email: false, in_app: true },
    trip_reminder: { email: true, in_app: true },
    rule_change: { email: true, in_app: true },
    billing: { email: true, in_app: true },
    product_update: { email: false, in_app: true },
  },
  email_unsubscribed_categories: [],
  email_digest_day: 'monday',
  email_digest_time: '09:00',
  auth_providers: ['email'],
  onboarding_completed: true,
  created_at: '2025-12-15T00:00:00Z',
  updated_at: '2026-02-05T10:30:00Z',
  deleted_at: null,
};

// Routes are seeded in the source's already-scored shape; the store strips
// them back to RouteForScoring and RE-scores against the live projection gap
// (mirroring the source GET /api/micro-vacations route, which scores live).
const rawMicroVacationRoutes: ScoredRoute[] = [
  {
    id: 'dev-route-001',
    origin: 'SEA',
    destination: 'HNL',
    typicalFareLow: 350,
    typicalFareHigh: 550,
    currentFareEstimate: 420,
    estimatedQualifyingMiles: 2680,
    flightDurationMinutes: 360,
    destinationTags: ['beach', 'tropical', 'popular'],
    averageFare: 450,
    efficiencyScore: 5.96,
    gapClosingPct: 20.9,
    segmentsEarned: 2,
    estimatedQD: 840,
    tripsNeededToClose: 3,
  },
  {
    id: 'dev-route-002',
    origin: 'SEA',
    destination: 'ANC',
    typicalFareLow: 200,
    typicalFareHigh: 380,
    currentFareEstimate: 260,
    estimatedQualifyingMiles: 1449,
    flightDurationMinutes: 210,
    destinationTags: ['nature', 'adventure', 'alaska'],
    averageFare: 290,
    efficiencyScore: 5.0,
    gapClosingPct: 11.3,
    segmentsEarned: 2,
    estimatedQD: 520,
    tripsNeededToClose: 5,
  },
  {
    id: 'dev-route-003',
    origin: 'SEA',
    destination: 'SJC',
    typicalFareLow: 100,
    typicalFareHigh: 220,
    currentFareEstimate: 140,
    estimatedQualifyingMiles: 695,
    flightDurationMinutes: 130,
    destinationTags: ['tech', 'business', 'short'],
    averageFare: 160,
    efficiencyScore: 4.34,
    gapClosingPct: 5.4,
    segmentsEarned: 2,
    estimatedQD: 280,
    tripsNeededToClose: 10,
  },
];

// ── Evergreen year shift ────────────────────────────────────────────────
// The source fixtures are authored against a 2026 qualification year. Shift
// every date to the CURRENT year at module init so the demo stays evergreen
// (pacing math needs "today" inside the qualification window).
const FIXTURE_YEAR = 2026;
const yearDelta = new Date().getFullYear() - FIXTURE_YEAR;

function shiftDate(iso: string): string {
  if (yearDelta === 0) return iso;
  return iso.replace(/^(\d{4})/, (y) => String(Number(y) + yearDelta));
}

const DATE_RE = /^\d{4}-\d{2}-\d{2}/;

/** Recursively shift every ISO-date-shaped string field by yearDelta. */
function shiftDatesDeep<T>(value: T): T {
  if (typeof value === 'string') {
    return (DATE_RE.test(value) ? shiftDate(value) : value) as T;
  }
  if (Array.isArray(value)) {
    return value.map((v) => shiftDatesDeep(v)) as T;
  }
  if (value !== null && typeof value === 'object') {
    return Object.fromEntries(
      Object.entries(value as Record<string, unknown>).map(([k, v]) => [k, shiftDatesDeep(v)]),
    ) as T;
  }
  return value;
}

export const mockProgram: LoyaltyProgram = shiftDatesDeep(rawProgram);
export const mockEnrollment: EnrollmentWithProgram = shiftDatesDeep(rawEnrollment);
export const mockTrips: TripWithSegments[] = shiftDatesDeep(rawTrips);
export const mockProfile: Profile = shiftDatesDeep(rawProfile);
export const mockMicroVacationRoutes: ScoredRoute[] = rawMicroVacationRoutes;
