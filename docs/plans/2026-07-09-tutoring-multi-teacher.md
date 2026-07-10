# Multi-Teacher 1v1 Tutoring — Phase 1 (Assign + Teacher Portal)

## Context

Today the 1v1 tutoring system is single-operator: the entire `/admin/tutoring` surface is admin-only, every engagement's teacher is the hardcoded free-text "Ryan Jackson," and there is no per-teacher scoping. Ryan's vision: many teachers with different expertise (e.g. a Japanese-speaking teacher takes the Japanese students), each running their own students' sessions. This phase delivers **teacher assignment + a teacher-scoped portal**. Decided during brainstorm: teachers get **full control** of their own engagements (generate/edit/publish reports, download documents); **payment stays manual** (admin enroll, as today); **no public directory/booking** (later phases).

Key discovery: most infrastructure already exists — each engagement *is* a `courses` row, so the existing `course_instructors` join table, instructor application→approval flow (flips `users.role` to `instructor`), `/instructor/*` portal shell with `InstructorGuard`, and the RLS join template from migration 033 are all reusable. Also verified: **a pre-existing security gap** — `app/api/tutoring/generate/route.ts:67` and `status/route.ts:20` already admit *any* instructor with no course scoping; this plan closes it.

**Architecture facts that shape the design (verified):**
- All tutoring **writes** go through `createAdminClient()` (service role) after a code-level gate (`lib/tutoring/actions.ts:60,126,164,180`; every API route) → instructors need **SELECT-only** RLS policies.
- **Reads** use the user-scoped client (`lib/tutoring/queries.ts`) → instructor SELECT policies are required on `session_reports`, `session_report_private`, `student_patterns`, plus `enrollments` and `users` (for the `users!inner` joins) or the document route 404s for teachers.

## Changes

### 1. Fix latent bug (independent, first)
`lib/instructor-portal/queries.ts:67` — `.eq('instructor_profile_id', …)` → `.eq('instructor_id', …)` (column name per migration 015:12). Currently `/instructor/courses` never lists taught courses.

### 2. Migration `supabase/migrations/058_tutoring_multi_teacher.sql` (additive, prod-safe before deploy)
- `public.is_instructor_for_course(p_course_id uuid)` — SECURITY DEFINER STABLE helper (join `course_instructors` → `instructor_profiles` → `auth.uid()`), mirroring `is_admin()` (001:525/002:5). REVOKE from anon.
- SELECT-only instructor policies: `session_reports` (`is_instructor_for_course(course_id)`), `session_report_private` (via EXISTS join to its report's course), `student_patterns` (same), `enrollments` (scoped to `course_type='1v1'` courses), `users` (only students actively enrolled in the caller's 1v1 engagements).
- **No write policies** (nothing uses them — writes are service-role). No storage/`courses` policy changes needed (`courses_public_read` covers published 1v1 rows; storage is service-role behind route gates).

### 3. Shared authorization helper — new `lib/tutoring/auth.ts`
- `getTutoringAccess(courseId)` / `getTutoringAccessForReport(reportId)` → result object `{ ok, access: { role: 'admin'|'instructor', userId, instructorProfileId|null, courseId } } | { ok:false, status: 401|403|404 }`; throwing wrappers `requireTutoringAccess*` for server actions (matches `requireAdmin()` convention, `lib/tutoring/actions.ts:10-23`).
- Admin passes unconditionally (no `instructor_profiles` row required — Ryan). Instructor passes only if `course_instructors` links their profile to the course (checked via admin client so the gate holds independent of RLS).

### 4. Wire helper into 6 routes + 3 actions
- `generate` (both modes — closes the unscoped-instructor hole), `publish`, `transcript`, `images`, `document` routes: replace the `role !== 'admin'` blocks with the helper.
- `status` route: scope instructor polling to their own courses (currently leaks any report's status).
- `lib/tutoring/actions.ts`: `updateSessionReport` / `unpublishSessionReport` / `deleteSessionReport` → `requireTutoringAccessForReport`; `createTutoringCourse` stays admin-only. Extend `revalidateForReport` + publish-route revalidates with `/instructor/tutoring/*` (+ `/ja`) paths.

### 5. Queries (`lib/tutoring/queries.ts` + `types.ts`)
- `list1v1Courses`: join `course_instructors` → add `teacherName`/`teacherProfileId` to `TutoringCourseSummary` ("Unassigned" when null).
- New `listMyTutoringEngagements(instructorProfileId)`: explicit filter via `course_instructors` (RLS can't scope the course list — `courses_public_read`); extract the enrollment/report-stats aggregation from `list1v1Courses` into a shared private helper.
- `getTutoringCourse` / `getReportsForCourse` / `getReportForAdmin` / `getPatternsForStudent` reused verbatim for the teacher portal (Step 2 policies make them work user-scoped); pages still call the access helper first (defense in depth).

### 6. Assignment UX (admin)
- **New slim `components/admin/TutoringTeacherControl.tsx`** (one teacher per engagement) — deliberately NOT reusing `InstructorAssignControl` (multi-instructor + roles + revenue pct = overkill/confusing here). Select fed by existing `getActiveInstructorOptions()` (`lib/instructors/queries.ts:134`); Assign/Change/Remove.
- **New server action `setTutoringTeacher({ courseId, instructorProfileId|null })`** in `lib/tutoring/actions.ts`: admin-only; replaces all `course_instructors` rows for the course with one `role:'lead'` row (or none); syncs legacy `courses.instructor_id` + `instructor_name` (retires the hardcoded 'Ryan Jackson' at actions.ts:88); revalidates admin + instructor paths.
- Mount the control in `app/[locale]/admin/tutoring/[courseId]/page.tsx` (above the dashboard — keeps the shared component admin-free). Admin list page gains a "Teacher" column. Optional teacher select added to `NewTutoringEngagement` + `createTutoringCourse` gains `instructorProfileId?`.

### 7. Shared components get `basePath` (surface-agnostic reuse — no forks)
Only two surface-bound references exist (all `fetch('/api/tutoring/…')` calls are already agnostic):
- `components/admin/TutoringCourseDashboard.tsx:423` report `<Link>` → `${basePath}/…`
- `components/admin/SessionReportReviewPanel.tsx:284` post-delete `router.push` → `${basePath}/${courseId}`
Both get `basePath?: string` defaulting to `'/admin/tutoring'` (zero admin changes). `TutoringCourseDashboard` also gets `allowEnroll?: boolean` (default true) — teacher surface hides the admin-only `TutoringEnrollStudent` and shows "ask an admin" copy. **Do not touch the just-shipped download UI.**

### 8. Teacher portal pages (new, under existing `InstructorGuard` layout)
- `app/[locale]/instructor/tutoring/page.tsx` — my engagements list (`resolveInstructorScope` → `listMyTutoringEngagements`); empty state.
- `app/[locale]/instructor/tutoring/[courseId]/page.tsx` — access check → reuse queries → `<TutoringCourseDashboard basePath allowEnroll={false}>`.
- `app/[locale]/instructor/tutoring/[courseId]/reports/[reportId]/page.tsx` — mirror of admin report page with `basePath`.
- Cross-links: "1v1 Tutoring" link on `/instructor/courses` header; back-link from tutoring list. Middleware already admits instructors to `/instructor/*`.

### 9. Tests
- **RLS**: new `supabase/tests/tutoring_instructor_rls.test.ts` + instructor fixtures — assigned instructor reads all statuses/private/patterns/enrollment/student-user-row; unassigned instructor reads none; instructor cannot INSERT/UPDATE; existing `session_reports_rls.test.ts` stays green.
- **Route auth** (`__tests__/api/` pattern): unit tests for `lib/tutoring/auth.ts` (admin bypass without profile; assignment required; 404); publish-route auth matrix. **Flagged: `tutoring-document.test.ts` expectations change** (assigned instructor → 200 now) — update mocks, don't loosen the route.

## Verification
1. `pnpm verify` (type-check → vitest app → build) green.
2. `pnpm test:rls` on local stack with 058 applied (022/025 duplicates stay parked as `.bak`).
3. Manual smoke EN + `/ja`: admin assigns teacher → teacher sees only their engagement at `/instructor/tutoring` → generates report from transcript/photos → edits/saves → publishes (student email fires) → downloads all 4 documents → second instructor sees nothing + gets 403 on direct API hits → admin flow unchanged.
4. **Prod rollout: apply 058 in the Supabase SQL editor (`zvfwtndbxshrtpwcwynw`) BEFORE the deploy** — additive-policy-only, so old code + new schema is a no-op; new code + old schema breaks teacher reads.

## Risks
- `users`-row exposure is row-level: assigned teachers can read all columns of their own 1v1 students' users rows (accepted for Phase 1; fallback is service-role reads behind the gate).
- Behavior change: generate/status tighten from "any instructor" to "assigned instructor" (intended — closes a live gap).
- Invariant to document in `lib/tutoring/actions.ts`: writes are service-role behind code gates; converting an action to the user client would silently break teacher writes.

## Workflow note
On approval, save this plan as `docs/plans/2026-07-09-tutoring-multi-teacher.md` (project convention) and execute via the standard loop (subagent per task, review each, `pnpm verify` + `pnpm test:rls` gates, commit to main, push; migration applied manually in prod first).
