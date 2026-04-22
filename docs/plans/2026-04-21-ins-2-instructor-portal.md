# INS-2 — Instructor Portal + Course Proposal Flow

## Context

INS-1 shipped the public apply flow and admin review queue that promotes approved applicants to `role = 'instructor'` with an `instructor_profiles` row. Those instructors currently have no place to go after login — no portal, no way to propose a course. INS-2 closes that gap by (a) letting instructors draft course **proposals** through a new `/instructor/*` portal, and (b) letting admins review proposals through a new filtered view before approval promotes them to a normal `draft` course for admin to finish authoring.

v1 deliberately scopes authoring to **proposal-level fields only** (title, pitch, audience, outcomes, tools, price). Weeks, sessions, and cohort dates stay in admin's hands on the existing `/admin/courses/[id]` editor after approval. This matches the locked decisions in [docs/plans/2026-04-17-instructor-marketplace.md](../../../Desktop/Projects/HonuVibe_2026/docs/plans/2026-04-17-instructor-marketplace.md) Phase INS-2 section (lines 176–231).

## Decisions (confirmed with user)

- **Proposal fields (EN-only for v1):** `title_en`, `description_en`, `level`, `learning_outcomes_en` (jsonb array), `who_is_for_en` (jsonb array), `tools_covered` (jsonb array), `price_usd`, `price_jpy`. JP fields left blank at submission — instructor or admin fills them post-approval.
- **Admin nav:** separate "Proposals" entry pointing at `/admin/courses/proposals`, mirrors the `/admin/instructor-applications` pattern.
- **Portal root `/instructor`:** server redirect to `/instructor/courses`. No dashboard page in v1.
- **Review actions:** approve → `status = 'draft'`; reject → `status = 'rejected'` with `proposal_review_notes` shown to instructor; revision comment deferred (admin emails manually).

## Migration — `supabase/migrations/032_course_proposals.sql`

Extend `courses.status` CHECK and add proposal columns. Template pattern from [supabase/migrations/031_instructor_applications.sql](../../../Desktop/Projects/HonuVibe_2026/supabase/migrations/031_instructor_applications.sql).

```sql
ALTER TABLE courses DROP CONSTRAINT IF EXISTS courses_status_check;
ALTER TABLE courses ADD CONSTRAINT courses_status_check
  CHECK (status IN ('draft', 'proposal', 'published', 'in-progress', 'completed', 'archived', 'rejected'));

ALTER TABLE courses
  ADD COLUMN IF NOT EXISTS proposed_by_instructor_id uuid
    REFERENCES instructor_profiles(id) ON DELETE SET NULL,
  ADD COLUMN IF NOT EXISTS proposal_submitted_at timestamptz,
  ADD COLUMN IF NOT EXISTS proposal_review_notes text;

CREATE INDEX IF NOT EXISTS idx_courses_proposal_status
  ON courses(status, proposal_submitted_at DESC)
  WHERE status IN ('proposal', 'rejected');
CREATE INDEX IF NOT EXISTS idx_courses_proposed_by
  ON courses(proposed_by_instructor_id)
  WHERE proposed_by_instructor_id IS NOT NULL;
```

RLS on `courses` already exists. Add two policies so instructors can CRUD their own proposals (admin bypasses via `is_admin()`):

```sql
-- Instructor can SELECT their own proposals + drafts (courses they proposed)
CREATE POLICY "courses_own_proposals_read" ON courses
  FOR SELECT
  USING (
    proposed_by_instructor_id IN (
      SELECT id FROM instructor_profiles WHERE user_id = auth.uid()
    )
  );

-- Instructor can INSERT a proposal tied to their own profile with status = 'proposal'
CREATE POLICY "courses_own_proposals_insert" ON courses
  FOR INSERT
  WITH CHECK (
    status = 'proposal'
    AND proposed_by_instructor_id IN (
      SELECT id FROM instructor_profiles WHERE user_id = auth.uid()
    )
  );

-- Instructor can UPDATE only while status = 'proposal'
CREATE POLICY "courses_own_proposals_update" ON courses
  FOR UPDATE
  USING (
    status = 'proposal'
    AND proposed_by_instructor_id IN (
      SELECT id FROM instructor_profiles WHERE user_id = auth.uid()
    )
  )
  WITH CHECK (status = 'proposal');
```

Writes still route through the API using the service-role client (see actions below) — policies are defensive.

## Files — INS-2

### New

- `supabase/migrations/032_course_proposals.sql` — above.
- `app/[locale]/instructor/layout.tsx` — server component; calls `resolveInstructorScope()` (redirects if not `role = 'instructor'` or `'admin'`); wraps children with `<InstructorPortalLayout>`. Mirror [app/[locale]/partner/layout.tsx](../../../Desktop/Projects/HonuVibe_2026/app/%5Blocale%5D/partner/layout.tsx).
- `app/[locale]/instructor/page.tsx` — server redirect to `/{locale}/instructor/courses` via `next/navigation` `redirect()`.
- `app/[locale]/instructor/courses/page.tsx` — list my courses + proposals, grouped by status tabs (proposal / rejected / draft / published). Reuses `getMyInstructorCourses()` from queries.
- `app/[locale]/instructor/courses/new/page.tsx` — renders `<InstructorCourseProposalForm mode="create">`.
- `app/[locale]/instructor/courses/[id]/edit/page.tsx` — loads proposal via `getMyProposalById(id)`; 404 if not found or status ≠ `'proposal'`; renders `<InstructorCourseProposalForm mode="edit" course={course}>`.
- `app/[locale]/admin/courses/proposals/page.tsx` — filtered list of proposals + rejected. Reuses `<AdminCourseList>` pattern but filtered. Pattern from [app/[locale]/admin/instructor-applications/page.tsx](../../../Desktop/Projects/HonuVibe_2026/app/%5Blocale%5D/admin/instructor-applications/page.tsx).
- `app/api/instructor/courses/route.ts` — `POST` creates a proposal (validates body, calls `createInstructorProposal` action).
- `app/api/instructor/courses/[id]/route.ts` — `PATCH` updates a proposal, `DELETE` withdraws (sets status to `'rejected'` with note "Withdrawn by instructor" — or simpler: hard-gate and skip delete for v1). v1: `PATCH` only.
- `app/api/admin/courses/[id]/proposal/route.ts` — `PATCH` with `action: 'approve' | 'reject'`; mirrors [app/api/admin/instructor-applications/[id]/route.ts](../../../Desktop/Projects/HonuVibe_2026/app/api/admin/instructor-applications/%5Bid%5D/route.ts).
- `lib/instructor-portal/queries.ts` — `resolveInstructorScope()`, `getMyInstructorCourses(userId)`, `getMyProposalById(id, userId)`. Template: [lib/partner-portal/queries.ts](../../../Desktop/Projects/HonuVibe_2026/lib/partner-portal/queries.ts).
- `lib/instructor-portal/actions.ts` — `createInstructorProposal(input)`, `updateInstructorProposal(id, input)`, `approveProposal(id)`, `rejectProposal(id, reviewNotes)`. Each starts with `requireInstructor()` or `requireAdmin()` as appropriate. Template: [lib/instructor-applications/actions.ts](../../../Desktop/Projects/HonuVibe_2026/lib/instructor-applications/actions.ts).
- `components/instructor-portal/InstructorNav.tsx` — sidebar + mobile bottom nav; items: Courses, Settings (stub for later). Template: [components/partner-portal/PartnerNav.tsx](../../../Desktop/Projects/HonuVibe_2026/components/partner-portal/PartnerNav.tsx).
- `components/instructor-portal/InstructorPortalLayout.tsx` — flex wrapper. Template: [components/partner-portal/PartnerPortalLayout.tsx](../../../Desktop/Projects/HonuVibe_2026/components/partner-portal/PartnerPortalLayout.tsx).
- `components/instructor-portal/InstructorCourseList.tsx` — client component; status tabs, card rows linking to `/instructor/courses/[id]/edit` (when editable) or `/learn/[slug]` (when published).
- `components/instructor-portal/InstructorCourseProposalForm.tsx` — client form with the core fields (see Decisions). Handles both create + edit. Posts to the `/api/instructor/courses` routes.
- `components/admin/AdminProposalActions.tsx` — client component; Approve / Reject buttons with a rejection-reason textarea (mirrors `AdminInstructorApplicationDetail`'s action panel).

### Modified

- `middleware.ts` — add `/instructor` to `PROTECTED_PREFIXES`; add `INSTRUCTOR_PREFIXES` and `isInstructorRoute()` check requiring `profile.role IN ('instructor','admin')`; extend post-login redirect (`/learn/auth` callback) so a user with `role = 'instructor'` lands on `/instructor/courses` unless a `redirect` param is present.
- `components/admin/AdminNav.tsx` — add `{ href: '/admin/courses/proposals', label: 'Proposals', icon: FileEdit }` right below the Courses entry (line ~20 in `navItems`). Import `FileEdit` from `lucide-react`.
- `app/[locale]/admin/courses/[id]/page.tsx` — when `course.status === 'proposal'`, render `<AdminProposalActions course={course} />` at the top of the detail view; keep all existing editor fields below (admin can finish authoring after approval).
- `components/admin/AdminCourseDetail.tsx` — no logic change; just render children-like slot from the page when status is proposal (or pass a `proposalActions` prop). Keep minimal.
- `messages/en.json` — add `instructor.*` namespace: nav labels, form labels, form helper text, empty-state copy, submit confirmation copy. Keep JP blank or stubbed with EN for v1 (translation happens in a separate pass).
- `messages/ja.json` — stub mirror of `instructor.*` with the same EN strings as placeholders (per CLAUDE.md "never machine-translate without review" — leave a TODO and copy EN so pages don't break).

## Proposal form shape

Single `<form>` with server-side validation via the API route. Fields:

| Field | Column | UI | Required |
|---|---|---|---|
| Title | `title_en` | text input | ✓ |
| Short description | `description_en` | textarea (3 rows, 280 char soft cap) | ✓ |
| Level | `level` | select: beginner / intermediate / advanced | ✓ |
| Learning outcomes | `learning_outcomes_en` | repeater (add/remove rows, min 3) → jsonb array of strings | ✓ |
| Who is it for | `who_is_for_en` | repeater → jsonb array of strings | ✓ |
| Tools covered | `tools_covered` | tag input → jsonb array | optional |
| Price USD | `price_usd` | number input (dollars) — convert to cents on submit | ✓ |
| Price JPY | `price_jpy` | number input (yen, stored as-is) | ✓ |

On submit: `status = 'proposal'`, `proposed_by_instructor_id` from logged-in user's `instructor_profiles.id`, `proposal_submitted_at = now()`. Slug auto-generated from title (reuse existing slug helper if one exists — otherwise inline `slugify`; need to check during execution).

## Server action / API layout

- Instructor submit/edit uses `lib/instructor-portal/actions.ts` functions called from API routes (not directly from forms, so client can show validation errors). Routes: `POST /api/instructor/courses`, `PATCH /api/instructor/courses/[id]`.
- Admin review uses `PATCH /api/admin/courses/[id]/proposal` with body `{ action: 'approve' }` or `{ action: 'reject', reviewNotes }`. Approve sets `status = 'draft'`, clears `proposal_review_notes`. Reject sets `status = 'rejected'`, stores `proposal_review_notes`, sends email (reuse `sendInstructorRejectionEmail` pattern from `lib/instructor-applications/actions.ts` — or inline minimal version for v1).
- All admin actions gated by `requireAdmin()` from `lib/instructor-applications/actions.ts` (export it, or duplicate — check during execution whether it's already exported).

## Middleware diff outline

```ts
const PROTECTED_PREFIXES = ['/learn/dashboard', '/learn/account', '/admin', '/partner', '/instructor'];
const INSTRUCTOR_PREFIXES = ['/instructor'];

function isInstructorRoute(p: string) {
  return INSTRUCTOR_PREFIXES.some(pref => p === pref || p.startsWith(pref + '/'));
}

// in the role-check block:
if (isInstructorRoute(logicalPath) && !['instructor', 'admin'].includes(profile?.role)) {
  return NextResponse.redirect(new URL(`${prefix}/learn/dashboard`, request.url));
}
```

Post-login redirect: check `role === 'instructor'` after partner check and before admin fallthrough; redirect to `/{locale}/instructor/courses` when no explicit `redirect` query param.

## Verification

1. **Type check:** `npx tsc --noEmit` — zero new errors.
2. **Build:** `npx next build` — succeeds. (Lint skipped per project note.)
3. **Migration:** apply `032_course_proposals.sql` to local Supabase via the project's usual migration runner; confirm CHECK and columns are in place (`\d+ courses`).
4. **Instructor flow (manual):**
   - Log in as an approved instructor.
   - Hit `/instructor` → redirect to `/instructor/courses`.
   - Click "Propose a course" → submit a valid proposal with all required fields.
   - Confirm the proposal appears in `/instructor/courses` under "Proposal" tab.
   - Edit the proposal; confirm changes persist.
5. **Admin flow (manual):**
   - Log in as admin.
   - Visit `/admin/courses/proposals` — see the submitted proposal.
   - Open detail → Approve. Confirm `courses.status = 'draft'` and the course shows up on `/admin/courses`.
   - Submit another proposal, then Reject with a reason. Confirm `status = 'rejected'`, `proposal_review_notes` set, and instructor sees the reason on their `/instructor/courses` list.
6. **Guard checks:**
   - Log in as non-instructor, visit `/instructor` → redirected to `/learn/dashboard`.
   - Instructor tries to PATCH another instructor's proposal via curl → 403 from RLS.
7. **Bilingual:** visit `/ja/instructor/courses` — EN strings still render (JP stubbed); no broken keys.

## Commit plan

One commit, staged by name only:

```
supabase/migrations/032_course_proposals.sql
app/[locale]/instructor/**
app/[locale]/admin/courses/proposals/**
app/api/instructor/**
app/api/admin/courses/[id]/proposal/**
lib/instructor-portal/**
components/instructor-portal/**
components/admin/AdminProposalActions.tsx
components/admin/AdminNav.tsx
app/[locale]/admin/courses/[id]/page.tsx
components/admin/AdminCourseDetail.tsx
middleware.ts
messages/en.json
messages/ja.json
```

Message: `feat(instructors): INS-2 — instructor portal + course proposal flow`. Push directly to `main`.

## Out of scope (deferred)

- Weekly/session authoring by instructors — admin keeps using existing editor.
- Revision-request comment action (admin emails manually for now).
- Full JP translations of proposal form copy.
- Withdrawal endpoint for proposals (instructors email admin for now).
- `partners` tie-in for instructor referrals (that's INS-3).
