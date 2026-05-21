# Partner-Owned Content (Phase 1) — Design Spec

**Date:** 2026-05-04
**Author:** Ryan + Claude (brainstorm session)
**Status:** Design approved, awaiting implementation plan
**Phase:** 1 of 3 (gated catalog → instructor program → 3-way revenue split)

---

## Context

HonuVibe currently treats partners as **attribution sources**: a partner has a co-branded landing page (`/partners/smashhaus`), and visitors who arrive through it have their subsequent enrollments tagged via the `hv_partner` cookie. Partners can sign into `/partner/` and see attributed stats.

SmashHaus brings 500K music-industry members and wants to offer AI training to its community — a mix of HonuVibe's general AI courses (cross-promoted) and music-industry-specific courses (ElevenLabs, Suno, album art, production). This requires the platform to model **partner-owned content** — courses and Vault lessons whose canonical owner is the partner — distinct from merely "featured."

**Phase 1 scope** (this spec): partner-owned courses + partner-owned Vault content, with badging/discovery in the main catalog and the partner portal.

**Out of scope (later phases, do not build):**
- Phase 2: Partner instructor program (elevating community members, content review).
- Phase 3: 3-way revenue split + monthly active-user invoicing model (HonuVibe invoices SmashHaus for active users; SmashHaus collects member-side revenue separately).
- Member identification / verification: SmashHaus drives traffic; visitors create normal free HonuVibe accounts. There is **no concept of a "verified SmashHaus member"** in Phase 1.
- White-labeling: badging only; no per-partner theme override on course/Vault pages.

---

## Design Decisions (already approved)

1. **1:1 ownership.** A course or Vault item has at most one owner partner. Cross-promotion stays via the existing `partner_courses` junction (which now means "featured on landing page," can include non-owned content).
2. **Ownership wins over cookie for attribution.** An enrollment in a partner-owned course always counts toward that partner regardless of the `hv_partner` cookie. Cookie attribution still applies for HonuVibe-owned courses bought by users who came via a partner link.
3. **Tagged everywhere.** Partner-owned content appears in the main `/learn` catalog and `/learn/vault` (with a "Presented by SmashHaus" badge), not silo'd to the partner page. Maximum discovery.
4. **No member identity / no gating.** Anyone can buy any course; freemium funnels through the standard Vault subscription.
5. **`vault_series.partner_id` is admin-UX sugar.** Source of truth is `content_items.partner_id`. Series-level partner_id auto-defaults onto items.
6. **Bilingual handling: null-fallback.** SmashHaus is EN-only. JP locale views fall back to `_en` fields when `_jp` is null (codebase convention per CLAUDE.md). No new `is_en_only` partner column needed.
7. **INS-3 revenue-split coexistence.** Migration `033` (already in production) wired `partners.revenue_share_pct` into the Stripe webhook: every paid enrollment with a non-null `partner_id` now snapshots `partner_share_amount = round(gross * partners.revenue_share_pct / 100)` to the enrollment ledger. Phase 1 ownership tagging will cause many more enrollments to carry a `partner_id` (every enrollment in a partner-owned course, not just cookie-attributed ones), so **partners that get ownership-tagged content MUST have `revenue_share_pct = 0` until Phase 3 (SmashHaus collects revenue + HonuVibe invoices monthly) is designed**. SmashHaus default is already `0` per migration `029` — confirm before tagging the first course. The admin Course edit form gets a warning UI for non-zero rev-share partners (see "Admin UX").

---

## Data Model

### Migration: `supabase/migrations/034_partner_ownership.sql`

```sql
-- Course-level partner ownership
alter table courses
  add column partner_id uuid references partners(id) on delete set null;
create index courses_partner_id_idx on courses(partner_id) where partner_id is not null;

-- Vault item-level partner ownership (source of truth)
alter table content_items
  add column partner_id uuid references partners(id) on delete set null;
create index content_items_partner_id_idx on content_items(partner_id) where partner_id is not null;

-- Vault series-level partner ownership (admin UX sugar; defaults onto items)
alter table vault_series
  add column partner_id uuid references partners(id) on delete set null;

-- Down migration (reversible)
-- drop index if exists courses_partner_id_idx;
-- drop index if exists content_items_partner_id_idx;
-- alter table courses drop column partner_id;
-- alter table content_items drop column partner_id;
-- alter table vault_series drop column partner_id;
```

### RLS

Existing RLS on `courses`, `content_items`, `vault_series` already permits public read of published rows. Adding a column does not require new policies. Partner admins write through `/api/admin/*` routes which use the admin client and bypass RLS — no changes there. Verify during implementation that RLS test queries still pass for: anon read, authenticated user read, partner role read of own content, partner role read of other partner's content (must remain readable since content is public).

### Attribution rule (new logic, not a schema change)

When `enrollments` rows are created (Stripe webhook + free-enrollment path):

```
enrollments.partner_id =
  course.partner_id              -- if the course is partner-owned, ownership wins
  ?? cookie_partner_id           -- else, fall back to hv_partner cookie attribution
  ?? null
```

Existing cookie attribution code path stays; we prepend the ownership check.

**INS-3 interaction:** the existing `persistEnrollmentSplit` call (in `lib/stripe/webhooks.ts`, added by migration `033`) reads `partners.revenue_share_pct` for whatever `partner_id` ends up on the enrollment. With ownership wins, more enrollments will carry a `partner_id`. Per Decision #7, owner partners must have `revenue_share_pct = 0` for Phase 1 — keeping `partner_share_amount = 0` and the existing cash-flow path unchanged.

---

## Admin UX

### Course edit form

- Add a "Partner" dropdown above the existing fields. Options: `— HonuVibe (default) —` plus all `is_active = true` partners. Searchable input if list grows beyond ~10.
- **Auto-feature on assign:** when a course is saved with `partner_id = X`, ensure a `partner_courses(partner_id=X, course_id=...)` row exists (idempotent insert; default `display_order = max+1`). De-feature is still manual via `AdminPartnerForm`.
- Changing `partner_id` from X to Y does **not** remove the X feature row (preserves cross-promotion).
- Course list shows a small partner logo chip next to the title where `partner_id` is set.
- **Revenue-share warning (INS-3 guard):** when admin selects a partner whose `revenue_share_pct > 0`, show an inline warning before save: *"This partner has a {pct}% revenue share. Tagging this course as owned will route share dollars to them via the INS-3 ledger on every enrollment. Confirm this is intended for Phase 1 (typically owner partners should be 0%)."* Save is not blocked — admin can confirm — but the prompt prevents accidental cash-flow regressions.

### Vault content_item edit form ([app/[locale]/admin/vault/[id]])

- Same "Partner" dropdown.
- If the item's `series_id` resolves to a series with `partner_id = X`, default the item's `partner_id` to X (admin can override).
- Vault content list shows partner chip.

### Vault series edit form ([app/[locale]/admin/vault/series])

- "Partner" dropdown.
- Saving a series with a `partner_id` shows a one-time confirmation: "Apply this partner to all N items in this series?" → bulk update on click.

### Backfill helper

No long-lived UI. Migration file includes a comment with example SQL for backfilling existing partner content if seeded before this lands. (SmashHaus currently has 0 owned content, so this is mostly documentation.)

---

## Public Surfaces & Badging

### New shared component: `components/partners/PartnerBadge.tsx`

Renders `[logo] Presented by {partnerName}` as a small chip linking to `/partners/{slug}`. Used in all places below. Bilingual via `useTranslations`; partner name uses `name_jp ?? name_en`.

### Touch points

| Surface | Change |
|---|---|
| `/learn` catalog ([app/[locale]/learn/page.tsx]) | Course cards with `partner_id` show `<PartnerBadge>` in card footer. Optional partner filter chip row above grid. |
| Course detail page ([app/[locale]/learn/[course-slug]]) | `<PartnerBadge>` near title in header. No theme override. |
| `/learn/vault` catalog | Vault item cards and series cards with `partner_id` show `<PartnerBadge>`. Partner filter added to existing filter row. |
| Vault item detail page | `<PartnerBadge>` in item header. |
| `/partners/[slug]` landing | Existing featured-courses section unchanged. **New section:** "Vault content from {Partner}" — pulls `vault_series` where `partner_id = X` and standalone `content_items` where `partner_id = X` and `series_id is null`. Renders only when content exists. **Note:** `PartnerLanding.tsx` is a client component (uses `useEffect` for cookie). Vault data must be fetched in the parent server component (`app/[locale]/partners/[slug]/page.tsx`) and passed in as props — do not move data fetching into the client component. |

### Bilingual / locale handling

- All partner content uses `_jp ?? _en` fallback per codebase convention.
- `/ja/partners/smashhaus` renders with English body content and JP-translated chrome.
- `PartnerBadge` "Presented by" string is translated; partner name is not.

---

## Partner Portal Stat Extensions

### `/partner/` dashboard ([app/[locale]/partner/page.tsx])

- Stats cards stay; **Students** and **Revenue (USD/JPY)** semantics broaden to: enrollments in partner-owned courses ∪ enrollments where cookie-attributed `partner_id = X`. Same metric names, broader source.
- Replace single "Courses featured" card with two: **Courses owned** + **Courses featured** (or one card with sub-label).
- New row of Vault stats: **Vault items owned**, **Vault views (30d)** (from `vault_views` filtered to owned `content_item_id`s).
- 30-day enrollment trend chart reflects broader source.
- "Featured courses" table renamed → **"Course performance"**; adds "Owned" column (badge).

### New page: `/partner/vault`

- Mirrors `/partner/courses` structure. Lists owned series and standalone items. Columns: title, views (lifetime + 30d), helpful count, freshness status. Reuses `vault_views` and `vault_feedback` aggregates.
- Add to `PartnerNav`: `Dashboard · Courses · Vault · Settings`.

### Query updates ([lib/partner-portal/queries.ts])

- `fetchAttributedEnrollments(partnerId)` becomes `fetchPartnerEnrollments(partnerId)`: returns enrollments where `enrollments.partner_id = X` OR `enrollments.course_id IN (select id from courses where partner_id = X)` — UNION semantics, deduplicated by enrollment id.
- New `getPartnerVaultStats(partnerId)`: items owned, views in window, helpful aggregates.
- New `getPartnerOwnedCourses(partnerId)`: courses where `partner_id = X`.
- Existing `getPartnerCourses(partnerId)` (featured) renamed to `getPartnerFeaturedCourses` for clarity; used by the existing partner landing page.

---

## Testing & Regression Safety

### Pre-flight

1. Snapshot current SmashHaus and Vertice Society dashboard numbers (students, revenue, course counts). After migration but before any `partner_id` assignments, numbers must be identical.
2. Capture screenshots of `/learn`, `/learn/vault`, `/partners/smashhaus`, `/partner/` (admin preview) as "before" reference.

### Migration safety

- All new columns nullable, no defaults → no row rewrites.
- `on delete set null` on FKs → partner deletion non-destructive.
- Down migration in same file → reversible.
- Run on Supabase preview branch first.

### Automated tests

Vitest is already configured in the repo (per INS-3, `vitest.config.ts` + `vitest.setup.ts`). New tests go at `lib/partner-portal/queries.test.ts` following the pattern from `lib/revenue-split/compute.test.ts`.

| # | Test | Verifies |
|---|---|---|
| 1 | `getPartnerStats` with no owned content | Cookie attribution path returns same numbers as before migration |
| 2 | `getPartnerStats` with owned courses, no enrollments | `studentCount = 0`, `coursesOwned` correct |
| 3 | Owned course enrollment + cookie-attributed enrollment from a different partner | Ownership wins; no double-count |
| 4 | Mixed: owned course enrollment + cookie-attributed HonuVibe enrollment for same user | Both count; deduplicated by enrollment id |
| 5 | `getPartnerOwnedCourses` returns correct list | Owned vs featured separation |
| 6 | Vault item, JP locale, null `title_jp` | Renders `title_en` fallback, no crash |
| 7 | Course card with `partner_id = null` | Renders without badge (no regression) |
| 8 | Stripe webhook for partner-owned course | Sets `enrollments.partner_id = course.partner_id` even with no cookie. Confirm INS-3's `persistEnrollmentSplit` produces `partner_share_amount = 0` when partner's `revenue_share_pct = 0`, even though `partner_id` is now set. |

### Manual regression checklist

- [ ] `/learn` catalog: HonuVibe-only courses render unchanged. Add SmashHaus-owned course → badge renders, layout intact.
- [ ] `/learn/vault` catalog: HonuVibe content unchanged; partner items get badge.
- [ ] Course detail page: HonuVibe course unchanged; partner course shows badge in header.
- [ ] Vault item detail page: HonuVibe unchanged; partner item shows badge.
- [ ] `/partners/smashhaus`: featured section still works. "Vault content from SmashHaus" section appears only when content exists.
- [ ] `/partners/vertice-society`: still bespoke (Slice D was deferred — uses `vertice-page-content.tsx`, not data-driven). Confirm we haven't accidentally affected it. Vertice's partner portal still works because that's data-driven via `partner_admins`.
- [ ] `/ja/partners/smashhaus`: renders with EN fallback content; no blank cards.
- [ ] Admin course form: existing edit flow unchanged. Setting partner saves + auto-creates `partner_courses` row.
- [ ] Admin Vault item form: existing edit flow unchanged.
- [ ] Admin Vault series form: bulk-apply confirmation works.
- [ ] Sign in as SmashHaus partner admin (`/partner/`): pre-flight stats match.
- [ ] `/partner/vault` (new): empty state when nothing tagged.
- [ ] Sign in as Vertice Society partner admin: portal scoped to Vertice; no SmashHaus leakage.
- [ ] Stripe webhook: partner-owned course purchase → `enrollments.partner_id = owner`. Cookie-attributed enrollments unchanged.

### Build verification

- `pnpm typecheck` clean (TS strict)
- `pnpm lint` clean
- `pnpm build` succeeds
- Lighthouse on `/learn` and `/partners/smashhaus` — perf budget unchanged.

---

## Critical Files

### New files

- `supabase/migrations/034_partner_ownership.sql`
- `components/partners/PartnerBadge.tsx`
- `app/[locale]/partner/vault/page.tsx`
- Test file(s) for `lib/partner-portal/queries.ts` updates

### Modified files

**Data layer:**
- `lib/partner-portal/queries.ts` — broaden `fetchAttributedEnrollments` to include owned courses; add `getPartnerVaultStats`, `getPartnerOwnedCourses`; rename existing `getPartnerCourses` → `getPartnerFeaturedCourses`.
- `lib/stripe/webhooks.ts` — attribution rule: `course.partner_id ?? cookie_partner_id ?? null`.
- Free-enrollment path (wherever `enrollments` rows are created server-side without Stripe — verify during implementation).

**Admin:**
- Course edit form (locate during implementation — likely under `app/[locale]/admin/learn/` or `components/admin/`).
- `app/[locale]/admin/vault/[id]/page.tsx` (or its form component) — partner dropdown.
- `app/[locale]/admin/vault/series` form — partner dropdown + bulk-apply prompt.
- `components/admin/AdminPartnerList.tsx` — partner logo chip in course list (if applicable).

**Public surfaces:**
- `app/[locale]/learn/page.tsx` — render badge on cards; partner filter chip row.
- `app/[locale]/learn/[course-slug]/page.tsx` (or equivalent course detail route) — badge in header.
- `app/[locale]/learn/vault/page.tsx` — render badge on cards; partner filter.
- `app/[locale]/learn/vault/[slug]/page.tsx` — badge in header.
- `app/[locale]/partners/[slug]/page.tsx` — new "Vault content from partner" section.
- `components/partners/PartnerLanding.tsx` — render new Vault section.

**Partner portal:**
- `app/[locale]/partner/page.tsx` — new stat cards, broaden semantics.
- `components/partner-portal/PartnerNav.tsx` — add `/partner/vault` entry.

**i18n:**
- `messages/en.json`, `messages/ja.json` — add `partner_badge.presented_by` translation key.

### Reused (no changes needed)

- `components/admin/StatCard.tsx`
- `components/partner-portal/EnrollmentTrendChart.tsx`
- `partners`, `partner_courses`, `partner_admins` tables
- Auth middleware (`middleware.ts`) — partner role gating already covers the new `/partner/vault` route since it's under `/partner/*`.

---

## Verification (end-to-end)

After implementation:

1. **DB migration:** apply `034_partner_ownership.sql` on Supabase preview branch; confirm columns + indexes; confirm rollback works.
2. **Stat parity:** sign into `/partner/` as SmashHaus admin (or use `?as=<id>` admin preview). Numbers match pre-flight snapshot.
3. **Tag a course:** in admin, set a course's `partner_id` to SmashHaus. Confirm:
   - Auto-feature row appears in `partner_courses`.
   - Course shows badge on `/learn`, on its detail page, and in `/partners/smashhaus`.
   - SmashHaus portal "Courses owned" stat = 1.
4. **Tag Vault content:** in admin, create a Vault series with `partner_id = SmashHaus`, add 3 items with bulk-apply. Confirm:
   - Items inherit partner_id.
   - Items render badge on `/learn/vault` and detail pages.
   - SmashHaus partner page shows "Vault content from SmashHaus" section.
   - SmashHaus portal `/partner/vault` shows the 3 items.
5. **Attribution:** with no `hv_partner` cookie, purchase a SmashHaus-owned course as a test user. Confirm `enrollments.partner_id` = SmashHaus's id.
6. **Cross-promotion:** with `hv_partner=smashhaus` cookie, purchase a HonuVibe-owned course. Confirm `enrollments.partner_id` = SmashHaus (cookie attribution preserved).
7. **JP locale:** visit `/ja/learn` and `/ja/partners/smashhaus`. SmashHaus content renders EN-fallback; no blank cards or crashes.
8. **Regression sweep:** run the manual checklist above. No issues.
9. **Build:** `pnpm typecheck && pnpm lint && pnpm build` all green.

---

## Open implementation-time questions

These don't block design approval but should be resolved during the implementation plan:

1. Where exactly is the course edit form? Need to locate during implementation (admin page paths weren't fully mapped in brainstorm).
2. Is there a free-enrollment path independent of Stripe (e.g., for free courses)? If so, attribution rule + INS-3 split persistence must be applied there too.
3. Filter-chip UX on `/learn` and `/learn/vault`: match the existing filter pattern in those pages (don't invent a new component).

## Pre-execution checks (run before tagging the first course)

- [ ] Confirm `partners.revenue_share_pct = 0` for SmashHaus and any other partner that will receive ownership-tagged content. Query: `SELECT slug, revenue_share_pct FROM partners WHERE is_active = true;`
- [ ] Confirm migration `033` is applied in production (it should be — INS-3 shipped).
- [ ] Confirm `vault_views`, `vault_feedback` tables are populated and queryable (used by new partner Vault stats).
