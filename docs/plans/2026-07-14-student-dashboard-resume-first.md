# Student Dashboard — restructure around a resume-first hero

## Context

The student dashboard (`/learn/dashboard`) is the daily home for members, but it currently
inverts its own priorities. Reviewing the live page against three proposed concepts surfaced
four concrete failures:

1. **Inverted hierarchy.** Six large Vault recommendation cards — empty image placeholders,
   `0` views — sit above the student's own courses and their homework.
2. **No resume action.** The highest-value action for a returning student (continue the lesson
   you were on) does not exist. You must scan "Your Courses", click in, and find your place.
3. **Vanity zeros.** Two of the four stat tiles read `0`. The page opens by telling a returning
   student what they haven't done.
4. **Sections vanish when empty instead of teaching.** Study Paths and Events are *already coded*
   but render nothing when the user has no data — so the dashboard silently hides half the product
   from the users who most need to discover it. Workbench and Community have no presence at all.

**Intended outcome:** one unmistakable primary action at the top, obligations second, and honest
one-tap coverage of every nav destination — built exclusively on data that actually exists.

### Design decisions taken (from review)

- **Base concept: 1b "Continue Your Path"** — the only concept that solves the resume gap with a
  single primary action, and it kills the vanity-zero row by relocating numbers *into* the hero
  where they have context.
- **Graft in 1a's full-width Action Items band.** 1b drops it entirely; homework is the only
  time-bound obligation on the page and must not be hidden.
- **Reject 1c's right-hand "Jump to" rail** — it duplicates the left sidebar, which already lists
  Vault / Workbench / Events / Community. Keep only 1c's principle of a single focus.
- **Reject all invented data** (see below).
- **Drop the day streak** for this pass. Consistent with
  `docs/plans/2026-07-05-completion-model.md:19` ("Explicitly deferred (do NOT build here):
  … streaks/XP") and `docs/plans/2026-05-19-dashboard-welcome-backdrop.md:73`.
- **Add lightweight view tracking** so the hero is accurate (see Data work).
- **Mobile is designed in now**, not deferred.

### Rejected mockup elements — no backing model

| Mockup element | Reality |
|---|---|
| "Day streak 6" | No activity-per-day table. Deliberately deferred in prior plans. |
| Workbench "2 experiments in progress · Draft · RESUME" | `workbench_attempts.output_text` is `NOT NULL` — rows exist only *after* a completed run. No drafts. No `updated_at`. |
| Community "#prompting" | `community_posts.category` is a fixed CHECK enum (`general`, `show_and_tell`, `help`, `wins`, `announcements`). The DB would reject `#prompting`. |
| Community "+142 online" | No presence model. Explicitly rejected before as needing "a real data contract". |
| Study Path milestones / "Agents 🔒 locked" | `study_path_items` is a flat `sort_order` list with `is_completed`. No grouping, no gating. |
| "128 resources unlocked" | No per-user unlock ledger; Vault access is a binary subscription gate. Redefine as Vault totals. |

Also note: study paths are **AI-generated per user**, not a curated catalog — a path title is
whatever Claude generated for that student. Copy must not imply a fixed track.

---

## Composition

Replaces the current section order in `app/[locale]/learn/dashboard/page.tsx`. Banners
(`SetPasswordBanner`, `InstructorTeachingBanner`, `?enrolled=true` toast) stay where they are,
above the hero. `WelcomeScreen` early-exit is unchanged.

| # | Section | Layout | Source |
|---|---|---|---|
| 1 | **Resume hero** | full-width, dark | new `getResumePoint()` |
| 2 | **Action Items** | full-width band | existing `pendingAssignments` |
| 3 | **Study Path** | full-width | existing `getUserPaths` / `PathCard` |
| 4 | **Workbench** \| **Events** | 2-up | new tile / existing `DashboardUpcomingEvents` |
| 5 | **Community** \| **Vault** | 2-up | new tile / `getVaultCourseRecommendations(user.id, 2)` |

**Removed:** the 4-tile `StatCard` row (numbers move into the hero), and the standalone
"Upcoming Sessions" card (superseded by the hero + Events tile). `NextSessionCard` stays only
when a session is imminent — it is a genuine time-sensitive interrupt.

### 1. Resume hero — `components/learn/ResumeHero.tsx` (new)

Dark card, mirroring the `.explore-ocean` / `.about-ocean` token-remap pattern used by the
marketing pages, so it reads as a deliberate focal band rather than a fifth grey card.

- Overline: `RESUME · LESSON {n} OF {total}`
- Title (serif): course title
- Sub: `Up next: {session title} · about {duration_minutes} min`
- Primary CTA: **Resume lesson →** → `/learn/dashboard/{course-slug}?session={id}`
- Secondary: **Open course**
- Right rail — *This week*: `Lessons done {n}` (completions this week), `Vault saves {n}`
  (`vault_bookmarks` count). **No streak.**

**Why a `?session=` param and NOT a `#session-` anchor:** there is no in-app lesson page —
sessions are consumed via `window.open(session.zoom_link | session.replay_url)` in
`components/learn/SessionCard.tsx:127-155`. But a hash anchor **cannot work here**: `WeekCard`
is an accordion (`components/learn/WeekCard.tsx:28,106`) that renders its sessions only under
`{isOpen && isUnlocked && ...}`, so a collapsed week has **no target node in the DOM** to scroll
to.

Use a query param instead, following the convention `CourseHub` already established for `?tab=`
and `?enrolled=` (`components/learn/CourseHub.tsx:88-101`):
- `CourseHub` reads `?session={id}`, resolves its containing week, and passes `defaultOpen` for
  that week (the prop already exists — `CourseHub.tsx:418` passes `defaultOpen={state === 'current'}`).
- Then scroll to + briefly highlight the session card. Add `scroll-margin-top` for the sticky
  top bar, and honor `prefers-reduced-motion` for the highlight (project tokens already exist).
- Move focus to the session card after navigation so keyboard/screen-reader users land with it.

**Hero states (never hide the hero):**
- No enrollments → "Start your first course" → `/learn`
- Enrolled, nothing opened yet → "Start Lesson 1 of {course}" (a correct, useful default)
- **Course fully complete** → do not say "Resume". Note `syncEnrollmentCompletion`
  (`lib/progress/actions.ts:138-186`) flips an enrollment to `completed` once every session is
  done, so this state is detectable from enrollment status. Prefer the next *active* enrollment;
  if none, show "You've finished {course}" + a discovery CTA (`Explore courses`).
- **Resume query fails** → render an error/retry state. Never degrade a DB failure into
  "Start your first course" — that misleads a student who has courses.

### 2. Action Items band

Reuse the existing markup and `AssignmentCompletionToggle`. Changes:

**Deterministic sort** (currently `sort_order`, so an overdue item can sit below a dateless one).
Explicit groups, each with a tie-breaker:
1. Overdue — `due_date ASC` (oldest first), then `sort_order`
2. Due today / soon (≤3d) — `due_date ASC`, then `sort_order`
3. Future dated — `due_date ASC`, then `sort_order`
4. Undated — `sort_order`

`course_assignments.due_date` is a bare `date` with no timezone. Interpret it as **end of that
day in `Pacific/Honolulu`**, and compare against Hawaii "today" — matching the week-boundary rule
above. Do this in one shared helper so the band and the due-label logic can't drift apart.

**No "View all" link.** There is no all-assignments route — `getPendingAssignmentsForStudent` is
consumed only by this page (verified: `pendingAssignments` appears nowhere else in `app/`). Rather
than invent one or link somewhere misleading, cap at 5 and show the true total in the header:
`{n} items · {m} overdue` (coral when `m > 0`). Every row already links to its course hub, so
nothing is unreachable. If an all-items route is wanted later, that's its own unit.

Extract the existing due-label logic at `page.tsx:379-402` into that shared helper so the band
component owns it.

### 3. Study Path

Reuse `PathCard` **only for the populated case** — pass it a real `StudyPathWithProgress`, no new
props. Show `{completed_items} of {total_items}`, flat, with no milestone or lock language.

**Do not add an empty-state variant to `PathCard`.** With no path there is no path object to
render, so an empty variant would mean nullable props and a muddied contract. Instead the
dashboard owns a small, separate invitation card ("Build a study path around your goal" →
`/learn/paths`). `PathCard.tsx` therefore stays **unmodified**.

### 4. Workbench tile — `components/learn/WorkbenchTile.tsx` (new)

Honest framing, built only on `workbench_attempts`:
- `{n} scenarios practiced` (distinct `scenario_id`) + `best score {overall_score}` when attempts
  exist. Exclude unscored attempts (`scored_at IS NULL` / `overall_score IS NULL`) from the best
  score; if every attempt is unscored, show the count alone rather than a null score.
- Otherwise a featured scenario (`workbench_scenarios.is_featured`, `is_published = true`) +
  "Try a scenario →".
- **Not** "experiments in progress" — that state does not exist.
- Note `workbench_attempts` has no `updated_at` (only `created_at` / `scored_at`), so any
  "recent" ordering must use `created_at`.

### 5. Community tile — `components/learn/CommunityTile.tsx` (new)

- Unread reply count via existing `lib/notifications/queries.ts`
  (`type='community_reply'`, `read_at IS NULL`). Caveat: fires only for replies to *your* posts.
- Plus 2 recent posts from `listFeed`. Use real `category` values, never `#prompting`.

### 6. Vault tile

- `getVaultCourseRecommendations(user.id, **2**)` — down from `6` (`page.tsx:69`).
- Footer line: `{saved} saved · {n} new this week`.
  - **saved** = `vault_bookmarks` where `bookmark_type = 'bookmark'`, **joined to
    `content_items` filtered `is_published = true`** — a bookmark whose item was unpublished must
    not inflate the count. (Note `bookmark_type` is overloaded: `bookmark | watch_later |
    completed` — migration `012` added `completed`. Count only `bookmark`.)
  - **new this week** = `content_items` where `is_published = true` and
    `created_at >= {same Hawaii week start}` — same boundary as "Lessons done", so the two
    "this week" numbers on one screen can't mean different weeks.
- Keep `RecommendationsEmptyState` for the no-recs case.

### Empty + failure states for every tile

The stated goal is that no section silently disappears, so each needs a defined empty state —
not just the hero and Study Path:

| Tile | Empty state |
|---|---|
| Workbench | No attempts → featured scenario + "Try a scenario →". No published scenarios at all → hide the tile (nothing to offer). |
| Events | No upcoming → "No events scheduled" + link to `/learn/dashboard/events`. |
| Community | No unread, no posts → "Start a conversation" + link. |
| Vault | No recs → existing `RecommendationsEmptyState`. |
| Study Path | No active path → dashboard-owned invitation card (above). |

**Failure ≠ empty.** The hero is critical: a failed resume query renders an error/retry state,
never "Start your first course". The five tiles are optional — each degrades independently
(render its empty state and log) rather than taking down the dashboard. Several existing helpers
collapse errors into empty arrays (e.g. `getUserPaths(...).catch(() => [])` at `page.tsx:73`);
that's acceptable for a tile, not for the hero.

### 7. `NextSessionCard` — define "imminent" and de-dupe against the hero

Currently rendered for `upcomingSessions[0]` whenever one exists, which would now frequently
duplicate the hero. Render it **only** when the session is `live` or starts within **30 minutes**
(the same threshold `SessionCard` already uses for `live-soon` — `SessionCard.tsx:29`). If it
refers to the same session as the hero, suppress the hero's duplicate CTA so one action isn't
offered twice.

### Mobile (single column, in order)

Hero (full-bleed, right rail wraps beneath) → Action Items → Study Path → Workbench → Events →
Community → Vault. All 2-ups collapse to stacked. Existing bottom nav is unaffected; keep bottom
padding clear of it. Touch targets ≥ 44px.

---

## Data work

### Migration `supabase/migrations/062_course_session_opens.sql` (new)

```sql
CREATE TABLE IF NOT EXISTS public.course_session_opens (
  user_id    uuid NOT NULL REFERENCES public.users(id)          ON DELETE CASCADE,
  course_id  uuid NOT NULL REFERENCES public.courses(id)        ON DELETE CASCADE,
  session_id uuid NOT NULL REFERENCES public.course_sessions(id) ON DELETE CASCADE,
  opened_at  timestamptz NOT NULL DEFAULT now(),
  PRIMARY KEY (user_id, session_id)
);
CREATE INDEX IF NOT EXISTS course_session_opens_user_recent_idx
  ON public.course_session_opens (user_id, opened_at DESC);
```
RLS: owner-all + admin-read, copied verbatim from `051_course_item_completions.sql:22-35`.
Upsert on conflict updates `opened_at`, so the table stays one row per user/session.

**Named `opens`, not `views`, with a real FK — two deliberate departures from 051:**
- We record a *click on an external link*, not confirmed consumption (content lives on Zoom /
  the replay host). "Opened" is what we can actually prove; don't call it "viewed" in the UI,
  analytics, or copy.
- Unlike `course_item_completions.item_id`, this column is **not polymorphic** — it always points
  at `course_sessions`. So it gets a true FK with `ON DELETE CASCADE`, which removes the orphan-row
  and mismatched-pair problems 051 has to police in application code.

> **Apply `062` BEFORE deploying the code, not after.** `CLAUDE.md`'s "apply after deploy" rule
> exists to stop code 500ing ahead of its schema — but for a purely *additive* table the safe
> order is the reverse: applying first is zero-risk (nothing reads it yet) and removes the
> failure window entirely. Rollback is then just reverting the code. Run it in the Supabase
> dashboard SQL editor on `zvfwtndbxshrtpwcwynw`. Also confirm `051` and `055` are actually
> applied in prod — the dashboard already depends on both.

This table is streak-ready: `distinct opened_at::date` is a natural future source, per
`docs/plans/2026-07-05-completion-model.md:188`.

### Server action — `lib/progress/actions.ts` (extend the existing file)

```ts
export async function recordSessionOpen(sessionId: string): Promise<void>
```
**Takes `sessionId` only.** Never accept `userId` or `courseId` from the client. Reuse the
safeguards already in this file (`lib/progress/actions.ts:10-88`), exactly as
`toggleSessionComplete` does:
`requireAuth()` → `resolveItemCourse(supabase, 'course_sessions', sessionId)` → `requireEnrollment()`
→ upsert. This makes a mismatched course/session pair structurally impossible.
Do **not** `revalidatePath` here — an open is not a progress change, and revalidating on every
link click would be wasteful.

**Popup-safety (required):** `window.open(...)` must stay **synchronous inside the click
handler** or popup blockers will eat the link. Call the action *after* the `window.open`, and
attach an explicit `.catch(() => {})` — a bare fire-and-forget risks an unhandled rejection.
Tracking must never block or prevent opening the link.

**Which clicks count:** Join live and Watch replay only. Transcript (`transcript_url`) and slide
deck (`slide_deck_url`) do **not** — they're reference material, not the lesson.

### Queries — `lib/progress/queries.ts` (extend, don't duplicate)

`getResumePoint(userId)` → `{ course, session, index, total } | null`

Eligible enrollments are `['active', 'completed']` — matching `requireEnrollment` and
`checkEnrollment` (`lib/enrollments/queries.ts:41-50`). Refunded/cancelled are excluded
everywhere. Course selection precedence:
1. Most recent `course_session_opens.opened_at` whose course is still an eligible enrollment.
2. Else most recent `course_item_completions.completed_at` on an eligible enrollment.
3. Else the **most recent active enrollment** — `enrolled_at DESC, id DESC`. (The plan
   previously said "earliest"; that contradicted `getUserEnrollments`, which already orders
   `enrolled_at DESC` at `lib/enrollments/queries.ts:22`. Newest-first is the existing
   convention and the better default — the course you just bought is the one you want.)
4. Prefer an `active` enrollment over a `completed` one at every step; a fully-complete course
   falls through to the completed-course hero state.

Within the selected course, **"up next" = the first incomplete session in an _unlocked_ week**:
- Order by `course_weeks.week_number ASC, course_sessions.session_number ASC, id ASC`
  (`session_number` is the real column — `001_phase2_schema.sql:155` — and `id` is a stable
  tie-breaker).
- Filter `course_weeks.is_unlocked = true`. A locked week's sessions are **never rendered** by
  `WeekCard` (`{isOpen && isUnlocked && ...}`), so linking to one would dead-end.
- Exclude `item_id`s in `course_item_completions` where `item_type = 'session'`.
- `index` / `total` are computed over unlocked sessions, so the hero's "Lesson n of N" matches
  what the student can actually see.
- **Course with zero sessions** → no resume target; fall through to the next eligible course.

`getLessonsCompletedThisWeek(userId)` — `count(course_item_completions)` where
`completed_at >= {week start}` **and `.eq('item_type', 'session')`**. Without that filter it
silently counts assignments too and the number is wrong.
**Week boundary:** Monday 00:00 in `Pacific/Honolulu` (the product's home timezone), converted to
UTC for the query. A calendar week, not a rolling 7 days — the label says "this week".

Add these to the existing `Promise.all` in `getStudentDashboardData`
(`lib/dashboard/queries.ts:18`) so they don't add serial round-trips.

### Fix the query/branch order in `page.tsx`

The current page runs **all** dashboard queries in a `Promise.all` at `page.tsx:67` and *then*
early-returns to `WelcomeScreen` at `page.tsx:95` — so a brand-new user pays for every dashboard
query and throws the results away. `getCourseBySlug('ai-essentials')` cannot simply be dropped
(the `WelcomeScreen` branch still needs it).

Correct restructure: read `profile` first, branch on `!profile.onboarded || sp.welcome === 'true'`,
then fetch **only** what that branch needs — the featured course for the welcome branch, the
dashboard bundle for the normal one.

### Vault / Workbench / Community counts

Small helpers beside their existing query modules — `getVaultBookmarkCount(userId)` and
`getVaultNewThisWeekCount()` in `lib/vault/queries.ts`; a `getWorkbenchSummary(userId)` in
`lib/workbench/`. Reuse the existing unread-count helper in `lib/notifications/queries.ts`.

---

## Files

**New:** `components/learn/ResumeHero.tsx`, `ActionItemsBand.tsx`, `WorkbenchTile.tsx`,
`CommunityTile.tsx`, `VaultTile.tsx`, `StudyPathInvite.tsx`;
`supabase/migrations/062_course_session_opens.sql`.

**Modified:** `app/[locale]/learn/dashboard/page.tsx` (restructure + branch-before-fetch);
`lib/dashboard/queries.ts`, `lib/progress/queries.ts`, `lib/progress/actions.ts`
(`recordSessionOpen`), `lib/vault/queries.ts`;
`components/learn/SessionCard.tsx` (id + popup-safe open tracking);
`components/learn/CourseHub.tsx` (resolve `?session=` → `defaultOpen` + scroll/focus);
`messages/en.json`, `messages/ja.json`.

**Unchanged:** `components/learn/PathCard.tsx` and `components/learn/WeekCard.tsx` — `defaultOpen`
already exists on `WeekCard`; the invite card is separate.

**Reuse, don't rebuild:** `SectionHeading` (has `viewAllHref`/`viewAllLabel`),
`AssignmentCompletionToggle`, `DashboardUpcomingEvents`, `PathCard`, `Card`, `BadgePill`,
`DashboardWelcomeHeader`, `DashboardBackdrop`, `RecommendationsEmptyState`.

**Note:** no shared `ProgressBar` primitive exists — the dashboard's bars are inline JSX and
`PathCard` has its own. Extract one `components/ui/progress-bar.tsx` while touching both.

## i18n

New keys in the `dashboard` namespace (`resume_*`, `this_week_*`, `tile_workbench_*`,
`tile_community_*`, `tile_vault_*`, `overdue_count`). JP copy is a draft pending native review,
consistent with recent redesigns. JP body type: line-height 1.7–1.8, no `text-justify`.

## Out of scope

Streaks; path milestones/gating; workbench drafts; community channels or presence; per-user Vault
view history (`vault_views` is `viewer_hash`-anonymized); 1v1 booking. Each needs new schema and a
product decision. `event_rsvps` is admin-only RLS — students cannot read their own public-event
RSVPs; leave it alone here.

## Verification

**Unit tests (the resume logic is where the bugs will be — cover it directly, don't lean on
`pnpm verify` alone):**
- Resume precedence: opens → completions → newest active enrollment.
- Refunded/cancelled enrollment is never selected; fully-completed course yields the
  completed-course state, not "Resume".
- Locked weeks are skipped; a zero-session course falls through.
- Ordering: `week_number ASC, session_number ASC, id ASC`.
- Hawaii week boundary for "Lessons done" (incl. that `item_type='session'` filter — assert an
  assignment completion does **not** count).
- Action-item group sort + tie-breakers; date-only `due_date` at a Hawaii day edge.
- `recordSessionOpen` authorization: unauthenticated rejected, non-enrolled rejected, unknown
  session rejected.

**Gates:**
1. `pnpm verify` (type-check → tests → build). Build needs
   `NODE_OPTIONS=--max-old-space-size=8192` (project memory — it OOMs at default heap; beware
   `| tail` masking exit codes).
2. `pnpm test:rls` — a migration changed. Cover `course_session_opens` owner read/write, admin
   read, and **cross-user denial**. Note: this currently requires temp-renaming the duplicate
   `022`/`025` survey migrations, then restoring them (project memory). That setup is fragile and
   the worktree already carries `.bak` files — worth fixing, but as its own unit; don't block
   this work on it.
3. **Apply `062` to prod first** (see Data work), then confirm table + index + RLS enabled + both
   policies exist before the code deploy.

**Browser smoke, EN + `/ja`, desktop and mobile widths:**
- **Populated:** hero names the last-opened lesson; "Resume lesson →" lands on the course hub with
  the containing week **expanded** and the session card scrolled to and highlighted — the
  accordion case that killed the hash approach.
- Click "Watch replay" (confirm the popup is **not** blocked), return to the dashboard, confirm
  the hero followed you.
- **Empty (a fresh account):** every section renders an invitation; no section silently
  disappears; no `0` is presented as an achievement.
- Keyboard-only pass: visible focus, sensible heading order, focus lands on the session card
  after `?session=` navigation; dark hero band meets WCAG AA in both themes;
  `prefers-reduced-motion` disables the highlight animation.
- Confirm no rendered string implies streaks, locked milestones, drafts, `#prompting`, or an
  online count.

**Query budget:** this adds resume, weekly-completions, bookmarks, vault-new, workbench, and
notifications to a page that already fetches paths, events, and recommendations. `Promise.all`
caps latency but not volume. Record the dashboard's server-render time and DB request count
before/after; if it regresses materially, consolidate (the per-tile counts are good candidates
for a single aggregate query) rather than shipping a slower dashboard.
