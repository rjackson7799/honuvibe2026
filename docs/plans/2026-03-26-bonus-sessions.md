# Bonus Sessions for Courses — Implementation Plan

> **For Claude:** REQUIRED SUB-SKILL: Use superpowers:executing-plans to implement this plan task-by-task.

**Goal:** Add ad-hoc bonus sessions (office hours, guest speakers, workshops, Q&A) to courses. Bonus sessions are not tied to weekly curriculum — they have their own type, description, instructor, Zoom link, replay URL, and scheduling. Visible on public course page as a marketing signal; Zoom/replay gated behind enrollment.

**Design Spec:** `docs/superpowers/specs/2026-03-26-bonus-sessions-design.md` — read this first for full context.

**Tech Stack:** Supabase (Postgres + RLS), Next.js App Router, next-intl, Tailwind CSS, Lucide icons. Extends existing `course_sessions` table with `is_bonus` flag approach.

---

## Task 1: Database Migration — Bonus Session Columns

**Files:**
- Create: `supabase/migrations/016_bonus_sessions.sql`

**Step 1: Write the migration**

```sql
-- Bonus session support for course_sessions
ALTER TABLE course_sessions ADD COLUMN is_bonus BOOLEAN NOT NULL DEFAULT false;
ALTER TABLE course_sessions ADD COLUMN bonus_type TEXT;
ALTER TABLE course_sessions ADD COLUMN description_en TEXT;
ALTER TABLE course_sessions ADD COLUMN description_jp TEXT;

-- Make week_id and session_number nullable for bonus sessions
ALTER TABLE course_sessions ALTER COLUMN week_id DROP NOT NULL;
ALTER TABLE course_sessions ALTER COLUMN session_number DROP NOT NULL;

-- Bonus sessions must have no week, curriculum sessions must have a week
ALTER TABLE course_sessions ADD CONSTRAINT chk_bonus_week
  CHECK (
    (is_bonus = false AND week_id IS NOT NULL)
    OR (is_bonus = true AND week_id IS NULL)
  );

-- Bonus sessions must have a type, curriculum sessions must not
ALTER TABLE course_sessions ADD CONSTRAINT chk_bonus_type
  CHECK (
    (is_bonus = false AND bonus_type IS NULL)
    OR (is_bonus = true AND bonus_type IN ('office-hours', 'guest-speaker', 'workshop', 'qa'))
  );

-- Index for efficient bonus session queries
CREATE INDEX idx_course_sessions_bonus ON course_sessions (course_id, is_bonus, scheduled_at);
```

**Step 2:** Apply migration locally with `npx supabase db push` or via Supabase dashboard. Verify columns and constraints exist.

---

## Task 2: TypeScript Types

**Files:**
- Modify: `lib/courses/types.ts`

**Step 1:** Add `BonusSessionType` type:
```typescript
export type BonusSessionType = 'office-hours' | 'guest-speaker' | 'workshop' | 'qa'
```

**Step 2:** Extend `CourseSession` interface with:
- `is_bonus: boolean`
- `bonus_type: BonusSessionType | null`
- `description_en: string | null`
- `description_jp: string | null`

**Step 3:** Extend `CourseWithCurriculum` interface with:
- `bonusSessions: CourseSession[]`

**Step 4:** Run `npm run build` — fix any type errors.

---

## Task 3: Query Updates

**Files:**
- Modify: `lib/courses/queries.ts`

**Step 1:** In `getCourseWithCurriculum()`:
- When fetching sessions for week assembly, add filter `is_bonus = false` (or `eq('is_bonus', false)`)
- Add a separate query for bonus sessions: filter `is_bonus = true` on the same `course_id`, order by `scheduled_at` ascending with nulls last
- Resolve `instructor_id` for bonus sessions using the existing instructor map (same logic as curriculum sessions)
- Attach result as `bonusSessions` on the returned course object

**Step 2:** In `getAdminCourseById()`:
- Same separation — curriculum sessions go into weeks, bonus sessions as separate `bonusSessions` array

**Step 3:** Run `npm run build` — fix any type errors.

---

## Task 4: Server Actions

**Files:**
- Modify: `lib/courses/actions.ts`

**Step 1:** Add `createBonusSession(courseId, data)`:
- Admin auth check (reuse existing pattern)
- Insert into `course_sessions` with `is_bonus: true`, `week_id: null`, `session_number: null`
- Accept: `bonus_type`, `title_en`, `title_jp`, `description_en`, `description_jp`, `instructor_id`, `zoom_link`, `replay_url`, `scheduled_at`, `duration_minutes`
- Default `status` to `'upcoming'`
- Revalidate `/learn` and `/admin/courses`

**Step 2:** Add `updateBonusSession(sessionId, updates)`:
- Admin auth check
- Update: `bonus_type`, `title_en/jp`, `description_en/jp`, `zoom_link`, `replay_url`, `transcript_url`, `slide_deck_url`, `scheduled_at`, `duration_minutes`, `instructor_id`, `status`
- Revalidate paths

**Step 3:** Add `deleteBonusSession(sessionId)`:
- Admin auth check
- Verify session `is_bonus = true` before deleting (safety check — don't accidentally delete curriculum sessions)
- Delete the row
- Revalidate paths

**Step 4:** Run `npm run build`.

---

## Task 5: Admin UI — BonusSessionEditor

**Files:**
- Create: `components/admin/BonusSessionEditor.tsx`
- Modify: `components/admin/AdminCourseDetail.tsx`

**Step 1:** Create `BonusSessionEditor.tsx`. Reference `SessionEditor.tsx` for patterns (Zoom invite parser, save/unsaved state, instructor dropdown). The bonus editor needs:
- **Bonus type dropdown:** Office Hours / Guest Speaker / Workshop / Q&A
- **Title fields:** EN + JP inputs
- **Description textarea:** EN + JP (replaces the structured topics used by curriculum sessions)
- **Instructor dropdown:** From `courseInstructors` prop (same pattern as SessionEditor)
- **Zoom link input** with Zoom invite paste-parser (reuse from SessionEditor)
- **Replay URL, Transcript URL, Slide Deck URL** inputs
- **Scheduled date/time input, Duration input**
- **Status dropdown:** Upcoming / Live / Completed
- **Delete button** with confirmation (bonus sessions can be removed)
- **Save button** calling `updateBonusSession()` or `createBonusSession()` depending on whether it's new

**Step 2:** Modify `AdminCourseDetail.tsx`:
- Add **"Bonus Sessions" tab** (after Curriculum tab, before Students tab)
- Tab content: list of `BonusSessionEditor` components for each `course.bonusSessions`
- **"Add Bonus Session" button** at the top — creates a new empty bonus session via `createBonusSession()` then refreshes
- Pass `courseInstructors` to each editor
- Show count badge on tab (e.g., "Bonus Sessions (3)")

**Step 3:** Run `npm run build`.

---

## Task 6: Public UI — Bonus Sessions Section

**Files:**
- Create: `components/learn/BonusSessionsSection.tsx`
- Modify: course detail page layout (find the page under `app/[locale]/learn/[slug]/`)

**Step 1:** Create `BonusSessionsSection.tsx`:
- Section heading: uses `learn.bonusSessions.title` i18n key
- Renders bonus session cards sorted by `scheduled_at` (upcoming first, completed below, no-date last)
- Each card shows:
  - **Type badge** with icon + label + color:
    - Office Hours → Clock icon, `--accent-teal`
    - Guest Speaker → Mic icon, `--accent-gold`
    - Workshop → Wrench icon, `--territory-web`
    - Q&A → MessageCircle icon, `--territory-pro`
  - **Title** (bilingual via locale)
  - **Description** (bilingual via locale)
  - **Instructor** (photo + display name, from resolved `instructor` on session)
  - **Date/time + duration**
  - **Status indicator** (upcoming/live/completed)
- **Enrollment gating:**
  - Zoom link button: only rendered if user is enrolled
  - Replay URL button: only rendered if session is completed AND user is enrolled
  - Everything else (title, description, type, instructor, date) visible to all
- Empty state: "No bonus sessions scheduled yet" message
- Follow existing design system: glass cards, border tokens, motion patterns from `SessionCard.tsx`

**Step 2:** Add `BonusSessionsSection` to the course detail page layout, below the curriculum/weeks section. Only render if `course.bonusSessions.length > 0`.

**Step 3:** Run `npm run build`.

---

## Task 7: i18n — Translation Keys

**Files:**
- Modify: `messages/en.json`
- Modify: `messages/ja.json`

**Step 1:** Add keys under `learn.bonusSessions` in both files:

| Key | EN | JP |
|-----|----|----|
| `title` | Bonus Sessions | ボーナスセッション |
| `officeHours` | Office Hours | オフィスアワー |
| `guestSpeaker` | Guest Speaker | ゲストスピーカー |
| `workshop` | Workshop | ワークショップ |
| `qa` | Q&A Session | Q&Aセッション |
| `addBonus` | Add Bonus Session | ボーナスセッションを追加 |
| `description` | Description | 説明 |
| `bonusType` | Session Type | セッションタイプ |
| `noBonus` | No bonus sessions scheduled yet | ボーナスセッションはまだありません |
| `joinZoom` | Join Session | セッションに参加 |
| `watchReplay` | Watch Replay | リプレイを見る |
| `enrollToAccess` | Enroll to access session links | セッションリンクにアクセスするには登録してください |

**Step 2:** Run `npm run build` — verify no missing key errors.

---

## Verification Checklist

After all tasks are complete:

1. ✅ `npm run build` passes with no type errors
2. ✅ Migration applies cleanly — `course_sessions` has `is_bonus`, `bonus_type`, `description_en/jp` columns + constraints
3. ✅ Admin: create a bonus session on an existing course — assign instructor, set Zoom link, pick date
4. ✅ Admin: bonus sessions appear in their own tab, not mixed into curriculum weeks
5. ✅ Admin: edit and delete a bonus session
6. ✅ Public: course detail page shows "Bonus Sessions" section below curriculum
7. ✅ Public: type badges display correct icon and color per session type
8. ✅ Public: Zoom link hidden for non-enrolled visitors
9. ✅ Public: replay link hidden until session is completed
10. ✅ Bonus session with no scheduled date sorts to end of list
11. ✅ Both EN and JP translations render correctly
