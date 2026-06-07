# Plan: Live Training Events (invite-only, with recap)

> **Status:** Revised 2026-06-06 after third-party review — awaiting approval before implementation.
> **Author:** Ryan + Claude (brainstormed 2026-06-06; revised after external code review)
> **Change log:** v2 hardens the access-control model (protected recap payload, trusted-email matching, explicit RSVP write path, fixed invite→callback→onboarding→event redirect, dashboard-nested routes) and folds in reviewer items. See §12 for the review disposition.

---

## 0. Project Summary (for a reviewer new to the codebase)

**HonuVibe.AI** is a bilingual (EN/JP) platform for AI education, consulting, and community, founded by Ryan Jackson in Hawaii. It runs a growth flywheel: social content → website → newsletter/community → courses → portfolio → brand → more content. The **primary conversion goal is course enrollment**; secondary CTAs feed into it.

**Tech stack:** Next.js 14+ (App Router, TypeScript strict), Tailwind (CSS-variable tokens, dark-mode default), Supabase (Postgres + Auth + RLS), Stripe (USD + JPY), Sanity (blog), next-intl (EN unprefixed, JP under `/ja/`), Resend (transactional email), Beehiiv (newsletter), Plausible + Vercel Analytics, hosted on Vercel. Package manager is **pnpm** (never npm).

**Reused infrastructure (~80% of this feature is reuse):**
- **Auth & members:** Supabase Auth (passwordless magic links); `public.users` profile (role, `subscription_tier`, `locale_preference`, `onboarded`) auto-created on signup via `handle_new_user()`. No paid subscription = "free tier."
- **Admin portal:** `app/[locale]/admin/*`, guarded by `components/auth/AdminGuard.tsx` + `public.is_admin()`, with a consistent list/detail CRUD pattern (the Vault admin).
- **Transactional email:** Resend, fully wired, with bilingual HTML template primitives.
- **Recap field shape precedent:** `course_sessions` already models `scheduled_at`, `zoom_link`, `replay_url`, `transcript_url`, `slide_deck_url`, `status`.
- **Protected-payload precedent:** `041_vault_access_boundary.sql` — premium payloads live in **child tables** with tier-aware RLS, because Postgres RLS is row-level, not column-level. **This feature follows that precedent for recap assets.**

**Why this feature:** A 3rd-party trainer is delivering an upcoming **live training event** — deliberately **neither a cohort** nor a **Vault lesson**. It is an **invite-only, single live session** with in-platform meeting details and a post-event recap. The brainstorm concluded it should be a **small, reusable capability** (guest trainings recur), not a one-off hack and not an over-built generic events system.

**Locked decisions:**
1. **Recurring capability** → a small purpose-built events entity in the admin portal.
2. **Hard allowlist + RSVP** → only invited people see details/Zoom/recap; track RSVP + attendance.
3. **Free-tier accounts via magic link** → invited emails map to HonuVibe accounts (auto-created free-tier for new invitees); access via the existing magic-link flow. Grows the member base.
4. **Recap gated on the event page** → the gated page gains a Recap section post-event.
5. **Tweaks:** manual **Send reminder** action; **`.ics`** attachment on the invite (via the `ics` library).
6. **Post-review (v2):** invitee pages nest under `/learn/dashboard/events`; recap payload lives in a protected child table; access matches the trusted JWT email, not the editable profile column.

---

## 1. Goals & Non-Goals

### In scope (v1)
- `live_events` + `event_invitations` + `live_event_recap_assets` tables with RLS.
- Admin CRUD for events (mirrors the Vault admin) + an **invitations manager** (paste emails / pick members, per-invitee RSVP + attendance + send-state).
- Admin actions: **Send invites**, **Send reminder**, **Send recap**, **Send test to me**, mark attendance — each with eligibility validation and a recipient-count confirmation.
- Invitee-gated event page at `/learn/dashboard/events/[slug]` — meeting details (incl. Zoom) pre-event, recap post-event.
- "My Events" list at `/learn/dashboard/events`.
- Bilingual (EN/JP) **invite**, **reminder**, **recap** emails via Resend; invite carries a **`.ics`** built with the `ics` library, whose calendar URL is the **gated event-page link (not Zoom)**.
- Magic-link access + free-tier account auto-create for new invitees, landing correctly on the event page.
- RSVP (`going` / `not_going`) and `attendance_status` (`unknown` / `attended` / `no_show`).

### Out of scope (explicit non-goals)
- One-click "promote recap → Vault workshop" (leave a clean seam: a future `promoteEventRecapToVault(eventId)`).
- **Automated/scheduled** reminders (cron). v1 ships a **manual** reminder button only.
- **Time-gated Zoom reveal** ("join opens X min before start"). v1 shows Zoom to invitees immediately once published; the `.ics` never carries the Zoom link, which kills the main leak vector. (v1.1.)
- **Full `event_email_deliveries` audit table.** v1 uses light per-invitation send-state columns (§3.2). (Add later if volume warrants.)
- **Rich invitee filter bar.** Confirmation-modal counts cover the day-one need. (v1.1.)
- Payments / ticketing; capacity waitlist enforcement; public registration funnel.

---

## 2. Architecture Decision

**Dedicated `live_events` entity** rather than extending `content_items` (Vault `workshop`) or reusing `course_sessions`.
- **Rejected — extend `content_items`:** wired into Vault RLS/browse/premium gating; an invite-only allowlist would entangle two access models and risk leaking events into Vault queries.
- **Rejected — reuse `course_sessions`:** requires faking a hidden "course," contradicting "not a cohort."
- **Chosen — dedicated tables:** self-contained invite-only access, while reusing email, auth, admin-CRUD, and the recap field shape.

---

## 3. Data Model

New migration `supabase/migrations/044_live_events.sql` (next free number after `043_workbench.sql`). Conventions: `uuid` PKs via `gen_random_uuid()`, `timestamptz default now()`, bilingual `_en`/`_jp`, RLS enabled.

### 3.1 `live_events` (the row invitees may read once published)
Holds only fields an invited, published-event viewer is *allowed* to see. **Recap assets are NOT here** (see §3.3) — they must stay hidden until `recap_published`, and RLS can't hide columns.

| Column | Type | Notes |
|---|---|---|
| `id` | uuid PK | |
| `slug` | text unique | |
| `title_en` / `title_jp` | text | |
| `description_en` / `description_jp` | text | overview |
| `presenter_name` | text | the 3rd-party trainer |
| `presenter_org` | text null | |
| `presenter_bio_en` / `presenter_bio_jp` | text null | |
| `starts_at` | timestamptz | canonical start instant |
| `ends_at` | timestamptz null | |
| `timezone` | text | IANA tz for display, e.g. `Pacific/Honolulu` |
| `meeting_url` | text null | Zoom — visible to invitees immediately once published (allowed; no hidden sub-state, so row-level is fine) |
| `meeting_notes_en` / `meeting_notes_jp` | text null | join instructions |
| `capacity` | int null | display only |
| `cover_image_url` | text null | |
| `status` | text | `draft`\|`scheduled`\|`live`\|`completed`\|`cancelled` |
| `is_published` | boolean default false | drafts hidden even from invitees |
| `recap_published` | boolean default false | the gate flag for §3.3 |
| `created_at` / `updated_at` | timestamptz | |

### 3.2 `event_invitations` (allowlist + RSVP + send-state)
| Column | Type | Notes |
|---|---|---|
| `id` | uuid PK | |
| `event_id` | uuid FK → `live_events` on delete cascade | |
| `email` | text | invited address, stored lowercased |
| `user_id` | uuid FK → `users` null | backfilled opportunistically |
| `locale` | text default `'en'` | `en`\|`ja`; from admin batch or invitee's `locale_preference` |
| `status` | text default `'invited'` | `invited`\|`going`\|`not_going` |
| `rsvp_at` | timestamptz null | |
| `attendance_status` | text default `'unknown'` | `unknown`\|`attended`\|`no_show` |
| `attendance_marked_at` | timestamptz null | |
| `invited_at` | timestamptz default now() | |
| `invite_sent_at` | timestamptz null | initial invite send |
| `reminder_sent_at` | timestamptz null | last reminder send |
| `recap_sent_at` | timestamptz null | recap-notification send |
| `last_email_status` | text null | `sent`\|`failed` (most recent send) |
| `last_email_error` | text null | error message on failure |
| — | — | `unique(event_id, email)` |

### 3.3 `live_event_recap_assets` (protected payload — mirrors 041)
Sensitive recap URLs live here so they are **unreadable until `recap_published`**, even by an invitee who can read the parent row.

| Column | Type |
|---|---|
| `event_id` | uuid PK + FK → `live_events` on delete cascade |
| `recording_url` | text null |
| `slide_deck_url` | text null |
| `transcript_url` | text null |
| `recap_notes_en` / `recap_notes_jp` | text null |
| `recap_resources` | jsonb default `'[]'` (`{label,url}[]`) |

### 3.4 Access helper — trusted email, not the editable profile column
`is_event_invitee(p_event_id uuid) returns boolean`, `SECURITY DEFINER`. True if `is_admin()`, **or** an `event_invitations` row exists for `p_event_id` where `user_id = auth.uid()` **or** `lower(email) = lower(auth.email())`.

**Why `auth.email()` and not `users.email`:** `users_own_update` ([001:537-538](../../supabase/migrations/001_phase2_schema.sql#L537-L538)) has **no `WITH CHECK`**, so a user can rewrite their own `public.users.email`. Matching on it would let anyone grant themselves access by editing their profile. `auth.email()` reads the JWT claim sourced from `auth.users`, which a user cannot change without a verified email-change flow. For a freshly invite-created account, `auth.users.email` is the invited address, so the match holds with no backfill.

> **Out-of-scope security note:** the missing `WITH CHECK` on `users_own_update` is a pre-existing escalation surface (a user can also self-edit `role`/`subscription_tier`). This feature does **not** depend on it (we use `auth.email()`), but it deserves its own hardening migration. Flagged, not fixed here.

### 3.5 RLS policies
- `live_events`: **write** admin-only (`is_admin()`); **read** if `is_admin()` **or** (`is_published` **and** `is_event_invitee(id)`).
- `event_invitations`: **write** admin-only (RSVP handled by a service-role action, §5); **read** own rows (`user_id = auth.uid()` or `lower(email)=lower(auth.email())`) or admin.
- `live_event_recap_assets`: **write** admin-only; **read** if `is_admin()` **or** (`is_event_invitee(event_id)` **and** the parent's `recap_published = true`).

---

## 4. Routes & Access

- **Invitee event page — `app/[locale]/learn/dashboard/events/[slug]/page.tsx`** (server component, inside `StudentDashboardLayout`): already under the `/learn/dashboard` protected prefix ([middleware.ts:9-15](../../middleware.ts#L9-L15)), so unauthenticated visitors get a clean `/learn/auth?redirect=…` bounce. Loads the event, checks `is_event_invitee`; non-invitee or unpublished → `notFound()`. Renders meeting details (incl. Zoom) pre-event; renders **Recap** only when `recap_published` (reading `live_event_recap_assets`). Sensitive values are read server-side; never serialized into a public client payload.
- **"My Events" — `app/[locale]/learn/dashboard/events/page.tsx`**: published events the signed-in user is invited to.
- **Nav:** add "Events" to `components/learn/StudentNav.tsx` (mind the mobile first-six limit; place ahead of lower-priority items).
- Both under `app/[locale]/` → JP gets `/ja/learn/dashboard/events/...`. **No middleware change needed** (dashboard nesting inherits protection).

---

## 5. Admin Experience (mirrors the Vault admin)

- **Nav:** add **"Events"** to `components/admin/AdminNav.tsx` under "Learning."
- **List — `app/[locale]/admin/events/page.tsx`**: events table (title, date, status, invite/RSVP counts), "New event." Mirror `app/[locale]/admin/vault/page.tsx`.
- **Detail/create — `app/[locale]/admin/events/[id]/page.tsx`** (`id='new'`): mirror `app/[locale]/admin/vault/[id]/page.tsx`.
- **`components/admin/AdminEventDetail.tsx`** (`'use client'`, tabbed like `AdminCourseDetail`):
  - **Details tab:** bilingual title/description, presenter fields, schedule (`starts_at`/`ends_at`/`timezone`), `meeting_url`, `meeting_notes`, cover, capacity, publish toggle. **Publish validation** (#17): title, slug, `starts_at`, valid timezone, presenter, `ends_at` after `starts_at`, and `meeting_url` required before `scheduled`/`published` — enforced both in disabled button state and server-side.
  - **Invitations tab:** paste-emails textarea + member picker → creates invitations (locale from picked member or a batch default); table with RSVP status, `attendance_status` select, and per-invitee send-state (invite/reminder/recap timestamps, last error). **Send invites / Send reminder / Send recap / Send test to me** buttons. Each batch button opens a **confirmation modal with exact recipient counts** (unsent, already-sent, going, not-going, no-RSVP, failed/skipped) and only acts on eligible rows.
  - **Recap tab:** edits `live_event_recap_assets` fields + the `recap_published` toggle; **Send recap** button.

### Server layer (`lib/events/`)
Mirror `lib/vault/{queries,actions,types}.ts` and `lib/courses/actions.ts` (auth check + `revalidatePath`):
- **`types.ts`** — `LiveEvent`, `EventInvitation`, `EventRecapAssets`, input types.
- **`queries.ts`** — `getAdminEvents()`, `getAdminEventById(id)` (with invitations + recap assets), `getEventForInvitee(slug)`, `getMyInvitedEvents()`.
- **`actions.ts`** (`'use server'`) — `createEvent`, `updateEvent`, `publishEvent` (with validation), `upsertRecapAssets`, `setRecapPublished`, `addInvitations(eventId, [{email,locale}])`, `removeInvitation`, `markAttendance(invitationId, status)`, `sendInvites`, `sendReminder`, `sendRecap`, `sendTestEmail(eventId, kind)`.
  - **`setRsvp(invitationId, status)`** — the one invitee-writable action. Runs with the **service-role client** and **verifies ownership** (`auth.uid()`/`auth.email()` matches the invitation) before updating **only** `status` + `rsvp_at`. (RLS keeps `event_invitations` admin-write; this action is the controlled exception, resolving the write-policy contradiction.)
  - Send actions enforce **eligibility** (#11): no invites for `draft`/unpublished or `cancelled` events; no reminders to `not_going`; no recap before `recap_published`. They stamp the relevant send-state columns and capture `last_email_status`/`last_email_error`.
- **`ics.ts`** — wraps the **`ics`** npm package (`pnpm add ics`) to build the calendar file. `url`/description point to the **gated event-page URL**, never `meeting_url`.

---

## 6. Email & Access Flow (reuses Resend)

**Provision + correct redirect (per invited email):**
1. Ensure an auth user exists — `supabase.auth.admin.createUser({ email, email_confirm: true })` if new; the `handle_new_user` trigger creates the free-tier `users` row (`onboarded=false`). Backfill `event_invitations.user_id`.
2. Mint a magic link whose post-auth destination is the event page **via the param the callback actually reads**: `redirectTo = ${origin}/api/auth/callback?redirect=${encodeURIComponent(localePrefix + '/learn/dashboard/events/' + slug)}`.
   - ⚠️ The existing `app/api/auth/magic-link/route.ts` uses `?next=`, which the callback **ignores** ([callback:10](../../app/api/auth/callback/route.ts#L10) reads `redirect`). Do **not** copy `next`; use `redirect`.
3. **Modify [app/api/auth/callback/route.ts](../../app/api/auth/callback/route.ts):** today, non-onboarded users are force-redirected to `/learn/dashboard?welcome=true` ([callback:54-63](../../app/api/auth/callback/route.ts#L54-L63)), which would strand new invitees off the event page. Change the onboarding branch to **honor an explicit `redirect` when present** (still fire the welcome email; optionally append `welcome=true`), falling back to the dashboard welcome only when no explicit redirect was given. Additive change — covered by a new test (§10) and checked against other explicit-redirect flows.

**New email senders** — extend `lib/email/types.ts` + `lib/email/send.ts`, reusing the bilingual primitives in `lib/email/templates.ts`, rendering in `invitation.locale`:
- **`sendEventInviteEmail`** — title, presenter, date/time in recipient locale + event `timezone`, CTA = the magic link. **Attaches the `.ics`** (Resend `attachments`, base64) from `lib/events/ics.ts`.
- **`sendEventReminderEmail`** — "starts soon," magic-link CTA. Manual button (no cron).
- **`sendEventRecapEmail`** — "recap is ready," links back to the gated page.

**Flow:** Admin **Send invites** (confirm counts) → provision + email each invitee with `.ics` → invitee clicks → authenticated → **lands on `/learn/dashboard/events/[slug]`** → RSVPs (service-role action). **Send reminder** anytime (eligible rows). Post-event: fill recap assets, flip `recap_published`, **Send recap**.

---

## 7. Bilingual, Timezone & Analytics
- **i18n:** `events.*` namespace in `messages/en.json` + `messages/ja.json` (page labels, RSVP buttons, email strings). JP typography rules (line-height 1.7–1.8, no `text-justify`).
- **Timezone:** render `starts_at` in the event `timezone`; show a secondary JST line for the US/JP audience. `.ics` uses UTC stamps from `starts_at` (the `ics` library handles formatting).
- **Analytics:** light Plausible events via `lib/analytics.ts` — `event_rsvp`, `event_recap_view`.

---

## 8. Files to Create / Modify

**Create**
- `supabase/migrations/044_live_events.sql` — three tables, `is_event_invitee`, RLS.
- `lib/events/{types,queries,actions,ics}.ts`.
- `app/[locale]/admin/events/page.tsx`, `app/[locale]/admin/events/[id]/page.tsx`.
- `components/admin/AdminEventDetail.tsx` (+ invitations-manager / recap-editor subcomponents, confirmation modal).
- `app/[locale]/learn/dashboard/events/page.tsx`, `app/[locale]/learn/dashboard/events/[slug]/page.tsx`.
- `components/events/*` — invitee event detail + RSVP controls.
- Tests: `supabase/tests/live_events_rls.test.ts`, `lib/events/ics.test.ts`, a callback new-user-invite test.

**Modify**
- `app/api/auth/callback/route.ts` — honor explicit `redirect` for non-onboarded users.
- `components/admin/AdminNav.tsx` — add "Events"; `components/learn/StudentNav.tsx` — add "Events".
- `lib/email/types.ts`, `lib/email/send.ts` — three senders.
- `messages/en.json`, `messages/ja.json` — `events.*`.
- `package.json` — add `ics` (via `pnpm add ics`).

**Reuse (mirror only):** `lib/supabase/server.ts`, `components/auth/AdminGuard.tsx`, `lib/courses/actions.ts`, `lib/vault/{queries,actions}.ts`, `app/[locale]/admin/vault/[id]/page.tsx`, `lib/email/templates.ts`, `lib/auth/safe-redirect.ts`.

---

## 9. Build Sequence
1. **DB:** `044_live_events.sql` (three tables, helper, RLS); apply locally; verify with invited / non-invited / pre-publish-recap cases.
2. **Server layer:** `types` → `queries` → `actions` (incl. service-role `setRsvp` + eligibility) → `ics` (with `ics` lib).
3. **Auth flow:** patch the callback redirect; wire `createUser` + `generateLink(redirect=…)`; test new + existing users, EN + JA.
4. **Email:** three senders + `.ics`; `Send test to me`; test sends.
5. **Admin UI:** nav → list → `AdminEventDetail` (Details/Invitations/Recap) + confirmation modals + publish/eligibility validation.
6. **Invitee UI:** gated `/learn/dashboard/events/[slug]` (details → recap) + RSVP; "My Events" + StudentNav entry.
7. **i18n + analytics + polish:** `events.*` EN/JP; Plausible; timezone rendering; reduced-motion; 44px targets; WCAG AA.

---

## 10. Verification (end-to-end + automated)
**Automated (mirror `supabase/tests/community_rls.test.ts` and `lib/auth/safe-redirect.test.ts`):**
- **RLS suite** — non-invited user: event row unreadable + page 404; invited user: details readable; **recap assets unreadable until `recap_published`**; unpublished events 404 even for invitees.
- **ICS unit test** — valid RFC 5545 output; calendar URL is the event page, **not** `meeting_url`.
- **Callback test** — a non-onboarded new user with an explicit event `redirect` lands on the event page (not the dashboard welcome); a plain new signup still gets the welcome.

**Manual:**
- **Invite path:** new email → **Send invites** → free-tier `users` row created → email received with working magic link + `.ics` that imports cleanly into Google/Apple/Outlook → lands on the gated event page → RSVP persists and shows in admin.
- **Reminder / recap:** eligibility respected; send-state timestamps update; recap hidden before publish, visible after.
- **Bilingual:** `/ja/learn/dashboard/events/[slug]` renders JP; JP invite email renders JP copy + correctly localized date/time.
- **Build/lint:** `pnpm build` + lint pass.

---

## 11. Risks / Open Questions
- **Callback change is shared code.** Honoring explicit `redirect` for non-onboarded users must not regress other flows; covered by the callback test and a quick audit of explicit-redirect callers.
- **`generateLink` for brand-new users** — standardize `createUser` + `magiclink(redirect=…)` during step 3; confirm the freshly created user's session reaches the event page.
- **Pre-existing `users_own_update` lacks `WITH CHECK`** (§3.4) — out of scope here (we use `auth.email()`), but recommend a separate hardening migration.

---

## 12. Review Disposition (v1 → v2)
**Adopted:** protected recap child table (#1); `auth.email()`/`user_id` matching (#2); service-role `setRsvp` with ownership check (#3); explicit `redirect` + onboarding-preserving callback (#4, #5); dashboard-nested protected routes (#6, #7); `locale` on invitations (#9); `attendance_status` enum (#10); send-eligibility + publish validation (#11, #17); `ics` library + event-URL-not-Zoom in calendar (#12); test-send (#13); confirmation-count modals (#14); automated RLS/ICS/callback tests (#18).
**Scoped down:** light send-state columns instead of an `event_email_deliveries` table (#8 — YAGNI for now); rich invitee filters deferred to v1.1 (#15); time-gated Zoom reveal deferred to v1.1, Zoom shown immediately to invitees while the `.ics` carries only the event URL (#16).
