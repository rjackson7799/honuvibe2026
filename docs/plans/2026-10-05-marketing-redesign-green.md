# Marketing redesign — "2026 green" slimmed offer (program roadmap)

**Status:** draft for Ryan's review. Nothing built. Each unit below runs in its own fresh
session via `docs/plans/_EXECUTION_TEMPLATE.md`; units that need more detail get their own
`docs/plans/2026-10-xx-<unit>.md` before execution (same pattern as the partner-platform
roadmap + unit plans).

**Design handoff:** `docs/design_2026_green/` (README + 7 `.dc.html` references + screenshots).
The folder is untracked — commit it together with this plan so execution sessions can read it.

---

## Context

Feedback: the current site is confusing. It sells four or five things at once across
Learn / Exploration / Sandbox / Partnerships / About / Contact, with Studio on a separate
subdomain and the business door split between `/partnerships` and `/organizations`.

The new design slims the offer to three doors and one nav — **Learn · Build · Partner** —
with a single cream/green palette (Space Grotesk + Public Sans), and six screens:
Home, Learn catalog, Course detail, Build, Partner, Sign in/up. The README is explicit:
restructure the existing codebase, reuse its components restyled to the new tokens,
don't add parallel one-offs, and retire pages that no longer fit.

Outcome: a visitor lands on any page and sees exactly three ways to work with HonuVibe,
one free entry (Community), one paid tier ($99 Vault), published Studio prices, and a
partner enquiry path. Every existing backend (Vault items, courses, Stripe, leads,
partnership inquiries, proof artifacts, Beehiiv) keeps working underneath.

---

## Locked decisions (Ryan, 2026-10-04 — do not re-litigate)

| # | Decision |
|---|---|
| 1 | Public Partner page takes `/partner`. The authenticated partner portal **moves to `/portal`** (`/portal/courses`, `/portal/vault`, `/portal/settings`, `/portal/[slug]/community`) with redirects from the old portal paths. |
| 2 | **Honu Community is free.** Any signed-in user has Community access. Vault $99/mo is the only paid tier. The $29 Community Stripe price is retired; existing $29 subscribers are set to cancel at period end and emailed (out-of-band). |
| 3 | **Studio comes in-site at `/build`** with published tiers: Landing Page from $100 · Build from $1,500 (popular) · System from $2,500 · hosting & maintenance from $25/mo (required) · à la carte add-ons. `lib/pricing.ts` is re-keyed to `landing_page / build / system`; legacy rows map `starter→build`, `pro→system`, `ai_native→system` for display only. studio.honuvibe.ai stays up and reads the same `lib/pricing.ts`. |
| 4 | **Single light palette on marketing pages; no theme toggle in the marketing nav.** Member, instructor, admin and portal areas are untouched (`:root`, `.learn-zone` stay). |
| 5 | **Courses are included in the Vault.** Course pages drop the per-course price/enroll; CTA = Join the Vault. Access comes from a new `courses.vault_included` flag + predicate change, not auto-enrollment. Per-course Stripe checkout stays in code for cohorts / non-included courses. |
| 6 | **Tracks** = new `track` text column with CHECK on `content_items` and `courses`: `ai_essentials, marketing_growth, build_with_ai, research_insights, workflow_automation`. Admin-editable in the Vault editor and course editor. |
| 7 | **Retire with redirects:** `/explore → /`; `/partnerships`, `/partnerships/apply`, `/partnerships/preview/co-made`, `/organizations → /partner`; `/free-lesson`, `/sandbox` (landing only) `→ /learn`. `/blog` and `/glossary` stay live, footer-linked, restyled later. `/about` and `/contact` stay (restyled, no design file). |
| 8 | Tool names (Claude, ChatGPT, Cursor, n8n…) are allowed in the marquees. Prose copy stays vendor-neutral. Written exception to the execution-template copy rule. |
| 9 | Sign in/up at `/signin` and `/signup` with the split layout; `/learn/auth → /signin` (query preserved). `/learn/auth/reset` untouched. |
| 10 | Skip the optional `02b Learn – Sales landing`. Newsletter: one subscribe with a `source` tag (the two-letter checkboxes collapse — single Beehiiv publication). |
| 11 | Testimonials: real quotes from `proof_artifacts` tagged per surface; i18n placeholder quotes until three real ones exist per page. Placeholder notes from the design are never shipped. |

---

## Reusable pieces (verified 2026-10-04)

Front end
- `components/marketing/shell.tsx` — `data-shell="marketing"`; all `--m-*` tokens live in `styles/globals.css` lines ~401–487 and are exposed to Tailwind in `@theme inline` (~864–895). Re-pointing a variable inside the scope reskins every consumer.
- `components/marketing/nav/{marketing-nav,marketing-nav-client,marketing-user-menu,marketing-mobile-menu,marketing-lang-toggle}.tsx`; `components/marketing/event-strip.tsx` (admin-toggled announcement strip — keep working).
- `components/marketing/primitives/*` (button, card, container, section, overline, section-heading, display-heading, numbered-step).
- `components/marketing/footer/marketing-footer.tsx`, `newsletter/marketing-newsletter.tsx` (posts `{email, source}` to `app/api/newsletter/subscribe`).
- `components/auth/AuthForm.tsx` — password, Google OAuth, magic link (`/api/auth/send-login-link`), forgot password, hash handling. Only presentation changes.
- `components/learn/*` — CourseDetailHero, LearningOutcomes, ToolsBadges, CurriculumAccordion, InstructorCard (restyle); `app/api/courses/[courseId]/syllabus` already serves `syllabus_url_en/jp`.
- `lib/marketing-routes.ts` (`isMarketingPath`), `components/layout/conditional-nav.tsx` (`isAuthShellRoute`), `components/ocean/honu-companion.tsx:48` hidden-route regex, `components/layout/conditional-footer.tsx` — every new route registers in all of these.
- `app/fonts.ts` (next/font) + `app/[locale]/layout.tsx`.
- `lib/vault/queries.ts` — `getVaultTrending` (:141), `getCachedVaultTotalCount` (cookie-less anon client + `unstable_cache` pattern to copy for the public catalog).
- `lib/proof/queries.ts` — `getPublishedTestimonials` (:41) over `proof_artifacts_public`.
- `next.config.ts` `redirects()` — every entry has a `/ja` twin; existing `/build → /explore` 307 must be removed.

Backend
- `lib/access/checks.ts` + `lib/access/parity-matrix.ts` mirror SQL `has_community_access()` / `has_vault_access()` (064 §1e, 041). Every community-table policy (042) calls `has_community_access(auth.uid())` → one-function change.
- `lib/stripe/tiers.ts` (`community` + `vault`), `lib/stripe/subscribe-helpers.ts:parseTier`, `app/api/stripe/subscribe/route.ts` (GET redirects signed-out users to `/learn/auth?redirect=` at :112 — becomes `/signin`).
- `lib/pricing.ts` — single source of truth for Studio prices; consumers: `components/marketing/studio/service-tiers.tsx`, `components/discover/LivePriceTotal.tsx`, `app/api/discover/complete`, `lib/studio/engagement/proposal-pricing.ts`.
- `app/api/studio-leads/submit/route.ts` → `leads` (requires `company` + `project_type ∈ starter|pro|ai_native|not_sure` today).
- `app/api/partnerships/submit/route.ts` → `partnership_inquiries` (034; requires `org_type`, `community_description`, `program_description`).
- `supabase/migrations/071_course_material_access.sql` — `can_read_course_materials()` gates all course material policies and `course_*_catalog` views.
- `content_items` RLS `content_public_read USING (is_published)` — anon already reads premium metadata (title, blurb, duration, level, tier); bodies stay gated (041). No RLS change for the public catalog.
- Highest migration: **077**. New ones: 078–083.

---

## Architecture of the change

**Token strategy — a NEW scope `[data-shell="hv"]`; no aliasing of `--m-*`.**
(Revised 2026-10-05 after adversarial review. The original "alias `--m-*` onto the green
values" idea was dropped for two verified reasons: `data-shell="marketing"` is also set on
proposals, the engagement questionnaire, surveys, join pages, event pages and the app/studio
subdomains, so aliasing would have reskinned confidential client documents; and
`--font-serif` lives in `@theme inline`, so re-pointing it inside a scope does nothing.)

Unit 0A adds a parallel scope `[data-shell="hv"]` in `styles/globals.css` carrying the full
green set (`--hv-green-950…200`, `--hv-amber`, `--hv-terracotta[-dark]`, `--hv-bronze`,
`--hv-sand-50…400`, `--hv-ink`, `--hv-ink-700/500`, `--hv-taupe`, cover tints, shadows
`cta/card/panel/tab`, `--hv-container: 1320px`, `--hv-ease`, type clamps,
`--hv-font-display/body`) and exposes it in `@theme inline` (`bg-hv-green-900`,
`font-hv-display`, `shadow-hv-card`, `text-hv-h1`, `animate-hv-pulse`…).
`MarketingShell` gains `theme="hv"`. New primitives and shared components live in
`components/marketing/hv/` and only ever use `--hv-*` tokens; the legacy
`components/marketing/primitives/*` and `--m-*` stay untouched for pages not yet rebuilt and
for the non-marketing surfaces above.

Cutover look: in 0B the new nav, footer and newsletter band carry their own
`data-shell="hv"` wrapper, so every marketing page gets the green chrome while its body keeps
the old teal layout until its unit lands. That is the accepted mixed state. Cleanup (Unit 6)
deletes `components/marketing/primitives/*` and the marketing-only `--m-*` consumers once no
marketing page uses `data-shell="marketing"`; the `--m-*` block itself stays for the
non-marketing surfaces.

**Fonts.** Add `spaceGrotesk` (500/600/700) and `publicSans` (400/500/600 + 400 italic),
latin subsets, as next/font variables. Keep DM Sans / DM Serif / JetBrains (app-wide
consumers). Drop `inter` from the `[locale]` layout at cleanup (marketing was its only
consumer there). Measure `.next/static/media/*.woff2` after the 0A build and record it;
budget stays < 400 KB. JA: `html[lang="ja"] [data-shell="marketing"]` falls back to Noto
Sans JP, letter-spacing 0 on headings (no `-0.04em` tracking in JA), body line-height 1.75.

**Shared components (built once in Unit 0).** Nav (dark green sticky, page-specific CTA
prop), footer, two-segment EN/日本語 lang toggle with `tone`, buttons (`primary-amber`,
`primary-dark`, `outline-dark`, `text-link`; sizes hero 54px / nav 44px), `Section`
(`sand`, `dark`), `Breadcrumb`, `Eyebrow`, `motion/rotating-word`, `motion/marquee`,
`motion/reveal` (one IntersectionObserver per tree; `data-intro` stagger + `data-reveal`),
`faq-accordion` (single-open, + → ×), `testimonial-carousel` (6.5 s, dots, proof data with
i18n fallback), `tier-cards`, `newsletter-band`, `forms/{lead-form-shell,pill-group,field}`,
`cta-band`. Keyframes `hv-rise`, `hv-marquee`, `hv-pulse`. All honour
`prefers-reduced-motion` (rotators static, marquees become scrollable rows, timers off).

**Portal move → `/portal`.** `/partner/portal` was rejected because the portal has a
dynamic `[slug]/community` child; nesting it under the public page would make
`/partner/<anything>` resolve to a guarded route. Files: `middleware.ts` PROTECTED/PARTNER
prefixes (:9–21), move `app/[locale]/partner/*` → `app/[locale]/portal/*`,
`components/partner-portal/PartnerNav.tsx` hrefs, `lib/auth/post-auth-redirect.ts:35`,
`components/auth/AuthForm.tsx:31`, `components/admin/PartnerAdminManager.tsx:98` copy,
`PartnerGuard` redirect targets, marketing-routes test, honu-companion regex. Redirects
(EN + `/ja`): `/partner/{courses,vault,settings}` and `/partner/:slug/community` → `/portal/…`.
`/partner` itself is NOT redirected (now public); partners who bookmarked it see the public
page and sign in to `/portal`.

---

## Units (execution order)

Backend units are independent of each other and of 0A; the front-end unit that consumes
each one is noted. Each migration is **applied to prod in the Supabase dashboard BEFORE the
code that depends on it is pushed** (expand first), then `pnpm test:rls` against the hosted
test project.

### B1 — Community free (migration 078)
- `078_community_free.sql`: `CREATE OR REPLACE FUNCTION has_community_access(p_user_id)` →
  `p_user_id IS NOT NULL AND EXISTS (users row)`. Same signature; all 042 policies inherit.
  Do not tighten `users_subscription_tier_check` (036) — `'community'` rows remain.
- `lib/access/checks.ts` `hasCommunityAccess` → true for any user object (keep signature);
  `parity-matrix.ts` `expectCommunity: true` everywhere; tests `__tests__/lib/access/checks.test.ts`,
  `supabase/tests/partner_entitlement_parity.test.ts`, `community_rls.test.ts` (+ fixtures:
  `honuvibe_free` now reads/posts the main feed; anon gets nothing).
- Stripe: `lib/stripe/tiers.ts` checkout-eligible tiers = `vault` only; community price id
  kept in a legacy list so renewals still resolve; `parseTier` only `vault`;
  `app/api/stripe/subscribe` rejects `tier=community` (400). Webhooks unchanged.
  `lib/partner-checkout/fulfill.ts` keeps accepting `'community'` for in-flight sessions.
- UI follow-through: `components/community/CommunityPaywall.tsx` (renders only for signed-out
  users), billing page + `components/billing/*`, i18n `subscription.price_monthly`,
  `learn.chapter_vault.community.*`; tests expecting `$29` / `?tier=community`.
- Precedes: Home + Learn pricing cards, Sign-up copy.

### B2 — Tracks + Vault inclusion flag + public catalog (migration 079)
- `079_tracks_and_vault_inclusion.sql`: `content_items.track text NULL` +
  `courses.track text NULL` with named CHECKs; `courses.vault_included boolean NOT NULL DEFAULT false`;
  partial index on `content_items(track) WHERE is_published`; `CREATE OR REPLACE VIEW course_catalog`
  appending `c.track, c.vault_included` **after** `c.partner_id` (views may only append);
  `NOTIFY pgrst, 'reload schema'`.
- `lib/tracks.ts` registry (`TRACK_IDS`, bilingual labels/blurbs, cover tone) + unit test
  asserting the CHECK string matches; `lib/vault/types.ts`, `lib/vault/actions.ts` (insert ~:120,
  update ~:320), `lib/courses/types.ts`, `lib/courses/actions.ts:updateCourse`.
- Admin: Track select in `components/admin/vault-editor/classification-section.tsx`;
  Track select + `vault_included` toggle in `components/admin/AdminCourseDetail.tsx`.
- `lib/vault/queries.ts` `getPublicCatalog()` — anon client + `unstable_cache`, explicit
  column list, `is_published = true`, ordered by track; returns the whole catalog (hundreds
  of rows) for client-side filtering.
- RLS tests: new `supabase/tests/vault_catalog_rls.test.ts` (anon reads premium metadata incl.
  `track`, cannot read premium bodies; `course_catalog` exposes the new columns).
- Out-of-band: Ryan assigns tracks per item in admin (optional tag→track backfill UPDATE once
  he supplies a mapping).
- Precedes: Learn catalog, Home track rows, Course facts.

### B3 — Vault course access (migration 081, after 079)
- `081_vault_course_access.sql`: `CREATE OR REPLACE FUNCTION can_read_course_materials(p_course)`
  adds `OR (course is_published AND vault_included AND has_vault_access(auth.uid()))`. All 071
  policies/views and 073 ESL inherit. Check `course_item_completions` RLS (062) needs the same
  clause.
- `lib/enrollments/queries.ts` `hasCourseAccess(userId, course)` = enrollment OR
  (`vault_included` AND vault access); used by `app/[locale]/learn/[slug]/page.tsx` and
  `learn/dashboard/[course-slug]/page.tsx`.
- RLS test: extend `course_material_access_rls.test.ts` with a vault subscriber on an included
  and a non-included course (this suite is the one that needs the local stack — see memory
  `supabase-duplicate-migrations`).
- Out-of-band: Ryan flips `vault_included` per course (self-study yes, cohorts no — admin toggle,
  no default flip).
- Precedes: Course detail CTA.

### B4 — Studio pricing re-key + Build brief (migration 080)
- `lib/pricing.ts`: `StudioTier = 'landing_page' | 'build' | 'system'`; `PRICING` =
  `{landing_page: {build:100, monthly:25, ceiling:1}, build: {build:1500, monthly:25, ceiling:8}, system: {build:2500, monthly:25, ceiling:null}}`;
  `HOSTING_MONTHLY = 25`; `ADDONS` + `form_building`, `lead_capture`, keep `multilingual`,
  `ai_chat`; `LEGACY_TIER_MAP = {starter:'build', pro:'system', ai_native:'system'}` +
  `normalizeTier()`. Remove `isCustom`'s dependence on `'ai_native'` (keep a custom path keyed
  on `pricing_mode`).
- Downstream: `lib/studio/labels.ts`, `lib/discover/{labels,derive}.ts`,
  `app/api/discover/start` zod (accept old ∪ new), `components/discover/*`,
  `components/marketing/studio/{service-tiers,start-project-form}.tsx`,
  `lib/studio/engagement/{types,proposal-schema,proposal-document,proposal-pricing,proposal-actions}.ts`,
  `components/admin/ProposalPricingForm.tsx`, `app/studio-site/{pricing,services}` copy.
  Draft proposals re-price on next save; sent/accepted ones are frozen snapshots.
- `080_studio_tier_rekey_and_brief.sql`: widen the four tier CHECKs by name
  (`leads.tier_interest`, `studio_leads.project_type`, `engagements.tier`,
  `engagement_proposals.tier` — verify names first) to old ∪ new; `leads.project_kind text NULL`
  CHECK `('website','web_app','mvp','documents','other')`; `ALTER leads.business_name DROP NOT NULL`.
- `app/api/studio-leads/submit`: `company` optional, `project_kind` field, `source: 'build_brief'`;
  `components/admin/StudioLeadRow.tsx` + email types show the kind.
- Tests: `lib/pricing.test.ts`, proposal-* tests, `engagement*_rls.test.ts` (add new-id cases),
  `__tests__/api/studio-lead-*.test.ts`.
- Precedes: Build page.

### B5 — Partner enquiry + proof surfaces + newsletter source (migrations 082, 083)
- `082_proof_surfaces.sql`: `proof_artifacts.surfaces text[] NOT NULL DEFAULT '{}'` CHECK ⊂
  `{home,learn,course,build,partner,signin}`, GIN index, `proof_artifacts_public` view appends
  `surfaces`. `lib/proof/{types,queries}.ts` `getPublishedTestimonialsForSurface(surface, 3)`
  with course-id fallback then i18n fallback; multi-check in the admin proof editor. Test:
  extend `proof_rls.test.ts`.
- `083_partner_inquiry_v2.sql`: `partnership_inquiries.interests text[] NOT NULL DEFAULT '{}'`
  CHECK ⊂ `{group_licenses,custom_curriculum,co_branding,revenue_share,member_teachers}`;
  `group_size integer NULL CHECK >= 0`; `org_type` and `community_description` DROP NOT NULL.
  Route zod updated; `components/admin/PartnershipInquiryCard.tsx` shows interest chips + size;
  `lib/partnerships/labels.ts` bilingual interest labels. Test: `__tests__/api/partnerships-submit.test.ts`.
- `app/api/newsletter/subscribe`: `source` validated against an allowlist and forwarded as
  `utm_source: 'honuvibe', utm_medium: source`. (Later segmentation = Beehiiv custom field
  `letters` or a second publication; not now.)
- Precedes: Partner page, every testimonial carousel, newsletter band.

### 0A — Tokens, fonts, hv primitives, shared components (no route changes, no visible change)
- `styles/globals.css` (`[data-shell="hv"]` token block, `@theme inline` exposure, keyframes
  `hv-rise/hv-marquee/hv-pulse`, JA rules, reduced-motion), `app/fonts.ts` (+ Space Grotesk,
  Public Sans as variable fonts), `app/[locale]/layout.tsx` (+2 font variables),
  `components/marketing/shell.tsx` (`theme` prop).
- New `components/marketing/hv/`: container, section, eyebrow, heading, button, breadcrumb,
  card, pill, `motion/{rotating-word,marquee,reveal,use-reduced-motion}`, faq-accordion,
  testimonial-carousel, tier-cards, newsletter-band, `forms/{field,pill-group,lead-form-shell}`,
  cta-band, index. Legacy `primitives/*` untouched.
- i18n: `newsletter.hv_*` keys + small `hv` namespace (EN + JA).
- Tests: extend `shell.test.tsx`; add `__tests__/marketing/hv/*.test.tsx` (reduced-motion,
  single-open accordion, carousel dots/timer, marquee duplication, tier popular state,
  newsletter POST + success, reveal observer wiring).
- Ship check: no page changes yet (nothing renders `theme="hv"`); `pnpm verify` green; record
  the font payload from the build.
- **Recorded 2026-10-05:** preloaded woff2 per the next-font manifest after 0A = **394.5 KB**
  across 14 files (Space Grotesk latin 21.8 KB; Public Sans latin upright 26.0 KB + italic
  27.7 KB). Under the 400 KB budget by ~5 KB; Unit 6 drops Inter (~85 KB) from the locale
  layout. Review fixes folded in before commit: Noto fallback in the hv font stacks (an
  unresolved `var()` would have invalidated `font-family` on every EN page), marquee
  animation longhands so hover-pause works, reveal scans `document` (nav/footer carry their
  own hv wrapper in 0B), carousel pauses on hover/focus and stops after a manual pick
  (WCAG 2.2.2) with 44px dot targets.

### 0B — Chrome, routing, portal move, sign in/up (ships as one commit)
- Nav links Learn · Partner (Build is added in Unit 3 when `/build` exists); CTA prop with
  per-page label (`get_started_free → /signup` default; `join_vault`, `start_project`, `talk_to_us`);
  dark sticky bar; keep the event strip + `--m-strip-h`. User menu logged-out →
  `/signin?redirect=…`. Lang toggle two-segment pill. Footer: Learn · Build · Partner · About us ·
  Contact + secondary Blog · Glossary · Privacy · Terms · Cookies, `SOCIAL_LINKS`.
- Portal move (see Architecture). Interim `/partner`: move `app/[locale]/partnerships/page.tsx`
  content to `app/[locale]/partner/page.tsx` under the new chrome so the nav resolves; Unit 4
  rebuilds it.
- `/signin`, `/signup`: `components/auth/AuthSplitLayout.tsx` (left dark panel + testimonial
  carousel, right form, light lang toggle). `AuthForm` gains `initialMode` + `onModeChange`
  (tabs `router.replace` between `/signin` ↔ `/signup`, preserving `?redirect`); hash handling
  unchanged; `.hv-auth` scoped remap of the `:root` tokens AuthForm uses. Redirect
  `/learn/auth → /signin` (+ `/ja`) keeping the query. Update `middleware.ts:253`,
  `app/api/stripe/subscribe:112`, the four guards, `post-auth-redirect.ts`, and the email-link
  builders in `/api/auth/{callback,send-login-link,forgot-password}` so magic-link / recovery
  URLs target `/signin`. Test both hash flows in the browser.
- Registration: `lib/marketing-routes.ts` += `/partner`, `/signin`, `/signup`, −`/partnerships`;
  `conditional-nav.tsx` `isAuthShellRoute` += `signin|signup`; `honu-companion.tsx:48` +=
  `signin|signup|portal`; `app/sitemap.ts` += `/partner`, −`/partnerships` (auth pages excluded).
- Tests: `marketing-routes.test.ts`, `conditional-nav.test.ts`, `conditional-main.test.tsx`,
  `marketing-user-menu.test.tsx`, `language-switcher.test.tsx`, `sitemap.test.ts`,
  `post-auth-redirect.test.ts`, `lib/partner-portal/queries.test.ts`; new `__tests__/auth/signin-pages.test.tsx`.
- i18n: `nav` (+build, partner, CTA labels), `auth` (split-panel copy per mode), `footer`.

### 1 — Home (needs B1 copy, B2 for track rows)
- `app/[locale]/page.tsx` + `components/marketing/home/*` rewritten: hero with "This week in
  the Vault" rotator (`getVaultTrending`), three-tab panel (380 ms crossfade, `defaultTab`),
  How Learn works (marquee + three steps with growing lines), More ways (two image cards),
  pricing via `TierCards` (Community Free / Vault $99 dark), `NewsletterBand`, `CtaBand`.
  Keep `RecoveryHashRedirect`.
- Retire `/explore`: delete `app/[locale]/explore/`, `components/marketing/explore/`;
  redirect `/explore` (+ `/ja`) → `/`; update the `/exploration → /explore` chain to `/`.
- Tests: rewrite `home/home-sections.test.tsx`, `home-faq.test.tsx`; delete
  `copy-prompt-button`, `proof-band`, `proof-stories`, `explore-sections` tests.
  i18n: rewrite `home`; delete `explore`, `exploration_page`, and `hero`/`mission`/
  `featured_courses`/`social_proof` only if grep shows no remaining consumer.

### 2 — Learn catalog + Course detail (needs B2, B3)
- `lib/learn/catalog.ts` `getLearnCatalog()` (server, `unstable_cache` 10 min) over
  `getPublicCatalog()` + published courses. **Client-side filtering** (`track`, `query`,
  `freeOnly`) over the server list, URL-synced `?track=&q=&free=1` via `history.replaceState`;
  move to a server query only past ~500 items. Hot chips + study-path goal links = i18n arrays.
  Free feature card = first `access_tier='free'` item.
- `app/[locale]/learn/page.tsx` + `components/marketing/learn/*` rewritten (hero + search,
  hot topics 4-up, catalog grid + sidebar, empty state, two-letter newsletter collapsed to one,
  FAQ + carousel, pricing strip).
- `app/[locale]/learn/[slug]/page.tsx`: drop `StickyEnrollSidebar/Bar`, `EnrollButton`,
  `checkEnrollment`; use `hasCourseAccess`; restyle hero (badges, JA subtitle = `title_jp`,
  facts `<dl>`), outcomes grid, curriculum accordion (multi-open + Expand all,
  `curriculumOpen` prop), instructors, syllabus band (existing syllabus API), FAQ + carousel,
  closing band. CTA "Join the Vault" → `/api/stripe/subscribe?tier=vault` (signed-out users
  bounce through `/signin`). Add a course-detail matcher to `lib/marketing-routes.ts`
  (`/learn/<slug>` excluding dashboard|vault|auth|paths|plans|library) — verify in the browser
  first whether the old dark Nav double-mounts there today.
- Retire `/free-lesson` and the `/sandbox` landing → `/learn` (demo apps under
  `app/sandbox/*` keep their layouts and the middleware exclusion); delete folders, components,
  keys; drop from MARKETING_PATHS, sitemap, `sandbox-sitemap.test.ts`.
- Tests: rewrite `learn/learn-sections.test.tsx`; new `learn/catalog-filter.test.tsx`,
  `learn/course-detail.test.tsx`. i18n: rewrite marketing parts of `learn` — grep
  `useTranslations('learn')` outside `components/marketing` first; the namespace is shared
  with the member dashboard.

### 3 — Build (needs B4)
- `app/[locale]/build/page.tsx` + `components/marketing/build/*`: hero with idea input
  (copies text into the brief + scrolls), rotating "Recent build" card, "We build" chips,
  four service cards (click → brief with type preselected), recent work grid (real shots
  from `public/`), how-it-runs auto-steps (2.6 s, pause on hover, in-view only), `TierCards`
  from `lib/pricing.ts` + à-la-carte row + hosting line, FAQ + carousel, brief form →
  `/api/studio-leads/submit` (`project_kind`, message, name, email; success panel shows the
  type), closing band → `/learn?track=build_with_ai`. `showPrices` prop (default true).
- Remove the `/build → /explore` redirects; MARKETING_PATHS += `/build`; sitemap; nav Build
  link + "Start a project" CTA. i18n: new `build` namespace; delete legacy `build_page`.
- Tests: new `build/build-sections.test.tsx`, `build/brief-form.test.tsx`.

### 4 — Partner (needs B5)
- Rebuild `app/[locale]/partner/page.tsx` + `components/marketing/partner/*`: hero +
  group-license estimator (slider 10–500 step 5 default 40; bands $79/$69/$59 vs $99;
  "Request this quote" scrolls + preselects Group licenses), who-we-partner-with marquee,
  four offer cards + "Also available" grid, member-teachers path (auto-advance, amber glow)
  + revenue bar (50/20/30, animates in view), partnership levels `TierCards` (Community
  program popular), how it runs, FAQ + carousel, enquiry form → `/api/partnerships/submit`
  (interests[], name, email, organization, group size, success textarea; fallback mailto
  partnerships@honuvibe.ai).
- Retire `/partnerships`, `/partnerships/apply`, `/partnerships/preview/co-made`,
  `/organizations` → `/partner` (+ `/ja`); re-point `/become-an-instructor → /partner`.
  Delete `components/marketing/partnerships/*` (incl. `comade/`), `organizations/*`.
  i18n: new `partner` namespace; delete `partnerships`, `organizations`
  (`rendered-translation-keys.test.tsx` imports `ComadeCurrentlyMaking` — update).
- Tests: delete `partnerships-sections.test.tsx`; new `partner/partner-sections.test.tsx`,
  `partner/estimator.test.ts`.

### 5 — About + Contact restyle
- Existing structure on hv tokens; remove `.about-ocean`; `ways.tsx` links → `/build`,
  `/partner`; contact form restyled through `forms/*`. Tests: update `about-sections`,
  `contact-sections`.

### 6 — Cleanup
- Delete `final-cta.tsx`, `proof-band.tsx`, `browser-frame.tsx`, legacy button/section
  aliases, `.explore-ocean` / `.about-ocean` / `learn-chapter-glow` CSS, unreferenced
  `--m-*` (keep the minimal alias block for blog/glossary/partners/events with a comment),
  drop `inter` from the `[locale]` layout, rewrite the ~50 remaining `/learn/auth` string
  references to `/signin`, prune dead i18n namespaces, promote the new 307s to 308 after a
  soak. Full `pnpm verify` (`NODE_OPTIONS=--max-old-space-size=8192`).

---

## Review amendments (adversarial plan review, 2026-10-05)

Folded into the units above where they apply; listed here so nothing is lost.

- **0B must also:** remove the `/build → /explore` redirect and ship a holding `/build` page
  (the design's Build hero + a link to the Studio brief) so the footer's Build link resolves;
  add `/partnerships`, `/partnerships/apply`, `/organizations → /partner` redirects in 0B
  (not Unit 4) so no page shows double chrome; rewrite the legacy dark
  `components/layout/nav.tsx` and `footer.tsx` link lists (they still render on
  `/honuhub`, legal pages, `/learn/[slug]`, `/learn/library`) to Learn/Build/Partner/About/
  Contact; add `/portal`, `/ja/portal` (and `/build`, `/partner`) to the
  `lib/auth/safe-redirect.ts` allowlist; fix `honu-companion.tsx` regex to also cover
  `learn/(paths|plans)` and `/portal`; decide that `/portal` keeps the global dark Nav as
  `/partner/*` does today; update the extra `/learn/auth` tests (`stripe-subscribe-get`,
  `AccessGate`, `post-auth-redirect`) and the extra callers (`AccessGate.tsx`,
  `user-menu.tsx`, `EnrollButton.tsx`, `learn-vault-preview-cards.tsx`, `join-shell.tsx`,
  `app/api/auth/{resend-confirmation,signup,magic-link}` pass-throughs; leave
  `callback:76`'s `/learn/auth/reset`). Hash fragments survive the 307.
- **Unit 1:** Home links to `/build` and `/partner` are fine once 0B ships the holding page.
  Add one proof line under the hero (the old ProofBand's role) from proof artifacts.
- **Unit 2:** keep a conditional enroll CTA for courses with `vault_included = false`
  (cohorts, paid-only, the 072 free-enrollment path); gate "Join the Vault" on the flag;
  Ryan flips the flag per course BEFORE Unit 2 ships. Add the design's sticky sub-nav
  (`showSubnav`) and the "Included in the Vault" price card. Pre-delete grep: `/free-lesson`
  deletion must also take `app/api/free-lesson/subscribe` and `lib/free-lesson/*`
  (its content links `/organizations`).
- **B3:** `course_item_completions` (051) is own-row and needs no clause. The real gap is
  app-level enrollment checks: 33 files query `enrollments` directly (`lib/progress/actions.ts`,
  `lib/esl/access.ts`, `lib/courses/queries.ts`, `lib/dashboard/queries.ts`,
  `lib/tutoring/queries.ts`…). Inventory every `from('enrollments')` access check and route
  the course-content ones through `hasCourseAccess`.
- **B2:** `getPublicCatalog()` filters `partner_id IS NULL` (partner-owned items are
  unlisted); add that case to the RLS test. `CREATE OR REPLACE VIEW` keeps grants, but verify
  anon/authenticated grants after applying.
- **B4:** CHECK constraints are auto-named; look them up from `pg_constraint` by table +
  definition (the 075 pattern), never by guessed name.
- **Migration order:** apply 078 (B1), 079 (B2), 080 (B4), 081 (B3, after 079), 082, 083
  (B5) — numeric order is the apply order.
- **B1 moderation:** opening Community to every account widens the spam surface; before
  enabling, confirm email-confirm gating on posting, the ban path (`BannedBanner`) and the
  in-memory rate limit in `lib/community/rate-limit`.
- **Unit 4 pre-delete grep:** `VerticeLanding.tsx:2937` links `/explore`;
  `lib/free-lesson/content.ts` links `/organizations`.
- **Design flags to keep:** `animateHero`, `scrollReveal` (0A Reveal props), `autoSteps`
  (Unit 3), `autoPath` (Unit 4), `showSubnav` + `curriculumOpen` (Unit 2), `defaultMode` +
  `showMagicLink` + password Show/Hide (0B), `showPrices` (1, 3, 4). Syllabus band renders
  one row per language that has a PDF.
- **Global commit order:** 0A → B1 → B2 → 0B → 1 → B3 → 2 → B4 → 3 → B5 → 4 → 5 → 6
  (backend units applied to prod before the front-end unit that needs them).

## Verification (every unit)

- `pnpm verify` green (type-check → tests → build); `pnpm test:rls` for B1–B5 against the
  hosted test project (course_material_access needs the local stack: temp-rename 022/025).
- Browser smoke EN + `/ja` at 1440 and 375 px: console clean, reduced-motion mode checked
  for rotators/marquees/carousels, 44 px targets, JA line-height/letter-spacing, no text
  below 12 px. Lighthouse mobile ≥ 90 on Home and Learn after Units 1–2.
- Adversarial review before each commit (`requesting-code-review`), triage with
  `receiving-code-review`. Commit to `main`, push.
- Per unit, Ryan: copy sign-off on EN headlines/pricing before commit; all JA copy is
  machine-drafted and flagged for native review.

## Out of scope / risks

- `02b` sales landing, dark variant of the green palette, Blog/Glossary restyle, self-serve
  seat purchase (estimator is a quote request only), a second Beehiiv publication, partner
  revenue-share accounting, syllabus PDFs for courses that have none (band hides when no URL).
- **Mixed look during cutover** is accepted: after 0A every page is green-on-sand but old
  pages keep their old layouts until their unit lands. Order 0A → 0B → 1 → 2 → 3 → 4 → 5 → 6
  keeps the nav consistent at every commit.
- Draft proposals re-price when next saved after the tier re-key; sent/accepted proposals
  are frozen snapshots.
- `learn` i18n namespace is shared with the dashboard — prune by grep, not by eye.
- The homepage-not-static mystery (from the 2026-07 simplification) is still open and may
  affect Lighthouse; investigate in Unit 1 if the hero data fetch isn't cached.
- Real images: every `<image-slot>` needs a real asset (Studio shots, cohort photo, lesson
  stills, course hero, instructor portraits). Units ship with the site's existing imagery or
  a neutral tinted block, never the "Drop an image" placeholder.

## Out-of-band steps (Ryan)

1. Commit `docs/design_2026_green/` with this plan.
2. Stripe: count active $29 Community subscriptions; set each to cancel at period end;
   archive the Community price; keep `STRIPE_COMMUNITY_PRICE_USD` in Vercel until the last
   one ends (webhook resolution). Send the notice email.
3. Apply 078–083 in the dashboard SQL editor on `zvfwtndbxshrtpwcwynw` before the matching
   unit is pushed; verify by querying prod, never by trusting a note.
4. After B2/B3 deploy: assign tracks in the Vault editor and course editor; flip
   `vault_included` on the self-study courses; optionally send a tag→track map for a
   one-off backfill.
5. After B5: tag three real proof artifacts per surface in `/admin/proof`.
6. Supply real images for the image slots and the AI Essentials syllabus PDF per language.
7. Native JA review of every new namespace (`nav`, `auth`, `home`, `learn`, `build`,
   `partner`, `footer`).
