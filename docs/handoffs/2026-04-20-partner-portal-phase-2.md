# Handoff: Partner Portal (Phase 2 of the partner platform)

**Created:** 2026-04-20
**Trigger to pick this up:** When a partner contact (Dylan at SmashHaus is the likely first) explicitly asks to see their own metrics, or when Ryan decides to offer it proactively. Do not build speculatively.

---

## Copy-paste prompt for a fresh Claude session

> I want to implement **Phase 2 of the partner platform — the partner portal at `/partner/*`** — so partner contacts can see their own aggregate metrics without admin access.
>
> **Before you write any code, read these in order:**
> 1. `docs/plans/2026-04-16-partner-whitelabel.md` — the parent plan. Read the full **Phase 2 — Partner portal (aggregate-only)** section (routes, middleware, dashboard content, queries, file list).
> 2. `docs/plans/2026-04-20-partner-smashhaus-demo.md` — execution plan for slices A–D (already shipped).
> 3. `PROGRESS.md` § "Partner Platform — Slices A–D (2026-04-20)" — current state.
> 4. `supabase/migrations/029_partners.sql` — schema + RLS. Note the `partner_admins` junction table and the `is_partner_for(p_partner_id)` RLS helper. Those exist and are ready.
>
> **Context:** Slices A–D (landing pages, Stripe attribution, admin CRUD, Vertice attribution) are live on production. The database already has `partners`, `partner_courses`, `partner_admins`, `enrollments.partner_id`, and `users.referred_by_partner_id`. The `partner_admins` RLS helper `public.is_partner_for()` already works. The only missing piece of Phase 1 is the API/UI to **add a user to `partner_admins`** — which is deferred in the admin plan until it's actually needed. That's now, so build it as part of Phase 2.
>
> **Your plan should cover these deliverables (per the parent plan, not a rewrite):**
>
> 1. **Partner admin provisioning in admin CRUD** — new API route + UI so a HonuVibe admin can (a) promote an existing user to `role = 'partner'` and (b) insert a `partner_admins` row linking them to a partner. Follow the same auth-gate pattern as `app/api/admin/partners/[id]/route.ts`. Surface this on `app/[locale]/admin/partners/[id]/page.tsx` as a new "Portal access" section (email lookup + list of existing admins with revoke button).
>
> 2. **Middleware guard for `/partner/*`** — extend `middleware.ts`. Protected prefix: `/partner/`. Require `user.role === 'partner'` OR `user.role === 'admin'` (admins should be able to preview any portal). Unauth → redirect to `/learn/auth?redirect=<path>`. Wrong role → redirect to `/` (or appropriate dashboard).
>
> 3. **Post-login role-based redirect** — in `app/api/auth/callback/route.ts` (or wherever the post-login redirect currently lives), route `role = 'partner'` to `/partner/`, `admin` to `/admin`, student default to `/learn/dashboard`.
>
> 4. **Portal shell and pages:**
>    - `app/[locale]/partner/layout.tsx` — guards + shell (branded nav with partner name/logo, sign-out)
>    - `app/[locale]/partner/page.tsx` — dashboard (stats row + courses table + 30-day enrollment chart)
>    - `app/[locale]/partner/courses/page.tsx` — featured courses with per-course aggregates
>    - `app/[locale]/partner/settings/page.tsx` — read-only profile view (logo, colors, rev-share %)
>
> 5. **Aggregate queries** in `lib/partner-portal/queries.ts`:
>    - `getPartnerForUser(userId)` → joins `partner_admins` ↔ `partners` for the current user
>    - `getPartnerStats(partnerId)` → `{ studentCount, revenueUsd (cents), revenueJpy (yen), courseCount, monthOverMonth }`
>    - `getPartnerCourses(partnerId)` → per-course enrollment + revenue
>    - `getPartnerDailyEnrollments(partnerId, days)` → chart data
>    - All queries **exclude `enrollments.status = 'refunded'`** from revenue/counts
>    - All queries **scope to the caller** via `partner_admins.user_id = auth.uid()` — rely on RLS to enforce isolation; don't pass `partnerId` blindly from the client
>    - Show USD and JPY **separately, never converted** (exchange rates mislead)
>
> 6. **Aggregate-only UI** — partners see counts, revenue totals, courses featured. They do **NOT** see individual student names, emails, or enrollment rows. No CSV export on the partner portal. That stays admin-only (which already exists at `/admin/partners/[id]/enrollments/csv`).
>
> 7. **Empty state** — for a partner with 0 attributed enrollments, show the "share your page" CTA: their `honuvibe.com/partners/<slug>` URL.
>
> **Decisions already locked (from the parent plan — don't re-litigate):**
> - Aggregate only — no individual enrollment rows, no student PII
> - USD + JPY shown separately (no currency conversion)
> - Refunded enrollments excluded
> - Partner admin invite is manual (HonuVibe admin promotes existing user)
> - No partner-delegated approval for anything — HonuVibe admin remains the sole approver
>
> **Files to reuse (patterns already in the codebase):**
> - Auth gate: `components/auth/AdminGuard.tsx` (adapt to create `PartnerGuard.tsx`)
> - Admin layout shell: `components/admin/AdminLayout.tsx`, `components/admin/AdminNav.tsx` (adapt for partner nav — simpler: Dashboard, Courses, Settings)
> - Stat cards: look at `components/admin/StatCard.tsx` or equivalents used in `app/[locale]/admin/page.tsx`
> - Charts: check what's already rendering charts (grep for `recharts`, `chart.js`, or SVG-based sparklines). If nothing exists and a chart would pull in a dependency, fall back to a simple stacked bar per day rendered in SVG.
> - Supabase server client: `lib/supabase/server.ts` (`createClient()` — anon, for user-session RLS)
>
> **Testing plan:**
> - Promote a test user to `role = 'partner'` and link them to SmashHaus via the new admin UI
> - Log in as that user → land on `/partner/` (verify post-login redirect)
> - Confirm dashboard shows correct aggregates matching `SELECT count(*) FROM enrollments WHERE partner_id = <smashhaus_id> AND status = 'active'`
> - Attempt to access `/admin/*` as the partner user → redirected away
> - Attempt to query `partner_admins` for a different partner via direct DB access (e.g. curl with the partner's session token) → RLS blocks it
> - Empty-state partner (e.g. a fresh test partner) shows the share-your-page CTA
>
> **Scope guardrails:**
> - Do NOT add partner-initiated content editing (branding, course selection) — that stays admin-only in Phase 2
> - Do NOT build Stripe Connect / automated payouts (that's Phase 4 territory, requires legal + KYC work)
> - Do NOT ship a partner app / notifications — they can bookmark the URL and check manually
>
> Commit directly to `main` per the standing git workflow memory. No feature branches, no PRs.
>
> Start by writing a plan to `docs/plans/2026-MM-DD-partner-portal.md` (date at execution time), then execute.

---

## Why this is deferred, not forgotten

Building a portal speculatively means guessing at what partners actually want to see. **Let a real partner ask a real question** ("how many members did we send?", "what's the most popular course?") — that shapes the first dashboard view far better than a generic template.

Current Slice C enrollments report at `/admin/partners/<id>/enrollments` covers everything a partner might want for now — Ryan can screenshot-and-send that to any partner who asks for metrics today. Only build the portal when the "send Ryan an email, wait for screenshot" loop becomes painful.

## Known unknowns to clarify before building

1. **Does Dylan want access in his name, or a shared `partner@smashhaus.com` inbox account?** Individual accounts are cleaner but shared accounts mean lower friction. Default to individual unless he pushes back.
2. **Do partner admins see each other's attribution?** When a partner has multiple admin users, they all see the same aggregate view — intentional — but confirm with the first partner it's what they want.
3. **Language preference for the portal UI** — default to `en` since all current partner contacts use English. Add JP only if a Japan-based partner signs.

## Prerequisites still needed

Before running this handoff, confirm:
- [ ] At least one partner has actually requested portal access (trigger condition)
- [ ] `public.users.role` check constraint still includes `'partner'` (added in migration 029 — should still be there)
- [ ] `partner_admins` table still empty in production (i.e. no pre-existing rows from manual SQL — `SELECT count(*) FROM partner_admins;` should be `0`)
