# Sandbox Phase B — MilesChaser Demo Port: Implementation Plan (rev 2)

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.
>
> Parent spec: `docs/plans/2026-07-13-sandbox-master.md` (rev 2, approved). This plan executes its **Phase B** section. Phase A shipped in `402eef6`.
> Rev 2 incorporates external review: full trips read contract (pagination + 6 filters), versioned/validated persistence, hook-mutation pruning + demo-tree boundary scan test, micro-vacations filter fidelity + upsell removal, deterministic engine test, evergreen seed year, a11y built into component tasks, X-Robots-Tag defense, bundle baseline, reproducible screenshot procedure.

**Goal:** Port a curated, fully-interactive slice of MilesChaser (dashboard, trips CRUD, path-to-gold, micro-vacations) into `app/sandbox/miles-chaser/` running on a client-side simulated-data store, and flip its landing card to `live`.

**Architecture:** The demo is a standalone root-layout tree (like `app/studio-site/`) excluded from the intl middleware. All data comes from a per-tab client store (seeded from the source app's fictional `devMockData` fixtures, persisted to `sessionStorage` in a versioned envelope); the ported SWR hooks keep their keys but their fetcher becomes `store.read(path)`. The pure projection engine is ported so the dashboard chart/pacing genuinely recompute when trips change. No API routes, no Supabase, no auth, no `fetch()` anywhere in the demo tree (enforced by a scan test).

**Tech Stack:** Next 16.1.6 App Router / React 19.2.3 / TS strict / Tailwind v4 (CSS-first; default `dark:` = media query — verified: no `@custom-variant dark` in `styles/globals.css`). New deps: `swr`, `recharts@^2.15.4`, `date-fns@^3`.

## Global Constraints

- Package manager: **pnpm only**. Never npm in this repo.
- Git: commit directly to `main`, push at the end. No branches, no PRs, no `--no-verify`. **Before every commit:** stage ONLY the paths listed in the task's commit step, then review `git diff --cached --stat` — the worktree carries unrelated concurrent work (TODO.md, billing, smashhaus, supabase files) that must never ride along.
- Source app (read-only): `C:\Users\HCI\Desktop\Projects\MilesChaser` (`@/*` → `./src/*`). Its mock fixtures are fictional ("Demo User", "Alaska Airlines Atmos") — verified in Phase A.
- Demo is **EN-only**; no `messages/*.json` changes (the JA landing's "English only" pill already renders for all statuses).
- Do NOT touch `app/[locale]/**` — the landing updates automatically when the registry status flips (Task 7).
- No sitemap changes: demo routes stay out (guarded by `__tests__/marketing/sandbox-sitemap.test.ts`).
- Copy rule (chrome/tooltip text): LLM-agnostic, "AI" only.
- Gate per task: `pnpm verify:fast`; full `pnpm verify` before ship. `pnpm lint` if the eslint-config maintenance commit has landed by then.
- State-note copy (exact, used in the badge tooltip): **"Your changes live in this browser tab and reset when you close it."** Browser nuance (do not promise more than this): reload in the same tab persists; an independently opened tab starts fresh; a *duplicated* tab may inherit a copy of the state and then diverge — the tooltip copy above stays accurate for all three.
- New-file import paths inside the demo use the repo `@/` alias: `@/components/sandbox/miles-chaser/...`, `@/lib/sandbox/miles-chaser/...`.
- **Accessibility is built during component work (Tasks 5–6), not discovered at QA**: dialog focus semantics, tooltip aria wiring, visible `focus-visible` states, icon-button names, chart text alternative, 44px touch targets in the chrome.

## File Structure (target)

```
middleware.ts                                    (matcher edit + /ja/sandbox/<demo> redirect)
next.config.ts                                   (X-Robots-Tag header for /sandbox/:path+)
app/sandbox/miles-chaser/
  layout.tsx                                     (root layout: html/body, fonts, noindex, analytics, chrome)
  page.tsx                                       (dashboard)
  trips/page.tsx  trips/new/page.tsx  trips/[id]/page.tsx
  path-to-gold/page.tsx                          (real page hosting PathToGoldChart)
  micro-vacations/page.tsx                       (real page hosting RecommendedRoutes)
components/sandbox/
  demo-chrome.tsx                                (SHARED chrome bar — Phase C reuses it)
components/sandbox/miles-chaser/
  shell.tsx                                      (client: ported header + 4-link bottom nav)
  miles-chaser.css                               (scoped v3-compat styles under body.demo-miles-chaser)
  paths.ts                                       (MC_BASE + mcHref helper)
  dashboard/{StatusCard,PathToGoldChart,ProgressBar,PacingBadge,MonthlyTargets}.tsx
  trips/{TripCard,TripList,TripForm,SegmentFields}.tsx
  micro-vacations/{RecommendedRoutes,RouteCard}.tsx
  ui/{Badge,Button,EmptyState,Input,LoadingSpinner,Modal,Select}.tsx
  hooks/{useEnrollments,useTrips,useProjection,useProfile,useMicroVacations}.ts
lib/sandbox/miles-chaser/
  types/{domain,database}.ts                     (trimmed copies)
  engine/{projectionEngine,pacingCalculator,gapAnalyzer,earningCalculator,microVacationScorer}.ts
  mock-data.ts                                   (seed fixtures, slice-only, year-shifted to "now")
  store.ts                                       (client store: read/createTrip/updateTrip/deleteTrip)
__tests__/sandbox/
  middleware-matcher.test.ts
  miles-chaser-engine.test.ts
  miles-chaser-store.test.ts
  miles-chaser-boundaries.test.ts
  miles-chaser-swr.test.tsx
```

**Explicitly NOT ported** (excluded areas): auth, admin, billing (`useSubscription` + every Premium upsell affordance), notifications, help (`FeedbackWidget`), OCR, CSV import, audit, settings, onboarding. No slice file imports supabase/posthog/stripe — verified by inventory AND enforced by the boundary scan test.

**Contract stance:** the store speaks the source dev-mock API's paths and body shapes, but is deliberately **stricter** where the source mock was sloppy: unknown trip/enrollment/projection IDs throw ("not found") instead of falling back to the first fixture, and `deleteTrip` on an unknown ID throws. This is a defined sandbox contract, not accidental parity drift.

---

### Task 1: Route-resolution spike (matcher + redirect + stub, BEFORE any porting)

**Files:**
- Modify: `middleware.ts` (matcher at :254, redirect after the app-site guard ~:121)
- Modify: `next.config.ts` (X-Robots-Tag header)
- Create: `app/sandbox/miles-chaser/layout.tsx` (minimal stub), `app/sandbox/miles-chaser/page.tsx` (stub)
- Test: `__tests__/sandbox/middleware-matcher.test.ts`

**Interfaces:**
- Produces: URL contract for everything later — `/sandbox` = EN landing, `/ja/sandbox` = JP landing, `/sandbox/miles-chaser` = demo (no locale handling), `/ja/sandbox/<anything>` → 308 to `/sandbox/<anything>` with query preserved. Plus the **bundle baseline** (`/[locale]/sandbox` First-Load JS number) recorded before any dep lands.

- [ ] **Step 1: Write the failing matcher test**

```ts
// __tests__/sandbox/middleware-matcher.test.ts
import { describe, it, expect } from 'vitest';
import { readFileSync } from 'node:fs';
import path from 'node:path';

/**
 * The middleware matcher is Next's route filter — if it drifts, demo routes
 * get locale-prefixed (404s) or marketing routes lose intl handling.
 * Next requires `config.matcher` to be a static literal, so we can't import
 * it; instead we EXTRACT it from middleware.ts source and assert both the
 * expected literal and its behavior as a regex. (The full middleware function
 * is not unit-tested here — it imports supabase/intl and needs env; the
 * redirect behavior is covered by the prod-mode curl contract in this task.)
 */
const source = readFileSync(path.resolve(__dirname, '../../middleware.ts'), 'utf8');
const match = source.match(/matcher:\s*'([^']+)'/);
const MATCHER = match?.[1] ?? '';

const EXPECTED =
  '/((?!api|trpc|_next|_vercel|studio(?:$|/)|sandbox/|.*\\..*).*)';

const toRegex = (m: string) => new RegExp(`^${m.replace(/\//g, '\\/')}$`);

describe('middleware matcher — sandbox routing contract', () => {
  it('middleware.ts contains exactly the expected matcher', () => {
    expect(MATCHER).toBe(EXPECTED);
  });

  const re = toRegex(EXPECTED);
  it.each([
    ['/sandbox', true],           // EN landing — needs intl
    ['/ja/sandbox', true],        // JP landing — needs intl
    ['/sandbox/', false],         // demo namespace — excluded
    ['/sandbox/miles-chaser', false],
    ['/sandbox/miles-chaser/trips/abc', false],
    ['/sandboxish', true],        // prefix confusion — still a normal route
    ['/ja/sandbox/miles-chaser', true], // matched so the redirect rule can run
    ['/learn', true],
    ['/favicon.ico', false],      // dotted assets excluded
    ['/sandbox/miles-chaser/x.png', false],
  ])('%s → middleware runs: %s', (p, expected) => {
    expect(re.test(p)).toBe(expected);
  });
});
```

- [ ] **Step 2: Run it to verify it fails**

Run: `pnpm vitest run --project app __tests__/sandbox/middleware-matcher.test.ts`
Expected: FAIL — `MATCHER` equals the current literal (no `sandbox/`).

- [ ] **Step 3: Edit the matcher**

In `middleware.ts:254`, change:

```ts
  matcher: '/((?!api|trpc|_next|_vercel|studio(?:$|/)|.*\\..*).*)',
```
to:
```ts
  // `sandbox/` (trailing slash) excludes the demo apps at /sandbox/<slug>/*
  // while the /sandbox LANDING still gets intl handling. This namespace is
  // reserved for demos — no future *marketing* child pages under /sandbox/<x>.
  matcher: '/((?!api|trpc|_next|_vercel|studio(?:$|/)|sandbox/|.*\\..*).*)',
```

- [ ] **Step 4: Add the /ja demo redirect**

In `middleware.ts`, directly after the `/app-site` guard block (after ~line 121, before the intl pipeline), insert:

```ts
  // ── Sandbox demos are EN-only, outside the locale tree ────────────────
  // /sandbox/<demo> is excluded from this middleware by the matcher, but
  // /ja/sandbox/<demo> still matches (starts with ja/). Canonicalize it so
  // the fourth URL case is designed, not accidental. clone() keeps the
  // query string; only the pathname changes.
  if (pathname.startsWith('/ja/sandbox/')) {
    const dest = request.nextUrl.clone();
    dest.pathname = pathname.slice('/ja'.length);
    return NextResponse.redirect(dest, 308);
  }
```

- [ ] **Step 5: X-Robots-Tag header (defense in depth beyond the meta tag)**

In `next.config.ts`, add a `headers()` entry (create the function if absent — the config already has `redirects()`, mirror its placement):

```ts
  async headers() {
    return [
      {
        // Demo routes only (:path+ requires ≥1 segment — the /sandbox
        // landing itself stays indexable).
        source: '/sandbox/:path+',
        headers: [{ key: 'X-Robots-Tag', value: 'noindex, follow' }],
      },
    ];
  },
```

- [ ] **Step 6: Create the stub demo route**

```tsx
// app/sandbox/miles-chaser/layout.tsx  (replaced with the real layout in Task 6)
import '@/styles/globals.css';

export const metadata = {
  title: 'MilesChaser — HonuVibe Sandbox',
  robots: { index: false, follow: true },
};

export default function MilesChaserLayout({ children }: { children: React.ReactNode }) {
  return (
    <html lang="en">
      <body className="demo-miles-chaser">{children}</body>
    </html>
  );
}
```

```tsx
// app/sandbox/miles-chaser/page.tsx  (replaced with the real dashboard in Task 6)
export default function MilesChaserStub() {
  return <p>MilesChaser demo — spike stub</p>;
}
```

- [ ] **Step 7: Run the matcher test — PASS**

Run: `pnpm vitest run --project app __tests__/sandbox/middleware-matcher.test.ts`

- [ ] **Step 8: Prod-mode URL contract + bundle baseline**

```bash
pnpm build   # RECORD from the route table: "/[locale]/sandbox" First-Load JS → write it into the Task 7 checklist now (baseline)
pnpm start &
curl -s -o /dev/null -w "%{http_code}\n" http://localhost:3000/sandbox                 # 200
curl -s -o /dev/null -w "%{http_code}\n" http://localhost:3000/ja/sandbox              # 200
curl -s -o /dev/null -w "%{http_code}\n" http://localhost:3000/sandbox/miles-chaser    # 200 (stub)
curl -s -o /dev/null -w "%{http_code} %{redirect_url}\n" http://localhost:3000/ja/sandbox/miles-chaser
#   → 308  http://localhost:3000/sandbox/miles-chaser
curl -s -o /dev/null -w "%{http_code} %{redirect_url}\n" "http://localhost:3000/ja/sandbox/miles-chaser/trips?foo=1"
#   → 308  …/sandbox/miles-chaser/trips?foo=1   (query preserved)
curl -s http://localhost:3000/sandbox/miles-chaser | grep -c 'noindex'                 # ≥1 (meta)
curl -s -D - -o /dev/null http://localhost:3000/sandbox/miles-chaser | grep -i x-robots-tag  # noindex, follow
curl -s -D - -o /dev/null http://localhost:3000/sandbox | grep -ci x-robots-tag        # 0 (landing NOT tagged)
```
Also confirm `/sandbox` + `/ja/sandbox` still render their full landing HTML. Kill the server.

- [ ] **Step 9: verify:fast + commit**

```bash
pnpm verify:fast
git add middleware.ts next.config.ts app/sandbox __tests__/sandbox/middleware-matcher.test.ts
git diff --cached --stat   # review: exactly these paths
git commit -m "feat(sandbox): route-resolution spike — demo namespace excluded from intl, /ja redirect, X-Robots-Tag (phase B step 1)"
```

---

### Task 2: Dependencies + types + engine port (with deterministic engine test)

**Files:**
- Modify: `package.json` (via pnpm add)
- Create: `lib/sandbox/miles-chaser/types/domain.ts`, `lib/sandbox/miles-chaser/types/database.ts`
- Create: `lib/sandbox/miles-chaser/engine/{projectionEngine,pacingCalculator,gapAnalyzer,earningCalculator,microVacationScorer}.ts`
- Test: `__tests__/sandbox/miles-chaser-engine.test.ts`

**Interfaces:**
- Produces: `runProjection(input: ProjectionInput, today?: Date): ProjectionResult` where `ProjectionResult = {currentQM, currentQS, currentQD, projectedQM, projectedQS, projectedQD, targetTier, gapQM, gapQS, gapQD, pacing, monthlyTargetQM, monthlyTargetQS, monthlyTargetQD, summary, completionPct, achievable, dataSources}`; `scoreRoutes(...)`; and the `domain.ts`/`database.ts` types every later task imports.

- [ ] **Step 1: Add deps**

```bash
pnpm add swr recharts date-fns@^3.6.0
```
(recharts `^2.15.4` — same major as the source, React-19 OK. date-fns pinned to v3 — engine uses v3 APIs.)

- [ ] **Step 2: Port types (trimmed)**

Copy source `src/types/domain.ts` → `lib/sandbox/miles-chaser/types/domain.ts` (delete the Audit* types). Copy `src/types/database.ts` → `.../types/database.ts` keeping `Profile`, `LoyaltyProgram`, `TierDefinition`, `EarningRules`, `UserProgramEnrollment`, `Trip`, `TripSegment`, `MicroVacationRoute` + referenced enums; delete the rest. Header comment on both: `// Ported from MilesChaser (fictional demo data only) — trimmed to the sandbox slice.`

- [ ] **Step 3: Port the 5 engine modules verbatim**

Copy `src/lib/engine/{projectionEngine,pacingCalculator,gapAnalyzer,earningCalculator,microVacationScorer}.ts` → `lib/sandbox/miles-chaser/engine/`. Single edit per file: `from '@/types/domain'` → `from '../types/domain'`. No other changes (pure TS + date-fns). Do NOT port `auditEngine.ts`.

- [ ] **Step 4: Write the deterministic engine test (fixed clock, exact numbers)**

```ts
// __tests__/sandbox/miles-chaser-engine.test.ts
import { describe, it, expect } from 'vitest';
import { runProjection } from '@/lib/sandbox/miles-chaser/engine/projectionEngine';
import type { ProjectionInput } from '@/lib/sandbox/miles-chaser/types/domain';

/**
 * Deterministic projection check: fixed `today`, trivially-summable fixture.
 * Guards the port — if an engine edit or a date-fns major bump changes the
 * math, this fails loudly with exact numbers (unlike the store's structural
 * "projection changed" assertion).
 */
const input: ProjectionInput = {
  enrollment: {
    id: 'e1',
    currentQM: 10_000,
    currentQS: 10,
    currentQD: 1_000,
    targetTierKey: 'gold',
    yearStart: '2030-01-01',
    yearEnd: '2030-12-31',
  },
  targetTier: { key: 'gold', name: 'Gold', qm: 40_000, qs: 30, qd: 4_000 },
  earningTrips: [
    {
      tripId: 't1',
      status: 'planned',
      segments: [
        {
          estimatedQM: 2_000, estimatedQS: 2, estimatedQD: 200,
          actualQM: null, actualQS: null, actualQD: null,
          fareClass: 'M', isPartnerFlight: false,
        },
      ],
    },
  ],
};
const TODAY = new Date('2030-07-01T00:00:00Z');

describe('projection engine (ported) — deterministic', () => {
  it('projects current + planned exactly', () => {
    const r = runProjection(input, TODAY);
    expect(r.currentQM).toBe(10_000);
    expect(r.projectedQM).toBe(12_000); // 10,000 current + 2,000 planned
    expect(r.projectedQS).toBe(12);
    expect(r.projectedQD).toBe(1_200);
    expect(r.gapQM).toBe(28_000);       // 40,000 − 12,000
    expect(r.targetTier).toBe('gold');
    expect(['ahead', 'on_track', 'behind', 'achieved', 'at_risk']).toContain(r.pacing);
  });
});
```
NOTE: while porting, read `gapAnalyzer.ts` — if `gapQM` is computed against *current* rather than *projected*, adjust the expected value to the engine's actual definition (with a comment quoting the source line) rather than changing the engine. If the source `PacingStatus` union differs from the list above, use the source's literal values.

- [ ] **Step 5: Run — expect exact-value PASS**

Run: `pnpm vitest run --project app __tests__/sandbox/miles-chaser-engine.test.ts`

- [ ] **Step 6: Type-check + commit**

```bash
pnpm type-check
git add package.json pnpm-lock.yaml lib/sandbox/miles-chaser __tests__/sandbox/miles-chaser-engine.test.ts
git diff --cached --stat
git commit -m "feat(sandbox): port MilesChaser types + pure projection engine with deterministic test (phase B)"
```

---

### Task 3: Mock seed + client store (TDD — the heart of the demo)

**Files:**
- Create: `lib/sandbox/miles-chaser/mock-data.ts`
- Create: `lib/sandbox/miles-chaser/store.ts`
- Test: `__tests__/sandbox/miles-chaser-store.test.ts`

**Interfaces:**
- Consumes: `runProjection`, types from Task 2.
- Produces (exact — Task 4's hooks depend on these):

```ts
// store.ts exports
export type TripWithSegments = Trip & { trip_segments: TripSegment[] };
export type StoreOptions = {
  latencyMs?: number;              // tests pass 0; default 150–300ms random
  storage?: Pick<Storage, 'getItem' | 'setItem'> | null;  // tests inject; default sessionStorage
};
export type MilesChaserStore = {
  read: (path: string) => Promise<unknown>;
  createTrip: (input: Record<string, unknown>) => Promise<TripWithSegments>;
  updateTrip: (id: string, input: Record<string, unknown>) => Promise<TripWithSegments>;
  deleteTrip: (id: string) => Promise<void>;   // throws Error('Trip not found') for unknown id
  reset: () => void;
};
export function createStore(opts?: StoreOptions): MilesChaserStore;
export function getStore(): MilesChaserStore;  // lazy per-tab singleton
```

Read contract (source dev-mock body shapes, stricter on unknown IDs):
| path | payload |
|---|---|
| `/api/profile` | `{data: profile}` |
| `/api/enrollments` | `{data: [enrollment]}` (embeds `loyalty_programs`) |
| `/api/enrollments/<id>` | `{data: enrollment}` if `<id>` matches; else throw `Error('Enrollment not found')` |
| `/api/trips?status=&enrollment_id=&is_earning_flight=&limit=&offset=&sort=` | `{data: TripWithSegments[], pagination: {limit, offset, total}}` — **all six filters honored**; `total` = filtered count BEFORE offset/limit; invalid numeric params ignored |
| `/api/trips/<id>` | `{data: TripWithSegments}` or throw `Error('Trip not found')` |
| `/api/projection/<enrollmentId>` | `{data: runProjection(...)}` recomputed from live trips **filtered to that enrollment**; unknown id throws `Error('Enrollment not found')` |
| `/api/micro-vacations?origin=&enrollment_id=&tag=&limit=` | `{data: {routes, totalAvailable, isPremiumRequired: false, gap}}` — routes filtered by `origin` (and `tag` if the seed routes carry tags), `limit` applied AFTER `totalAvailable` is counted; `gap` = `{qm, qs, qd}` derived from the live projection's gap fields; unknown `enrollment_id` throws |

- [ ] **Step 1: Create the seed (verbatim fictional fixtures, year-shifted)**

Copy from source `src/lib/devMockData.ts` into `lib/sandbox/miles-chaser/mock-data.ts` ONLY: `MOCK_USER_ID`, `MOCK_PROGRAM_ID`, `MOCK_ENROLLMENT_ID`, `mockProgram`, `mockEnrollment`, `mockTrips`, `mockProfile`, `mockMicroVacations`, typed against `./types/database`. Skip: `mockProjection` (recomputed live), `mockSubscription`, `mockNotifications`, `mockHelpArticles`, `mockAuditRecords`, `getMockResponse`.

**Evergreen year shift** (the source fixtures are pinned to 2026 — a public demo must not expire): add at the bottom and apply to the exports:

```ts
// The source fixtures are authored against a 2026 qualification year. Shift
// every date to the CURRENT year at module init so the demo stays evergreen
// (pacing math needs "today" inside the qualification window).
const FIXTURE_YEAR = 2026;
const yearDelta = new Date().getFullYear() - FIXTURE_YEAR;

function shiftDate(iso: string): string {
  if (yearDelta === 0) return iso;
  return iso.replace(/^(\d{4})/, (y) => String(Number(y) + yearDelta));
}
```
Apply `shiftDate` to `mockEnrollment.qualification_year_start/_end`, every trip/segment date field in `mockTrips`, and any dated fields in `mockProfile` while constructing the exports (map over the raw literals; keep the raw literals verbatim so diffing against the source stays easy).

- [ ] **Step 2: Write the failing contract tests**

```ts
// __tests__/sandbox/miles-chaser-store.test.ts
import { describe, it, expect, beforeEach } from 'vitest';
import { createStore } from '@/lib/sandbox/miles-chaser/store';
import { MOCK_ENROLLMENT_ID, mockTrips, mockProfile } from '@/lib/sandbox/miles-chaser/mock-data';
import type { ProjectionResult } from '@/lib/sandbox/miles-chaser/types/domain';

type TripsBody = {
  data: Array<{ id: string; status: string; name?: string; trip_segments: unknown[] }>;
  pagination: { limit: number; offset: number; total: number };
};
type Body<T> = { data: T };
const KEY = 'honuvibe-sandbox-miles-chaser-v1';

const newTripInput = {
  name: 'Test Hop',
  enrollment_id: MOCK_ENROLLMENT_ID,
  origin: 'SEA',
  destination: 'HNL',
  start_date: '2031-08-01',
  end_date: '2031-08-05',
  status: 'planned',
  is_earning_flight: true,
  segments: [
    {
      origin: 'SEA', destination: 'HNL', flight_date: '2031-08-01',
      fare_class: 'M', is_partner_flight: false,
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

  it('trip detail throws for unknown ids (stricter than the source mock)', async () => {
    const s = store();
    await expect(s.read('/api/trips/nope')).rejects.toThrow('Trip not found');
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
    expect(body.data.totalAvailable).toBeGreaterThanOrEqual(body.data.routes.length);
    expect(body.data.isPremiumRequired).toBe(false);
    expect(body.data.gap.qm).toBeGreaterThanOrEqual(0);
    const wrongOrigin = (await s.read(
      `/api/micro-vacations?origin=ZZZ&enrollment_id=${MOCK_ENROLLMENT_ID}`,
    )) as Body<{ routes: unknown[] }>;
    expect(wrongOrigin.data.routes).toHaveLength(0);
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
    list.data[0].name = 'CORRUPTED';
    const again = (await s.read('/api/trips')) as TripsBody;
    expect(again.data[0].name).not.toBe('CORRUPTED');
  });

  it('reset() restores the seed', async () => {
    const s = store();
    await s.createTrip(newTripInput);
    s.reset();
    const list = (await s.read('/api/trips')) as TripsBody;
    expect(list.pagination.total).toBe(mockTrips.length);
  });
});
```

- [ ] **Step 3: Run — verify they fail** (`store.ts` doesn't exist)

Run: `pnpm vitest run --project app __tests__/sandbox/miles-chaser-store.test.ts`

- [ ] **Step 4: Implement the store**

```ts
// lib/sandbox/miles-chaser/store.ts
// Per-tab simulated backend for the MilesChaser demo. No server, no API
// routes: state lives in this module + sessionStorage (survives reload,
// ends with the tab — mirrored by the chrome tooltip copy).
import { runProjection } from './engine/projectionEngine';
import {
  MOCK_ENROLLMENT_ID, mockEnrollment, mockProfile, mockTrips, mockMicroVacations,
} from './mock-data';
import type { Trip, TripSegment, TierDefinition } from './types/database';
import type { ProjectionInput, SegmentEarningInput, TierInfo } from './types/domain';

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
    } catch { /* malformed — fall through to reseed */ }
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
      if (earning !== null) trips = trips.filter((t) => String(t.is_earning_flight) === earning);
      const sort = params.get('sort');
      if (sort) {
        // Source API sorts by column name, newest-first default. Mirror the
        // source route's sort options exactly (read it while porting); at
        // minimum support 'start_date' asc.
        trips = [...trips].sort((a, b) => String(a[sort as keyof Trip] ?? '').localeCompare(String(b[sort as keyof Trip] ?? '')));
      }
      const total = trips.length;
      const offset = num(params.get('offset')) ?? 0;
      const limit = num(params.get('limit')) ?? 20;
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
      let routes = clone(mockMicroVacations.routes);
      if (origin) routes = routes.filter((r) => r.origin === origin);
      if (tag) routes = routes.filter((r) => (r.tags ?? []).includes(tag));
      const totalAvailable = routes.length;
      const limit = num(params.get('limit'));
      if (limit !== null) routes = routes.slice(0, limit);
      const p = computeProjection(enrollmentId ?? MOCK_ENROLLMENT_ID);
      return {
        data: {
          routes,
          totalAvailable,
          isPremiumRequired: false, // billing is excluded from the demo
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
    const segments = rawSegments.map((s, i): TripSegment => ({
      // Explicit normalization — every TripSegment column gets a value.
      // While porting, reconcile this field list 1:1 against types/database.ts
      // (the source POST /api/trips route shows the server-side defaults).
      ...(s as Partial<TripSegment>),
      id: newId(),
      trip_id: id,
      segment_order: (s.segment_order as number) ?? i + 1,
      actual_qualifying_miles: null,
      actual_qualifying_segments: null,
      actual_qualifying_dollars: null,
      created_at: now,
      updated_at: now,
    }) as TripSegment);
    const { segments: _drop, ...tripFields } = input;
    const trip = {
      ...(tripFields as Partial<Trip>),
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
```

NOTE for the implementer: while copying `mock-data.ts` you will see the real `Trip`/`TripSegment` field lists AND the source `POST /api/trips` route's server-side defaults — reconcile `createTrip`'s normalization so every non-null column has an explicit value (`notes: null`, booking fields `null`, etc.). If the seed's route objects carry no `tags` field, drop the `tag` filter branch and its mention in the contract table. The tests in Step 2 are the contract.

- [ ] **Step 5: Run — all store tests PASS**

Run: `pnpm vitest run --project app __tests__/sandbox/miles-chaser-store.test.ts`
Expected: 12 passing.

- [ ] **Step 6: verify:fast + commit**

```bash
pnpm verify:fast
git add lib/sandbox/miles-chaser __tests__/sandbox/miles-chaser-store.test.ts
git diff --cached --stat
git commit -m "feat(sandbox): MilesChaser client store — versioned sessionStorage backend, full read contract, live projection (phase B)"
```

---

### Task 4: SWR hooks port (fetcher = store, mutations pruned)

**Files:**
- Create: `components/sandbox/miles-chaser/hooks/{useEnrollments,useTrips,useProjection,useProfile,useMicroVacations}.ts`
- Test: `__tests__/sandbox/miles-chaser-swr.test.tsx`

**Interfaces:**
- Consumes: `getStore()` from Task 3.
- Produces (same names/signatures as source): `useEnrollments()`, `useTrips(filters?)` (incl. `pagination`), `useTrip(id)`, `useProjection(enrollmentId)`, `useProfile()`, `useMicroVacations(filters)`, mutations `createTrip`/`updateTrip`/`deleteTrip`, `revalidateMicroVacations()`, and the exported types (`EnrollmentWithProgram`, `TripWithSegments`, `TripFilters`, `MicroVacationFilters`, `MicroVacationResponse`).

- [ ] **Step 1: Copy the 5 hook files** from source `src/hooks/` (skip `useSubscription`, `useNotifications`). Per file:
  1. Fetcher swap:
     ```ts
     import { getStore } from '@/lib/sandbox/miles-chaser/store';
     const fetcher = (path: string) => getStore().read(path);
     ```
     SWR keys stay IDENTICAL. Keep each hook's SWR options verbatim.
  2. Trip mutations: replace the `fetch` call bodies with `getStore().createTrip(input)` / `updateTrip(id, input)` / `deleteTrip(id)`; KEEP the `mutate(...)` revalidation lines verbatim (keys starting `/api/trips` and `/api/projection`).
  3. **Prune every mutation with no store operation** — the demo must contain zero `fetch()`: delete `updateProfile` (useProfile), `createEnrollment`/`updateEnrollment`/`deleteEnrollment` (useEnrollments), and `addSegment`/`updateSegment`/`deleteSegment` (useTrips) unless `trips/[id]/page.tsx` turns out to use segment mutations while porting — in that case add matching store methods (mirror `updateTrip`) instead of keeping fetch.
  4. Type imports → `@/lib/sandbox/miles-chaser/types/...`.

- [ ] **Step 2: Write the SWR revalidation integration test** (proves fetcher + mutate wiring end-to-end — the store unit tests can't see SWR):

```tsx
// __tests__/sandbox/miles-chaser-swr.test.tsx
import { describe, it, expect, beforeEach } from 'vitest';
import { renderHook, waitFor, act } from '@testing-library/react';
import { SWRConfig } from 'swr';
import type { ReactNode } from 'react';
import { useTrips, createTrip } from '@/components/sandbox/miles-chaser/hooks/useTrips';
import { useProjection } from '@/components/sandbox/miles-chaser/hooks/useProjection';
import { getStore } from '@/lib/sandbox/miles-chaser/store';
import { MOCK_ENROLLMENT_ID, mockTrips } from '@/lib/sandbox/miles-chaser/mock-data';

// NOTE: hooks use the getStore() singleton (default latency) — reset it and
// give SWR a fresh cache per test so tests stay isolated.
const wrapper = ({ children }: { children: ReactNode }) => (
  <SWRConfig value={{ provider: () => new Map(), dedupingInterval: 0 }}>{children}</SWRConfig>
);

describe('SWR hooks ↔ store revalidation', () => {
  beforeEach(() => {
    sessionStorage.clear();
    getStore().reset();
  });

  it('createTrip revalidates the trip list AND the projection', async () => {
    const trips = renderHook(() => useTrips(), { wrapper });
    const projection = renderHook(() => useProjection(MOCK_ENROLLMENT_ID), { wrapper });
    await waitFor(() => expect(trips.result.current.trips).toHaveLength(mockTrips.length));
    await waitFor(() => expect(projection.result.current.projection).toBeTruthy());
    const qmBefore = projection.result.current.projection!.projectedQM;

    await act(() => createTrip({
      name: 'Hook Hop', enrollment_id: MOCK_ENROLLMENT_ID, status: 'planned',
      is_earning_flight: true,
      segments: [{
        origin: 'SEA', destination: 'HNL', fare_class: 'M', is_partner_flight: false,
        estimated_qualifying_miles: 1000, estimated_qualifying_segments: 1,
        estimated_qualifying_dollars: 100,
      }],
    }));

    await waitFor(() => expect(trips.result.current.trips).toHaveLength(mockTrips.length + 1));
    await waitFor(() =>
      expect(projection.result.current.projection!.projectedQM).toBe(qmBefore + 1000),
    );
  });
});
```
(One focused test — create is the highest-risk wiring; update/delete reuse the identical mutate lines.)

- [ ] **Step 3: Run — PASS**

Run: `pnpm vitest run --project app __tests__/sandbox/miles-chaser-swr.test.tsx`

- [ ] **Step 4: Commit**

```bash
pnpm type-check
git add components/sandbox/miles-chaser/hooks __tests__/sandbox/miles-chaser-swr.test.tsx
git diff --cached --stat
git commit -m "feat(sandbox): port MilesChaser SWR hooks onto the client store, prune fetch mutations (phase B)"
```

---

### Task 5: UI + feature components + scoped CSS + boundary scan

**Files:**
- Create: `components/sandbox/miles-chaser/paths.ts`
- Create: `components/sandbox/miles-chaser/ui/*` (7), `dashboard/*` (5), `trips/*` (4), `micro-vacations/*` (2) — per File Structure
- Create: `components/sandbox/miles-chaser/miles-chaser.css`
- Test: `__tests__/sandbox/miles-chaser-boundaries.test.ts`

**Interfaces:**
- Consumes: hooks (Task 4), types (Task 2).
- Produces: components with the SOURCE export signatures, plus:
  ```ts
  // paths.ts
  export const MC_BASE = '/sandbox/miles-chaser';
  export const mcHref = (path: string) => `${MC_BASE}${path === '/dashboard' ? '' : path}`;
  // dashboard lives at MC_BASE itself; /trips → /sandbox/miles-chaser/trips, etc.
  ```

- [ ] **Step 1: paths.ts** — exactly as above.

- [ ] **Step 2: Write the boundary scan test FIRST** (it fails until the components land clean):

```ts
// __tests__/sandbox/miles-chaser-boundaries.test.ts
import { describe, it, expect } from 'vitest';
import { readdirSync, readFileSync } from 'node:fs';
import path from 'node:path';

/**
 * Static isolation contract for the demo tree: no network, no vendor SDKs,
 * no locale-aware Link, no unprefixed internal navigation, no source-app
 * import paths. Any hit is a porting mistake that manual QA might miss.
 */
const ROOTS = ['app/sandbox', 'components/sandbox', 'lib/sandbox/miles-chaser'];
const repo = path.resolve(__dirname, '../..');

function collect(dir: string): string[] {
  return readdirSync(dir, { withFileTypes: true }).flatMap((e) => {
    const p = path.join(dir, e.name);
    if (e.isDirectory()) return collect(p);
    return /\.(ts|tsx|css)$/.test(e.name) ? [p] : [];
  });
}

const FORBIDDEN: Array<[RegExp, string]> = [
  [/@\/i18n\/navigation/, 'demo must use plain next/link'],
  [/\bfetch\s*\(/, 'no network calls — the store is the backend'],
  [/from\s+['"][^'"]*(supabase|posthog|stripe)/i, 'vendor SDKs are excluded'],
  [/from\s+['"]@\/hooks\//, 'source-app import path leaked'],
  [/from\s+['"]@\/types\//, 'source-app import path leaked'],
  [/(href=|push\(|replace\(|location\.href\s*=\s*)["'`]\/(dashboard|trips|path-to-gold|micro-vacations|settings|ocr|audit|csv-import|help)\b/, 'unprefixed internal navigation'],
];

describe('miles-chaser demo tree boundaries', () => {
  const files = ROOTS.flatMap((r) => collect(path.join(repo, r)));
  it('scans a non-trivial tree', () => expect(files.length).toBeGreaterThan(20));
  for (const [re, why] of FORBIDDEN) {
    it(`contains no ${re}`, () => {
      const hits = files
        .filter((f) => re.test(readFileSync(f, 'utf8')))
        .map((f) => path.relative(repo, f));
      expect(hits, why).toEqual([]);
    });
  }
});
```
(Run it now: the tree count may pass but this pins the contract; it must be green by the end of this task.)

- [ ] **Step 3: Copy the 18 components** from the inventory paths. Mechanical edit rules per file:
  1. Import rewrites: `@/components/ui/X` → `../ui/X`; `@/hooks/useX` → `../hooks/useX`; `@/types/...` → `@/lib/sandbox/miles-chaser/types/...`.
  2. Navigation prefixing — covers **all** APIs, not just `<Link>`: `href="/x"` → `mcHref('/x')`; `router.push('/x')` / `router.replace('/x')` → `router.push(mcHref('/x'))` (TripForm uses `router.push('/trips')` — confirmed); `window.location.href = '/x'` → `mcHref('/x')`. Plain `next/link` only.
  3. Excluded-area edits:
     - `RecommendedRoutes.tsx`: DELETE the entire `isPremiumRequired` upsell block (billing is excluded — don't re-point it); the store always returns `isPremiumRequired: false` anyway. The `!homeAirport` EmptyState: unreachable with the fixed seed — replace its action with none (text-only: "This demo profile has a fixed home airport.").
     - `RecommendedRoutes.tsx` booking feedback: the source swallows errors into `console.error` and shows no success state. Add: a `bookedRouteId` state that renders an inline confirmation on the just-booked card ("Added to your trips" + `next/link` to `mcHref('/trips')`), and an inline error line on failure. Keep the existing per-route `addingRouteId` pending state (it already prevents double-clicks — verify the button is `disabled` while pending).
     - `TripList.tsx`: delete any `/csv-import` affordance.
     - `EmptyState` usages pointing at `/settings`: replace with `mcHref('/trips/new')` + "Add a trip" ONLY where the semantic is "you have no trips"; where the semantic is "configure settings" (missing enrollment/home airport — unreachable with the seed), use action-less explanatory text instead.
  4. Keep ALL Tailwind classes (incl. `dark:` variants) unchanged.
  5. `Button`/`Input`/`Select` keep `forwardRef` (valid in React 19).
  6. **A11y during the port** (not deferred to QA):
     - `Modal.tsx`: `role="dialog"` + `aria-modal="true"` + `aria-labelledby` to its title; Escape closes; initial focus moves into the dialog; focus returns to the trigger on close. If the source lacks any of these, add them now.
     - `PathToGoldChart.tsx`: wrap the chart in a container with `role="img"` and an `aria-label` summarizing the three metrics (e.g. "Progress toward Gold: miles X%, segments Y%, dollars Z% of target").
     - Icon-only buttons get `aria-label`s; form inputs keep/gain associated `<label>`s; error text is associated via `aria-describedby` where the source used bare colored text.
     - Interactive elements have visible `focus-visible` styles (the source's default rings are fine — don't strip them).

- [ ] **Step 4: miles-chaser.css**

```css
/* Scoped MilesChaser demo styles — everything under body.demo-miles-chaser.
   Ports the source :root/body vars + Tailwind v3 compat defaults. */
.demo-miles-chaser {
  --background: #ffffff;
  --foreground: #171717;
  color: var(--foreground);
  background: var(--background);
}
@media (prefers-color-scheme: dark) {
  .demo-miles-chaser {
    --background: #0a0a0a;
    --foreground: #ededed;
  }
}
/* Tailwind v3 preflight defaulted border-color to gray-200; v4 uses
   currentColor. Restore v3 behavior inside the demo only. */
.demo-miles-chaser *,
.demo-miles-chaser *::before,
.demo-miles-chaser *::after {
  border-color: rgb(229 231 235);
}
@media (prefers-color-scheme: dark) {
  .demo-miles-chaser *,
  .demo-miles-chaser *::before,
  .demo-miles-chaser *::after {
    border-color: rgb(55 65 81); /* gray-700 — matches source dark borders */
  }
}
```
While copying, grep components for `text-balance`; if used, add `.demo-miles-chaser .text-balance { text-wrap: balance; }`.

- [ ] **Step 5: Boundary scan + type-check green, commit**

```bash
pnpm vitest run --project app __tests__/sandbox/miles-chaser-boundaries.test.ts
pnpm type-check
git add components/sandbox/miles-chaser __tests__/sandbox/miles-chaser-boundaries.test.ts
git diff --cached --stat
git commit -m "feat(sandbox): port MilesChaser UI slice with a11y + navigation prefixing, add boundary scan (phase B)"
```

---

### Task 6: Demo chrome, root layout, pages

**Files:**
- Create: `components/sandbox/demo-chrome.tsx` (SHARED — Phase C reuses)
- Create: `components/sandbox/miles-chaser/shell.tsx`
- Replace: `app/sandbox/miles-chaser/layout.tsx`, `app/sandbox/miles-chaser/page.tsx` (stubs → real)
- Create: `app/sandbox/miles-chaser/trips/page.tsx`, `trips/new/page.tsx`, `trips/[id]/page.tsx`, `path-to-gold/page.tsx`, `micro-vacations/page.tsx`

**Interfaces:**
- Produces: `DemoChrome({ demoName, stateNote }: { demoName: string; stateNote: string })`.

- [ ] **Step 1: DemoChrome (shared, 44px controls, accessible tooltip)**

```tsx
// components/sandbox/demo-chrome.tsx
'use client';

import Link from 'next/link';
import { useId, useState } from 'react';
import { FlaskConical, X } from 'lucide-react';

type Props = {
  demoName: string;
  /** Per-demo reset-behavior copy, e.g. "Your changes live in this browser
   *  tab and reset when you close it." Shown in the badge tooltip. */
  stateNote: string;
};

/**
 * Slim sticky bar framing every sandbox demo. Styled with HonuVibe DARK
 * tokens so it reads as a frame around a foreign app. The bar is 44px tall
 * and every control stretches its full height (44px touch targets).
 * Tooltip: toggles on click, shows on hover/focus, closes on Escape,
 * announced via aria-describedby.
 */
export function DemoChrome({ demoName, stateNote }: Props) {
  const [tipOpen, setTipOpen] = useState(false);
  const tipId = useId();

  return (
    <div className="sticky top-0 z-[500] flex h-11 items-stretch gap-3 border-b border-white/10 bg-[#0d1220] px-4 text-white print:hidden">
      <span className="sr-only">
        This is an interactive HonuVibe Sandbox demo running on simulated data. {stateNote}
      </span>
      <Link
        href="/sandbox"
        className="flex items-center text-[13px] font-bold tracking-[-0.01em] text-white transition-opacity hover:opacity-80 focus-visible:outline focus-visible:outline-2 focus-visible:outline-[#3ec8c0]"
      >
        HonuVibe<span className="text-[#0fa9a0]">&nbsp;Sandbox</span>
      </Link>
      <span className="self-center text-white/30" aria-hidden>·</span>
      <span className="flex items-center text-[13px] font-medium text-white/80">{demoName}</span>

      <span
        className="relative ml-auto flex items-center"
        onMouseEnter={() => setTipOpen(true)}
        onMouseLeave={() => setTipOpen(false)}
      >
        <button
          type="button"
          onClick={() => setTipOpen((v) => !v)}
          onFocus={() => setTipOpen(true)}
          onBlur={() => setTipOpen(false)}
          onKeyDown={(e) => e.key === 'Escape' && setTipOpen(false)}
          aria-describedby={tipId}
          aria-expanded={tipOpen}
          className="inline-flex h-full min-w-[44px] items-center gap-1.5 rounded-none bg-transparent px-2.5 font-mono text-[10.5px] font-bold uppercase tracking-[0.12em] text-[#3ec8c0] focus-visible:outline focus-visible:outline-2 focus-visible:outline-[#3ec8c0]"
        >
          <span className="inline-flex items-center gap-1.5 rounded-full bg-[rgba(15,169,160,0.18)] px-2.5 py-1">
            <FlaskConical size={11} aria-hidden />
            Simulated data
          </span>
        </button>
        <span
          id={tipId}
          role="tooltip"
          hidden={!tipOpen}
          className="absolute right-0 top-full z-10 mt-1 w-64 rounded-lg border border-white/10 bg-[#131a2e] p-3 text-[12px] leading-relaxed text-white/85 shadow-lg"
        >
          {stateNote}
        </span>
      </span>

      <Link
        href="/sandbox"
        aria-label="Exit demo"
        className="inline-flex min-w-[44px] items-center gap-1 rounded-none px-2 text-[12.5px] font-semibold text-white/70 transition-colors hover:bg-white/10 hover:text-white focus-visible:outline focus-visible:outline-2 focus-visible:outline-[#3ec8c0]"
      >
        <X size={14} aria-hidden />
        Exit
      </Link>
    </div>
  );
}
```

- [ ] **Step 2: shell.tsx** — port the header + bottom nav from source `(app)/layout.tsx` as `'use client'` `MilesChaserShell({children})`:
  - DELETE: `NotificationBell`, `FeedbackWidget`, the `/help` header link.
  - `NAV_ITEMS`: exactly 4 — Dashboard (`mcHref('/dashboard')`), Trips, Path to Gold, Micro-Vacations (icons: reuse the source's approach; matching lucide icons for the two new items). Every nav link ≥44px touch target (the source bottom-nav items already are — keep their sizing).
  - Active state: `usePathname()` — dashboard = exact `MC_BASE`, others = prefix match.
  - Logo link → `mcHref('/dashboard')`.

- [ ] **Step 3: Real root layout** (replaces stub)

```tsx
// app/sandbox/miles-chaser/layout.tsx
import type { Metadata } from 'next';
import { Analytics } from '@vercel/analytics/next';
import { inter } from '@/app/fonts';
import { DemoChrome } from '@/components/sandbox/demo-chrome';
import { MilesChaserShell } from '@/components/sandbox/miles-chaser/shell';
import '@/styles/globals.css';
import '@/components/sandbox/miles-chaser/miles-chaser.css';

const STATE_NOTE = 'Your changes live in this browser tab and reset when you close it.';

export const metadata: Metadata = {
  title: 'MilesChaser — HonuVibe Sandbox',
  description:
    'Interactive demo of MilesChaser, a travel-rewards dashboard. 100% simulated data.',
  robots: { index: false, follow: true },
};

/**
 * Standalone root layout (precedent: app/studio-site/). Separate <html> from
 * app/[locale]/ — landing→demo is a full document load, so this layout must
 * carry its own analytics (Plausible pageview IS the launch event) and fonts.
 * The demo scope class lives on <body> so any future portals inherit it.
 * Plausible has no SRI hash deliberately — mirrors app/[locale]/layout.tsx
 * (Plausible rotates script contents; a hash would silently kill tracking).
 */
export default function MilesChaserLayout({ children }: { children: React.ReactNode }) {
  return (
    <html lang="en" className={inter.className}>
      <head>
        {process.env.NEXT_PUBLIC_PLAUSIBLE_DOMAIN && (
          <script
            defer
            data-domain={process.env.NEXT_PUBLIC_PLAUSIBLE_DOMAIN}
            src="https://plausible.io/js/script.js"
          />
        )}
      </head>
      <body className="demo-miles-chaser antialiased">
        <DemoChrome demoName="MilesChaser" stateNote={STATE_NOTE} />
        <MilesChaserShell>{children}</MilesChaserShell>
        <Analytics />
      </body>
    </html>
  );
}
```

- [ ] **Step 4: Pages**
  - `page.tsx` (dashboard): copy source `dashboard/page.tsx` with edits — delete `useSubscription` import + `isPremium`; Quick Actions keep ONLY "+ Add Trip" (`mcHref('/trips/new')`); the no-enrollment `EmptyState` (unreachable with the seed) becomes action-less explanatory text; all links via `mcHref`; imports from the demo tree.
  - `trips/page.tsx`, `trips/new/page.tsx`, `trips/[id]/page.tsx`: copy source pages, same rewrite rules. In `[id]`: Next 16 `params` is a Promise — client pages unwrap with `use(params)`:
    ```tsx
    const { id } = use(params); // import { use } from 'react'; type Props = { params: Promise<{ id: string }> }
    ```
  - `path-to-gold/page.tsx` (source is a STUB — real thin page with explicit load/error/empty states):
    ```tsx
    'use client';
    import { useEnrollments } from '@/components/sandbox/miles-chaser/hooks/useEnrollments';
    import { useProjection } from '@/components/sandbox/miles-chaser/hooks/useProjection';
    import PathToGoldChart from '@/components/sandbox/miles-chaser/dashboard/PathToGoldChart';
    import LoadingSpinner from '@/components/sandbox/miles-chaser/ui/LoadingSpinner';

    export default function PathToGoldPage() {
      const { enrollments, isLoading, error } = useEnrollments();
      const enrollment = enrollments[0];
      const { projection, error: projError } = useProjection(enrollment?.id ?? null);

      const body = (() => {
        if (error || projError)
          return <p className="text-sm text-red-600 dark:text-red-400 py-4">Failed to load projection data.</p>;
        if (isLoading || (enrollment && !projection))
          return <LoadingSpinner className="py-20" size="lg" />;
        if (!enrollment)
          return <p className="text-sm text-gray-500 dark:text-gray-400 py-4">No enrollment in this demo profile.</p>;
        return <PathToGoldChart enrollment={enrollment} projection={projection!} />;
      })();

      return (
        <div className="space-y-6">
          <div>
            <h1 className="text-2xl font-bold text-gray-900 dark:text-gray-100">Path to Gold</h1>
            <p className="text-sm text-gray-500 dark:text-gray-400 mt-1">Progress breakdown by metric</p>
          </div>
          {body}
        </div>
      );
    }
    ```
  - `micro-vacations/page.tsx`: same pattern hosting `RecommendedRoutes homeAirport={profile?.home_airport ?? null} enrollmentId={enrollment?.id ?? null}` via `useProfile` + `useEnrollments`, with the same explicit error/loading branches (`RecommendedRoutes` handles its own inner states).

- [ ] **Step 5: Full interactive smoke (dev server, storage reset first)**

`pnpm dev`; in a browser, open DevTools → Application → clear sessionStorage for localhost; then at `/sandbox/miles-chaser`:
  1. Dashboard renders with a real SWR loading flash → status card + chart show seed values (assert the STRUCTURE — bars, pacing badge, monthly targets — not hard-coded percentages; they drift with the date).
  2. Create a trip → appears in list → detail by NEW id → change status → delete → repeat for all → empty state renders.
  3. Projection/chart values changed after the create (compare before/after).
  4. Micro-vacations: book a route → inline "Added to your trips" confirmation → trip visible in list; button disabled while pending.
  5. Reload keeps state; an independently opened new tab starts fresh (open via the address bar, not tab-duplicate — duplicates legitimately inherit a sessionStorage copy).
  6. Chrome bar: tooltip on hover, focus, click; Escape closes; Exit returns to `/sandbox`.
  7. **Network tab: zero requests to `/api/*` during all of the above.** Console: no errors/hydration warnings on any of the 6 routes.
  8. View-source: `noindex` meta present.

- [ ] **Step 6: verify:fast + commit**

```bash
pnpm verify:fast
git add app/sandbox components/sandbox/demo-chrome.tsx components/sandbox/miles-chaser/shell.tsx
git diff --cached --stat   # ONLY demo-tree paths — the worktree has unrelated work
git commit -m "feat(sandbox): MilesChaser demo — chrome, root layout, dashboard/trips/path-to-gold/micro-vacations pages (phase B)"
```

---

### Task 7: Go live — registry flip, screenshot, QA, ship

**Files:**
- Modify: `lib/sandbox/demos.ts` (miles-chaser → `'live'`)
- Replace: `public/sandbox/miles-chaser.webp`

- [ ] **Step 1: Flip the registry** — `status: 'live'` for `miles-chaser` only. The landing card becomes a plain-`next/link` launch card automatically (Phase A built both branches).

- [ ] **Step 2: Recapture the screenshot — reproducible procedure**
  1. Prod server (`pnpm build && pnpm start`), light color scheme.
  2. Headless capture via the Phase A CDP probe: viewport **1440×900, deviceScaleFactor 1**, `prefers-reduced-motion: reduce`, fresh profile (empty sessionStorage = seed state), wait until the dashboard's chart SVG is present (not the loading spinner) + 2s settle.
  3. Crop to a **16:10 region (1240×775 from x=100,y=0)** including the chrome bar + status card; `sharp` → 1600×1000 WebP q82 → `public/sandbox/miles-chaser.webp`.
  4. Visually confirm: chrome bar visible, only fictional data, no loading states.

- [ ] **Step 3: QA checklist** (a11y was built in Tasks 5–6 — this verifies, not discovers):
  - Keyboard: tab through chrome + nav + trip form + delete modal; visible focus everywhere; modal Escape + focus return; tooltip reachable by keyboard.
  - Chart `role="img"` + label present (screen-reader summary).
  - Contrast spot-check in light AND dark (OS toggle — demo dark is media-driven).
  - 375px: no horizontal scroll on all 6 demo routes (CDP probe `scrollWidth === clientWidth`).
  - `prefers-reduced-motion` respected.
  - **Bundle isolation vs the Task 1 baseline**: `/[locale]/sandbox` First-Load JS within **+5 kB** of the recorded baseline; recharts/swr appear only in `/sandbox/miles-chaser*` chunks (route table + chunk inspection).

- [ ] **Step 4: Full gate + adversarial review**

```bash
pnpm verify
```
Dispatch a code-reviewer sub-agent over the full Phase B diff (requesting-code-review skill) prompted to REFUTE: cross-visitor state leakage (must be impossible — no server state), store-contract mismatches vs the hooks, unprefixed navigation, i18n-Link misuse, excluded-area imports, `fetch(` anywhere in the tree, a11y regressions, sensitive data. Triage with receiving-code-review; re-run `pnpm verify` after fixes.

- [ ] **Step 5: Ship**

```bash
git add lib/sandbox/demos.ts public/sandbox/miles-chaser.webp
git diff --cached --stat
git commit -m "feat(sandbox): MilesChaser demo live — registry flip + live-demo screenshot (phase B)"
git push origin main
```

---

## Done criteria

From the master plan:
- Launch from landing → dashboard with real SWR loading states.
- Trip create → appears in list → detail by new id → delete → empty-state renders.
- Projection updates after trip changes (asserted numerically in tests: `projectedQM` moves by the created segment's miles).
- Reload keeps tab state; an independently opened tab starts fresh (duplicated tabs may inherit a copy — wording matches real browser semantics).
- Chrome + noindex (meta AND X-Robots-Tag header) + Plausible + Vercel Analytics verified in the demo tree.
- 4-case URL contract green in prod mode (incl. `/ja/sandbox/miles-chaser` → 308 with query preserved).
- Registry flipped `live`; screenshot recaptured from the running demo via the reproducible procedure.
- QA checklist passed; `pnpm verify` green (+ `pnpm lint` if the eslint config has landed).

Added by rev 2 review:
- **Zero network requests to `/api/*`** during any demo interaction (Network-tab check + `fetch(`-free tree enforced by the boundary scan test).
- No console errors or hydration warnings on any demo route.
- Invalid/malformed/stale-version persisted state self-recovers to the seed (tested).
- All store read paths + all six trip filters have contract tests; pagination metadata correct.
- Every demo navigation (Link, router.push/replace, location.href) stays under `/sandbox/miles-chaser` (boundary scan).
- Deterministic fixed-clock engine test passes with exact numbers.
- Error, loading, empty, and mutation-failure states exist and are exercised (thin pages + booking feedback).
- `/[locale]/sandbox` First-Load JS within +5 kB of the pre-port baseline.

## Rejected review items (with reasons)

- **Playwright/Chromium automated E2E for the CRUD flow** — the master plan explicitly rejected E2E infra ("repo is vitest-only; manual checklist + contract tests cover a demo showcase"). The SWR integration test + store contract tests + CDP console/overflow probes cover the automated portion.
- **Middleware-function unit tests with `NextRequest`** — importing `middleware.ts` into vitest drags in `@supabase/ssr` + next-intl middleware with env expectations; brittle for the value. The redirect's status/destination/query behavior is asserted against the REAL server in Task 1 Step 8 (curl), plus the source-literal + regex matcher test.
- **Dynamic tooltip copy when persistence is unavailable** — over-engineering for a private-mode edge case; a `console.warn` records it and the demo still works in-memory.

## Risks / open decisions for Ryan's review

1. **Stub pages upgraded to real pages.** Source `path-to-gold` and `micro-vacations` pages are one-line stubs; their real UI lives in dashboard components. This plan builds thin real pages around `PathToGoldChart` / `RecommendedRoutes` to honor the master plan's 4-link nav. Alternative: 2-link nav and drop those routes — say the word and Task 6 shrinks.
2. **Micro-vacations "Book this trip" flow** — kept (creates a real trip in the store), now with visible success/error feedback.
3. **recharts on Next 16**: source needed `transpilePackages: ['recharts']` on Next 14. Expect Next 16 to handle it; if the Task 6 build fails on recharts ESM, add `transpilePackages: ['recharts']` to `next.config.ts` (one line, note it in the ship report).
4. **Engine "today" + evergreen seed**: fixtures are year-shifted to the current year at module init, so the demo stays valid past 2026; within a year, pacing numbers still drift day-to-day by design (it makes the demo feel alive).
5. **Plausible script has no SRI hash** — deliberate: mirrors `app/[locale]/layout.tsx` (Plausible rotates script contents; an `integrity` hash would silently kill tracking). SRI would be a site-wide, self-hosted-script decision.
