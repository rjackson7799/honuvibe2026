# B3 — Vault course access (migration 087)

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Status:** SHIPPED 2026-10-19 as `6e11e5f`; 087 applied on prod and verified by query (see "Execution record" below). Was: PLAN rev 2 — APPROVED by Ryan 2026-10-18 (D1–D6, D8 as recommended; D7: 2b ships with "Join the Vault" even though no course is `vault_included` yet). Rev 2 folds in an adversarial plan review (see "Plan review" at the end): D3 is tightened and D9 is new; Ryan approved D9 as recommended (2026-10-18). **Ready to execute** in a fresh session. Not built, nothing migrated, prod untouched.
**Baseline:** `main` = `origin/main` = `a1c796f` (checked 2026-10-18). The execution session re-checks `origin/main` first, because another session pushes to main.
**Roadmap:** `docs/plans/2026-10-05-marketing-redesign-green.md`: §B3, the "Review amendments" B3 bullet, and Locked decision #5. Those decisions are not reopened. **Unit 2b** (the course-detail UI) waits on this plan; see `docs/plans/2026-10-18-unit-2a-learn-catalog.md`.

**Goal:** Any active Vault member can read a published course with `courses.vault_included = true`, with no enrollment. The rule is enforced in SQL (RLS / views / ESL) and in the app's access checks. Per-course checkout still works for every other course.

**Architecture:** `087_vault_course_access.sql` uses `CREATE OR REPLACE` on `can_read_course_materials()` and `can_access_course_esl()` to add a Vault clause. Every 085/086 policy and view inherits the change. The same migration closes the instructor self-flag hole. In the app, a new `hasCourseAccess()` replaces the enrollment-only check at the content gates. It is backed by a pure predicate in `lib/access/checks.ts`, and a shared case matrix tests that predicate against the SQL function.

**Tech Stack:** Supabase Postgres (SECURITY DEFINER SQL helpers, RLS), Next.js 16 server components and server actions, Vitest (`app` project for unit tests, `rls` project for the DB suites).

**Spec:** the roadmap sections above plus this plan's §1 (verified facts). There is **one migration: 087**.

## Global Constraints

- **Migration number is 087.** On disk, the highest tracked migration is `086_course_material_enforce.sql`. `084_auth_email_security.sql` is untracked, reserved by the auth-hardening work: **never touch, stage or replay it**. Prod has no migration history table. A read-only probe (2026-10-18) showed 085 live: `rpc/can_read_course_materials` returns `false` for anon. It also showed 086 live: anon `courses` returns `[]`.
- Keep the 085 function contract: same name and signature, `LANGUAGE sql STABLE SECURITY DEFINER SET search_path = public, pg_temp`. Re-issue the 085 `REVOKE ALL … FROM PUBLIC` / `GRANT EXECUTE … TO anon, authenticated, service_role` for every function 087 replaces.
- Use the 064 `has_vault_access(uid)`, not the 041 one. It covers admin, vault `active`/`trialing`, `cancelled` before `subscription_expires_at`, an active cohort bundle window, and an active partner seat.
- Anon behaviour must not change. `auth.uid()` is NULL for anon, so the new clause is guarded by `auth.uid() IS NOT NULL`.
- This is **not auto-enrollment**. B3 never inserts `enrollments` rows. Billing, rosters, counts, certificates, checkout dedupe and revenue split stay enrollment-only.
- No UI changes beyond swapping booleans at the two named pages. The course-detail CTA ("Join the Vault", conditional enroll) is **Unit 2b**.
- pnpm only. Gates run one at a time on this 8 GB machine. `NODE_OPTIONS=--max-old-space-size=8192` for `type-check` and `build`, never for tests. Unit tests run as `pnpm vitest run --project app --maxWorkers=2`. Never pipe a gate through `| tail`.
- Build in a clean worktree from `origin/main` (hoisted `.npmrc`, copy `.env.local` and `.env.test.local`). Ship by patch-apply to main (§6).
- **Never stage:** `middleware.ts`, `app/[locale]/layout.tsx`, `components/layout/conditional-nav.tsx`, the dirty marketing nav files (`marketing-lang-toggle.tsx`, `marketing-mobile-menu.tsx`, `marketing-user-menu.tsx`), `components/marketing/home/hero.tsx`, any auth hunk, the untracked 084 migration, `supabase/config.toml`. For dirty shared files (`next.config.ts`, `app/sitemap.ts`, `messages/*.json`), take only B3's hunks. B3 is not expected to touch any of them.

## Review Focus

1. **A legacy course buyer is not a Vault member.** `checkVaultAccess()` (`lib/vault/access.ts:158-178`) grants Vault to anyone with *any* live enrollment (`source: 'enrollment'`). SQL `has_vault_access()` does not. If `hasCourseAccess` trusted `checkVaultAccess().hasAccess`, a $198 cohort buyer would see every included course as unlocked while RLS returned null URLs. → Task 3 test `legacy enrollee in another course is denied an included course`.
2. **Lapsed vs grace subscribers.** `cancelled` before `expires_at` reads. `cancelled` after expiry does not. `past_due` does not. A `community`-tier subscriber does not. → matrix cases (Task 2), asserted against both TS and SQL (Task 5).
3. **An unpublished, non-self-study or proposal course with the flag set.** It must stay unreadable to Vault members. The flag can't be set on a cohort or 1v1 course, and an instructor can't write their own course row at all. → Task 1 SQL clause plus Task 5 `instructor cannot write a proposal row directly` and `only self-study courses can be vault_included`.
4. **Paid material via the views.** A Vault member on an included course gets `replay_url`, the session-only resource URL, `community_link` and ESL. The same member on a non-included course gets none of them. → Task 5.
5. **Progress writes.** A Vault reader can mark a session complete on an included course. `syncEnrollmentCompletion` stays a no-op with no enrollment row and must not throw. A refunded buyer is still rejected. → Task 4.

---

## 1. Verified facts (2026-10-18; the roadmap is stale here)

| Roadmap says | Reality |
|---|---|
| "migration 081, extending 071" | 071 and 073 were never applied. Their helpers live in **085** (additive) and **086** (enforce), both on prod. B3 = **087**. |
| "All 071 policies/views and 073 ESL inherit" | Policies and views inherit: `weeks_catalog_read`, `sessions_material_read` (via `can_read_session_materials` → `can_read_course_materials`), `assignments_/vocabulary_material_read`, `resources_material_read` (via `can_read_course_resource`), `course_instructors_catalog_read`, and the 4 `course_*_catalog` views' `CASE` columns. **ESL does not inherit.** `can_access_course_esl()` (`085:109-118`) checks `enrollments` directly, so it needs its own clause (D2). |
| `course_item_completions` needs a check | Own-row only (`051:25-29`), as is `course_session_opens` (`062:33-37`). **No SQL change.** The app gate in `lib/progress/actions.ts` is the real check (Task 4). |
| "33 files query enrollments" | 52 `.from('enrollments')` calls in 26 files, plus 3 helpers. **8 are content gates** (§3). |
| Instructors can self-set `vault_included` | **Confirmed, and wider.** `courses_own_proposals_insert/update` (`032:44-63`) only check `status = 'proposal'`. Through PostgREST an instructor can write `vault_included = true` **and `is_published = true`** on their own proposal. `approveProposal` (`lib/instructor-portal/actions.ts:189-192`) keeps both. It's reachable without a raw API call too: `updateCourse` (`lib/courses/actions.ts:16-40`) is an exported `'use server'` action with **no admin check**, which writes any payload through the user client. RLS limits that to admins and to the instructor's own proposal. The same hole also lets an instructor pre-set `price_usd`, `instructor_revenue_share_pct`, `partner_id`, `esl_included`, `is_private` and `course_type`, and approval keeps all of them. Instructor-portal proposal writes already use the service role (`:117-128`, `:147-164`), so the 032 write policies have no legitimate user. Fixed by D3 (rev 2). |

**Prod courses (read-only service-role REST query, 2026-10-18):** 13 courses, **every one `vault_included = false`**, and **none is `self-study`**.

| slug | published | private | type | price_usd (¢) | esl en/incl | proposed by instructor |
|---|---|---|---|---|---|---|
| ai-essentials-first-steps-future | ✓ | – | cohort | 125000 | ✓ / – | – |
| ai-for-music-professionals | ✓ | ✓ | cohort | 19800 | – | – |
| how-to-make-different-types-of-martinis | ✓ | ✓ | cohort | 100 | – | – |
| teaching-ai-for-teachers | ✓ | ✓ | cohort | 0 | – | – |
| test-1v1 | ✓ | ✓ | 1v1 | null | – | – |
| ai-foundations-for-business, ai-foundations-modern-professionals, ai-mastery-curious-to-confident, ai-powered-productivity, building-ai-first-products, how-to-make-personal-brand, introduction-to-claude-code, website-chatbot-installation | draft | – | cohort | 29700–79700 | (2 have esl_enabled) | – |

So nothing on prod becomes Vault-readable when B3 ships. Exposure starts only when Ryan flips a flag (§7, D7).

## 2. Decisions for Ryan (recommendations marked)

- **D1 — SQL shape.** In 087, `can_read_course_materials(p_course)` becomes `can_manage_course(p_course) OR <live enrollment> OR (auth.uid() IS NOT NULL AND EXISTS (SELECT 1 FROM courses c WHERE c.id = p_course AND c.is_published AND c.vault_included) AND has_vault_access(auth.uid()))`. The signature, security settings and grants stay. `can_read_session_materials` and `can_read_course_resource` are **not** redefined, because they call it. *Recommended.*
- **D2 — ESL on included courses.** Add the same Vault clause to `can_access_course_esl`, but only where the course already has `esl_included = true`. In that case ESL comes with course access, and Vault access becomes course access. Without `esl_included`, ESL stays an add-on purchase even for Vault members. Mirror this in `lib/esl/access.ts` with `source: 'vault'`. *Recommended.* (Alternative: ESL stays enrollment/purchase-only. Rejected, because "included" would then mean two different things.) No prod course has `esl_included = true` today.
- **D3 (rev 2, after plan review) — Close the self-flag hole completely.**
  1. In 087, `DROP POLICY IF EXISTS courses_own_proposals_insert` and `courses_own_proposals_update`. Keep `courses_own_proposals_read`. No app path uses these policies, because proposal writes go through the service role. `courses_admin_all` (`FOR ALL USING (is_admin())`) and the service role are unaffected.
  2. `updateCourse`, `invalidateSyllabusCache`, `publishCourse` and `unpublishCourse` (`lib/courses/actions.ts`) get a module-local `requireAdmin()`, the same pattern as `lib/instructor-portal/actions.ts:59`. Their only caller is `components/admin/AdminCourseDetail.tsx`.
  3. In 087, `ADD CONSTRAINT courses_vault_included_self_study CHECK (NOT vault_included OR course_type = 'self-study')`. This writes the roadmap's "self-study yes, cohorts no" (and never 1v1) into the database: one mis-click on a cohort would otherwise hand out its Zoom and community links and skip `max_enrollment`. 0 prod rows violate it. New self-study courses come from the wizard (`WizardStepBasicInfo.tsx:50`).
  4. In `AdminCourseDetail.tsx`, the toggle is disabled with a hint ("Only self-study courses can be included in the Vault") unless `course.course_type === 'self-study'`, and `handleVaultIncludedToggle` catches and shows the error.
  5. `approveProposal` adds `vault_included: false, is_published: false` to its update.
  *Recommended.*
- **D9 (new, from plan review) — No paying twice.** After B3 a Vault member could still buy an included course. `app/api/stripe/checkout/route.ts:70-84` and `checkout-embed/route.ts:67` only check for an existing enrollment. Both routes return `409 { error: 'included_in_vault' }` when `hasCourseAccess(...).source === 'vault'`. `app/[locale]/learn/[slug]/checkout/page.tsx:46` redirects those users to the course hub, as it already does for enrolled users. *Recommended;* this is the only new decision since your approval.
- **D4 — TS Vault semantics = SQL semantics.** `hasCourseAccess` counts Vault access only when `checkVaultAccess()` returns `hasAccess && source !== 'enrollment'` (Review Focus #1). `checkVaultAccess`'s own legacy step 4 is untouched: it is pre-existing TS↔SQL drift for *Vault* content and out of scope (§8). *Recommended.* (Alternative: `hasCourseAccess` = `supabase.rpc('can_read_course_materials')`. That gives exact parity with no TS mirror, but it silently widens the course page to every assigned instructor and breaks the B1 parity pattern you asked for. Rejected.)
- **D5 — Staff stay as today in TS.** SQL grants `can_manage_course` (admins and assigned instructors). `hasCourseAccess` does not, so the course pages keep today's behaviour for staff. TS is stricter than SQL only in the safe direction. The matrix excludes staff and says so. *Recommended.*
- **D6 — Leave dashboard listings enrollment-based in B3.** `getUpcomingSessionsForStudent`, `getPendingAssignmentsForStudent`, `getCommunityLinksForStudent`, `getResumePoint`, the partner rail and "My courses" decide *which courses are mine*. A Vault reader has no enrollment row, so an included course they are reading won't show on `/learn/dashboard` yet. They still reach it at `/learn/dashboard/<slug>`. "Started Vault courses on the dashboard" (driven by `course_session_opens` / `course_item_completions`) goes into **2b or its own follow-on**. *Recommended.*
- **D7 — Data.** There is no default flip. Every prod course is a cohort or 1v1, so **there is nothing to flip yet**. `ai-essentials-first-steps-future` (a $1,250 cohort) must stay `false`. Before 2b ships, Ryan either creates or converts a self-study course and flips it, or 2b ships with "Join the Vault" shown on no course. B3 doesn't block on this either way. *Ryan to choose before 2b.*
- **D8 — Fold in the `NavCtaAnchor` `/api/` fix: yes, as its own small task and commit (Task 6).** `components/marketing/nav/nav-cta-anchor.tsx` is clean in main. The bug (`NextLink` for `/api/` does a client-side RSC fetch and strands the click, Unit 1 record `:518`) must land before anything uses `cta="join_vault"`, and 2b is that first user. The fix is three lines plus a test, and it touches no dirty file. *Recommended.* (Alternative: keep it separate and land it with 2b. Then 2b carries a nav fix it doesn't own.)

## 3. Enrollment-read inventory (52 calls + helpers)

**Content gates. Route these through `hasCourseAccess` (or the Vault clause) in B3:**

| # | Site | Today | B3 change |
|---|---|---|---|
| A1 | `lib/enrollments/queries.ts:28` `checkEnrollment` | enrollment active/completed | Unchanged. It stays the enrollment primitive, and `hasCourseAccess` composes it via the new `getLiveEnrollment` |
| A2 | `app/[locale]/learn/[slug]/page.tsx:65-69` | `isEnrolled` → SessionCard/WeekCard/Curriculum/Bonus/CTA | `hasCourseAccess(user.id, course).hasAccess` (Task 4) |
| A3 | `app/[locale]/learn/dashboard/[course-slug]/page.tsx:46-69` | gates `CourseHub` + completion + 1v1 reports | access gates hub + completion; 1v1 reports stay `source === 'enrollment'` (Task 4) |
| A4 | `lib/progress/actions.ts:75-88` `requireEnrollment` (used at :206, :237, :272) | throws "Not enrolled" | `requireCourseAccess` via `hasCourseAccess` (Task 4) |
| A5 | `lib/esl/access.ts:27-39` `checkESLAccess` | `esl_included` + enrollment | add Vault branch (D2, Task 3) |
| A6–A8 | `lib/dashboard/queries.ts:51,120,199` | dashboard lists for enrolled courses | **Leave** (D6). These are listings, and RLS already serves the material |

**Ambiguous. Left as is, with the reason:** `lib/progress/queries.ts:332` `getResumePoint` and the partner rail in `learn/dashboard/page.tsx:206` (both D6); `lib/vault/access.ts:162` legacy step 4 (D4 / §8); `getEnrollmentByCourseId` (`lib/enrollments/queries.ts:59`, no callers, `active` only; leave it, and delete it in a cleanup unit).

**Enrollment-specific. Leave alone (B):** `progress/actions.ts:168-184` (`syncEnrollmentCompletion`: no row → returns), `vault/queries.ts:1301`, `paths/generate.ts:181`, `tutoring/queries.ts:75,252`, `api/tutoring/generate:257`, `stripe/checkout:72`, `checkout-embed:67`, `admin/stripe/send-payment-link:40`, `stripe/webhooks.ts:101,153,376,396`, `revenue-split/persist.ts:70`, `cron/reminders:59`, `enrollments/actions.ts:94,103`, `courses/queries.ts:386`, `courses/actions.ts:113`, `admin/queries.ts:40,79,130,189,631`, `admin/actions.ts:51,73,151,160`, `admin/course-survey-actions.ts:148`, `instructors/queries.ts:217`, `partner-portal/queries.ts:158,168,319,330`, `admin/partners/**` (4 sites), `api/admin/partners/**` (2), `api/admin/enrollments/[id]:30`, `learn/[slug]/checkout/page.tsx:46` (dedupe), `getUserEnrollments` callers.

## 4. File map

Create
- `supabase/migrations/087_vault_course_access.sql` (Task 1)
- `lib/enrollments/access.ts`: `hasCourseAccess` (Task 3). It goes in its own file, not `queries.ts`, so `vi.mock` of `checkVaultAccess` stays local. `queries.ts` re-exports it, so the roadmap's import path works.
- `__tests__/lib/enrollments/course-access.test.ts`, `__tests__/marketing/nav/nav-cta-anchor.test.tsx`

Modify
- `lib/access/checks.ts` (+ `canReadCourseContent`), `lib/access/parity-matrix.ts` (+ `COURSE_ACCESS_CASES`), `__tests__/lib/access/checks.test.ts` (Task 2)
- `lib/enrollments/queries.ts` (+ `getLiveEnrollment`, re-export), `lib/enrollments/types.ts` (+ `CourseAccess`), `lib/esl/access.ts`, `lib/esl/types.ts:186` (`source` + `'vault'`) (Task 3)
- `lib/progress/actions.ts`, `app/[locale]/learn/[slug]/page.tsx`, `app/[locale]/learn/dashboard/[course-slug]/page.tsx`, plus their existing tests where mocks name `checkEnrollment` (Task 4)
- `lib/instructor-portal/actions.ts:189-192` (D3.5), `lib/courses/actions.ts` (D3.2), `components/admin/AdminCourseDetail.tsx` (D3.4) and their tests (Task 1)
- `app/api/stripe/checkout/route.ts`, `app/api/stripe/checkout-embed/route.ts`, `app/[locale]/learn/[slug]/checkout/page.tsx` (D9, Task 4)
- `supabase/tests/course_material_access_rls.test.ts` (Task 5)
- `components/marketing/nav/nav-cta-anchor.tsx` (Task 6)
- `lib/courses/types.ts:125-129`: update the comment (B3 now reads the flag)

Not edited: `lib/vault/access.ts`, `lib/dashboard/queries.ts`, `components/learn/*`, any checkout/webhook file, 085/086.

## 5. Tasks

### Task 1: Migration 087 + proposal reset

**Files:** Create `supabase/migrations/087_vault_course_access.sql`. Modify `lib/instructor-portal/actions.ts`. Test: the existing instructor-portal actions test (find it with `grep -rln approveProposal __tests__`).

**Interfaces:** Produces the SQL functions `can_read_course_materials(uuid)` and `can_access_course_esl(uuid)`, both with the D1/D2 clause. Keep the parameter name `p_course`, because `CREATE OR REPLACE` rejects a renamed parameter, and schema-prefix every call (`public.has_vault_access(auth.uid())`) as 085 does. Clause order: the course lookup first, then `has_vault_access`. 087 also drops the 032 write policies (D3.1) and adds the constraint `courses_vault_included_self_study` (D3.3).

**Files (add):** `lib/courses/actions.ts`, `components/admin/AdminCourseDetail.tsx`, `__tests__/lib/track-actions.test.ts` (already mocks `updateCourse`'s client).

- [ ] **Step 1: Failing unit tests:**
  - `approveProposal sets vault_included and is_published false`: mock the admin client, call `approveProposal('c1')`, and assert the update payload equals `{ status: 'draft', proposal_review_notes: null, vault_included: false, is_published: false }`.
  - `updateCourse rejects a non-admin`: the mocked `users.role` is `'instructor'` → rejects with `'Not authorized'`, and no `courses` update is issued. Existing admin-path tests still pass.
  - `vault toggle is disabled for a cohort course`: render `AdminCourseDetail` with `course_type: 'cohort'` → the toggle has `disabled` and the hint text; with `'self-study'` it is enabled.
- [ ] **Step 2:** `pnpm vitest run --project app <those test files>`. Expected: FAIL.
- [ ] **Step 3: Implement.** Make the D3.2/D3.4/D3.5 app edits. Write 087 in the 085 house style:
  - a header covering purpose, plan link, the APPLY ORDER ("apply BEFORE pushing the B3 code; additive for readers, restrictive only for direct instructor writes, which no app path uses"), post-apply verification SQL (§7) and rollback (re-run 085's two function bodies and 032's two write policies; drop the constraint);
  - `BEGIN;`, the two `CREATE OR REPLACE FUNCTION`s (bodies per D1/D2, with 085's existing branches kept verbatim), the two `DROP POLICY IF EXISTS`, then `ALTER TABLE public.courses DROP CONSTRAINT IF EXISTS courses_vault_included_self_study` followed by `ADD CONSTRAINT …`;
  - the 085 `REVOKE`/`GRANT` lines for both functions, then `NOTIFY pgrst, 'reload schema'; COMMIT;`.
  The script must be re-runnable.
- [ ] **Step 4:** Same command. Expected: PASS.
- [ ] **Step 5: Commit** `feat(db): 087 Vault course access predicate + proposal flag guard`.

### Task 2: Pure predicate + shared course-access matrix

**Files:** Modify `lib/access/checks.ts`, `lib/access/parity-matrix.ts` and `__tests__/lib/access/checks.test.ts`.

**Interfaces:**
- Produces in `checks.ts`:
  ```ts
  export interface CourseAccessCourse { is_published: boolean; vault_included: boolean }
  export function canReadCourseContent(input: { enrolled: boolean; hasVault: boolean; course: CourseAccessCourse }): boolean;
  // = enrolled || (course.is_published && course.vault_included && hasVault)
  ```
  The header comment adds `can_read_course_materials()` (085, 087) to the list of mirrored SQL helpers.
- Produces in `parity-matrix.ts`:
  ```ts
  export type VaultState = 'anon' | 'none' | 'vault_active' | 'vault_trialing' | 'vault_cancelled_grace' | 'vault_cancelled_expired' | 'vault_past_due' | 'community_active' | 'cohort_window' | 'seat_active';
  export type CourseAccessCase = { id: string; description: string; vault: VaultState;
    enrollment: 'active' | 'completed' | 'refunded' | 'cancelled' | null;
    enrollmentOnOtherCourse?: boolean;
    course: { published: boolean; vaultIncluded: boolean }; expectCourse: boolean; expectEsl: boolean };
  export const COURSE_ACCESS_CASES: readonly CourseAccessCase[];
  export function vaultStateFixture(state: VaultState, now: Date): { user: SubscriptionCheckUser; cohort: CohortEnrollmentRow[]; seats: SeatGrantRow[] } | null; // null for 'anon'
  ```
  Cases (id → expect): `anon-included` ✗ · `none-included` ✗ · `active-included` ✓ · `trialing-included` ✓ · `grace-included` ✓ · `expired-included` ✗ · `past-due-included` ✗ · `community-included` ✗ · `cohort-included` ✓ · `seat-included` ✓ · `active-not-included` ✗ · `active-included-unpublished` ✗ · `enrolled-active-not-included` ✓ · `enrolled-completed-not-included` ✓ · `enrolled-refunded-not-included` ✗ · `enrolled-cancelled-not-included` ✗ · `expired-plus-enrolled-active` ✓ · `legacy-other-course-enrollment-included` ✗. The last one has an active enrollment on a *different* course: TS feeds it through `hasCourseAccess` (Task 3), and SQL seeds the enrollment on the other course. Staff are excluded on purpose (D5).
  Each case also carries `expectEsl: boolean`, evaluated on a course with `esl_enabled` + `esl_included`. It equals `expectCourse`, except that unpublished courses and `legacy-other-course` are ✗. The SQL side checks it against `can_access_course_esl` (Task 5).
- [ ] **Step 1: Failing test.** `describe('course access matrix (TypeScript side)')` iterates `COURSE_ACCESS_CASES`: `hasVault = fixture ? hasVaultAccess(fixture.user, fixture.cohort, fixture.seats, now) : false`, `enrolled = ['active','completed'].includes(enrollment)`, and expects `canReadCourseContent({enrolled, hasVault, course: {is_published: published, vault_included: vaultIncluded}})` to be `expectCourse`. Add one guard test: the case ids are unique and the matrix has ≥ 17 cases.
- [ ] **Step 2:** `pnpm vitest run --project app __tests__/lib/access/checks.test.ts`. Expected: FAIL (export missing).
- [ ] **Step 3:** Implement both files.
- [ ] **Step 4:** Same command. Expected: PASS, including the existing 19 entitlement cases.
- [ ] **Step 5: Commit** `feat(access): canReadCourseContent + shared course access matrix`.

### Task 3: `hasCourseAccess` + ESL Vault branch

**Files:** Create `lib/enrollments/access.ts` and `__tests__/lib/enrollments/course-access.test.ts`. Modify `lib/enrollments/queries.ts`, `lib/enrollments/types.ts`, `lib/esl/access.ts`, `lib/esl/types.ts`, and the ESL access test (create `__tests__/lib/esl/access.test.ts` if none exists).

**Interfaces:**
- Consumes `canReadCourseContent` (Task 2) and `checkVaultAccess` (`lib/vault/access.ts:72`).
- Produces:
  ```ts
  // lib/enrollments/types.ts
  export type CourseAccess = { hasAccess: boolean; source: 'enrollment' | 'vault' | null; enrollment: Enrollment | null };
  // lib/enrollments/queries.ts
  export async function getLiveEnrollment(userId: string, courseId: string): Promise<Enrollment | null>; // status in ('active','completed')
  export { hasCourseAccess } from './access';
  // lib/enrollments/access.ts
  export async function hasCourseAccess(userId: string, course: { id: string; is_published: boolean; vault_included?: boolean | null }): Promise<CourseAccess>;
  ```
  The order is: enrollment first, so the result is `source 'enrollment'` with the row. `checkVaultAccess` is called **only** when `is_published && vault_included`. Vault counts only when `hasAccess && source !== 'enrollment'`. A `null`/`undefined` `vault_included` counts as `false`.
  `checkESLAccess` gets one new branch, `esl_included && is_published && vault_included && <vault as above>` → `{ hasAccess: true, source: 'vault' }`. It sits after the enrollment branch and before the purchase lookup. It also widens its select to `esl_enabled, esl_included, is_published, vault_included`.
- [ ] **Step 1: Failing tests** (`vi.mock('@/lib/supabase/server')` with a chainable enrollments stub, and `vi.mock('@/lib/vault/access')`):
  - `enrolled user → source enrollment, checkVaultAccess not called`.
  - `vault subscriber on included published course → source vault`.
  - `vault subscriber on non-included course → no access, checkVaultAccess not called`.
  - `vault subscriber on included unpublished course → no access`.
  - `legacy enrollee in another course is denied an included course` (`checkVaultAccess` → `{hasAccess:true, source:'enrollment'}` → `hasAccess false`).
  - `vault_included undefined → treated as false`.
  - ESL: `vault member gets ESL on included course with esl_included → source vault`; `… esl_included false → no access`; `… course not vault_included → no access`.
- [ ] **Step 2:** `pnpm vitest run --project app __tests__/lib/enrollments/course-access.test.ts __tests__/lib/esl`. Expected: FAIL.
- [ ] **Step 3:** Implement.
- [ ] **Step 4:** Same command. Expected: PASS.
- [ ] **Step 5: Commit** `feat(enrollments): hasCourseAccess (enrollment or Vault-included) + ESL Vault branch`.

### Task 4: Route the content gates through `hasCourseAccess`

**Files:** Modify `lib/progress/actions.ts`, `app/[locale]/learn/[slug]/page.tsx`, `app/[locale]/learn/dashboard/[course-slug]/page.tsx`, and `lib/courses/types.ts` (comment only). Tests: the existing progress-actions test (`grep -rln toggleSessionComplete __tests__ lib`) plus any page test that mocks `checkEnrollment` for these routes.

**Interfaces:**
- Consumes `hasCourseAccess` (Task 3).
- `resolveItemCourse` widens its `course_catalog` select from `'slug'` to `'slug, is_published, vault_included'` and returns `{ courseId, courseSlug, course: { id, is_published, vault_included } }`.
- `requireEnrollment` is renamed `requireCourseAccess(userId, course)` and throws `'No access to this course'` unless `hasCourseAccess(...).hasAccess`.
- Course detail page: `const access = user ? await hasCourseAccess(user.id, course) : null; const isEnrolled = access?.hasAccess ?? false;`. The variable name is kept so the JSX diff is one line. 2b renames it with the UI.
- Course hub: `isEnrolled={access.hasAccess}`. Completion loads when `access.hasAccess`. 1v1 reports load only when `access.source === 'enrollment'`.
- D9: `checkout` and `checkout-embed` call `hasCourseAccess` after their enrollment dedupe and return `409 { error: 'included_in_vault' }` when `source === 'vault'`. The checkout page redirects to the hub when `hasAccess` (any source).
- Extra failing tests: `checkout returns 409 included_in_vault for a Vault member on an included course`, the same for `checkout-embed`, and `checkout still creates a session for a Vault member on a non-included course`.
- [ ] **Step 1: Failing tests:**
  - `toggleSessionComplete succeeds for a Vault reader of an included course` (hasCourseAccess mocked → `{hasAccess:true, source:'vault'}`). Assert the completion insert happens and `syncEnrollmentCompletion` resolves without throwing when the enrollments lookup returns `null`.
  - `toggleSessionComplete rejects without access` → `'No access to this course'`.
  - `recordSessionOpen` and `toggleAssignmentComplete` follow the same pair.
  - Update the existing tests that asserted `'Not enrolled in this course'`.
- [ ] **Step 2:** Run the progress test file(s). Expected: FAIL.
- [ ] **Step 3:** Implement the three edits.
- [ ] **Step 4:** Run them again, then `NODE_OPTIONS=--max-old-space-size=8192 pnpm type-check`. Expected: PASS, exit 0.
- [ ] **Step 5: Commit** `feat(learn): course pages and progress writes honour Vault-included access`.

### Task 5: RLS suite (local stack) + hosted regression

**Files:** Modify `supabase/tests/course_material_access_rls.test.ts`.

**Interfaces:** Consumes `COURSE_ACCESS_CASES` and `vaultStateFixture` (Task 2), plus `serviceClient`, `userClient` and `anonClient`.

- [ ] **Step 1: Write the tests.**
  - Seed users `vaultMember` (`subscription_tier 'vault'`, `active`) and `lapsed` (`vault`, `cancelled`, `subscription_expires_at` = yesterday).
  - Seed `includedCourse`: published, `vault_included true`, `esl_enabled` + `esl_included`, with one week, one paid session (`replay_url` secret), one session-only resource, `community_link`, and one published ESL lesson with audio.
  - Seed `includedDraft`: unpublished, `vault_included true`. The existing `course` stays non-included.
  - Tests:
    - `vault member reads paid material on an included course`: raw `course_sessions.replay_url`, `course_resources.url`, `course_catalog.community_link`, `esl_lessons` row, and a signed audio URL.
    - `vault member gets nothing paid on a non-included course` (the existing `course`, same reads as the anonymous test).
    - `lapsed subscriber and anon get nothing on the included course`.
    - `vault member cannot read an included draft`.
    - `COURSE_ACCESS_CASES match can_read_course_materials and can_access_course_esl`: per case, seed a user from `vaultStateFixture` and an enrollment row if needed (on the other course for `enrollmentOnOtherCourse`). Then assert `userClient.rpc('can_read_course_materials', { p_course })` equals `expectCourse` and `rpc('can_access_course_esl', …)` equals `expectEsl`. Anon uses `anonClient()`. Seed through `supabase/tests/helpers/partner-spine.ts`: `seedSpinePartners`, `seedUser`, `createSeatBlock`, plus a seat grant row and a `cohort_enrollments` row via service. Clean up with `resetSpineData(userIds)`, because partners can't be deleted (RESTRICT FK on the audit log). Sharing the SPINE partners is safe because `test:rls` runs with `--no-file-parallelism`.
    - `instructor cannot write a proposal row directly`: the `teacher` client inserts `{ status: 'proposal', proposed_by_instructor_id: teacherProfile, … }` → error `42501`. A service-seeded proposal, updated by the teacher to `vault_included: true` → no row is updated (service read shows `false`).
    - `only self-study courses can be vault_included`: service inserts with `vault_included: true` and `course_type` `'cohort'`, then `'1v1'` → error `23514` both times. With `'self-study'` → OK.
  - Clean up every seeded row in `afterAll`. Existing baseline: 28 tests.
- [ ] **Step 2: Local stack** (in the worktree):
  - `supabase stop`. Temp-rename `supabase/migrations/022_make_has_laptop_nullable.sql` and `025_survey_has_laptop_nullable.sql` (e.g. `.sql.bak`), and swap `.env.test.local` to the local block.
  - `supabase start`. It replays 001…087; 084 is not in the worktree.
  - Run `pnpm test:rls course_material_access_rls --maxWorkers=1 --minWorkers=1`. Expected: all PASS, i.e. the 28 existing tests plus the new ones.
  - **Restore** both files and the env block, `supabase stop`, then `git status` in the worktree shows only B3's files.
- [ ] **Step 3: Hosted throwaway** `kmmfssluqbcuhybfrsbn` (**never prod**):
  - First confirm 085 and 086 are on the throwaway: `can_manage_course` exists, and `courses_staff_read` is in `pg_policies`. If either is missing, stop and tell Ryan.
  - Run `pnpm test:rls` for a baseline.
  - Apply 087 twice via `TEST_SUPABASE_DB_URL` (the second run is a no-op) and insert history row `087`.
  - Run `pnpm test:rls` again. Expected: the same result as the baseline. `course_material_access_rls` fails in both runs by design, because its `beforeAll` throws when the URL isn't local. Any other difference must be explained.
- [ ] **Step 4: Commit** `test(rls): Vault course access + proposal flag guard`.

### Task 6: `NavCtaAnchor` `/api/` fix (D8)

**Files:** Modify `components/marketing/nav/nav-cta-anchor.tsx`. Create `__tests__/marketing/nav/nav-cta-anchor.test.tsx`.

- [ ] **Step 1: Failing test:**
  - `cta /api/stripe/subscribe?tier=vault renders a plain anchor`: with the `ja` locale, `href` is `apiHrefForLocale(…, 'ja')`, and the element is not a Next `Link` (assert `next/link` is mocked and not called).
  - `/learn cta still uses the locale Link`.
- [ ] **Step 2:** `pnpm vitest run --project app __tests__/marketing/nav/nav-cta-anchor.test.tsx`. Expected: FAIL.
- [ ] **Step 3:** In the `/api/` branch, replace `NextLink` with `<a href={apiHrefForLocale(cta.href, locale)} …>`, mirroring `HvButton` (`components/marketing/hv/button.tsx:102-106`). Drop the `next/link` import.
- [ ] **Step 4:** Same command, plus `__tests__/marketing/marketing-nav.test.tsx`. Expected: PASS. (That test is dirty in main, so run the worktree copy.)
- [ ] **Step 5: Commit** `fix(nav): Join-the-Vault CTA does a full navigation for /api/ hrefs`.

### Task 7: Gates, review, ship

- [ ] **Step 1: Gates in the worktree, one at a time:**
  1. `NODE_OPTIONS=--max-old-space-size=8192 pnpm type-check`
  2. `pnpm vitest run --project app --maxWorkers=2`
  3. `NODE_OPTIONS=--max-old-space-size=8192 pnpm build`

  Expected: all exit 0. The route table is unchanged vs a baseline build: `/`, `/ja`, `/about`, `/learn` and `/ja/learn` are still `●`, and `/learn/[slug]` is still `ƒ`.
- [ ] **Step 2: Adversarial review.** Use `requesting-code-review` with the reviewer told to *refute*, over the worktree diff plus 087, with this plan attached. Ask them to attack:
  - the SQL clause's anon path;
  - the D3 policy rewrite (can admins still edit proposals? can the service role?);
  - D4 legacy drift;
  - the "8 content gates" classification — find a 9th.

  Triage with `receiving-code-review`, then re-run any affected gates.
- [ ] **Step 3: STOP. Ryan applies 087** in the Supabase dashboard SQL editor on `zvfwtndbxshrtpwcwynw`, **before** the push. 087 is expand-safe on the old code: the old pages only under-grant, and no flag is true.
- [ ] **Step 4: Verify prod by query** (§7), never by trusting a note.
- [ ] **Step 5: STOP. Ryan approves the push.** Then ship per §6.
- [ ] **Step 6: Post-deploy:**
  - Wait for the Vercel status on the sha to show success.
  - Smoke while logged out, EN and `/ja`: `/learn/ai-essentials-first-steps-future` renders unchanged.
  - Ryan's logged-in smoke: a Vault member on that (non-included) course still sees the enroll CTA. Note that once a course *is* included, Vault readers will see `EnrollButton`'s enrolled state until 2b replaces it. That's expected.
  - Append an execution record to this plan.
  - Update memory `project_marketing_redesign_green` (B3 shipped, 087 on prod, 2b next).

## 6. Ship mechanics (same as Unit 2a §6)

1. In the worktree, run `git add -A -- . ':!.npmrc'` → `git diff --cached --binary origin/main > b3.patch`.
2. In main, run `git apply --cached b3.patch`.
3. Eyeball `git diff --cached --stat`: it must show no auth paths, no 084 and no WIP paths.
4. `git write-tree` must equal the worktree's tree.
5. Commit and push in one command.
6. Reconcile main's working copy. B3's files are all clean in main, so run `git checkout -- <B3 paths>`.
7. `git status` shows only the pre-existing WIP.

## 7. Prod verification after Ryan applies 087 (read-only; transaction rolled back)

```sql
-- 1. Bodies + security (expect 2 rows, prosecdef t, both contain 'vault_included')
select proname, prosecdef, position('vault_included' in pg_get_functiondef(oid)) > 0 as has_clause
  from pg_proc where pronamespace = 'public'::regnamespace
  and proname in ('can_read_course_materials','can_access_course_esl');
-- 2. Grants (expect EXECUTE for anon, authenticated, service_role and the owner postgres; no PUBLIC)
select routine_name, grantee, privilege_type from information_schema.routine_privileges
  where routine_schema = 'public' and routine_name in ('can_read_course_materials','can_access_course_esl') order by 1, 2;
-- 3. Policies + constraint (expect: only courses_own_proposals_read remains; 1 constraint)
select policyname, cmd from pg_policies where tablename = 'courses' and policyname like 'courses_own_proposals_%';
select conname, pg_get_constraintdef(oid) from pg_constraint where conname = 'courses_vault_included_self_study';
-- 4. Behaviour. Run as ONE statement. It ALWAYS ends in an exception, which rolls everything back
--    (so no flag can be left flipped, even under "Run selected"). The error text is the result.
--    The probe course and member are created inside the block, so no real course is touched and
--    the member cannot be enrolled in it or teach it.
do $$
declare v_member uuid; v_course uuid := gen_random_uuid(); r0 boolean; r1 boolean;
begin
  select id into v_member from public.users
   where subscription_tier = 'vault' and subscription_status in ('active','trialing') and role <> 'admin' limit 1;
  if v_member is null then raise exception 'NO_VAULT_MEMBER (positive path proven by the local suite only)'; end if;
  insert into public.courses (id, slug, title_en, is_published, course_type, vault_included)
    values (v_course, 'b3-probe-' || v_course, 'B3 probe', true, 'self-study', false);
  perform set_config('request.jwt.claims', json_build_object('sub', v_member, 'role', 'authenticated')::text, true);
  r0 := public.can_read_course_materials(v_course);
  update public.courses set vault_included = true where id = v_course;
  r1 := public.can_read_course_materials(v_course);
  raise exception 'B3_PROBE before=% after=%', r0, r1;
end $$;
-- expect: ERROR B3_PROBE before=false after=true
-- 5. Unchanged default (expect 0, and no 'b3-probe-%' slug exists)
select count(*) filter (where vault_included) as flagged, count(*) filter (where slug like 'b3-probe-%') as probes from public.courses;
```

`auth.uid()` reads `request.jwt.claims ->> 'sub'`. The block runs as `postgres`, but the SECURITY DEFINER functions only use `auth.uid()`, so no role switch is needed. If the probe insert fails on another NOT NULL column, add that column with a dummy value; it all rolls back anyway. Step 5 must show `flagged = 0`, `probes = 0` until Ryan flips a flag on purpose.

## 8. Out of scope

- The course-detail UI: "Join the Vault" CTA, conditional enroll CTA, "Included in the Vault" price card (Unit 2b).
- Dashboard listing and resume for Vault-read courses (D6 → 2b or a follow-on).
- `checkVaultAccess` legacy step 4. Course buyers get Vault content in TS but not in SQL, and no parity case covers it. It needs its own decision: grandfather it in SQL, or drop it in TS.
- Deleting the dead `getEnrollmentByCourseId`. Unifying the B-row status filters.
- Certificates or completion records for Vault readers (completion stays enrollment-only).
- `/api/esl/progress` writes progress for any lesson id with no access check (own-row only). Pre-existing, found in plan review; fix in a hardening pass.

## Plan review (2026-10-18, fresh sub-agent told to refute)

Folded in as rev 2: C1, the §7 probe is now a self-rolling-back `DO` block on a throwaway probe course; I1, the CHECK is self-study-only and the toggle is gated; I2, the 032 write policies are dropped and `updateCourse` gets `requireAdmin`; I3, the seeding uses the partner-spine helpers; I4, the matrix gains a legacy-other-course case and an `expectEsl` column. Minors: 42501 expectations, owner `postgres` in grants, hosted-suite notes, 28-test baseline, schema-prefix and `p_course`, and the new D9. Both of the reviewer's headline claims (no admin check in `updateCourse`; self-study creatable) were checked against the code before acting. Held: the anon path, SECURITY DEFINER/grant preservation, no other SQL reader of enrollments, admin/service writes after D3, ship order, D4 semantics, no further content gate, no per-user caching.

## Execution record (2026-10-18 → 2026-10-19)

**Shipped:** `6e11e5f` feat(learn): B3 Vault course access (087), on top of `718c0ca`. One commit, 30 files (+1386/−80). It was built in the scratch worktree `hv-land-a` as 7 task commits and then patch-applied to main. `git write-tree` matched the worktree tree `d18fbd1`. **087 was applied on prod by Ryan before the push.**

**Gates** (on tree `d18fbd1`):
- type-check: exit 0.
- `vitest --project app --maxWorkers=2`: 199 files, 2218/2218.
- build: exit 0. The route table is unchanged (`/`, `/ja`, `/about`, `/learn`, `/ja/learn` ●; `/learn/[slug]` ƒ).
- Local stack, fresh replay 001→087: `course_material_access_rls` 36/36 (28 existing + 8 new, including the TS↔SQL `COURSE_ACCESS_CASES` matrix).
- Hosted throwaway `kmmfssluqbcuhybfrsbn`:
  - 085/086 were confirmed present first.
  - 087 was applied twice (a no-op the second time), and history row `087` was inserted.
  - Baseline vs after-087 differ only in `vault_catalog_rls`. Its B2 fixture set `vault_included` on a default cohort course, which the new CHECK correctly refuses. The fixture is now `course_type: 'self-study'` (6/6).
  - `business_upgrade_plans_rls` "lets a member read only their own profile…" fails in both runs and isn't caused by B3.

**Prod verification** (§7, results from Ryan's SQL editor, plus my read-only REST checks):
- Both functions are `prosecdef` and contain the clause.
- ACL is `postgres, anon, authenticated, service_role`, with no PUBLIC entry.
- Only `courses_own_proposals_read | SELECT` remains.
- The constraint is `CHECK ((NOT vault_included) OR (course_type = 'self-study'))`.
- The probe returned `B3_PROBE before=f after=t`. **Correction to §7:** Postgres prints booleans as `t`/`f`, not `false`/`true`.
- flagged = 0, probes = 0.
- From REST: anon rpc returns `false` for both functions, and anon raw `courses` returns `[]`.
- Note: the SQL editor only shows the last statement's result, so run multi-statement checks one at a time.

**Deviations and judgment calls:**
- **Progress tests** mock `checkVaultAccess` (`@/lib/vault/access`) rather than `hasCourseAccess`. The real `hasCourseAccess` → `getLiveEnrollment` path therefore runs against the table stub, which is stronger than the plan's mock.
- **`lib/courses/actions.ts`:** the internal `clearSyllabusCache()` (no admin check) is used by `updateCourse` and `updateCourseSession`. The exported `invalidateSyllabusCache` is admin-gated. This keeps `updateCourseSession`'s behaviour as it was.
- **D9 in the checkout routes:** `hasCourseAccess` is called only when `course.vault_included`, which avoids a second enrollment query on every checkout. Note that §4 "Not edited: any checkout/webhook file" contradicted D9 rev 2. D9 won, as listed in the file map.
- **Admin toggle copy:** the stale "(B3)" sentence became "Vault members can open this course without enrolling. Leave off for paid-only courses." The self-study hint is added below it. This is admin-only, English-only UI.
- **`getLiveEnrollment`** lives in `lib/enrollments/access.ts` and is re-exported from `queries.ts`. This broke an import cycle the review flagged; the interface is unchanged.

**Review** (an independent sub-agent told to refute): no Critical findings.
- Fixed:
  - The new RLS block signed in ~26 users against GoTrue's local limit of 30 per 5 minutes. It now uses one user per (Vault state, enrollment) key.
  - The comments wrongly said "staff/admins are not granted". An admin does get included courses, through the Vault, exactly as SQL `has_vault_access` does.
  - The import cycle.
  - An RLS test-order dependency and a cleanup leak.
- Left as is (minor):
  - In prod Next, the admin toggle shows a generic error instead of the 23514 text.
  - A Vault member on a FULL included course gets 400 "Course is full" before the 409.
  - `api/admin/stripe/send-payment-link` can still charge a Vault member (it's admin-initiated).
  - `checkEnrollment` now has no callers.
  - `publish`/`unpublish` run the admin check twice.
- 9th content gate: none found that over-grants. The under-grants are listings only, within D6: `app/api/dashboard/courses`, `getResumePoint`, `lib/dashboard/queries.ts`, `getVaultCourseRecommendations`.
- Declined (product call): an `is_private` self-study course flagged `vault_included` is readable by every Vault member.

**Environment notes:**
- On this 8 GB machine, Docker's VM dies when free RAM is under ~1 GB, so close Chrome first.
- Docker's auto-restart revived stale stacks, including `harpers-circle-finale`. Those were stopped, not removed.
- A VM crash left the HonuVibe db container with a corrupt `postgresql.conf`. Fixed by `supabase stop --no-backup` (the local test volume was wiped), then `supabase start -x studio,logflare,vector,imgproxy,edge-runtime,realtime,supavisor,mailpit,postgres-meta`.
- PowerShell 5.1 `>` writes UTF-16 and breaks git patches; use `git diff --output=`.
- The 022/025 renames and the `.env.test.local` swap were restored afterwards, and the stack was stopped.

**Owed:**
- Ryan's logged-in smoke as a Vault member: `/learn/ai-essentials-first-steps-future` must still show the enroll CTA (it's not included).
- Pick or create the first **self-study** course to flag before 2b (D7). Only self-study courses can be flagged now.
- Unit 2b: "Join the Vault" CTA, conditional enroll, and the price card. Until then, a Vault reader of an included course sees `EnrollButton`'s enrolled state.

## Out-of-band (Ryan)

1. Review this plan and answer D1–D8 (recommendations marked).
2. D7: decide which course, if any, becomes self-study + `vault_included` before 2b.
3. Apply 087 on prod (Task 7 Step 3). Approve the push (Step 5). Do the logged-in smoke (Step 6).
