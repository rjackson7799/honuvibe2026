# INS-3 — Revenue-share tracking

## Context

INS-1 + INS-2 delivered the instructor pipeline — apply, approve, propose, review. Nothing of that produces money yet: every enrollment currently nets 100% to HonuVibe, partner or no partner, instructor or no instructor. INS-3 plugs the revenue-split layer in so that each Stripe-paid enrollment persists a **snapshot** of who owes whom, and admin can run a payout report (CSV) to pay instructors manually. Stripe Connect wiring comes later in INS-7 — for now payouts are a manual CSV → bank transfer loop, and `enrollment_instructor_shares` is the ledger.

Source spec: [docs/plans/2026-04-17-instructor-marketplace.md](2026-04-17-instructor-marketplace.md), Phase INS-3 (lines 234–330).

Pre-existing relevant state:
- `partners.revenue_share_pct numeric(5,2) DEFAULT 0` already exists (migration 029) but is **never read** anywhere yet. INS-3 makes it load-bearing.
- `enrollments.partner_id` already exists (migration 029). No revenue-snapshot columns yet.
- `course_instructors` already exists (migration 015). No per-instructor weight column yet.
- Stripe webhook handles `checkout.session.completed` at [lib/stripe/webhooks.ts](../../lib/stripe/webhooks.ts) `handleCheckoutCompleted()`. No `charge.refunded` handler exists.
- Admin revenue page at `/admin/revenue` shows aggregate totals only — no per-instructor / per-partner breakdown, no payout workflow.
- Vitest is configured (`vitest.config.ts`, `vitest.setup.ts`) but **no `lib/**/*.test.ts` files exist yet**. INS-3 introduces the first one.

## Locked decisions

- **Forward-only**: splits are computed on new enrollments from webhook time onward. No backfill of historical enrollments (their snapshot columns stay at 0 = 100% HonuVibe). Admin can manually adjust if needed.
- **Round-half-away-from-zero**, residue absorbed by HonuVibe share. All math in smallest currency unit (cents / yen), integer only.
- **JPY has no decimal unit**; same integer math applies — `price_jpy` is already whole yen in the DB.
- **Instructor pool allocation**: if `course_instructors` rows for a course don't sum to exactly 100, the pool splits proportionally by their weights (pragmatic handling; admin UI enforces sum=100 at save time but webhook is tolerant so a mid-transaction config change doesn't break enrollment).
- **Zero instructors assigned**: `instructor_share_amount = 0` — the instructor pool collapses into HonuVibe share even if `courses.instructor_revenue_share_pct > 0`. Log a warning.
- **Refund**: `charge.refunded` marks **all** related `enrollment_instructor_shares` rows as `clawed_back`, regardless of whether they were `pending` or `paid`. Admin reconciles paid-then-refunded with the instructor manually (note: not uncommon; volume is low in v1). Enrollment row status flips to `refunded` (already happens via existing Stripe subscription code path? — verify during execution; if not, add it to the refund handler).
- **CSV export scope**: one CSV per run, filtered by `status = 'pending'` by default; admin can optionally include paid/clawed_back via a query param.

## Migration — `supabase/migrations/033_revenue_split.sql`

```sql
-- ============================================================
-- REVENUE SPLIT — Per-enrollment instructor/partner/HonuVibe snapshot.
-- Feeds manual CSV payouts (INS-3); Stripe Connect comes in INS-7.
-- ============================================================

ALTER TABLE courses
  ADD COLUMN IF NOT EXISTS instructor_revenue_share_pct numeric(5,2) DEFAULT 0;

ALTER TABLE course_instructors
  ADD COLUMN IF NOT EXISTS revenue_share_pct numeric(5,2) DEFAULT 0;

ALTER TABLE enrollments
  ADD COLUMN IF NOT EXISTS partner_share_amount integer DEFAULT 0,
  ADD COLUMN IF NOT EXISTS instructor_share_amount integer DEFAULT 0,
  ADD COLUMN IF NOT EXISTS honuvibe_share_amount integer DEFAULT 0;

CREATE TABLE IF NOT EXISTS enrollment_instructor_shares (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  enrollment_id uuid NOT NULL REFERENCES enrollments(id) ON DELETE CASCADE,
  instructor_id uuid NOT NULL REFERENCES instructor_profiles(id),
  amount integer NOT NULL,
  currency text NOT NULL,
  status text NOT NULL DEFAULT 'pending'
    CHECK (status IN ('pending', 'paid', 'clawed_back')),
  paid_at timestamptz,
  payout_reference text,
  created_at timestamptz NOT NULL DEFAULT now(),
  UNIQUE(enrollment_id, instructor_id)
);

CREATE INDEX IF NOT EXISTS idx_eis_instructor_status
  ON enrollment_instructor_shares(instructor_id, status);
CREATE INDEX IF NOT EXISTS idx_eis_enrollment
  ON enrollment_instructor_shares(enrollment_id);
CREATE INDEX IF NOT EXISTS idx_eis_status_created
  ON enrollment_instructor_shares(status, created_at DESC);

ALTER TABLE enrollment_instructor_shares ENABLE ROW LEVEL SECURITY;

CREATE POLICY "eis_admin_all" ON enrollment_instructor_shares
  FOR ALL USING (public.is_admin());

CREATE POLICY "eis_own_read" ON enrollment_instructor_shares
  FOR SELECT USING (
    EXISTS (
      SELECT 1 FROM instructor_profiles ip
      WHERE ip.id = enrollment_instructor_shares.instructor_id
        AND ip.user_id = auth.uid()
    )
  );
```

## Split computation — `lib/revenue-split/compute.ts`

Pure function. No DB, no network, no imports beyond types.

```ts
export type InstructorWeight = { instructor_id: string; pct: number };

export type SplitInput = {
  gross: number;                      // cents (USD) or yen (JPY), integer
  partnerSharePct: number | null;     // 0–100; null or 0 = no partner
  instructorSharePct: number;         // 0–100; % of gross that goes to the instructor pool
  instructorWeights: InstructorWeight[]; // per-instructor weights (sum ~100)
};

export type SplitOutput = {
  partner: number;                    // cents/yen
  instructor_total: number;           // cents/yen
  honuvibe: number;                   // cents/yen (absorbs rounding)
  per_instructor: Array<{ instructor_id: string; amount: number }>;
};

export function computeEnrollmentSplit(input: SplitInput): SplitOutput;
```

Algorithm:
1. Clamp `partnerSharePct` and `instructorSharePct` to [0, 100]; if sum > 100 → throw (caller's bug).
2. `partner = round(gross * partnerSharePct / 100)`.
3. `instructor_total = round(gross * instructorSharePct / 100)`.
4. If `instructorWeights` empty OR sum of pct = 0 → `instructor_total = 0`, `per_instructor = []`.
5. Otherwise: for each weight, `amount = round(instructor_total * pct / totalWeight)` where `totalWeight = sum(pct)`. Distribute the rounding residue to the first/largest weight deterministically so `sum(per_instructor.amount) === instructor_total`.
6. `honuvibe = gross - partner - instructor_total` (always absorbs leftover).

Rounding helper: `function roundHalfAwayFromZero(n: number): number`.

### Unit tests — `lib/revenue-split/compute.test.ts`

Cases to cover:
- 0% partner, 0% instructor → HonuVibe = gross.
- 100% instructor, single instructor → instructor gets everything.
- 50% instructor, two instructors 60/40 → pool splits 60/40 with residue deterministic.
- 10% partner, 30% instructor, three instructors 33/33/34 → full snapshot.
- Empty `instructorWeights` with non-zero `instructorSharePct` → pool stays at 0, residue → HonuVibe.
- Weights that sum to 99 or 101 → still allocate proportionally within the pool.
- JPY (whole yen) edge: gross=1000, 33% instructor, two 50/50 → 165/165 = 330; HonuVibe absorbs 0 or 1 depending on rounding.
- Gross = 0 → all outputs 0.
- Malformed (negative pct, sum > 100) → throws.

Mirror existing vitest.config alias resolution — import helper as `@/lib/revenue-split/compute`.

## Webhook integration — `lib/stripe/webhooks.ts`

In `handleCheckoutCompleted()`, after the enrollment is created (the `.insert({...}).select().single()` block):

1. Fetch in parallel via the admin client:
   - `courses.instructor_revenue_share_pct` (single row)
   - `partners.revenue_share_pct` if `partner_id` is set (single row)
   - `course_instructors` rows for this course: `{ instructor_id, revenue_share_pct }[]`
2. Call `computeEnrollmentSplit({ gross: session.amount_total, partnerSharePct, instructorSharePct, instructorWeights })`.
3. `update` the newly created enrollment with `partner_share_amount`, `instructor_share_amount`, `honuvibe_share_amount`.
4. For each `per_instructor.amount > 0`, `insert` into `enrollment_instructor_shares` with `status = 'pending'`, `currency` from enrollment, `amount`, `instructor_id`.
5. Wrap all failures in a try/catch — if split persistence fails, **do not** roll back the enrollment (the payment succeeded; losing the split ledger is admin-recoverable via a one-off script). Log loudly.

New helper: `persistEnrollmentSplit(adminClient, enrollmentId, courseId, partnerId, grossAmount, currency)` in `lib/revenue-split/persist.ts` — thin DB wrapper around `computeEnrollmentSplit`. Keeps the webhook handler readable.

### New refund handler — `handleChargeRefunded()`

- Resolve enrollment by `stripe_payment_intent_id` from `event.data.object.payment_intent`.
- Flip enrollment `status` to `refunded`, stamp `refunded_at` (add column if missing — check during execution).
- Update all `enrollment_instructor_shares` where `enrollment_id = <x>` to `status = 'clawed_back'`.
- Decrement `courses.current_enrollment`.
- Log `payments` audit row.

Wire it up in `app/api/stripe/webhook/route.ts` — add `case 'charge.refunded': await handleChargeRefunded(event); break;`.

## Admin UI

### `components/admin/CourseRevenueSplitEditor.tsx` (new, client)

Rendered in the **overview tab** of `AdminCourseDetail`, adjacent to `InstructorAssignControl`. Contents:
- Single numeric input: `instructor_revenue_share_pct` (0–100).
- Table of assigned instructors with a `revenue_share_pct` numeric input per row.
- Live-computed "Sum: 100 / needs 100" indicator. Save button disabled when sum ≠ 100 and pool > 0.
- Preview row showing the split on a sample gross (e.g., a $100 / ¥15,000 preview using `computeEnrollmentSplit`).
- Persists via a new server action `updateCourseRevenueSplit(courseId, { instructorSharePct, weights })` in `lib/courses/actions.ts` (or a new `lib/revenue-split/actions.ts` — choose at execution time based on existing file weight).

### `/admin/payouts/instructors/page.tsx` (new)

Server component. Filters (from searchParams):
- `status` — default `pending`; also `paid`, `clawed_back`, `all`.
- `instructor_id` — optional filter.
- `from` / `to` — date range on `created_at`.

Reads via `getInstructorPayouts(filters)` in `lib/revenue-split/queries.ts`. Renders:
- Header with totals by currency: "Pending: $X,XXX USD · ¥YYY,YYY JPY".
- Instructor selector (single-select) that changes the query.
- Table: course, student (anonymized to email or display_name), gross, instructor share, currency, status, created_at, paid_at, payout_reference.
- Row checkbox + "Mark selected as paid" button with a `payout_reference` prompt.
- "Export CSV" button linking to the CSV route with the same query string.

Add a **Payouts** entry to `AdminNav.tsx` (icon: `Wallet` or `Banknote` from lucide). Put it between Revenue and Surveys to keep money-flow items grouped. (Actually — put it directly after Revenue, or fold "Instructor payouts" as a sub-entry under /admin/revenue; prefer a separate top-level for discoverability in v1.)

### `/api/admin/payouts/instructors/csv/route.ts` (new)

Mirror the pattern in [app/api/admin/partners/[id]/enrollments/csv/route.ts](../../app/api/admin/partners/%5Bid%5D/enrollments/csv/route.ts) — `requireAdmin`, `createAdminClient()`, `.select` with joins, `csvEscape` helper, `Content-Disposition: attachment; filename="instructor-payouts-<ISO>.csv"`.

Columns: `enrollment_id, course_title_en, student_email, instructor_id, instructor_display_name, amount, currency, status, created_at, paid_at, payout_reference`.

### `/api/admin/payouts/instructors/mark-paid/route.ts` (new)

`POST` with body `{ shareIds: string[], payoutReference: string }`. `requireAdmin`. Bulk-update matching `enrollment_instructor_shares` rows — only those currently `pending` → set `status = 'paid'`, `paid_at = now()`, `payout_reference`. Return `{ updated: n }`. Revalidate `/admin/payouts/instructors`.

## Files — INS-3

### New
- `supabase/migrations/033_revenue_split.sql`
- `lib/revenue-split/compute.ts`
- `lib/revenue-split/compute.test.ts`
- `lib/revenue-split/persist.ts`
- `lib/revenue-split/queries.ts`
- `lib/revenue-split/actions.ts` *(or merge into `lib/courses/actions.ts`; decide at execution)*
- `components/admin/CourseRevenueSplitEditor.tsx`
- `components/admin/AdminPayoutsTable.tsx` *(client; checkbox selection + mark-paid UX)*
- `app/[locale]/admin/payouts/layout.tsx` *(thin — reuse `AdminLayout` via parent)*
- `app/[locale]/admin/payouts/instructors/page.tsx`
- `app/api/admin/payouts/instructors/csv/route.ts`
- `app/api/admin/payouts/instructors/mark-paid/route.ts`

### Modified
- `lib/stripe/webhooks.ts` — call `persistEnrollmentSplit(...)` at end of `handleCheckoutCompleted()`; add `handleChargeRefunded()`.
- `app/api/stripe/webhook/route.ts` — wire `case 'charge.refunded'`.
- `components/admin/AdminCourseDetail.tsx` — mount `<CourseRevenueSplitEditor>` in the overview tab.
- `components/admin/AdminNav.tsx` — add Payouts entry.
- `lib/courses/types.ts` — add `instructor_revenue_share_pct` to `Course`; add `revenue_share_pct` on the course-instructor join type if it exists.
- `lib/instructors/types.ts` (check path during execution) — add the new join field.

## Verification

1. **Type check:** `npx tsc --noEmit` — zero new errors.
2. **Unit tests:** `npx vitest run lib/revenue-split` — all pass. This is the first suite to land under `lib/`, so also confirm the runner picks it up out of the box.
3. **Build:** `npx next build` — succeeds. Confirm new routes show up: `/admin/payouts/instructors`, `/api/admin/payouts/instructors/csv`, `/api/admin/payouts/instructors/mark-paid`.
4. **Migration:** apply `033_revenue_split.sql` to local Supabase; confirm columns + table + policies in place (`\d enrollment_instructor_shares`).
5. **Admin configuration path (manual):**
   - Sign in as admin → open an existing course's detail page.
   - Set `instructor_revenue_share_pct = 30`, add 2 instructors with weights 60/40, save. Confirm save is blocked when weights sum to 99.
6. **Webhook path (manual, local Stripe CLI):**
   - Trigger a test `checkout.session.completed` with metadata pointing at a configured course.
   - Confirm: `enrollments.instructor_share_amount`, `partner_share_amount`, `honuvibe_share_amount` populated; `enrollment_instructor_shares` rows created with `status='pending'`.
   - Trigger `charge.refunded` for the same payment intent. Confirm: enrollment status `refunded`; related share rows flipped to `clawed_back`.
7. **Payout flow (manual):**
   - Visit `/admin/payouts/instructors` → see pending shares.
   - Select a row, "Mark as paid" with reference `BATCH-2026-04-30`. Row updates to `paid` with `paid_at` and `payout_reference`.
   - Click "Export CSV" with `?status=pending` → downloaded CSV has the remaining pending rows only.
8. **Instructor view check:** as an instructor user (via RLS `eis_own_read`), query via the Supabase client — confirm the instructor only sees their own share rows, not anyone else's. Defer building an instructor-facing payout page (that's INS-4).

## Commit plan

One commit, staged by name:

```
supabase/migrations/033_revenue_split.sql
lib/revenue-split/**
lib/stripe/webhooks.ts
lib/courses/types.ts
(lib/instructors/types.ts if changed)
app/api/stripe/webhook/route.ts
app/api/admin/payouts/**
app/[locale]/admin/payouts/**
components/admin/CourseRevenueSplitEditor.tsx
components/admin/AdminPayoutsTable.tsx
components/admin/AdminCourseDetail.tsx
components/admin/AdminNav.tsx
docs/plans/2026-04-21-ins-3-revenue-split.md
```

Message: `feat(instructors): INS-3 — revenue-share tracking + payout ledger`. Push to `main`.

## Out of scope (deferred)

- Instructor-facing payout dashboard (`/instructor/payouts`) — INS-4.
- Tax forms (W-9 / 1099 / Japanese equivalents) — INS-4.
- Stripe Connect automated transfers — INS-7.
- Historical backfill of pre-INS-3 enrollments.
- Multi-currency conversion (each enrollment is single-currency; admin runs separate USD and JPY payout batches).
- Partner payout UI (`partners.revenue_share_pct` snapshot lands on enrollment, but the existing `/admin/revenue` page handles partner reporting — separate payout workflow for partners is a later plan if ever needed).
- Edit of already-paid share rows (immutable once marked paid; corrections happen via a manual DB patch).
