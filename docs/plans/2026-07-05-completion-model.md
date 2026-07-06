# Tier 0.1 — Real Completion Model (Unit 2)

**Status:** Approved design, ready to execute. **Touches schema + RLS** — not a Haiku job; run execution on a capable model (Sonnet).
**Date:** 2026-07-05
**Execute via:** `docs/plans/_EXECUTION_TEMPLATE.md` (copy the prompt block, set `{{PLAN_FILE}}` to this file). This unit adds a migration, so also honor the RLS + manual-prod-migration steps below.

---

## Context

Today the LMS fakes progress: course bars are calendar-elapsed (`weeks since start_date ÷ total_weeks`), the "Completed" count reads a never-set `enrollments.status='completed'`, and there is **no per-item course completion anywhere** (confirmed greenfield — no certificate/streak/completion tables exist). This unit makes progress **real**, which is the foundation the rest of Tier 1 depends on (certificates, streaks, meaningful recommendations) and gives the notification system real events to fire on later.

**Design decisions already locked (Ryan):**
- **Mechanism:** manual "mark complete" toggle. Course sessions are external Zoom/replay links with zero watch-tracking, so auto watch-time isn't possible — reuse the Vault toggle pattern instead.
- **Schema:** one polymorphic `course_item_completions` table (sessions + assignments).
- **4th dashboard stat:** replace "Scheduled Hours" with **"Sessions Completed"** (real lifetime count).
- **Scope:** end-to-end — completion write path + derived progress + checkable action items + auto-set enrollment completion + swap the dashboard's calendar stats for real numbers.

**Explicitly deferred (do NOT build here):** certificates, streaks/XP, LINE/notifications, watch-time tracking. Course "complete" is gated on **sessions only** (assignments are tracked as action items, not part of the % or the completion gate).

**Reuse these existing patterns (read them first):**
- Toggle write path: `lib/vault/actions.ts` → `toggleBookmark` / `markComplete` (select → delete-if-exists-else-insert, `requireAuth()`, `revalidatePath`).
- Toggle UI: `components/vault/VaultCompletionToggle.tsx` (optimistic client toggle, revert on throw).
- Richer per-item row shape: `supabase/migrations/005_library_videos.sql` → `user_library_progress`.
- RLS pattern + admin helper: `enrollments` policies in `001_phase2_schema.sql` (`auth.uid() = user_id`, `public.is_admin()`).

All file paths/line numbers verified on 2026-07-05 against the working tree (post-Unit-1, commit `f370329`); re-confirm before editing.

---

## 1. Migration — `supabase/migrations/051_course_item_completions.sql`

Next free number is **051** (highest existing is `050_course_surveys.sql`). Course tables reference `public.users(id)` (not `auth.users`), and `public.users.id == auth.users.id`, so `auth.uid() = user_id` is the correct RLS predicate (same as `enrollments`).

```sql
-- 051_course_item_completions.sql
-- Per-user completion of course items (sessions + assignments).
-- Manual "mark complete" toggle: a row's presence = completed; delete = not completed.

CREATE TABLE IF NOT EXISTS public.course_item_completions (
  id           uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id      uuid NOT NULL REFERENCES public.users(id)   ON DELETE CASCADE,
  course_id    uuid NOT NULL REFERENCES public.courses(id) ON DELETE CASCADE,
  item_type    text NOT NULL CHECK (item_type IN ('session','assignment')),
  item_id      uuid NOT NULL,   -- course_sessions(id) or course_assignments(id) by type; no FK (polymorphic)
  completed_at timestamptz NOT NULL DEFAULT now(),
  UNIQUE (user_id, item_type, item_id)
);

CREATE INDEX IF NOT EXISTS course_item_completions_user_course_idx
  ON public.course_item_completions (user_id, course_id);

ALTER TABLE public.course_item_completions ENABLE ROW LEVEL SECURITY;

-- Owner can do everything to their own rows.
CREATE POLICY "course_item_completions_own"
  ON public.course_item_completions
  FOR ALL
  USING (auth.uid() = user_id)
  WITH CHECK (auth.uid() = user_id);

-- Admins can read all (mirrors enrollments_admin_all; read-only is enough here).
CREATE POLICY "course_item_completions_admin_read"
  ON public.course_item_completions
  FOR SELECT
  USING (public.is_admin());
```

**Integrity note for the executor:** `item_id` is polymorphic so there's no DB FK, and RLS `WITH CHECK` only enforces `user_id`. So the **server action is responsible** for validating that (a) the item exists, (b) it resolves to `course_id`, and (c) the user has an `active` enrollment in that course, before inserting. Do not rely on the DB for that.

---

## 2. Data layer — new `lib/progress/`

### `lib/progress/actions.ts` (`'use server'`)

Model both on `toggleBookmark`. Each resolves the item → its `course_id`, verifies enrollment, toggles the row, then re-derives enrollment completion.

- `toggleSessionComplete(sessionId: string): Promise<{ completed: boolean }>`
  1. `requireAuth()` → userId.
  2. Resolve `sessionId` → `course_sessions.week_id` → `course_weeks.course_id`. If not found → throw.
  3. Verify an `enrollments` row exists for `(userId, course_id)` with `status='active'`. If not → throw (not enrolled).
  4. Select existing `course_item_completions` where `(user_id, item_type='session', item_id=sessionId)`; delete if present else insert (`course_id`, `completed_at=now()`).
  5. Call `syncEnrollmentCompletion(userId, course_id)` (below).
  6. `revalidatePath('/learn/dashboard')` and the course hub path; return `{ completed }`.

- `toggleAssignmentComplete(assignmentId: string): Promise<{ completed: boolean }>` — same, resolving `course_assignments.week_id → course_weeks.course_id`, `item_type='assignment'`. Does **not** affect enrollment completion (assignments aren't part of the gate).

- `syncEnrollmentCompletion(userId, courseId)` (internal): count total sessions in the course (`course_sessions` joined via `course_weeks` where `course_id`) vs the user's completed sessions. If `total > 0 && completed === total` and enrollment `status='active'` → update to `status='completed', completed_at=now()`. If `completed < total` and `status='completed'` → revert to `status='active', completed_at=null`. **Only ever transitions between `active`↔`completed`** — never touch `refunded`/`cancelled`.

### `lib/progress/queries.ts`

- `getCourseCompletion(userId, courseId): Promise<{ completedSessionIds: Set<string>; completedAssignmentIds: Set<string>; sessionsCompleted: number; sessionsTotal: number; percent: number }>` — one read of `course_item_completions` for `(user, course)` + a count of the course's sessions. `percent = sessionsTotal === 0 ? 0 : Math.round(sessionsCompleted / sessionsTotal * 100)`.
- `getCoursesProgressMap(userId, courseIds: string[]): Promise<Map<string, number>>` — batched percent per course for the dashboard "My Courses" cards (avoid N+1: fetch all completions for the user across `courseIds` in one query, plus per-course session totals, compute in memory).
- `getSessionsCompletedCount(userId): Promise<number>` — lifetime `count(*) where user_id=? and item_type='session'` for the 4th stat.

---

## 3. Course hub — replace calendar math with real completion

`components/learn/CourseHub.tsx` currently derives week state and progress purely from dates (`getCurrentWeek`, `getWeekState`, `progressPercent = currentWeek / totalWeeks`).

- In the course hub **page** (server component that renders `CourseHub`), fetch `getCourseCompletion(userId, courseId)` and pass `completedSessionIds`, `completedAssignmentIds`, and `percent` into `CourseHub`.
- Rework `getWeekState(week)`:
  - `'locked'` if `!week.is_unlocked`.
  - `'completed'` if the week is unlocked and **every** session in that week is in `completedSessionIds`.
  - `'current'` = the first unlocked, not-fully-complete week.
  - `'upcoming'` otherwise.
  - Remove the `now`-vs-`weekEnd` date logic.
- `progressPercent` = the real `percent` prop.
- Render a `SessionCompletionToggle` on each session row (see §5). Keep the existing session UI (title, LIVE badge, replay link) — the toggle is additive.
- Edge case: a course with `sessionsTotal === 0` → show 0% / no toggles gracefully (don't divide by zero — handled in the query).

---

## 4. Dashboard — real bars, real stats, checkable action items

In `app/[locale]/learn/dashboard/page.tsx` + `lib/dashboard/queries.ts`:

1. **My Courses progress bars** (currently inline calendar math at `page.tsx:238-244`): fetch `getCoursesProgressMap(userId, activeCourseIds)` and use the real percent per card. `isComplete = percent === 100`.
2. **"Completed" stat** — already counts `enrollments.status='completed'`; now that §2 actually sets it, it becomes truthful. No code change beyond confirming it reads live.
3. **4th stat card** — replace the source and label:
   - `lib/dashboard/queries.ts`: drop `total_study_hours` from the stats build; add `sessions_completed` via `getSessionsCompletedCount(userId)`. Update the `StudentStats` type in `lib/dashboard/types.ts`.
   - `page.tsx`: the 4th `StatCard` uses `stats.sessions_completed` with label `t('stats_sessions_completed')` and a fitting icon (e.g. `CircleCheckBig`). Remove the now-unused `stats_study_hours` key from **both** `messages/en.json` and `messages/ja.json` (it was "Scheduled Hours" after Unit 1).
4. **Action Items become checkable** (closes the Unit 1 deferral):
   - `getPendingAssignmentsForStudent` (in `lib/dashboard/queries.ts`): exclude assignments the user has already completed (`NOT IN` the user's `item_type='assignment'` completions), so the dashboard stays a to-do list.
   - Add a client `AssignmentCompletionToggle` (see §5) as the leading control of each action-item row. It must be a `<button>` that calls `stopPropagation()` so toggling completion does **not** trigger the row's course-link navigation (Unit 1 made the row a `Link`). On complete → optimistic check → `revalidate` drops it from the list.

---

## 5. Client toggle components

- `components/learn/SessionCompletionToggle.tsx` (`'use client'`) — mirror `VaultCompletionToggle`. Props `{ sessionId: string; isCompleted: boolean }`. Optimistic `setCompleted`, `await toggleSessionComplete(sessionId)`, revert on throw. Label `t('mark_complete')` / checked `t('completed_label')`; ≥44px touch target.
- `components/learn/AssignmentCompletionToggle.tsx` (`'use client'`) — same shape for `toggleAssignmentComplete(assignmentId)`; `onClick` calls `stopPropagation()` (nested inside the row `Link`).

---

## 6. i18n (add to `dashboard` ns in BOTH `messages/en.json` and `messages/ja.json`, parallel positions)

- `stats_sessions_completed` — EN "Sessions Completed" / JA "完了セッション"
- `mark_complete` — EN "Mark complete" / JA "完了にする"
- `completed_label` — EN "Completed" / JA "完了"

Remove `stats_study_hours` from both files if it ends up unused (grep to confirm zero references first).
JA strings above are provided; if any reads awkwardly, flag it in the completion report rather than shipping a guess.

---

## Verification

Run the full `_EXECUTION_TEMPLATE.md` workflow (dev smoke EN + /ja, console clean, mobile 375px, theme toggle, adversarial review). Because this unit changes **schema + RLS**, also do the RLS + prod-migration steps.

**Execution status (2026-07-05):** Automated gates GREEN — `pnpm type-check` clean, `pnpm build` exit 0 (no `MISSING_MESSAGE` for the new keys), `pnpm test:rls` **52/52** (incl. the new suite). `pnpm test:run`: 428 pass, only 4 **pre-existing** unrelated `marketing-routes.test.ts` failures (reproduce on committed HEAD; not this unit). Adversarial review done (2 CONFIRMED findings fixed — the `status='active'` coupling; broadened 5 student gates with Ryan's approval). **The live browser smoke (EN + /ja, console, mobile 375px, theme toggle, real toggle-click behavior) was NOT run — the execution session was headless with no browser.** Items below verified by code/logic/RLS are ticked; items needing a running browser are marked `[ ] (browser)`.

- [ ] `pnpm verify` clean — type-check ✓ + build ✓; test step blocked only by 4 pre-existing unrelated marketing failures.
- [x] **`pnpm test:rls` clean.** Ran 52/52 green (local `supabase db reset` after temp-renaming the redundant 022/025 survey `has_laptop` ALTERs, then restored — not committed). Confirmed a user can only read/write their own `course_item_completions` rows and cannot write rows for another `user_id`.
- [ ] (browser) Marking every session complete flips to 100% + `enrollments.status='completed'` + `completed_at`; "Completed" stat increments; un-mark reverts. *(Logic implemented; enrollment sync uses service-role client; not browser-verified.)*
- [ ] (browser) Course hub week states completion-driven; progress bar = sessions-completed ÷ total. *(Implemented.)*
- [ ] (browser) Dashboard "My Courses" bars show real percent; brand-new enrollment reads 0%. *(Implemented.)*
- [ ] (browser) Action items checkable; drop off list; clicking elsewhere still navigates (no nested-interaction bug). *(Implemented; toggle uses `preventDefault`+`stopPropagation`, review-confirmed.)*
- [x] 4th stat card reads "Sessions Completed" / "完了セッション" with a real count; no orphaned `stats_study_hours` key remains (grep = 0 refs; build clean).
- [ ] (browser) EN + /ja both pass; no `MISSING_MESSAGE`; no hydration warnings. *(Build shows no `MISSING_MESSAGE` for new keys; live hydration not checked.)*
- [x] A session/assignment toggle by a non-enrolled user is rejected by the server action — `requireEnrollment()` throws before any insert (not just RLS).

**Out-of-band — REQUIRED (migration shipped):**
- [ ] Apply `051_course_item_completions.sql` in the Supabase dashboard SQL editor on project `zvfwtndbxshrtpwcwynw` **after deploy** — prod is not migrated by the Vercel build, and the code will 500 ahead of its schema until you do.

---

## Suggested commit message

```
feat(learn): real course completion model (Tier 0.1)

- Add course_item_completions table (051) + RLS: per-user session/assignment completion
- lib/progress: toggle actions (mark complete) + derived-progress queries
- Course hub + dashboard: replace calendar-elapsed progress with real completion %
- Auto-set enrollment 'completed' when all sessions are done
- Action items are now truly checkable (closes Unit 1 deferral)
- Replace "Scheduled Hours" stat with real "Sessions Completed" (EN/JA)
```

---

## Notes for the next units (context, not scope here)

- Enrollment completion now fires reliably → **certificates** (Tier 1.2) can hook off `enrollments.completed_at`.
- `course_item_completions.completed_at` is the natural event source for **streaks** (Tier 2.2) and for **notification** triggers (Unit 3).
