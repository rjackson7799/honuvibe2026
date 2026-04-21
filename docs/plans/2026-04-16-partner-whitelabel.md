# Plan: Partners Platform (Landing Pages, Attribution, Portal)

**Date:** 2026-04-16
**Status:** Ready for implementation
**Supersedes:** nothing, but *amends* [learn-subdomain-migration.md](./learn-subdomain-migration.md) — see Phase 3.

---

## Context

HonuVibe is starting to attract partner organizations (Vertice Society already, SmashHaus under discussion, 2–5 more expected over the next 12 months) who want to offer HonuVibe courses to their membership under co-branded landing pages. Eventually those partners will want a login where they can see how their audience is engaging — enrollments, revenue, featured courses — without being able to author content.

This plan lays out a staged path that:
- Turns the existing ad-hoc `/partners/vertice-society` page into a data-driven, admin-manageable system
- Introduces the right architectural abstractions now (tenant-aware routing, `getTenant()` helper) so we're not rewriting middleware every time a partner signs
- Defers actual multi-tenant isolation (separate user pools, per-partner Stripe accounts, partner-owned subdomains) until a specific partner signs requiring it

### Decisions already locked in

| # | Decision | Value |
|---|---|---|
| 1 | Vertice Society page | **Migrate to data-driven system** (delete the bespoke component) |
| 2 | Student PII in partner portal | **Aggregate only** — no individual enrollment rows, no emails, no names |
| 3 | Course→partner relationship | **Single join table** — simple featured/assigned relationship, no enum |
| 4 | Partner admin invite flow | **Manual** — HonuVibe admin promotes an existing user's role to `'partner'` and links via admin UI |
| 5 | Phase 0 router foundation | **Before Phase 1**, as its own PR |
| — | Scale | 2–5 partners over 12 months (not self-serve) |
| — | Domain | Co-branded on honuvibe.com (no partner-owned subdomains in v1–v3) |
| — | Ownership | HonuVibe owns users + payments + support; partner gets attribution and aggregate metrics |

---

## Architecture Overview

```
Phase 0 ─ Router foundation            (1-2 days) — config-driven, tenant-aware, no user-visible change
Phase 1 ─ Partners data layer          (1-2 weeks) — migration, /partners/[slug], admin CRUD, Vertice migration
Phase 2 ─ Partner portal               (1-2 weeks) — partner role, /partner/* dashboard (aggregate only)
Phase 3 ─ learn.honuvibe.com subdomain (orthogonal, any time) — amended per critique
Phase 4 ─ Full white-label             (deferred, only if a specific partner requires it)
```

Phases 0–2 are the deliverable. Phases 3 and 4 are separate tracks that build on the same foundation.

---

## Phase 0 — Router foundation

Zero user-visible change. Purely architectural groundwork to avoid hardcoded host strings and to pre-wire a `tenant` concept so later phases plug in cleanly.

**New file: `lib/subdomain-config.ts`**
```typescript
export type TenantId = 'honuvibe' | string; // extensible — partner tenants added in Phase 4

export type SubdomainEntry = {
  prefix: string | null;   // path prefix to prepend ("/learn"), or null for the main app
  tenant: TenantId;
};

const entries: Record<string, SubdomainEntry> = {
  [process.env.NEXT_PUBLIC_LEARN_HOST ?? 'learn.honuvibe.com']: { prefix: '/learn', tenant: 'honuvibe' },
  [process.env.NEXT_PUBLIC_PRIMARY_HOST ?? 'honuvibe.com']:    { prefix: null,     tenant: 'honuvibe' },
  // Future partner entries land here. e.g.:
  // 'smashhaus.honuvibe.com': { prefix: '/learn', tenant: 'smashhaus' },
};

export function resolveHost(host: string | null): SubdomainEntry {
  const normalized = (host ?? '').toLowerCase().split(':')[0]; // strip port
  return entries[normalized] ?? entries[process.env.NEXT_PUBLIC_PRIMARY_HOST ?? 'honuvibe.com'];
}
```

**New file: `lib/tenant.ts`**
```typescript
import { headers } from 'next/headers';
import { resolveHost } from './subdomain-config';

export async function getTenant(): Promise<TenantId> {
  const host = (await headers()).get('host');
  return resolveHost(host).tenant;
}
```

`getTenant()` is a no-op in Phase 0 (always returns `'honuvibe'`). It exists so Phase 1+ can call it without plumbing, and Phase 4 can make it real without touching callers.

**Env vars added:**
- `NEXT_PUBLIC_PRIMARY_HOST` (default `honuvibe.com`)
- `NEXT_PUBLIC_LEARN_HOST` (default `learn.honuvibe.com`)
- Local dev: `NEXT_PUBLIC_PRIMARY_HOST=localhost:3000`, `NEXT_PUBLIC_LEARN_HOST=learn.localhost:3000`

**Verification:** Unit test `resolveHost()` with each configured host plus an unknown host; deploy to preview and confirm no regression.

---

## Phase 1 — Partners data layer, landing pages, admin CRUD

### 1.1 Migration — `supabase/migrations/<timestamp>_add_partners.sql`

```sql
-- Extend users role enum to include 'partner'
ALTER TABLE public.users DROP CONSTRAINT users_role_check;
ALTER TABLE public.users ADD CONSTRAINT users_role_check
  CHECK (role IN ('student', 'admin', 'instructor', 'partner'));

-- Partners: branding, settings, attribution metadata
CREATE TABLE partners (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  slug text UNIQUE NOT NULL,
  name_en text NOT NULL,
  name_jp text,
  tagline_en text,
  tagline_jp text,
  description_en text,
  description_jp text,
  logo_url text,
  primary_color text,           -- hex, overrides --accent-teal on landing page
  secondary_color text,         -- hex, overrides --accent-gold
  website_url text,
  contact_email text,
  revenue_share_pct numeric(5,2) DEFAULT 0,
  is_public boolean DEFAULT true,   -- controls SEO indexability (Vertice = false)
  is_active boolean DEFAULT true,   -- soft-delete toggle
  created_at timestamptz DEFAULT now(),
  updated_at timestamptz DEFAULT now()
);

CREATE INDEX idx_partners_slug ON partners(slug);
CREATE INDEX idx_partners_active ON partners(is_active);

-- Course assignment (simple join per decision #3)
CREATE TABLE partner_courses (
  partner_id uuid REFERENCES partners(id) ON DELETE CASCADE,
  course_id  uuid REFERENCES courses(id)  ON DELETE CASCADE,
  display_order integer DEFAULT 0,
  created_at timestamptz DEFAULT now(),
  PRIMARY KEY (partner_id, course_id)
);

CREATE INDEX idx_partner_courses_partner ON partner_courses(partner_id, display_order);

-- Partner portal access
CREATE TABLE partner_admins (
  partner_id uuid REFERENCES partners(id)     ON DELETE CASCADE,
  user_id    uuid REFERENCES public.users(id) ON DELETE CASCADE,
  created_at timestamptz DEFAULT now(),
  PRIMARY KEY (partner_id, user_id)
);

CREATE INDEX idx_partner_admins_user ON partner_admins(user_id);

-- Attribution columns on existing tables (nullable — non-breaking)
ALTER TABLE enrollments
  ADD COLUMN partner_id uuid REFERENCES partners(id);
CREATE INDEX idx_enrollments_partner ON enrollments(partner_id);

ALTER TABLE public.users
  ADD COLUMN referred_by_partner_id uuid REFERENCES partners(id);
CREATE INDEX idx_users_referred_by_partner ON public.users(referred_by_partner_id);

-- RLS helper mirroring public.is_admin()
CREATE OR REPLACE FUNCTION public.is_partner_for(p_partner_id uuid)
RETURNS boolean AS $$
  SELECT EXISTS (
    SELECT 1 FROM public.partner_admins
    WHERE partner_id = p_partner_id AND user_id = auth.uid()
  );
$$ LANGUAGE sql SECURITY DEFINER STABLE;

-- RLS — match existing project conventions
ALTER TABLE partners ENABLE ROW LEVEL SECURITY;
CREATE POLICY "partners_public_read" ON partners
  FOR SELECT USING (is_active = true AND is_public = true);
CREATE POLICY "partners_admin_all" ON partners
  FOR ALL USING (public.is_admin());
CREATE POLICY "partners_self_read" ON partners   -- partner admins can read their own partner
  FOR SELECT USING (public.is_partner_for(id));

ALTER TABLE partner_courses ENABLE ROW LEVEL SECURITY;
CREATE POLICY "partner_courses_public_read" ON partner_courses
  FOR SELECT USING (
    EXISTS (SELECT 1 FROM partners WHERE id = partner_id AND is_active = true AND is_public = true)
  );
CREATE POLICY "partner_courses_admin_all" ON partner_courses
  FOR ALL USING (public.is_admin());
CREATE POLICY "partner_courses_self_read" ON partner_courses
  FOR SELECT USING (public.is_partner_for(partner_id));

ALTER TABLE partner_admins ENABLE ROW LEVEL SECURITY;
CREATE POLICY "partner_admins_admin_all" ON partner_admins
  FOR ALL USING (public.is_admin());
CREATE POLICY "partner_admins_own_read" ON partner_admins
  FOR SELECT USING (user_id = auth.uid());
```

### 1.2 `/partners/[slug]` — data-driven landing page

- Replaces `app/[locale]/partners/vertice-society/page.tsx` (delete after migration of Vertice data into DB)
- New route: `app/[locale]/partners/[slug]/page.tsx` — server component
- 404 if partner not found, not active
- If `partners.is_public = false`, set `robots: { index: false, follow: false }` (matches current Vertice behavior)
- Branding: inline `style={{ ['--accent-teal' as any]: partner.primary_color, ['--accent-gold' as any]: partner.secondary_color }}` on the page wrapper. No global CSS changes.
- Reuses existing `HeroSection`, `FeaturedCourses`, `Footer`. Footer shows "Powered by HonuVibe.AI" mark.
- Pulls courses via `partner_courses` join, ordered by `display_order`, enriched with courses table data
- Sets attribution cookie on mount (see 1.4)

### 1.3 Vertice Society migration

One-time data migration:
1. Insert a `partners` row for Vertice Society with `is_public = false`
2. Link its course(s) via `partner_courses`
3. Copy branding colors/copy from the existing `VerticePageContent` component into the partner row
4. Update internal links from `/partners/vertice-society` → unchanged (same URL, data-driven now)
5. Delete `app/[locale]/partners/vertice-society/page.tsx` and `components/partners/vertice-page-content.tsx`
6. Verify the page renders identically (side-by-side before deletion)

### 1.4 Attribution

**New file: `lib/partner-attribution.ts`**

- `capturePartner(slug)` — client: on visit to `/partners/[slug]` or `?partner=<slug>` on any URL, set cookie `hv_partner=<slug>` with 30-day TTL
- `getAttributedPartnerSlug()` — server: reads the cookie
- `resolvePartnerIdBySlug(slug)` — server: looks up the partner, returns id or null

**Integration points:**
- `app/api/stripe/checkout/route.ts` — read cookie, pass `partner_slug` through Stripe session `metadata`
- `app/api/stripe/webhook/route.ts` — on `checkout.session.completed`, resolve slug → id and persist on `enrollments.partner_id`. Also, if `users.referred_by_partner_id` is null for this user, set it (first-touch sticky).

### 1.5 Admin CRUD — `/admin/partners`

Follow the pattern from [app/api/admin/surveys/](app/api/admin/surveys/) and [app/api/admin/users/](app/api/admin/users/).

- `app/[locale]/admin/partners/page.tsx` — list: logo, name, slug, enrollments count, revenue, active toggle
- `app/[locale]/admin/partners/[id]/page.tsx` — edit: branding, content (EN/JP), `is_public`, course picker (multi-select with drag-to-reorder), rev-share %, partner admins (list + add/remove), active toggle
- `app/[locale]/admin/partners/[id]/enrollments/page.tsx` — full detail enrollments report, CSV export (admin sees PII — aggregate-only rule applies to the *partner* portal, not the admin view)
- `app/api/admin/partners/route.ts` — GET list / POST create
- `app/api/admin/partners/[id]/route.ts` — GET / PATCH / DELETE (DELETE is soft — sets `is_active = false`)
- `app/api/admin/partners/[id]/admins/route.ts` — POST (add partner admin: promote user role + insert `partner_admins`), DELETE (revoke)

### 1.6 Analytics

Add Plausible event in [lib/analytics.ts](lib/analytics.ts):
- `partner_landing_view` with `{ partner: slug }` prop — fired on `/partners/[slug]` load
- `partner_enroll_click` with `{ partner: slug, course: slug }` prop — fired when user clicks Enroll from a partner-attributed context

### 1.7 Files — Phase 1 summary

**New:**
- `supabase/migrations/<ts>_add_partners.sql`
- `app/[locale]/partners/[slug]/page.tsx`
- `app/[locale]/admin/partners/page.tsx`
- `app/[locale]/admin/partners/[id]/page.tsx`
- `app/[locale]/admin/partners/[id]/enrollments/page.tsx`
- `app/api/admin/partners/route.ts`
- `app/api/admin/partners/[id]/route.ts`
- `app/api/admin/partners/[id]/admins/route.ts`
- `lib/partner-attribution.ts`
- `components/partners/PartnerLanding.tsx` (composes existing HeroSection + FeaturedCourses + Footer)

**Modified:**
- `app/api/stripe/checkout/route.ts` — pass `partner_slug` in session metadata
- `app/api/stripe/webhook/route.ts` — persist `partner_id` on enrollment + first-touch on user
- `types/supabase.ts` — regenerate
- `messages/en.json`, `messages/ja.json` — `partners.*` namespace
- `lib/analytics.ts` — add events

**Deleted (after Vertice migration verified):**
- `app/[locale]/partners/vertice-society/page.tsx`
- `components/partners/vertice-page-content.tsx`

---

## Phase 2 — Partner portal (aggregate-only)

### 2.1 Routes

All under `/partner/` (singular) to avoid collision with `/partners/[slug]` (plural, public).

- `/partner/` — dashboard summary
- `/partner/courses` — featured courses with per-course aggregate counts
- `/partner/settings` — read-only view of their partner profile (logo preview, colors, rev-share %)

**No enrollments detail page, no CSV export** — per decision #2, aggregate only. Partner admins never see individual student data.

### 2.2 Middleware guard

In [middleware.ts](middleware.ts), extend the existing admin guard:

```typescript
if (pathname.startsWith('/partner/') && user?.role !== 'partner') {
  return NextResponse.redirect(new URL('/', request.url));
}
```

Post-login redirect logic: `admin → /admin`, `partner → /partner`, `student → /learn/dashboard`.

### 2.3 Dashboard content

All aggregate. Queries filter by the logged-in user's partner via `partner_admins` join.

**Hero stats (card row):**
- Total enrolled students (distinct `user_id` in `enrollments` where `partner_id = self`)
- Total revenue — **shown separately as USD and JPY** (no conversion — exchange rates mislead)
- Total courses featured
- Current-month delta vs previous month for each metric

**Sections below hero:**
- "Featured courses" — table: course title, enrollments (lifetime, current month), revenue (USD/JPY separate)
- "Activity this month" — single chart (enrollments per day, last 30 days, no PII)

**Empty state:** "No enrollments yet. Share your co-branded page with your community: https://honuvibe.com/partners/your-slug"

### 2.4 Data helper

**New file: `lib/partner-portal/queries.ts`**

```typescript
export async function getPartnerForUser(userId: string): Promise<Partner | null>;
export async function getPartnerStats(partnerId: string): Promise<{
  studentCount: number;
  revenueUsd: number;  // cents
  revenueJpy: number;  // yen
  courseCount: number;
  monthOverMonth: { students: number; revenueUsd: number; revenueJpy: number };
}>;
export async function getPartnerCourses(partnerId: string): Promise<PartnerCourseStats[]>;
export async function getPartnerDailyEnrollments(partnerId: string, days: number): Promise<{ date: string; count: number }[]>;
```

All queries exclude `status = 'refunded'` enrollments from revenue and counts.

### 2.5 Files — Phase 2 summary

**New:**
- `app/[locale]/partner/layout.tsx` — partner portal shell (nav, sign out)
- `app/[locale]/partner/page.tsx` — dashboard
- `app/[locale]/partner/courses/page.tsx`
- `app/[locale]/partner/settings/page.tsx`
- `lib/partner-portal/queries.ts`
- `components/partner-portal/StatCard.tsx`, `EnrollmentTrendChart.tsx`

**Modified:**
- `middleware.ts` — add `/partner/*` guard
- `app/api/auth/callback/route.ts` — post-login role-based redirect (if not already doing this)

---

## Phase 3 — learn.honuvibe.com subdomain (amended, orthogonal)

The existing [learn-subdomain-migration.md](./learn-subdomain-migration.md) plan is sound in spirit but needs four amendments per the critique:

1. **Commit to Option B canonical strategy explicitly.** Marketing (`/learn` catalog, `/learn/[slug]` detail, `/partners/[slug]`) stays on `honuvibe.com`. App (`/dashboard`, `/auth`, `/vault`, `/admin`, `/partner`, course player) lives on `learn.honuvibe.com`. Clear storefront-to-app handoff at enrollment — same pattern every SaaS uses.
2. **Add `<link rel="canonical">` tags** pointing to each page's canonical domain. No page should be indexable from both domains.
3. **Replace `NextRequest` reconstruction with `NextResponse.rewrite(url)`** — mutate `request.nextUrl.pathname` before calling `intlMiddleware`, return `NextResponse.rewrite`. Much simpler.
4. **Use the Phase 0 `resolveHost()` map** instead of hardcoded `host === 'learn.honuvibe.com'`. Zero code change when Phase 4 adds partner subdomains.

Cookie-domain decision (`.honuvibe.com`) is a deliberate tradeoff: all first-party code runs on `*.honuvibe.com`; any third-party hosted service gets a separate apex (e.g. `honuvibe-status.com`). Document it in that plan.

The partner portal (`/partner/*`) moves from `honuvibe.com/partner` to `learn.honuvibe.com/partner` when this phase ships. Redirect `honuvibe.com/partner/*` → `learn.honuvibe.com/partner/*` permanently.

---

## Phase 4 — Full white-label (deferred)

Only if a specific partner signs requiring `learn.smashhaus.com` or isolated users/payments. At that point:
- Add partner subdomain entry to `lib/subdomain-config.ts` — one-line config change
- `getTenant()` starts returning real tenant ids
- Add `tenant_id` to per-user tables (`users`, `vault_bookmarks`, `esl_progress`) + RLS rewrite
- Stripe Connect for partner-owned revenue
- Per-tenant email branding (move `BRAND` constants in [lib/email/templates.ts](lib/email/templates.ts) into `partners.email_config` column)
- Partner's DNS: CNAME `learn.smashhaus.com` → `cname.vercel-dns.com`, add domain in Vercel

Out of scope for this plan. Called out so we know the upgrade path exists.

---

## Documented tradeoffs

| Tradeoff | Decision | Why |
|---|---|---|
| Cookie domain `.honuvibe.com` | Accepted | All first-party on `*.honuvibe.com`; third-party services on separate apex domains |
| PII visibility to partners | Aggregate only | GDPR/APPI-safe, no per-partner consent infra needed in v1 |
| Single `partner_courses` join vs enum | Single simple join | YAGNI — no relationship_type enum until a partner asks for a case the simple model can't express |
| First-touch + last-touch attribution | Both stored | `enrollments.partner_id` drives rev-share (last-touch at purchase). `users.referred_by_partner_id` answers "where did this user come from originally" |
| Manual partner admin invite | Admin promotes existing users | Faster to ship; Supabase `inviteUserByEmail` is a Phase 2.5 polish |
| No currency conversion in partner dashboard | USD + JPY shown separately | Exchange rates change; conversion misleads |

---

## Verification

### Phase 0
- Unit test: `resolveHost('learn.honuvibe.com')`, `resolveHost('honuvibe.com')`, `resolveHost('unknown.com')`, `resolveHost(null)`, `resolveHost('localhost:3000')` all return sensible results.
- Preview deploy: no regression on any existing page.

### Phase 1
- Migration applies cleanly on a dev branch; existing enrollments/users queries unaffected.
- Admin creates partner "Acme" with test branding. Landing page at `/partners/acme` renders partner name, primary color applied to accent elements, "Powered by HonuVibe" footer mark, JP version works at `/ja/partners/acme`.
- Vertice Society: new `/partners/vertice-society` (data-driven) renders visually identical to the old bespoke page; `robots: noindex` preserved via `is_public = false`.
- Attribution flow: visit `/partners/acme` → cookie set → enroll in a course via Stripe test mode → `enrollments.partner_id = acme.id` and `users.referred_by_partner_id = acme.id` (if first enrollment).
- Attribution via query string: visit `/learn/courses/foo?partner=acme` directly, enroll, confirm stamping.
- No-partner regression: visit `/learn/courses/foo` (no partner context), enroll, confirm `partner_id IS NULL`.
- Admin reporting: `/admin/partners/[id]/enrollments` shows the test enrollment and rev-share calc.
- RLS sanity: anon can read active public partners; cannot read `is_public = false` partners; partner admin can read own partner; can't read other partners.

### Phase 2
- Admin promotes a test user to `role = 'partner'` and links to Acme. That user logs in → redirected to `/partner/`. Dashboard shows the test enrollment aggregates (1 student, revenue matches).
- Partner admin cannot access `/admin/*` (redirected). Cannot access `/partner/*` for a *different* partner (no query surface in UI; RLS blocks direct DB access).
- Empty-state partner (0 enrollments) shows the "share your page" CTA.
- Refunded enrollments excluded from revenue and student count.

### Phase 3 (when ready)
- Per the amended subdomain plan.

---

## Open items (low-priority, not blocking)

- Public "Our Partners" index at `/partners` listing all `is_public = true` partners — social proof, low effort, nice-to-have after Phase 1.
- Partner-specific Stripe coupons (`partners.stripe_coupon_id`, auto-apply at checkout from partner-attributed sessions) — Phase 1.5 if a partner requests it.
- Partner-branded enrollment confirmation emails — Phase 4 (requires per-tenant email template infra anyway).
- Time-series analytics beyond 30-day chart — defer until a partner asks.
