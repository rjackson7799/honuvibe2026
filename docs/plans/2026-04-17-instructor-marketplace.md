# Plan: Instructor Marketplace (Apply, Propose, Earn)

**Date:** 2026-04-17
**Status:** Ready for implementation
**Companion to:** [2026-04-16-partner-whitelabel.md](./2026-04-16-partner-whitelabel.md)

---

## Context

Dylan (SmashHaus) flagged that his 500k-member music-maker community is looking for ways to earn additional revenue. Combined with the partner work already in progress, this suggests a larger opportunity: a self-serve path for qualified community members (SmashHaus or otherwise) to apply to become HonuVibe instructors, propose their own courses, and earn revenue when those courses sell.

This is an *extension* of the partner plan, not a replacement. The partner system brings an audience in; the instructor marketplace lets members of that audience create supply on the platform. Together they form a two-sided marketplace with HonuVibe as the curated quality gate.

### Decisions locked in

| # | Decision | Value |
|---|---|---|
| 1 | Approval | **HonuVibe admin only** — no partner-delegated approval (keeps brand quality consistent) |
| 2 | Course authoring | **Propose → admin reviews → publishes** — instructors draft, admin reviews, admin publishes |
| 3 | Revenue split | **Three-way** — partner share (if attributed) comes off gross first, then instructor/HonuVibe split the remainder at a per-course rate |
| 4 | Payouts | **Manual first (CSV), Stripe Connect later** — schema tracks per-enrollment splits from day one so the Connect migration is non-breaking |
| 5 | Positioning | **Curated, not open marketplace** — HonuVibe selectively invites top community experts (via SmashHaus et al.) + internally developed masterclass experts. Not a Udemy/Teachable clone. Roster measured in 20–50, not 500k. |

### What already exists in the codebase (reuse, don't rebuild)

- [supabase/migrations/015_multi_instructor.sql](../../supabase/migrations/015_multi_instructor.sql) — `course_instructors` many-to-many join with `role` (lead | instructor | guest)
- `instructor_profiles` table with bilingual bio fields, social links, photo
- `users.role = 'instructor'` already supported
- [lib/instructors/actions.ts](../../lib/instructors/actions.ts) — mature admin flows: `createInstructorProfile`, `createNewUserAndInstructor`, `demoteToStudent`, `addInstructorToCourse`, `syncLegacyInstructorId`
- Instructor welcome email + admin notification flow via `lib/email/send.ts`
- Admin UI at `/admin/instructors`
- Courses have `status` enum: `draft | published | in-progress | completed | archived` (we'll add `proposal`)

**The gap:** no self-serve application path, no instructor authoring UI, no revenue-share tracking, no instructor dashboard.

---

## How this composes with the partners platform

The partner plan introduces `enrollments.partner_id` (last-touch at purchase) and `users.referred_by_partner_id` (first-touch sticky). This plan adds revenue-split snapshot columns on the same `enrollments` row so every sale carries its own full audit trail:

```
enrollments row
├── user_id, course_id, amount_paid, currency           ← existing
├── partner_id                                          ← added in partner plan (Phase 1)
├── partner_share_amount                                ← added here — cents/yen snapshot
├── instructor_share_amount                             ← added here — cents/yen snapshot
└── honuvibe_share_amount                               ← added here — cents/yen snapshot
```

**Computation at webhook time** (order matters):
1. Start with `session.amount_total` (gross).
2. If `partner_id IS NOT NULL`, partner share = `gross × partners.revenue_share_pct / 100`.
3. Remainder after partner share = `gross − partner_share`.
4. Instructor share = `remainder × courses.instructor_revenue_share_pct / 100`.
5. If the course has multiple instructors, split the instructor pool using `course_instructors.revenue_share_pct` (defaults to 100% for lead, 0% for others — must sum to 100 per course).
6. HonuVibe share = `gross − partner_share − instructor_share`.

Stored as a snapshot so rate changes in `partners` or `courses` never rewrite historical payouts.

**Deliberate non-coupling:** an instructor's recruitment source does *not* create a permanent partner rev-share claim. Partner earns on student attribution (already attributed enrollments), not on instructor lifetime sales. If SmashHaus wants to reward members who become instructors, that's a SmashHaus-side incentive program, not a HonuVibe obligation. Keeps the split model simple.

---

## Phasing

```
INS-1 ─ Application flow + admin review              (3-5 days)
INS-2 ─ Course proposal + review workflow            (1 week)
INS-3 ─ Revenue-share tracking (schema + compute)    (3-5 days)
INS-4 ─ Instructor dashboard + tax forms + manual    (1 week)
        payout report
INS-5 ─ Ratings & reviews                            (4-5 days, trigger after 5 instructor courses)
INS-6 ─ Student-instructor Q&A + dispute handling    (1 week, trigger after 20 active instructors)
INS-7 ─ Stripe Connect migration                     (deferred — trigger when manual CSV payouts become a time sink)
```

Ship INS-1 through INS-4 in sequence. INS-5 and INS-6 are scoped but deferred — implemented when the named triggers fire. INS-7 is a later upgrade when volume justifies automated payouts.

---

## Phase INS-1 — Application flow

### 1.1 Migration — `instructor_applications`

```sql
CREATE TABLE instructor_applications (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),

  -- Applicant identity (either logged-in user or anonymous email)
  applicant_user_id uuid REFERENCES public.users(id) ON DELETE SET NULL,
  applicant_email text NOT NULL,
  applicant_full_name text NOT NULL,

  -- Attribution (optional — if they applied via a partner page)
  referred_by_partner_id uuid REFERENCES partners(id),

  -- Application content
  bio_short text NOT NULL,
  expertise_areas jsonb,                -- array of tags/topics
  proposed_topic text,                  -- what they want to teach
  sample_material_url text,             -- portfolio / sample video / social
  linkedin_url text,
  website_url text,
  why_honuvibe text,

  -- Review
  status text DEFAULT 'pending'
    CHECK (status IN ('pending', 'approved', 'rejected', 'withdrawn')),
  reviewed_by_user_id uuid REFERENCES public.users(id),
  reviewed_at timestamptz,
  review_notes text,                    -- admin-only notes
  rejection_reason text,                -- shown to applicant

  -- Outcome
  created_instructor_profile_id uuid REFERENCES instructor_profiles(id),

  submitted_at timestamptz DEFAULT now(),
  updated_at timestamptz DEFAULT now()
);

CREATE INDEX idx_instructor_applications_status ON instructor_applications(status);
CREATE INDEX idx_instructor_applications_applicant ON instructor_applications(applicant_user_id);

ALTER TABLE instructor_applications ENABLE ROW LEVEL SECURITY;

-- Applicants can read their own application
CREATE POLICY "applications_own_read" ON instructor_applications
  FOR SELECT USING (applicant_user_id = auth.uid());

-- Anonymous inserts allowed (form submission without auth)
CREATE POLICY "applications_public_insert" ON instructor_applications
  FOR INSERT WITH CHECK (true);

-- Admin full access
CREATE POLICY "applications_admin_all" ON instructor_applications
  FOR ALL USING (public.is_admin());
```

### 1.2 Public application form

- Route: `app/[locale]/become-an-instructor/page.tsx` (marketing + form)
- Form submits to `/api/instructor-applications/submit`
- Captures `hv_partner` cookie → `referred_by_partner_id` (attribution to recruiting partner)
- Sends "application received" email to applicant + notification email to admin
- Bilingual — lives on main domain (marketing page)

### 1.3 Admin review UI

- Route: `app/[locale]/admin/instructor-applications/page.tsx` (queue)
- Route: `app/[locale]/admin/instructor-applications/[id]/page.tsx` (detail)
- Actions:
  - **Approve** — triggers existing `createInstructorProfile` (if applicant has a user account) or `createNewUserAndInstructor` (if anonymous), stamps `created_instructor_profile_id`, sends welcome email via existing flow
  - **Reject** — sets status, stores `rejection_reason`, sends rejection email (short and kind)
  - **Request more info** — defer; email manually for now

### 1.4 Files — INS-1

**New:**
- `supabase/migrations/<ts>_instructor_applications.sql`
- `app/[locale]/become-an-instructor/page.tsx`
- `app/api/instructor-applications/submit/route.ts`
- `app/[locale]/admin/instructor-applications/page.tsx`
- `app/[locale]/admin/instructor-applications/[id]/page.tsx`
- `app/api/admin/instructor-applications/[id]/route.ts`
- `lib/instructor-applications/actions.ts`
- `lib/email/templates/instructor-application.ts`

**Modified:**
- `lib/email/send.ts` — add `sendInstructorApplicationReceived`, `sendInstructorApplicationRejected`, `sendInstructorApplicationAdminNotification`
- `messages/en.json`, `messages/ja.json` — `instructor_apply.*` namespace

---

## Phase INS-2 — Course proposal flow

### 2.1 Schema changes

Extend the existing `courses.status` enum:

```sql
ALTER TABLE courses DROP CONSTRAINT courses_status_check;
ALTER TABLE courses ADD CONSTRAINT courses_status_check
  CHECK (status IN ('draft', 'proposal', 'published', 'in-progress', 'completed', 'archived', 'rejected'));

ALTER TABLE courses ADD COLUMN IF NOT EXISTS proposed_by_instructor_id uuid
  REFERENCES instructor_profiles(id);
ALTER TABLE courses ADD COLUMN IF NOT EXISTS proposal_submitted_at timestamptz;
ALTER TABLE courses ADD COLUMN IF NOT EXISTS proposal_review_notes text;
```

### 2.2 Instructor authoring UI

- Route: `app/[locale]/instructor/` (new portal — mirror `/admin/` layout but scoped to owner)
- `app/[locale]/instructor/courses/page.tsx` — list my courses + proposals
- `app/[locale]/instructor/courses/new/page.tsx` — create a proposal (title, description, outline, proposed pricing, target audience — uses existing course fields but saves as `status = 'proposal'`)
- `app/[locale]/instructor/courses/[id]/edit/page.tsx` — edit own proposal (only while `status = 'proposal'`)

**Form scope in v1:** only proposal-level fields. No per-week/session authoring in the instructor UI yet — once admin approves and publishes, admin fills in weeks/sessions via existing `/admin/courses/[id]` flow. This cuts scope dramatically. Expand later if instructors want full authoring.

### 2.3 Admin review UI

- Route: `app/[locale]/admin/courses/proposals/page.tsx` — filtered list where `status = 'proposal'`
- Reuse existing `app/[locale]/admin/courses/[id]/page.tsx` for detail (just add proposal-specific actions)
- Actions:
  - **Approve** → move to `status = 'draft'`, admin completes weeks/sessions/pricing, then publishes as normal
  - **Reject** → move to `status = 'rejected'`, store `proposal_review_notes` (visible to instructor), send email
  - **Request revision** → comment-only for now; email the instructor manually

### 2.4 Middleware update

Extend [middleware.ts](../../middleware.ts) to protect `/instructor/*` routes — require `user.role = 'instructor'`.

### 2.5 Files — INS-2

**New:**
- `supabase/migrations/<ts>_course_proposals.sql`
- `app/[locale]/instructor/layout.tsx`
- `app/[locale]/instructor/courses/page.tsx`
- `app/[locale]/instructor/courses/new/page.tsx`
- `app/[locale]/instructor/courses/[id]/edit/page.tsx`
- `app/[locale]/admin/courses/proposals/page.tsx`
- `app/api/instructor/courses/route.ts`
- `lib/instructor-portal/actions.ts`
- `lib/instructor-portal/queries.ts`

**Modified:**
- `middleware.ts` — add `/instructor/*` guard, post-login redirect for role = 'instructor'
- `app/[locale]/admin/courses/[id]/page.tsx` — surface proposal review actions when `status = 'proposal'`

---

## Phase INS-3 — Revenue-share tracking

### 3.1 Migration

```sql
-- Per-course instructor share (default rate; can be overridden per-instructor via course_instructors)
ALTER TABLE courses ADD COLUMN IF NOT EXISTS instructor_revenue_share_pct numeric(5,2) DEFAULT 0;

-- Per-instructor weight within the instructor pool for a course (must sum to 100 per course)
ALTER TABLE course_instructors ADD COLUMN IF NOT EXISTS revenue_share_pct numeric(5,2) DEFAULT 0;

-- Snapshot columns on enrollments (historical record, immune to rate changes)
ALTER TABLE enrollments ADD COLUMN IF NOT EXISTS partner_share_amount integer DEFAULT 0;
ALTER TABLE enrollments ADD COLUMN IF NOT EXISTS instructor_share_amount integer DEFAULT 0;
ALTER TABLE enrollments ADD COLUMN IF NOT EXISTS honuvibe_share_amount integer DEFAULT 0;

-- Per-instructor breakdown (for multi-instructor courses)
CREATE TABLE enrollment_instructor_shares (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  enrollment_id uuid NOT NULL REFERENCES enrollments(id) ON DELETE CASCADE,
  instructor_id uuid NOT NULL REFERENCES instructor_profiles(id),
  amount integer NOT NULL,      -- cents (USD) or yen
  currency text NOT NULL,
  status text DEFAULT 'pending' CHECK (status IN ('pending', 'paid', 'clawed_back')),
  paid_at timestamptz,
  payout_reference text,        -- CSV batch ID or Stripe transfer ID later
  created_at timestamptz DEFAULT now(),
  UNIQUE(enrollment_id, instructor_id)
);

CREATE INDEX idx_eis_instructor ON enrollment_instructor_shares(instructor_id, status);
CREATE INDEX idx_eis_enrollment ON enrollment_instructor_shares(enrollment_id);

ALTER TABLE enrollment_instructor_shares ENABLE ROW LEVEL SECURITY;
CREATE POLICY "eis_admin_all" ON enrollment_instructor_shares FOR ALL USING (public.is_admin());
CREATE POLICY "eis_own_read" ON enrollment_instructor_shares
  FOR SELECT USING (
    EXISTS (
      SELECT 1 FROM instructor_profiles ip
      WHERE ip.id = enrollment_instructor_shares.instructor_id
        AND ip.user_id = auth.uid()
    )
  );
```

### 3.2 Split computation

**New file: `lib/revenue-split/compute.ts`** — pure function, no DB/network:

```typescript
computeEnrollmentSplit({
  gross: number,
  partnerSharePct: number | null,
  instructorSharePct: number,
  instructorWeights: Array<{ instructor_id: string; pct: number }>
}): {
  partner: number;
  instructor_total: number;
  honuvibe: number;
  per_instructor: Array<{ instructor_id: string; amount: number }>;
}
```

All math in smallest currency unit (cents / yen) — no floating-point. Round-half-away-from-zero, with any rounding residue absorbed by the HonuVibe share.

Unit-test this heavily — 0% partner, 0% instructor, 100% instructor edge cases, single vs. multi-instructor, currency sanity (JPY has no cents).

### 3.3 Webhook integration

Modify [lib/stripe/webhooks.ts](../../lib/stripe/webhooks.ts) → `handleCheckoutCompleted`:
- After creating the enrollment row, load partner + course + course_instructors
- Call `computeEnrollmentSplit`
- Update enrollment with split snapshot
- Insert per-instructor rows into `enrollment_instructor_shares` with `status = 'pending'`
- On refund (new webhook handler for `charge.refunded`): mark all related shares as `clawed_back`

### 3.4 Admin UI additions

- Course edit page — add `instructor_revenue_share_pct` field + per-instructor weight sliders (validate sum = 100)
- `/admin/payouts/instructors/page.tsx` — monthly report, filterable by instructor, CSV export of pending shares
- "Mark as paid" action — bulk-updates `status = 'paid'` with a `payout_reference`

### 3.5 Files — INS-3

**New:**
- `supabase/migrations/<ts>_revenue_split.sql`
- `lib/revenue-split/compute.ts` + `lib/revenue-split/compute.test.ts`
- `app/[locale]/admin/payouts/instructors/page.tsx`
- `app/api/admin/payouts/instructors/csv/route.ts`
- `app/api/admin/payouts/instructors/mark-paid/route.ts`

**Modified:**
- `lib/stripe/webhooks.ts` — compute and persist splits on `checkout.session.completed`, add `charge.refunded` handler
- `app/api/stripe/webhook/route.ts` — wire the refund event type
- `app/[locale]/admin/courses/[id]/page.tsx` — surface share % fields

---

## Phase INS-4 — Instructor dashboard + tax forms + manual payouts

### 4.1 Portal scope (aggregate, like partner portal)

- `/instructor/` — dashboard summary: my courses, lifetime earnings (pending + paid, per currency), this month
- `/instructor/courses/` — already exists from INS-2; extend with per-course earnings column
- `/instructor/earnings/` — monthly breakdown table, pending/paid status
- `/instructor/profile/` — edit own `instructor_profiles` fields (display name, bio, socials, photo) — reuse existing admin form pattern
- `/instructor/tax-forms/` — upload W-9 (US) or W-8BEN (international) before first payout. Instructor dashboard shows "payout blocked until tax form on file" until uploaded.
- `/instructor/settings/` — payout preferences placeholder (populated with Stripe Connect onboarding in INS-7)

### 4.2 Tax form schema

```sql
CREATE TABLE instructor_tax_forms (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  instructor_id uuid NOT NULL REFERENCES instructor_profiles(id) ON DELETE CASCADE,
  form_type text NOT NULL CHECK (form_type IN ('w9', 'w8ben', 'w8ben_e', 'other')),
  country_code text,                -- ISO 3166-1 alpha-2 for the payee
  file_url text NOT NULL,           -- Supabase Storage path (private bucket)
  file_sha256 text,                 -- integrity check
  status text DEFAULT 'submitted'
    CHECK (status IN ('submitted', 'verified', 'rejected', 'expired')),
  verified_by_user_id uuid REFERENCES public.users(id),
  verified_at timestamptz,
  rejection_reason text,
  tax_year integer,                 -- which tax year this form applies to
  submitted_at timestamptz DEFAULT now(),
  updated_at timestamptz DEFAULT now()
);

CREATE INDEX idx_tax_forms_instructor ON instructor_tax_forms(instructor_id, status);

ALTER TABLE instructor_tax_forms ENABLE ROW LEVEL SECURITY;
CREATE POLICY "tax_forms_admin_all" ON instructor_tax_forms FOR ALL USING (public.is_admin());
CREATE POLICY "tax_forms_own" ON instructor_tax_forms
  FOR ALL USING (
    EXISTS (
      SELECT 1 FROM instructor_profiles ip
      WHERE ip.id = instructor_tax_forms.instructor_id
        AND ip.user_id = auth.uid()
    )
  );
```

Storage: private Supabase bucket `instructor-tax-forms`, path-namespaced by `instructor_id`. Admin-only read outside of the instructor themselves. Retention policy per US IRS (4 years minimum after last payout).

**Payout gate:** `/admin/payouts/instructors/` hides instructors whose latest `instructor_tax_forms.status != 'verified'` from "ready to pay." Instructor dashboard shows a yellow banner until verified.

### 4.3 Queries

**New file: `lib/instructor-portal/queries.ts`** — sibling to `lib/partner-portal/queries.ts`

- `getInstructorProfileForUser(userId)` → instructor_profiles row + id lookup
- `getInstructorEarnings(instructorId)` → pending/paid/total per currency, current month delta
- `getInstructorCourses(instructorId)` → list with per-course enrollment counts + earnings
- `getInstructorMonthlyEarnings(instructorId, months=12)` → table data
- `getLatestTaxFormStatus(instructorId)` → gate flag for payout eligibility

All scoped via `instructor_profiles.user_id = auth.uid()` with RLS on `enrollment_instructor_shares` and `instructor_tax_forms`.

### 4.4 Files — INS-4

**New:**
- `supabase/migrations/<ts>_instructor_tax_forms.sql`
- `app/[locale]/instructor/page.tsx` (dashboard)
- `app/[locale]/instructor/earnings/page.tsx`
- `app/[locale]/instructor/profile/page.tsx`
- `app/[locale]/instructor/tax-forms/page.tsx`
- `app/[locale]/instructor/settings/page.tsx`
- `app/api/instructor/tax-forms/route.ts` (upload + list)
- `app/api/admin/tax-forms/[id]/verify/route.ts` (admin verify/reject)
- `lib/instructor-portal/queries.ts` (expanded from INS-2)
- `components/instructor-portal/EarningsSummary.tsx`, `EarningsTable.tsx`, `TaxFormStatus.tsx`

**Modified:**
- `app/[locale]/instructor/layout.tsx` — add earnings/profile/tax-forms/settings nav items
- `app/[locale]/admin/payouts/instructors/page.tsx` — gate "ready to pay" by verified tax form status

---

## Phase INS-5 — Ratings & reviews (scoped, deferred)

**Trigger to implement:** 5+ instructor-taught courses live on the platform. Reviews provide social proof for a curated roster — important even without high-volume marketplace dynamics.

### 5.1 Schema

```sql
CREATE TABLE course_reviews (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  course_id uuid NOT NULL REFERENCES courses(id) ON DELETE CASCADE,
  user_id uuid NOT NULL REFERENCES public.users(id) ON DELETE CASCADE,
  enrollment_id uuid REFERENCES enrollments(id),  -- link to the enrollment (gates who can review)
  rating integer NOT NULL CHECK (rating BETWEEN 1 AND 5),
  title text,
  body text,
  is_published boolean DEFAULT true,   -- admin can hide abuse
  created_at timestamptz DEFAULT now(),
  updated_at timestamptz DEFAULT now(),
  UNIQUE(course_id, user_id)           -- one review per student per course
);

CREATE INDEX idx_course_reviews_course ON course_reviews(course_id, is_published);

ALTER TABLE course_reviews ENABLE ROW LEVEL SECURITY;
CREATE POLICY "reviews_public_read" ON course_reviews
  FOR SELECT USING (is_published = true);
CREATE POLICY "reviews_own_write" ON course_reviews
  FOR ALL USING (user_id = auth.uid());
CREATE POLICY "reviews_admin_all" ON course_reviews FOR ALL USING (public.is_admin());
```

### 5.2 UX

- Students can review a course only after `completed_at IS NOT NULL` on their enrollment (enforced at API layer)
- Public course pages show aggregated rating (avg + count) and latest N reviews
- Instructor dashboard surfaces per-course average + recent review text
- Admin can hide abusive reviews (set `is_published = false`) and see all reviews via `/admin/reviews`

### 5.3 Scope bounds (intentionally narrow)

- No ML-based review ranking
- No review helpfulness voting
- No reply-from-instructor feature (defer to INS-6 messaging)
- No discovery / search-ranking influence (we're curated, not algorithmic)

---

## Phase INS-6 — Student–instructor Q&A + dispute handling (scoped, deferred)

**Trigger to implement:** 20+ active instructors or 5+ disputes surface via support channels.

### 6.1 Student ↔ instructor Q&A

Lightweight threaded comments attached to a course. Students enrolled in the course can post questions; the course's instructor(s) can reply. Admin can moderate.

```sql
CREATE TABLE course_threads (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  course_id uuid NOT NULL REFERENCES courses(id) ON DELETE CASCADE,
  created_by uuid NOT NULL REFERENCES public.users(id) ON DELETE CASCADE,
  title text NOT NULL,
  body text NOT NULL,
  is_resolved boolean DEFAULT false,
  is_hidden boolean DEFAULT false,
  created_at timestamptz DEFAULT now()
);

CREATE TABLE course_thread_replies (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  thread_id uuid NOT NULL REFERENCES course_threads(id) ON DELETE CASCADE,
  author_id uuid NOT NULL REFERENCES public.users(id) ON DELETE CASCADE,
  body text NOT NULL,
  is_instructor_reply boolean DEFAULT false,  -- denormalized flag for UI emphasis
  is_hidden boolean DEFAULT false,
  created_at timestamptz DEFAULT now()
);
```

RLS: enrolled students + course instructors + admin can read threads for the course. Only enrolled students can create threads; only the thread creator, course instructors, or admin can reply. Email notifications when a reply lands (daily digest to avoid spam).

### 6.2 Dispute handling

Formal dispute flow for refund requests or content complaints.

```sql
CREATE TABLE enrollment_disputes (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  enrollment_id uuid NOT NULL REFERENCES enrollments(id) ON DELETE CASCADE,
  opened_by_user_id uuid NOT NULL REFERENCES public.users(id),
  dispute_type text NOT NULL
    CHECK (dispute_type IN ('refund_request', 'content_complaint', 'copyright', 'other')),
  description text NOT NULL,
  status text DEFAULT 'open'
    CHECK (status IN ('open', 'in_review', 'resolved', 'rejected')),
  resolution_notes text,             -- admin-only
  resolved_by_user_id uuid REFERENCES public.users(id),
  resolved_at timestamptz,
  created_at timestamptz DEFAULT now()
);
```

HonuVibe admin is always the resolver. Instructor sees disputes about their courses (read-only, for context). Refund outcomes feed into existing claw-back logic (`enrollment_instructor_shares.status = 'clawed_back'`).

### 6.3 Scope bounds

- No direct messaging between students and instructors (only course-scoped threads — public, reviewable)
- No real-time chat — async only
- No dispute-SLA enforcement yet — admin triage in the same queue as support

---

## Phase INS-7 — Stripe Connect (deferred)

Triggered when we have ~20 active instructors or admin CSV payout becomes a time sink. Scope sketch only:

- Each instructor onboards a Stripe Express account from `/instructor/settings/`
- `instructor_profiles.stripe_connect_account_id text`
- Payout flow: scheduled job batches pending `enrollment_instructor_shares` per instructor → creates Stripe Transfer → marks as `paid` with `payout_reference = transfer_id`
- Stripe handles KYC, 1099-NEC generation for US payees at >$600/yr, country restrictions. Our own `instructor_tax_forms` records become a backup / pre-Connect archive.
- `charge.refunded` already handled (INS-3) — becomes a `stripe.transfers.createReversal` call

Out of scope for this plan. Flagged so INS-3's schema (`payout_reference`, `status`) and INS-4's tax form infra are both forward-compatible.

---

## Integration points with the partner plan

| Area | Partner plan provides | This plan consumes |
|---|---|---|
| Attribution | `enrollments.partner_id` | Reads to compute partner share |
| Partner portal | `/partner/*` aggregate dashboard | Instructor earnings from partner-attributed enrollments show up in their instructor dashboard normally; partner portal unchanged |
| Partner rev-share | `partners.revenue_share_pct` | Used as first-cut in split computation |
| Recruitment attribution | (new) `instructor_applications.referred_by_partner_id` | **Does not create a rev-share claim.** Used only for reporting ("we recruited 7 instructors from SmashHaus") |

The partner portal does not need new UI for the instructor marketplace. Partners see their enrollment-attributed revenue as before; instructor payouts are a HonuVibe↔instructor matter.

---

## Documented tradeoffs

| Tradeoff | Decision | Why |
|---|---|---|
| Partner cut on instructor lifetime sales | No | Complicates split math, creates perverse incentives (partner pushes members into instructor role for ongoing rent), violates clean attribution principle |
| Multi-instructor weight storage | On `course_instructors` row | Already the canonical per-course-per-instructor join; natural home. Must sum to 100 (validated at save time, not DB constraint) |
| Snapshot columns on enrollments vs. compute-on-read | Snapshot | Historical payouts immune to rate changes; also makes Stripe Connect migration a data migration, not a logic migration |
| Manual CSV payouts in v1 | Yes | Same shape as partner rev-share; Stripe Connect is significant build (KYC, 1099, country restrictions, tax forms) |
| Instructor authoring scope | Proposal only in v1, admin fills in weeks/sessions | Cuts scope dramatically; admin stays in control of course quality; expand when instructors demand it |
| Course refunds claw back instructor earnings | Yes | Instructor gets paid on *kept* revenue, not headline revenue. If already paid out, show as `clawed_back` status and reconcile next payout cycle |

---

## Verification

### INS-1
- Submit an application anonymously from `/become-an-instructor` with a partner cookie set — row appears in `instructor_applications` with `referred_by_partner_id` populated; applicant receives confirmation email; admin receives notification.
- Admin approves — new `instructor_profiles` row created, user promoted to `role = 'instructor'`, welcome email sent.
- Admin rejects — status updates, rejection email sent with `rejection_reason`.
- RLS: applicant can read own application; cannot read others. Anon cannot read any.

### INS-2
- Instructor logs in → lands on `/instructor/courses/`. Creates a proposal → appears in `/admin/courses/proposals/` with `status = 'proposal'`.
- Admin moves proposal to `draft` → instructor sees it in "under review" tab; cannot edit anymore.
- Admin publishes → student can enroll normally.
- Non-instructor user hitting `/instructor/*` is redirected.

### INS-3
- Unit tests for `computeEnrollmentSplit`: every edge case (no partner, no instructor share, multi-instructor, JPY rounding, 100% instructor, 100% partner rejected as invalid).
- End-to-end: partner-attributed student enrolls in an instructor-taught course → `enrollments.partner_share_amount + instructor_share_amount + honuvibe_share_amount = amount_paid`. Per-instructor rows in `enrollment_instructor_shares` sum to `instructor_share_amount`.
- Refund scenario: trigger `charge.refunded` in Stripe test mode → all related share rows flip to `clawed_back`.
- Rate change immunity: change `partners.revenue_share_pct` after an enrollment exists — historical enrollment split unchanged.

### INS-4
- Instructor dashboard shows correct pending/paid earnings per currency (matches DB).
- Instructor cannot see another instructor's earnings (RLS check via direct query).
- CSV export from `/admin/payouts/instructors/` matches the dashboard aggregates.
- "Mark as paid" flips status; dashboard updates to show paid balance.

---

## Open questions / deferred

- **Minimum payout threshold** — INS-4 assumes any balance can be paid out. Later, introduce a $50 / ¥5000 minimum to reduce transaction overhead.
- **1099 generation** — INS-4 collects tax forms manually. INS-7 (Stripe Connect) delegates 1099-NEC generation to Stripe. Before Connect ships, if annual payouts to any US instructor cross $600, HonuVibe is responsible for filing a 1099-NEC (manual or via a service like Track1099). Add an admin reminder for Q1 of each tax year.
- **International tax obligations** — APPI / local withholding rules for non-US payees. Legal consult needed before first international payout lands.
- **Per-region instructor visibility** — if a SmashHaus-recruited instructor should only appear on the SmashHaus partner landing (not global listings), we'd need a `course_instructors_partners` visibility matrix. Defer until a partner asks.
- **Instructor application throughput** — at what rate of incoming applications do we need a larger review team or a partial auto-screening step? Revisit if queue exceeds 10 pending for >1 week.
- **Q&A notification fatigue** — INS-6 proposes daily digest emails. If instructors hate that, add per-course opt-in / real-time toggle.
