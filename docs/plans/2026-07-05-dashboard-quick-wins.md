# Student Dashboard — Quick Wins (Unit 1)

**Status:** Approved, ready to execute. Front-end + i18n only.
**Date:** 2026-07-05
**Execute via:** `docs/plans/_EXECUTION_TEMPLATE.md` (copy the prompt block, set `{{PLAN_FILE}}` to this file, run in a fresh session with a low-cost model — Haiku or Sonnet).

---

## Context

First unit of a larger student-experience roadmap (brainstorm lives in the planning notes). This unit is the **highest perceived-quality lift for the least work**: it makes the `/learn/dashboard` feel alive and honest, and surfaces two buried differentiators (Apply-It Workbench, AI Study Paths) in the sidebar.

Hard boundary: **no database migrations, no new tables, no RLS, no server actions.** Every change is a front-end component or an i18n string. This keeps the verify gate simple (`pnpm verify`; **no `pnpm test:rls`**) and the blast radius tiny.

**Explicitly out of scope — deferred to Tier 0** (do NOT build here; stop and flag if a step seems to need them):
- Real assignment check-off persistence (needs an `assignment_completions` table + server action).
- A real notification center / data-driven bell (needs a notifications table).
- Real tracked study time (needs the completion model).

All file paths and line numbers were verified against the working tree on 2026-07-05; re-confirm before editing since other work may have shifted lines.

---

## Changes

### A. "Up Next" session card (continue-learning highlight)

The next live session is what a returning student most wants to see, and **all the data is already fetched** — `upcomingSessions[0]` from `getStudentDashboardData`, destructured at `app/[locale]/learn/dashboard/page.tsx:77`. Each item (`lib/dashboard/types.ts:18-32`) has `title_en/jp, format, scheduled_at, zoom_link, replay_url, duration_minutes, course_title_en/jp, course_slug, week_number`, sorted ascending → `[0]` is next. No new query.

**New file:** `components/learn/NextSessionCard.tsx` (`'use client'`).
- Props: the next-session object + `locale` (pick `title_en/jp` the same way the existing "Coming Up" list does at `page.tsx:246-303`).
- Inside a `Card variant="learn"` (`@/components/ui/card`):
  - Overline `t('next_session_heading')`.
  - Session title + course title + `Week {n}`.
  - Live "Starts in {time}" using existing key `starts_in`. **Compute the countdown client-side in `useEffect` after mount** (never during render — avoids hydration mismatch); tick every 60s. Buckets: `>24h` → "Xd Yh"; `1–24h` → "Xh Ym"; `<60m` → "Nm"; `<=0 && within duration` → `t('live_now')`; else fall through to the date.
  - **Always** render the absolute date/time as an SSR-stable fallback (native `toLocaleDateString/TimeString`, `locale === 'ja' ? 'ja-JP' : 'en-US'`, matching `page.tsx:284-296`).
  - Primary action: `format === 'live'` + `zoom_link` → `t('join_session')` as `<a target="_blank" rel="noopener noreferrer">`; else `replay_url` → `t('watch_replay')`; else link to the course hub.
- No shared `Button` is imported on this page — check `@/components/ui` for one; if none, mirror the utility-class CTA at `page.tsx:195-200`.

**Wire-in:** in `page.tsx`, render `<NextSessionCard session={upcomingSessions[0]} locale={locale} />` right after `<DashboardWelcomeHeader/>` (after line 120) and before the stat grid (line 136), guarded by `upcomingSessions.length > 0`. Keep the existing "Coming Up" list.

**i18n** (add to `dashboard` namespace in BOTH `messages/en.json` and `messages/ja.json`, matching positions; `join_session` and `starts_in` already exist):
- `next_session_heading` — EN "Up next" / JA "次回"
- `live_now` — EN "Live now" / JA "ライブ配信中"
- `watch_replay` — EN "Watch replay" / JA "録画を見る"

### B. Recommendations empty state

Today the whole "Recommended for You" section silently vanishes for users without tagged enrollments (guard at `page.tsx:179-182` + `components/vault/VaultCourseRecommendations.tsx:15` `return null`). Turn the blank hole into a personalization CTA.

**Change:** at `page.tsx:179-182`, swap the `&&` guard for a ternary — non-empty → `<VaultCourseRecommendations>`, empty → `<RecommendationsEmptyState />`.

**New file:** `components/learn/RecommendationsEmptyState.tsx` (server component). `Card variant="learn"` with a `Sparkles` icon, heading + subtitle, and two CTAs: primary → `/learn/paths/new`, secondary → `/learn/vault`.

**i18n** (`dashboard` ns, EN+JA):
- `recs_empty_heading` — "Let's find your next step"
- `recs_empty_subtitle` — "Take a 2-minute intake and we'll build a personalized learning path for you."
- `recs_empty_cta_path` — "Get your personalized path"
- `recs_empty_cta_vault` — "Browse the Vault"

### C. Notification bell — remove the fake state

`DashboardWelcomeHeader` renders an always-on red dot (hardcoded default `true`, `components/learn/DashboardWelcomeHeader.tsx:21,26-28`) on a bell button with no handler and no notification system behind it — it implies unread notifications that don't exist.

**Change:** in `DashboardWelcomeHeader.tsx`, render the bell block (~lines 43-59) **only when `notificationsHref` is provided** (never today → the bell + dot disappear), and drop the `showNotificationDot` default-`true` dot. Keep the `notificationsHref` prop so Tier 0.2 re-enables the bell by simply passing it. Leave the avatar (lines 60-66) untouched.

### D. Action Items — honest urgency + actionable rows (front-end only)

Rows are static non-clickable divs with a decorative fake checkbox (`aria-hidden` div, no handler, `page.tsx:354-357`) that implies a check-off feature that isn't wired. Real completion is Tier 0. Here, polish only.

**Changes** in the Action Items block (`page.tsx:306-383`):
1. Remove the decorative checkbox div (354-357), or replace it with the assignment-type icon, so nothing implies non-working interactivity.
2. Strengthen due-date states (currently only `daysUntilDue <= 3` → coral, `page.tsx:335-347`): `< 0` → `t('overdue')` in a danger style; `=== 0` → `t('due_today')`; `<= 3` → existing coral "Due {date}"; else neutral.
3. Make each row a `Link` to the course hub (`/learn/dashboard/courses/{course_slug}` — confirm the course route during execution). Keep the ≥44px touch target.

**i18n** (`dashboard` ns, EN+JA): `overdue` ("Overdue"/"期限切れ"), `due_today` ("Due today"/"本日締切").

### E. Honest stat relabel — "Study Hours" → "Scheduled Hours"

`stats.total_study_hours` sums only the durations of **upcoming** sessions (`lib/dashboard/queries.ts:27-36`) — hours scheduled ahead, not hours studied. The "Study Hours" label misrepresents it.

**Change:** relabel only — change the `stats_study_hours` value at `messages/en.json:1655` and the parallel `ja.json` line to "Scheduled Hours" / "予定時間". No logic change. Add a brief code comment near `queries.ts:27-36` noting this is upcoming-scheduled hours and that Tier 0 will replace it with tracked study time (and can restore the "Study Hours" label then).

### F. Nav — surface Workbench + Study Paths as first-class entries

Two of the strongest features are buried; promote them in the sidebar `components/learn/StudentNav.tsx`.

1. Import two icons into the lucide block (lines 9-20): `FlaskConical` (Workbench), `Route` (Study Paths).
2. Append to `baseNavItems` (lines 32-40), right **after** the vault entry:
   - `{ href: '/learn/vault/workbench', labelKey: 'nav_workbench', icon: FlaskConical, exact: false }`
   - `{ href: '/learn/paths/new', labelKey: 'nav_study_paths', icon: Route, exact: false }`
   Rationale: `/learn/vault/workbench` exists, renders inside the vault layout (sidebar present), and self-gates via `VaultPremiumGate` (safe for all logged-in students, no redirect). `/learn/paths` has **no index page** (would 404) → point at the existing `/learn/paths/new`.
3. Mobile bar (lines 196-219) auto-takes the first 6 items and filters out events — after inserting 2 items, **verify the mobile bar** still shows a sensible set and doesn't overflow; adjust ordering if needed.

**i18n:** `nav_workbench` — ADD to `dashboard` ns in EN+JA (EN "Apply-It Workbench", reuse the `workbench.page_title` value; JA equivalent). `nav_study_paths` — **already exists** in both files (en "Study Paths" / ja "学習パス"), no change.

**Study Paths sidebar-shell fix (recommended, low-risk):** paths pages have no layout wrapper, so `/learn/paths/*` renders **without the sidebar**. Add `app/[locale]/learn/paths/layout.tsx` mirroring `app/[locale]/learn/vault/layout.tsx`: `<AuthGuard><StudentDashboardLayout>{children}</StudentDashboardLayout></AuthGuard>`. Verify it doesn't conflict with `paths/new`'s own auth redirect (same pattern as vault → compatible). If it complicates execution, ship the nav entry without the layout and flag the shell gap as a follow-up.

**Active-state note:** `StudentNav` strips the locale and matches by href (~line 128). With href `/learn/paths/new`, the entry highlights on `/new` but not on `/learn/paths/[id]` — acceptable for this unit.

---

## Verification

Run the full workflow in `_EXECUTION_TEMPLATE.md` (dev smoke EN + /ja, console clean, mobile 375px, theme toggle, `pnpm verify`, adversarial review). Unit-specific checks:

**Execution status (2026-07-05, non-interactive session):** Code complete and committed. `pnpm type-check` and `pnpm build` are clean; EN/JA i18n parity verified 1:1 (every referenced key exists in both files, so no `MISSING_MESSAGE`); adversarial code-review pass done (3 findings — instructor mobile-nav Settings drop, Vault/Workbench double-highlight, empty-state Link/Button convention — all fixed). `pnpm test:run` is 428/432; the 4 failures are pre-existing and unrelated (`marketing-routes` `/partners/*`, from in-flight partner work — no dashboard file touched). **The browser EN + `/ja` dev smoke was NOT run in this environment** — the boxes below are code/build-verified and left unchecked pending Ryan's visual smoke (`pnpm dev`, walk each item, check the console for hydration/console warnings, mobile 375px, theme toggle).

- [ ] With an active enrollment that has a future live session, the dashboard shows an "Up next" card above the stats, with a ticking "Starts in…", a Join button linking to the Zoom URL, and correct localized title/date. No console hydration warning.
- [ ] A user with no vault recommendations sees the empty-state CTA card (not a blank gap); the primary CTA lands on `/learn/paths/new`.
- [ ] No red dot / no bell in the dashboard header; the avatar still renders and links to settings.
- [ ] Action items visibly distinguish overdue / due-today / upcoming; clicking a row opens its course; no element implies a non-working checkbox.
- [ ] The fourth stat card reads "Scheduled Hours" / "予定時間"; the number is unchanged.
- [ ] Sidebar shows Workbench + Study Paths (desktop + mobile) with correct icons and localized labels; Workbench opens (premium gate for non-subscribers, not a redirect); Study Paths opens `/learn/paths/new` with the sidebar present.
- [ ] EN and /ja both pass all of the above; no `MISSING_MESSAGE` warnings.
- [ ] `pnpm verify` clean (type-check + tests + build). `pnpm test:rls` NOT required (no RLS/migration changes).

**Out-of-band migrations:** None — no schema change in this plan.

---

## Suggested commit message

```
feat(dashboard): quick-win polish — up-next card, honest stats, surfaced Workbench/Paths

- Add NextSessionCard (continue-learning highlight, ticking countdown, Join/Replay)
- Replace vanishing recommendations section with a personalized-path empty state
- Remove the fake always-on notification dot until real notifications ship
- Action items: overdue/due-today states + rows link to their course
- Relabel misleading "Study Hours" stat to "Scheduled Hours" (EN/JA)
- Surface Apply-It Workbench and Study Paths as first-class sidebar nav
```
