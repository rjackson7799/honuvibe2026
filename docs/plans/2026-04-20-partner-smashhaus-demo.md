# Partners Platform — Phase 0 + 1 execution (SmashHaus demo first)

**Date:** 2026-04-20
**Parent plan:** [2026-04-16-partner-whitelabel.md](./2026-04-16-partner-whitelabel.md)
**Status:** Ready for execution

---

## Context

Ryan wants to show Dylan (SmashHaus, 500k-member community) a co-branded landing page soon to advance partnership discussions. The parent plan covers Phases 0–4; this execution plan sequences the work as **demo-first slices** so `/partners/smashhaus` is shareable in days, with admin polish and attribution wiring following after.

**Already drafted (untracked in git, zero consumers):**
- [lib/subdomain-config.ts](../../lib/subdomain-config.ts) — Phase 0 helper
- [lib/tenant.ts](../../lib/tenant.ts) — Phase 0 helper, `getTenant()` returns `'honuvibe'`
- [supabase/migrations/029_partners.sql](../../supabase/migrations/029_partners.sql) — Phase 1.1 schema + RLS, non-breaking (all additions `IF NOT EXISTS`)

**Confirmed via repo exploration:**
- No `types/supabase.ts` exists — no type regeneration step needed
- No `db:migrate` npm script — migration applied manually via Supabase CLI or dashboard SQL editor
- Bespoke Vertice page ([app/[locale]/partners/vertice-society/page.tsx](../../app/%5Blocale%5D/partners/vertice-society/page.tsx) + [components/partners/vertice-page-content.tsx](../../components/partners/vertice-page-content.tsx)) still live and untouched — we leave it alone through this demo
- Admin CRUD pattern to mirror: existing untracked `app/api/admin/surveys/` and `app/api/admin/users/`
- Stripe metadata injection point: [app/api/stripe/checkout/route.ts:113-143](../../app/api/stripe/checkout/route.ts#L113-L143)
- Stripe enrollment insert: [lib/stripe/webhooks.ts:52-63](../../lib/stripe/webhooks.ts#L52-L63)

---

## Slice A — SmashHaus demo (ship first, ~2-3 days)

### A1. Commit Phase 0 + migration scaffolding

- Stage `lib/subdomain-config.ts`, `lib/tenant.ts`, `supabase/migrations/029_partners.sql`
- No new callers yet — safe to land as-is
- Apply migration to dev Supabase (dashboard SQL editor or `supabase db push` — Ryan's preference)
- Verify tables `partners`, `partner_courses`, `partner_admins` exist and RLS is enabled
- Verify columns `enrollments.partner_id`, `users.referred_by_partner_id` exist

### A2. Partner landing page (data-driven)

**New:** `app/[locale]/partners/[slug]/page.tsx` — server component following the dynamic-slug pattern from [app/[locale]/learn/[slug]/page.tsx](../../app/%5Blocale%5D/learn/%5Bslug%5D/page.tsx):

- `setRequestLocale(locale)` for next-intl
- Fetch partner by slug via `createClient()` from [lib/supabase/server.ts](../../lib/supabase/server.ts)
- 404 via `notFound()` if partner absent or `is_active === false`
- `generateMetadata`: use `partner.name_{en,jp}` + description; if `partner.is_public === false`, emit `robots: { index: false, follow: false }`
- Fetch featured courses via `partner_courses` join on `courses`, ordered by `display_order`
- Render `<PartnerLanding partner={...} courses={...} locale={locale} />`

**New:** `components/partners/PartnerLanding.tsx` — client component (needs `useEffect` for cookie):

- Apply branding via inline style on root wrapper: `style={{ ['--accent-teal' as any]: partner.primary_color, ['--accent-gold' as any]: partner.secondary_color }}`
- Composition: logo + branded hero (name, tagline, "Browse courses" CTA → `/learn`) → featured courses grid → footer
- On mount: set `hv_partner=<slug>` cookie, 30-day `Max-Age`, `SameSite=Lax`, `Path=/`
- On mount: `trackEvent('partner_landing_view', { partner: slug, locale })`
- Reuse primitives:
  - Button: [components/ui/button.tsx](../../components/ui/button.tsx)
  - Course card pattern: adapt from [components/sections/featured-courses.tsx](../../components/sections/featured-courses.tsx)
  - Footer: [components/layout/footer.tsx](../../components/layout/footer.tsx)
  - Analytics helper: [lib/analytics.ts](../../lib/analytics.ts) `trackEvent()`

**Deliberately not reusing:** the full `HeroSection` — its floating cards are bound to course-specific translations and don't fit a generic partner hero. A simpler "logo + tagline + CTA" hero is cleaner to theme per partner.

### A3. i18n namespace

Add `partners.*` to [messages/en.json](../../messages/en.json) and [messages/ja.json](../../messages/ja.json):

```json
"partners": {
  "featured_courses_heading": "Featured courses",
  "cta_browse_courses": "Browse all courses",
  "powered_by": "Powered by HonuVibe.AI",
  "meta_description_fallback": "Co-branded AI learning — HonuVibe.AI"
}
```

Partner-specific copy (name, tagline, description) comes from the DB row, not messages.

### A4. Seed SmashHaus

**New:** `supabase/seeds/smashhaus_demo.sql` — idempotent seed:

```sql
INSERT INTO partners (slug, name_en, name_jp, tagline_en, tagline_jp, description_en, description_jp,
                     logo_url, primary_color, secondary_color, is_public, is_active)
VALUES ('smashhaus', 'SmashHaus', 'スマッシュハウス', /* ... */)
ON CONFLICT (slug) DO UPDATE SET ...;

INSERT INTO partner_courses (partner_id, course_id, display_order)
SELECT p.id, c.id, 0 FROM partners p, courses c
WHERE p.slug = 'smashhaus' AND c.slug = '<course-slug-tbd>'
ON CONFLICT DO NOTHING;
```

- `is_public = false` for the demo (noindex until SmashHaus approves going live)
- Course selection: TBD with Ryan (Claude Code intro is the likely fit)
- Placeholder logo + colors are acceptable for initial build — swap in real assets before sharing the URL

### A5. Verify demo

1. Dev server: visit `/partners/smashhaus` and `/ja/partners/smashhaus`
2. DevTools checks: (a) branded `--accent-teal` / `--accent-gold` applied, (b) `hv_partner=smashhaus` cookie set with 30-day expiry, (c) correct courses listed, (d) `<meta name="robots" content="noindex, nofollow">` present
3. `/partners/nonexistent` → 404
4. Regression: `/partners/vertice-society` still renders (untouched)
5. `npm run build` passes

### A6. Commit + share

Commit Slices A1–A5 as a single `feat(partners): smashhaus demo landing page` commit directly to `main` per [git workflow preference](../../C:/Users/HCI/.claude/projects/c--Users-HCI-Desktop-Projects-HonuVibe-2026/memory/feedback_git_workflow.md). Send Dylan the URL.

---

## Slice B — Attribution wiring (post-demo, ~1-2 days)

Triggered once Dylan's page goes public or the first partner-driven enrollment needs to be tracked.

**New:** `lib/partner-attribution.ts`

- `capturePartner(slug)` — client cookie setter (already called by `PartnerLanding`)
- `getAttributedPartnerSlug()` — server reader using `cookies()` from `next/headers`
- `resolvePartnerIdBySlug(slug)` — DB lookup, returns id or null

**Modified:** [app/api/stripe/checkout/route.ts](../../app/api/stripe/checkout/route.ts)

- Read `hv_partner` cookie
- Add `partner_slug: <slug>` to `session.metadata` alongside existing `user_id`, `course_id`, `course_slug`, `currency`, `locale`

**Modified:** [lib/stripe/webhooks.ts](../../lib/stripe/webhooks.ts) `handleCheckoutCompleted`

- After idempotency check, before enrollment insert: if `session.metadata.partner_slug` present, resolve to `partner_id`
- Include `partner_id` in the enrollment insert payload
- If `users.referred_by_partner_id` is null for this `user_id`, set it (first-touch sticky)

**Modified:** `PartnerLanding.tsx`

- Fire `trackEvent('partner_enroll_click', { partner, course })` on each course CTA click

**Verify Slice B:** Stripe test-mode purchase from `/partners/smashhaus` → `enrollments.partner_id = <smashhaus.id>`. Direct `/learn/<course>` enrollment → `partner_id IS NULL`.

---

## Slice C — Admin CRUD (when hand-editing SQL becomes a chore)

Self-service partner creation. Mirrors the existing pattern in `app/api/admin/surveys/` / `app/api/admin/users/` (auth gate: `createClient()` → `getUser()` → role check → `createAdminClient()` for mutation).

- `app/[locale]/admin/partners/page.tsx` — list with logo, name, slug, enrollments count, active/public toggles
- `app/[locale]/admin/partners/[id]/page.tsx` — edit (branding, content EN/JP, course picker with drag-to-reorder, rev-share %, active/public)
- `app/[locale]/admin/partners/[id]/enrollments/page.tsx` — attribution report + CSV export (admin sees PII; partner portal aggregate-only is a Phase 2 concern)
- `app/api/admin/partners/route.ts` — GET list / POST create
- `app/api/admin/partners/[id]/route.ts` — GET / PATCH / DELETE (soft: `is_active = false`)
- `app/api/admin/partners/[id]/admins/route.ts` — add/revoke portal access (deferred until a partner wants a login)

---

## Slice D — Vertice migration (optional cleanup)

Low-urgency. The bespoke Vertice page works fine as-is; migration is about consolidating on one pattern.

- Seed Vertice row into `partners` (`slug: 'vertice-society'`, `is_public: false`, copy branding from current component)
- Side-by-side visual parity check
- Delete `app/[locale]/partners/vertice-society/page.tsx`, `components/partners/vertice-page-content.tsx`, `vertice-enroll-panel.tsx`, `vertice-teacher-profiles.tsx`
- Remove the Vertice-specific locale fallback in [middleware.ts:57-65](../../middleware.ts#L57-L65)
- Update hardcoded Vertice link in [components/layout/footer.tsx](../../components/layout/footer.tsx) — either drop it (Vertice is invite-only) or add a generic "Our Partners" link if `is_public = true` partners exist

**Note:** Vertice has custom enrollment logic (`vertice-enroll-panel`) that the data-driven page doesn't currently replicate. Either port it to a per-partner feature flag or keep Vertice on the bespoke page indefinitely. Defer this decision until we actually want to delete the bespoke files.

---

## Out of scope

- Phase 2 partner portal (`/partner/*` aggregate dashboard) — decide after Dylan sees the demo
- Phase 3 `learn.honuvibe.com` subdomain — orthogonal platform work
- Phase 4 full white-label (`learn.smashhaus.com`, isolated users/Stripe) — only if SmashHaus contractually demands it
- Instructor marketplace (the 2026-04-17 plan) — consumes fields this plan adds; queued after Slice B lands

---

## Files summary

### Slice A (demo)

**New:**
- `lib/subdomain-config.ts` (already drafted)
- `lib/tenant.ts` (already drafted)
- `supabase/migrations/029_partners.sql` (already drafted)
- `supabase/seeds/smashhaus_demo.sql`
- `app/[locale]/partners/[slug]/page.tsx`
- `components/partners/PartnerLanding.tsx`

**Modified:**
- `messages/en.json`, `messages/ja.json`

### Slice B (attribution)

**New:**
- `lib/partner-attribution.ts`

**Modified:**
- `app/api/stripe/checkout/route.ts`
- `lib/stripe/webhooks.ts`
- `components/partners/PartnerLanding.tsx` (add enroll-click event)

### Slice C (admin CRUD)

**New:** six files under `app/[locale]/admin/partners/` and `app/api/admin/partners/`

### Slice D (Vertice)

**Modified:** `middleware.ts`, `components/layout/footer.tsx`
**Deleted:** four files under `app/[locale]/partners/vertice-society/` and `components/partners/`

---

## Open data needs (gather before Slice A4)

1. SmashHaus logo asset (SVG preferred)
2. SmashHaus primary + secondary hex colors
3. Short EN/JP tagline + description copy
4. Which course(s) to feature for SmashHaus audience

Placeholders are fine for initial build — swap in real assets before sharing with Dylan.

---

## Verification (end of Slice A)

1. Migration applied: all partner tables + attribution columns exist; RLS enabled on `partners`/`partner_courses`/`partner_admins`
2. `npm run build` and `npm run type-check` pass
3. `/partners/smashhaus` renders with brand colors, featured courses, footer, noindex meta, attribution cookie
4. `/ja/partners/smashhaus` renders the Japanese variant
5. `/partners/nonexistent` → 404
6. `/partners/vertice-society` regression-clean (unchanged)
