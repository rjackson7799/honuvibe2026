# Plan: Partner Portal (Phase 2 of the Partner Platform)

**Date:** 2026-04-20
**Parent plan:** [2026-04-16-partner-whitelabel.md](./2026-04-16-partner-whitelabel.md) — see Phase 2
**Handoff:** [docs/handoffs/2026-04-20-partner-portal-phase-2.md](../handoffs/2026-04-20-partner-portal-phase-2.md)
**Status:** Ready for execution

---

## Context

Slices A–D of the partner platform are live on production (data-driven landing pages, Stripe attribution, admin CRUD, Vertice attribution). Today, whenever a partner asks "how many enrollments have we driven?", Ryan hand-screenshots the admin enrollments report and sends it over. This plan builds the self-serve replacement: a partner-scoped portal at `/partner/*` where a partner contact (Dylan at SmashHaus is the expected first user) can see their own aggregate metrics — no student PII, no CSV export, no content editing.

The database already has `partners`, `partner_courses`, `partner_admins`, `enrollments.partner_id`, `users.referred_by_partner_id`, and the `public.is_partner_for()` RLS helper ([supabase/migrations/029_partners.sql](../../supabase/migrations/029_partners.sql)). What's missing from Phase 1 is the **API/UI to populate `partner_admins`** — deferred at the time as YAGNI, now needed. Build it as part of this phase.

Phases 3 (learn subdomain) and 4 (full white-label) are out of scope.

---

## Locked decisions (from parent plan — do not re-litigate)

- Aggregate only — no individual enrollment rows, no student PII in the portal
- USD + JPY shown separately — no currency conversion
- Refunded enrollments excluded from revenue and counts
- Partner-admin invite is manual (a HonuVibe admin promotes an existing user)
- No partner-initiated content editing, no Stripe Connect, no partner app
- Portal UI is EN-only in v1 (JP added only if a Japan-based partner signs)
- Individual partner accounts (not shared inboxes) unless a partner pushes back
- Multiple admins on the same partner all see the same aggregate view (intentional)

## Design decisions made in this plan

- **Admin preview** — middleware lets an `admin` role into `/partner/*`. To scope the view to a specific partner, admin pages accept a `?as=<partner_id>` query param. Without it, admin is redirected to `/admin/partners`. Partner role users ignore `?as` and always see their own partner (via `partner_admins`).
- **Charts** — no chart dependency exists in the repo (grep found no `recharts`/`chart.js`/`d3`). Render the 30-day enrollment bar chart as plain inline SVG. No new dependency.
- **StatCard reuse** — import [components/admin/StatCard.tsx](../../components/admin/StatCard.tsx) directly. No new component.
- **Partner admin invite** — admin enters an email; if the user doesn't exist yet, return a 404 with a message asking the admin to have the partner sign up first. Don't auto-provision via Supabase invite in v1 (parent plan labels that Phase 2.5 polish).
- **Role demotion on revoke** — DO NOT revert role on revoke. Leave the user's role at `'partner'` even after the last `partner_admins` row is removed. Their access is gated by the join table, not the role alone, so no security hole. Reverting is error-prone (what if they're a partner admin for two partners and we revoke one?).

---

## Architecture at a glance

```
Request to /partner/*
  │
  ├─▶ middleware.ts
  │     - protected prefix (auth required)
  │     - role must be 'partner' OR 'admin', else redirect to /
  │
  ├─▶ app/[locale]/partner/layout.tsx
  │     - PartnerGuard (server component, mirror of AdminGuard)
  │     - PartnerPortalLayout shell (nav with partner branding, sign-out)
  │
  └─▶ page.tsx / courses/page.tsx / settings/page.tsx
        - getPartnerForUser(user.id) or ?as=<id> (admin only)
        - lib/partner-portal/queries.ts for aggregates
        - renders StatCards + per-course table + SVG chart
```

---

## Work items

### 1 — Admin provisioning: `partner_admins` CRUD

**New: `app/api/admin/partners/[id]/admins/route.ts`**

Mirror the gate + service-client pattern from [app/api/admin/partners/[id]/route.ts:4-21](../../app/api/admin/partners/[id]/route.ts).

- `GET` — list existing partner admins for the partner. Join `partner_admins` ↔ `users` to return `{ user_id, email, full_name, created_at }[]`.
- `POST` — body `{ email: string }`.
  1. `requireAdmin()` gate.
  2. Look up `users` by email (service-role client, case-insensitive). If not found → 404 with message: `"No user with that email. Ask the partner to sign up at /learn/auth first."`
  3. If user's `role !== 'partner'`, `UPDATE users SET role = 'partner'`. Keep `admin` role intact if already admin (don't demote).
  4. `INSERT INTO partner_admins (partner_id, user_id)` — handle duplicate-key (code `23505`) as 409 "already a portal admin".
  5. Return `{ user_id, email, full_name }`.

**New: `app/api/admin/partners/[id]/admins/[userId]/route.ts`**

- `DELETE` — `requireAdmin()` gate, then `DELETE FROM partner_admins WHERE partner_id = $1 AND user_id = $2`. Do NOT revert role (see design decisions). Return `{ success: true }`.

**Modified: `app/[locale]/admin/partners/[id]/page.tsx`**

Slot in a new "Portal access" section after the existing `<AdminPartnerForm>` wrapper (line 73–78). Server-fetch current partner admins and pass to a new client component.

**New: `components/admin/PartnerAdminManager.tsx`** (client)

- Table of existing admins: email, full name (if present), "Added" date, Revoke button.
- "Grant portal access" form: email input + submit.
- On success, optimistic update of the list; on 404/409, display a tone-appropriate message.

**Reuse:** error/success UX pattern from [components/admin/AdminPartnerForm.tsx](../../components/admin/AdminPartnerForm.tsx) (state machine with `saving`, `saveError`, `saveMessage`).

### 2 — Middleware guard for `/partner/*`

**Modified: [middleware.ts](../../middleware.ts)**

- Add `'/partner'` to `PROTECTED_PREFIXES` (line 9).
- Add a new `PARTNER_PREFIXES = ['/partner']` constant + `isPartnerRoute()` helper (mirror lines 20–24).
- After the admin-gate block (lines 122–137), add an analogous partner-gate block:
  - If partner route and `profile?.role !== 'partner' && profile?.role !== 'admin'`, redirect to `/learn/dashboard` (or `/ja/learn/dashboard` for JP).
- Share the `profile` lookup with the admin block — single query instead of two — by lifting the `users.role` fetch above both gates.

### 3 — Post-login role-based redirect

**Modified: [app/api/auth/callback/route.ts](../../app/api/auth/callback/route.ts)**

- After the existing onboarding check (line 52–62), branch on role **only if** `redirectTo` is the default `/learn/dashboard` (respect explicit `?redirect` overrides — password reset, welcome flows, etc., already pass their own targets).
- Lookup: extend the existing profile query (line 46–50) to also select `role`.
- Apply:
  - `role === 'admin'` → `redirectTo = '/admin'`
  - `role === 'partner'` → `redirectTo = '/partner'`
  - else → leave as `/learn/dashboard` (keep `?welcome=true` if set)

### 4 — Portal shell and pages

**New: `app/[locale]/partner/layout.tsx`**

Mirror [app/[locale]/admin/layout.tsx](../../app/[locale]/admin/layout.tsx): `setRequestLocale(locale)` → `<PartnerGuard>` → `<PartnerPortalLayout>`.

**New: `components/auth/PartnerGuard.tsx`** (server)

Near-duplicate of [components/auth/AdminGuard.tsx](../../components/auth/AdminGuard.tsx):
- `supabase.auth.getUser()` → if missing, redirect to `/{prefix}/learn/auth`.
- Fetch `users.role`. If `role === 'partner'`, pass through. If `role === 'admin'`, pass through (preview mode). Else redirect to `/{prefix}/learn/dashboard`.

**New: `components/partner-portal/PartnerPortalLayout.tsx`**

Structure parallel to [components/admin/AdminLayout.tsx](../../components/admin/AdminLayout.tsx): `<div class="flex min-h-screen"><PartnerNav /><main>{children}</main></div>`. Accept `partner` prop (name, logo_url, primary_color) so the nav header can show branding.

**New: `components/partner-portal/PartnerNav.tsx`**

Simplified clone of [components/admin/AdminNav.tsx](../../components/admin/AdminNav.tsx) with only 3 items: Dashboard (`/partner`), Courses (`/partner/courses`), Settings (`/partner/settings`). Same `UserMenu` + `ThemeToggle` + `LangToggle` footer controls. Show partner logo + name in the sidebar header (swap the hardcoded "Admin" label for the partner name; render `logo_url` if present). **Cross-cut concern:** reading the partner in a client nav needs the partner passed as a prop from the server layout — don't re-query on the client.

**New: `app/[locale]/partner/page.tsx`** — Dashboard

Content:
1. Hero strip: four `<StatCard>`s — Students, Revenue (USD), Revenue (JPY), Courses featured. Each with `trend` prop showing MoM delta (e.g. `"+12 vs last month"`).
2. "Activity this month" — `<EnrollmentTrendChart />` rendered inline SVG: 30 bars, height scaled to max day count, hover title attributes for tooltip.
3. "Featured courses" — table: Course title, Enrollments (lifetime), Enrollments (this month), Revenue (USD), Revenue (JPY). Render from `getPartnerCourses(partnerId)`.
4. Empty state: if `stats.studentCount === 0`, replace sections 2 + 3 with a single "Share your page" card pointing to `https://honuvibe.com/{locale}/partners/{slug}` with a copy-link button.

**New: `app/[locale]/partner/courses/page.tsx`**

Standalone per-course aggregate table. Same data source as the dashboard's courses section, but with more columns (Created date, `partner_courses.display_order`, plus published/unpublished indicator so the partner can see if a course they're featured on is currently published).

**New: `app/[locale]/partner/settings/page.tsx`**

Read-only profile view:
- Logo preview
- Name (EN/JP if present)
- Tagline, description
- Primary color, secondary color (swatches)
- Revenue-share % (informational)
- Website URL, contact email

Copy block at the bottom: "To change any of this, email [contact address]." Don't ship any forms on this page — that's explicit Phase 2 scope guardrail.

**New: `components/partner-portal/EnrollmentTrendChart.tsx`**

Pure-SVG daily bar chart. Props: `data: { date: string; count: number }[]`, `height?: number`. Render 30 `<rect>` elements in a horizontal layout; max bar height = `height - 20`; y-axis is implied (no labels — peak count shown above chart). Accessible fallback: a visually-hidden `<ul>` with one `<li>` per day. ~60 lines of code.

### 5 — Aggregate queries

**New: `lib/partner-portal/queries.ts`**

All queries use `createClient()` (anon, user-session) so RLS (`is_partner_for()`) scopes reads to the caller. Exception: admin preview explicitly passes `partnerId`, verified against the admin role client-side.

```typescript
export type PartnerStats = {
  studentCount: number;       // distinct user_id, status != 'refunded'
  revenueUsd: number;         // cents, status != 'refunded', currency = 'usd'
  revenueJpy: number;         // yen,  status != 'refunded', currency = 'jpy'
  courseCount: number;        // count from partner_courses
  monthOverMonth: {
    students: number;         // delta: this-month - last-month
    revenueUsd: number;
    revenueJpy: number;
  };
};

export type PartnerCourseStats = {
  course_id: string;
  slug: string;
  title_en: string;
  is_published: boolean;
  lifetimeEnrollments: number;
  currentMonthEnrollments: number;
  lifetimeRevenueUsd: number;
  lifetimeRevenueJpy: number;
};

export async function getPartnerForUser(userId: string): Promise<Partner | null>;
export async function getPartnerStats(partnerId: string): Promise<PartnerStats>;
export async function getPartnerCourses(partnerId: string): Promise<PartnerCourseStats[]>;
export async function getPartnerDailyEnrollments(partnerId: string, days: number): Promise<{ date: string; count: number }[]>;
```

Implementation notes:
- **Always filter** `.not('status', 'eq', 'refunded')` on enrollment queries (parent plan + handoff requirement).
- **USD and JPY separately** — `currency = 'usd'` and `currency = 'jpy'` filtered independently, no conversion.
- **Reuse the shape** of the aggregation in [app/[locale]/admin/partners/[id]/enrollments/page.tsx:63-67](../../app/[locale]/admin/partners/[id]/enrollments/page.tsx) — reduce `amount_paid` into a currency-keyed map.
- **Daily chart query**: `select(date_trunc('day', enrolled_at)::date, count(*))` — Supabase doesn't do this natively in the JS client; fetch all enrollments in the window with `enrolled_at, status`, filter refunded, bucket client-side by date string. Simpler than a Postgres function; the window is bounded (30 days × at most a few hundred enrollments).
- **Month-over-month**: fetch two ranges (current month, previous month) and diff. `new Date()` for boundaries.

### 6 — Testing plan

Manual end-to-end, executed on production or a preview with production data:

1. **Create test user:** sign up a new account with email `partner-test@honuvibe.com` via `/learn/auth`.
2. **Grant portal access:** as admin, navigate to `/admin/partners/<smashhaus-id>`, scroll to "Portal access", enter `partner-test@honuvibe.com`, submit. Expect a row to appear in the admins table.
3. **Verify role:** `SELECT role FROM users WHERE email = 'partner-test@honuvibe.com';` → `partner`.
4. **Verify row:** `SELECT * FROM partner_admins WHERE user_id = <id>;` → one row for SmashHaus.
5. **Log in as test user:** sign out of admin, log in as `partner-test@honuvibe.com`. Expect redirect to `/partner/`.
6. **Verify dashboard:** counts on the dashboard match `SELECT count(DISTINCT user_id) FROM enrollments WHERE partner_id = '<smashhaus-id>' AND status != 'refunded';`. Revenue totals match per-currency sums from the same query.
7. **Admin denial:** as the partner user, attempt to navigate to `/admin` → expect redirect to `/learn/dashboard`.
8. **RLS isolation:** with the partner user's access token (pull from browser dev tools), `curl` the Supabase REST endpoint for `partner_admins` filtered by another partner's id (Vertice) → expect empty result (RLS blocks).
9. **Empty state:** create a throwaway partner "Test Empty" with no enrollments, promote a separate test user, log in as them → expect the "Share your page" CTA, no stats section.
10. **Refund exclusion:** manually set one SmashHaus enrollment to `status = 'refunded'`, refresh the partner dashboard → count and revenue should drop by that enrollment's contribution.
11. **Revoke:** as admin, click "Revoke" on the test partner admin. As that user, refresh `/partner/` → expect redirect to `/learn/dashboard` (RLS now returns no partner rows for them, triggering the "no partner found" redirect in the page).
12. **Admin preview:** log in as admin, visit `/partner/?as=<smashhaus-id>` → expect the SmashHaus dashboard to render. Visit `/partner/` without `?as` → expect redirect to `/admin/partners`.

### 7 — Scope guardrails

- **Do not** build partner-facing content editing (logo, colors, course list stay admin-only)
- **Do not** build Stripe Connect / auto-payouts
- **Do not** build a notifications / email digest system for partners
- **Do not** add a CSV export on the partner portal (admin-only at `/admin/partners/[id]/enrollments/csv` already exists)
- **Do not** ship JP translations for portal UI in v1

---

## Files — summary

**New (13):**
- `app/[locale]/partner/layout.tsx`
- `app/[locale]/partner/page.tsx`
- `app/[locale]/partner/courses/page.tsx`
- `app/[locale]/partner/settings/page.tsx`
- `components/auth/PartnerGuard.tsx`
- `components/partner-portal/PartnerPortalLayout.tsx`
- `components/partner-portal/PartnerNav.tsx`
- `components/partner-portal/EnrollmentTrendChart.tsx`
- `components/admin/PartnerAdminManager.tsx`
- `lib/partner-portal/queries.ts`
- `app/api/admin/partners/[id]/admins/route.ts` (GET list, POST grant)
- `app/api/admin/partners/[id]/admins/[userId]/route.ts` (DELETE)

**Modified (3):**
- `middleware.ts` — add partner prefix + gate (share the `users.role` lookup with admin gate)
- `app/api/auth/callback/route.ts` — role-based default redirect
- `app/[locale]/admin/partners/[id]/page.tsx` — slot in `<PartnerAdminManager>` section

**Reused (no changes, import only):**
- `components/admin/StatCard.tsx`
- `components/layout/user-menu.tsx` (sign-out via `UserMenu`)
- `components/layout/theme-toggle.tsx`, `components/layout/lang-toggle.tsx`
- `lib/supabase/server.ts` (`createClient`, `createAdminClient`)
- `requireAdmin()` pattern from `app/api/admin/partners/[id]/route.ts` (copy into new admin routes — it's a 17-line helper, duplicate is cheaper than a new module)

---

## Execution order

1. Migration is not needed — schema already in place. Start with the API routes + admin UI (work item 1) because they're testable end-to-end independent of the partner portal itself.
2. Middleware (item 2) + auth callback (item 3) — small, easy to verify with manual login flips.
3. Portal shell (item 4 layout + guard + nav) — no data yet, just routing and UI skeleton.
4. Queries (item 5) — can be unit-tested against seeded data.
5. Portal pages (item 4 page.tsx / courses / settings) — wire the shell to the queries.
6. Manual end-to-end test per work item 6.
7. Commit to `main`.

No feature branches, no PRs — per standing git workflow. Commit in the 4 logical chunks above with clear `feat(partners):` messages. Update `PROGRESS.md` at the end.

---

## Verification (what "done" looks like)

- All 12 test cases in work item 6 pass.
- `npm run build` clean, no TypeScript errors.
- RLS isolation confirmed manually (test case 8).
- Admin preview works (test case 12).
- `PROGRESS.md` has a new "Partner Portal — Phase 2" section under the partner platform block.

## Open questions (non-blocking — defaults locked)

Per handoff § "Known unknowns to clarify before building":

1. Individual Dylan account (default) vs shared `partner@smashhaus.com`. — **Default: individual**. Revisit if Dylan pushes back on account creation.
2. Multiple partner admins seeing same view. — **Confirmed intentional** per parent plan.
3. JP UI. — **EN only** in v1.

No action needed to unblock this plan.
