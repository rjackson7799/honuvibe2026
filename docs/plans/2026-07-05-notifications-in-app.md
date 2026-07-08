# Tier 0.2 — In-App Notification Center + Reminders (Unit 3)

**Status:** Approved design, ready to execute — **but execute only after Unit 2 (completion model) merges to main** (see Sequencing). **Touches schema + RLS** — run execution on a capable model (Sonnet), not Haiku.
**Date:** 2026-07-05
**Execute via:** `docs/plans/_EXECUTION_TEMPLATE.md`. This unit adds a migration + Vercel cron, so honor the RLS + manual-prod-migration steps below.

---

## Context

There is no notification system today — the bell was made href-driven in Unit 1 but no page ever passes it an href, so it's invisible. This unit builds the first real channel: an **in-app notification center** plus **cron-generated reminders** (session starting soon, assignment due), with an optional cheap event-driven trigger (community reply). Email and LINE are explicitly **later units (4 and 5)** — do not build them here.

**Design decisions already locked (Ryan):**
- **Scope:** in-app center + cron reminders. No email, no LINE.
- **Surfacing:** the bell links to a **notifications page** (`/learn/dashboard/notifications`) with an unread badge — not a dropdown.
- **Badge liveness:** server-computed unread count on page load. **No Supabase Realtime** (greenfield infra, not worth it for v1).
- **Dedup:** a `UNIQUE (user_id, type, entity_id)` constraint + upsert-ignore-duplicates — cleaner than a delivery-ledger (that pattern is justified only by expensive LLM+retry sends; a reminder just needs "insert once").
- **Copy:** store `type` + a `data` jsonb of render params; render bilingual copy at display time via next-intl using the user's `locale_preference` — do NOT store frozen bilingual strings in the row.

**Reuse these existing patterns (read them first):**
- Cron: `app/api/cron/presenter-summaries/route.ts` (CRON_SECRET bearer guard, `export const dynamic='force-dynamic'`, `maxDuration=60`, `MAX_PER_RUN` cap) + the `crons` array in `vercel.json`.
- Idempotent upsert idiom: `.upsert(rows, { onConflict: '...', ignoreDuplicates: true })` (used in `lib/survey/send-presenter-summary.ts:64`).
- RLS owner pattern: `043_workbench.sql:202-213` (`user_id = auth.uid()`), plus the "no client INSERT — service-role only" convention.
- Bell: `components/learn/DashboardWelcomeHeader.tsx` already renders a `<Link>` when given `notificationsHref` (wrapper has `relative` for a badge).

## Sequencing (important — parallel work)

Unit 2 is being built in another session. It takes migration **051** and edits `dashboard/page.tsx`. This unit:
- Takes migration **052** (confirm `051_course_item_completions.sql` has landed before running).
- Also edits `dashboard/page.tsx` (adds the bell href + unread count) — so **rebase onto Unit 2's merged version**; do not start until Unit 2 is on `main`.
- Does not otherwise overlap (notifications is greenfield).

All file paths/line numbers verified 2026-07-05 against commit `f370329` (pre-Unit-2); re-confirm after Unit 2 merges.

---

## 1. Migration — `supabase/migrations/052_notifications.sql`

```sql
-- 052_notifications.sql
-- In-app notifications. Rows are inserted by the cron / service role only
-- (users never INSERT); users may read and mark-read their own rows.

CREATE TABLE IF NOT EXISTS public.notifications (
  id         uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id    uuid NOT NULL REFERENCES public.users(id) ON DELETE CASCADE,
  type       text NOT NULL CHECK (type IN ('session_soon','assignment_due','community_reply')),
  entity_id  uuid NOT NULL,                      -- session/assignment/comment id (dedup + linking)
  data       jsonb NOT NULL DEFAULT '{}'::jsonb, -- render params (course/session/assignment title, when, actor name)
  href       text,                               -- deep link target
  read_at    timestamptz,                        -- NULL = unread
  created_at timestamptz NOT NULL DEFAULT now(),
  UNIQUE (user_id, type, entity_id)
);

CREATE INDEX IF NOT EXISTS notifications_user_created_idx
  ON public.notifications (user_id, created_at DESC);

ALTER TABLE public.notifications ENABLE ROW LEVEL SECURITY;

-- Owner may read and mark-read; NO owner INSERT policy (service role bypasses RLS to insert).
CREATE POLICY "notifications_own_select" ON public.notifications
  FOR SELECT USING (user_id = auth.uid());
CREATE POLICY "notifications_own_update" ON public.notifications
  FOR UPDATE USING (user_id = auth.uid()) WITH CHECK (user_id = auth.uid());
CREATE POLICY "notifications_admin_read" ON public.notifications
  FOR SELECT USING (public.is_admin());
```

**Why no owner INSERT:** the community-reply trigger inserts a row for a *different* user (the post author), which an owner-only `WITH CHECK` would forbid. All inserts go through the **service-role client** (§2), which bypasses RLS. Keeping owner INSERT off also prevents users forging notifications.

---

## 2. Data layer — new `lib/notifications/`

- `emit.ts` — `emitNotification({ userId, type, entityId, data, href })`. Uses the **service-role Supabase client** (confirm the existing helper — the same elevated client used by admin/cron flows; e.g. a `createServiceClient()` / admin client. If none exists, add one keyed off `SUPABASE_SERVICE_ROLE_KEY`). Inserts via `.upsert([row], { onConflict: 'user_id,type,entity_id', ignoreDuplicates: true })` so a repeat cron pass no-ops. Never throws into the caller — log and swallow (best-effort, like `sendEmail`).
- `queries.ts` — `getNotifications(userId, { limit = 30 })` (order `created_at DESC`); `getUnreadCount(userId)` (`count where read_at is null`, `head: true`).
- `actions.ts` (`'use server'`) — `markAllRead()`: `requireAuth()` → `update notifications set read_at=now() where user_id=<me> and read_at is null` (RLS-scoped to own rows), then `revalidatePath('/learn/dashboard')`. Optionally `markRead(ids: string[])`.

---

## 3. Cron — one combined reminders route

**New file `app/api/cron/reminders/route.ts`** — mirror `presenter-summaries/route.ts` exactly (same CRON_SECRET bearer guard, `dynamic='force-dynamic'`, `maxDuration=60`, `MAX_PER_RUN` cap, try/catch per item, JSON summary). One hourly run handles both reminder types; the UNIQUE constraint makes it idempotent across runs.

- **Session reminders:** find `course_sessions` with `format IN ('live','hybrid')` and `scheduled_at` between `now` and `now + 24h`. For each, resolve `week_id → course_weeks.course_id`, then `enrollments WHERE course_id = ? AND status='active'` → fan out `emitNotification({ userId, type:'session_soon', entityId: sessionId, data:{ courseTitle, sessionTitle, scheduledAt }, href:<course hub path> })`.
- **Assignment reminders:** find `course_assignments` in **unlocked** weeks (`course_weeks.is_unlocked=true`) with `due_date` between `today` and `today + 2 days` (note `due_date` is a `date`). Resolve course → active enrollments → `emitNotification({ type:'assignment_due', entityId: assignmentId, data:{ assignmentTitle, courseTitle, dueDate }, href:<course hub path> })`.

These cross-user queries are **greenfield** (existing readers are all per-student); write them fresh, scanning items-first then fanning to enrollments. Use the service-role client so the scan isn't RLS-limited to one user.

**`vercel.json`:** append to the `crons` array: `{ "path": "/api/cron/reminders", "schedule": "0 * * * *" }`. (Region stays top-level `hnd1`.)

---

## 4. Event-driven trigger — community reply (cheap, include)

In `app/api/community/posts/[id]/comments/route.ts`, after `addComment(...)` returns the created `comment` (around line 33, before the 201 response): look up `community_posts.author_id` for the post; if it differs from the replier's `user.id`, call `emitNotification({ userId: authorId, type:'community_reply', entityId: comment.id, data:{ actorName, postExcerpt }, href:`/learn/dashboard/community/${postId}` })`. Self-replies emit nothing. No community schema change.

---

## 5. Bell + unread badge

- `components/learn/DashboardWelcomeHeader.tsx`: add `unreadCount?: number` to the props. Inside the existing `relative` bell `<Link>`, render a small count badge (absolutely positioned, `--accent-coral`) when `unreadCount > 0` (cap display at `9+`).
- `app/[locale]/learn/dashboard/page.tsx` (post-Unit-2 version): pass `notificationsHref="/learn/dashboard/notifications"` and `unreadCount={await getUnreadCount(user.id)}` into `<DashboardWelcomeHeader>`. This activates the bell.

## 6. Notifications page

**New `app/[locale]/learn/dashboard/notifications/page.tsx`** (server component, inside the existing dashboard layout so it keeps the sidebar):
- Fetch `getNotifications(user.id)`. Render each: icon by `type`, title/body rendered from `type` + `data` via next-intl (see §7), relative timestamp (match the inline `toLocaleDateString`/`toLocaleTimeString` pattern used elsewhere — no date lib in the repo), unread rows visually distinct, whole row links to `notification.href`.
- Empty state when none.
- **Mark-read on view:** a small `'use client'` child (`MarkAllReadOnView`) that calls `markAllRead()` in a `useEffect` on mount. Because `markAllRead` revalidates `/learn/dashboard`, the bell badge clears on return. Also render a manual "Mark all read" control for clarity.

## 7. Nav + i18n

- **StudentNav** (`components/learn/StudentNav.tsx`): append `{ href: '/learn/dashboard/notifications', labelKey: 'nav_notifications', icon: Bell, exact: false }` to `baseNavItems`; import `Bell` from lucide. (Desktop sidebar; the mobile bar caps at 6 and filters extras, so it may not appear on mobile — acceptable, the header bell covers mobile.)
- **i18n** (`dashboard` ns, BOTH `messages/en.json` + `messages/ja.json`, parallel positions):
  - `nav_notifications` — "Notifications" / "通知"
  - `notifications_title` — "Notifications" / "通知"
  - `notifications_empty` — "You're all caught up." / "新しい通知はありません。"
  - `notifications_mark_all_read` — "Mark all read" / "すべて既読にする"
  - `notif_session_soon` — EN "{course}: {session} starts {when}" / JA "{course}：{session}が{when}に始まります"
  - `notif_assignment_due` — EN "{assignment} is due {when}" / JA "{assignment}の締切は{when}です"
  - `notif_community_reply` — EN "{name} replied to your post" / JA "{name}さんがあなたの投稿に返信しました"
  JA strings are provided; flag any that read awkwardly in the completion report rather than shipping a guess.

---

## Verification

Run the full `_EXECUTION_TEMPLATE.md` workflow (dev smoke EN + /ja, console clean, mobile 375px, theme toggle, adversarial review), plus these:

- [ ] `pnpm verify` clean (type-check + tests + build).
- [ ] **`pnpm test:rls` clean** (temp-rename the 022/025 duplicate migrations first, restore after, don't commit the rename). Confirm: a user reads only their **own** notifications; a user **cannot INSERT** a notification (no owner insert policy); a user can mark their own read but not another user's.
- [ ] Manually invoke the cron locally with the bearer secret (`GET /api/cron/reminders` with `Authorization: Bearer $CRON_SECRET`): a seeded live session ~12h out produces exactly one `session_soon` per active-enrollment student; running it again produces **no duplicates** (unique constraint holds). Same for an assignment due tomorrow.
- [ ] The dashboard bell appears with a correct unread count; opening `/learn/dashboard/notifications` lists them, marks them read, and the badge clears on return.
- [ ] A community reply notifies the post author (not the replier); self-reply emits nothing.
- [ ] Copy renders correctly from `type`+`data` on EN and /ja (no `MISSING_MESSAGE`); no hydration warnings.
- [ ] Cron auth is fail-closed: a request without the correct bearer returns 401.

**Out-of-band — REQUIRED (migration shipped):**
- [ ] Apply `052_notifications.sql` in the Supabase dashboard SQL editor on project `zvfwtndbxshrtpwcwynw` **after deploy** — prod is not migrated by the Vercel build; the code 500s ahead of its schema until you do.
- [ ] Confirm `CRON_SECRET` and `SUPABASE_SERVICE_ROLE_KEY` are set in the Vercel project env (the cron 401s / the emit fails without them). The new cron entry begins running on the next production deploy.

---

## Suggested commit message

```
feat(learn): in-app notification center + reminders (Tier 0.2)

- Add notifications table (052) + RLS: owner read/mark-read, service-role insert
- lib/notifications: emit (dedup upsert) + queries + mark-read action
- Cron /api/cron/reminders: session-soon + assignment-due, idempotent fan-out
- Community reply notifies the post author
- Activate the header bell (unread badge) + /learn/dashboard/notifications page
- Sidebar entry + bilingual notification copy (EN/JA)
```

---

## Notes for later units (context, not scope here)

- The `notifications` table + `emitNotification` are the delivery substrate the **email digest (Unit 4)** and **LINE push (Unit 5)** will reuse — those add channels/prefs, not a new store.
- A `course_completed` notification type is a natural add once Unit 2's `completed_at` events exist (fire from the enrollment-completion sync). Deferred to keep this unit decoupled from Unit 2's internals.
