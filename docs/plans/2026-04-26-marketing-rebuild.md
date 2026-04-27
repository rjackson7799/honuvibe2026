# Public Marketing Site Visual Rebuild

> Living document. Use the **Progress** table below as the source of truth for what's done, in flight, and next. Update the **Verification log** after every `pnpm verify` run. A phase is only "done" when its row is green AND `pnpm verify` was green on the same commit.

## Progress

| Phase | Scope | Status | Last verified |
|---|---|---|---|
| 0 | Foundation: tokens, font, shell, primitives, marketing nav/footer/newsletter, route detection, `DESIGN.md` | ✅ done | 2026-04-26 — typecheck ✓, build ✓, vitest ✓ |
| 1 | Home page | ⏳ pending | — |
| 2 | Learn page | ⏳ pending | — |
| 3 | Explore + About + Contact | ⏳ pending | — |
| 4 | Partnerships (new route + Supabase + email + admin list) | ⏳ pending | — |
| 5 | Nav + Footer cutover (UserMenu integration polish, mobile menu polish) | ⏳ pending | — |
| 6 | Cleanup: redirects, retire dead routes, prune `components/sections/*`, restore `<main>` padding | ⏳ pending | — |

Status legend: ⏳ pending · 🚧 in progress · ✅ done · ⚠ blocked · 🔁 needs rework

## Recursive testing (built into the process)

After every meaningful change, run **`pnpm verify`** before committing. This is the quality gate.

```
pnpm verify       # typecheck + vitest run + next build  (~3 min full check)
pnpm verify:fast  # typecheck + vitest run               (~30s tight loop)
```

What each step catches:

| Gate | Catches |
|---|---|
| `tsc --noEmit` | Type errors, missing imports, prop mismatches across components |
| `vitest run` | Primitive behavior regressions, `MarketingShell` token-scope sanity, marketing-route detection regressions, missing i18n keys when stubbed in tests |
| `next build` | RSC boundary violations, server/client misuse, missing next-intl translation keys, font-loader misconfig, route collisions, Edge runtime issues |

**Test growth rule:** every phase MUST add at least one smoke test for the new page or feature. The suite grows monotonically — old tests stay green. If a future change makes a test fail, fix the code, not the test (unless behavior is intentionally changing — record the change in the verification log).

### Verification log

| Date | Phase | Result | Commit | Notes |
|---|---|---|---|---|
| 2026-04-26 | 0 | `pnpm verify` ✅ — typecheck ✓ · 267 vitest tests ✓ (26 files, 21s) · next build ✓ (102s, 383 static pages) | (pending) | Foundation landed. New tests under `__tests__/marketing/` (99 tests across primitives, shell, `isMarketingPath*`). Pre-existing build warnings unchanged. Vitest pinned to ^3.2.4 to dodge a vitest 4 + pnpm picomatch resolution bug; vitest config now excludes `.worktrees/**` (a stale survey-module worktree was pulling its own node_modules into discovery). |

(append a row after every phase or significant change)

---

## Context

We are visually rebuilding the public-facing marketing pages of HonuVibe.AI on top of a new design language delivered as five React/Babel prototypes in `docs/designs/` (`Homepage.html`, `Learn.html`, `Explore.html`, `Partnerships.html`, `About.html`, `Contact.html`). The new design is **light-mode only**, sales-driven, uses Inter typography, and a tighter teal+coral+sand palette. It supersedes the dark-mode-default, DM-Serif-Display-headlined design currently described in `CLAUDE.md`.

The existing app surface — auth, course player, Vault dashboard, instructor portal, partner portal, admin panel — keeps its current dark-themed design. Stack stays unchanged: Next.js 14 App Router, Tailwind v4 (inline `@theme` in `styles/globals.css`), CSS variables, next-intl, Supabase, Sanity, Stripe, next/font/google.

A new `docs/DESIGN.md` becomes the canonical design-system reference; the design-system sections of `CLAUDE.md` will be pruned and pointed at it.

## Decisions locked in

| Area | Decision |
|---|---|
| Theme | Light-only on marketing pages. Dark theme system stays untouched for app routes. |
| Tokens | New tokens prefixed `--m-*`, scoped under `[data-shell="marketing"]`. Existing tokens stay. |
| Font | Add Inter via `next/font/google`. Existing DM Sans/Serif/JetBrains Mono/Noto Sans JP stay. |
| Shell | `<MarketingShell>` wrapper component (NOT a `(marketing)` route group). Cleaner integration with existing locale layout. |
| Honuhub | `/honuhub` keeps current design, removed from primary nav. Out of scope for visual rebuild. |
| Auth-aware nav | When logged in, `UserMenu` avatar dropdown appears next to JP/EN toggle. |
| Partnerships form | Posts to new Supabase table `partnership_inquiries`, RLS admin-read; triggers Resend email to ryan@honuvibe.ai via existing `lib/email/` pipeline. |
| Footer scope | No new footer-only pages built. Footer reconciles to currently-existing routes only. |
| "Get Started" CTA | Homepage-only per design. |
| Old marketing routes | `/build → /explore`, `/community → /about#aloha`, `/resources → /learn`, `/newsletter → /#newsletter`, `/become-an-instructor → /partnerships`. Add to `next.config.ts` redirects, then delete route directories. |
| Git workflow | Direct-to-main per `feedback_git_workflow.md`. Phase 1 page swap split into two commits (components → swap) for one-file revert safety. |

## New design system at a glance

```
Tokens (T from prototypes):
teal #0FA9A0  tealDark #0B7F78
coral #E8765A  coralDark #CC5A3E  coralSoft #FCEDE6
navy #1A2B33  slate #5A6B73  caption #8B9499
canvas #FDFBF7  sand #F5F0E8  white #FFFFFF

Font:    Inter (400/500/600/700) + Noto Sans JP (400/500/700)
Heading: weight 700, letter-spacing -0.02 to -0.035em
Container: max-width 1200, gutter 32
Section: 96px py (88px hero), alternates canvas ↔ sand
Cards:   radius 16, hover translateY(-3 to -4px) + tinted border
```

## Phase 0 — Foundation (Day 1)

**Files to create:**
- `components/marketing/shell.tsx` — wraps page in `<div data-shell="marketing">`, applies Inter, ensures light styling locally.
- `components/marketing/primitives/{container,section,overline,display-heading,section-heading,button,card,badge,browser-frame,photo-placeholder,numbered-step}.tsx`
- `components/marketing/nav/{marketing-nav.tsx,marketing-nav-client.tsx,marketing-mobile-menu.tsx}`
- `components/marketing/footer/marketing-footer.tsx`
- `components/marketing/newsletter/marketing-newsletter.tsx` — wraps existing `POST /api/newsletter/subscribe`; do not duplicate the API.
- `docs/DESIGN.md` (outline below)

**Files to modify:**
- `app/fonts.ts` — append Inter export with `--font-inter`.
- `styles/globals.css` — append `[data-shell="marketing"] { ... }` block defining `--m-*` token set. Do not touch existing `[data-theme="light"]` or `:root`.
- `app/[locale]/layout.tsx` — add `inter.variable` to `<html className>`.
- `components/layout/nav-client.tsx` — add `isMarketingRoute` check that returns `null` so the page tree mounts `<MarketingNav />` itself via the shell.
- `components/layout/conditional-footer.tsx` — same null-return for marketing routes.

## Phase 1 — Home (Day 2–3)

Components in `components/marketing/home/`: `hero.tsx`, `how-it-works.tsx`, `value-props.tsx`, `vault-section.tsx`, `featured-courses.tsx`, `org-section.tsx`, `exploration.tsx`, `testimonials.tsx`.

Rewire `app/[locale]/page.tsx` to compose `<MarketingShell>` + ordered sections + `<MarketingNewsletter />` + `<MarketingFooter />`. Land components in commit A (unused), swap in commit B for clean revert.

Old `components/sections/*` files stay on disk through Phase 5. Audit and delete in Phase 6.

i18n: extend existing `home` namespace in `messages/{en,ja}.json`; do not create `home_v2`.

## Phase 2 — Learn (Day 4)

Components in `components/marketing/learn/`: `hero.tsx`, `three-paths.tsx`, `vault-moment.tsx`, `courses-catalog.tsx`, `private-cohorts.tsx`, `comparison-table.tsx`.

Real course data flows through existing `getPublishedCourses()` from `lib/courses/queries.ts`. Inspect `lib/courses/types.ts` — if `track`/`level`/`category` columns are missing, add migration `034_course_tracks.sql`. Otherwise filtering is client-side from existing `Course` shape. Build `lib/courses/filters.ts` for chip-state derivation.

Course card adapts existing fields (`title`, `slug`, `cover_image_url`, `price_cents`, `duration_*`); TRACK ribbon overlay derives from `track` (or `tier` fallback).

## Phase 3 — Explore, About, Contact (Day 5)

**Explore:** `app/[locale]/explore/page.tsx` + `components/marketing/explore/{hero,stats-strip,featured-projects,how-we-build,aloha-standard,two-path-cta}.tsx`. Stats hardcoded in v1; project rows alternate; dashed Placeholder is `<PhotoPlaceholder variant="dashed" />`.

**About:** `app/[locale]/about/page.tsx` + `components/marketing/about/{hero,origin-story,team,aloha-standard,mission-vision,social-section,soft-cta}.tsx`. Team photos: `public/images/team/{ryan,...}.jpg` — gradient placeholder if missing.

**Contact:** Refactor `app/[locale]/contact/page.tsx` to new shell. Existing form action POSTing to `/api/contact/submit` is reused — only the visual layer changes. New components in `components/marketing/contact/{hero,contact-form,info-strip,social-section}.tsx`.

## Phase 4 — Partnerships (Day 6–7) — NEW

**Migration:** `supabase/migrations/034_partnership_inquiries.sql` (mirror `033_revenue_split.sql` style). Table fields: `id, created_at, full_name, email, organization, role, partnership_type (enum), audience_size, budget_band, timeline, region, message, source_locale, status, notes, reviewed_by, reviewed_at`. RLS: anon INSERT, admin SELECT/UPDATE via `public.is_admin()`. Index `(status, created_at desc)`.

**Files:**
- `app/[locale]/partnerships/page.tsx`
- `components/marketing/partnerships/{hero,what-you-get,how-it-works,current-partners,who-is-it-for,pricing,application-form}.tsx`
- `app/api/partnerships/submit/route.ts` — Zod-validated POST; mirrors existing `app/api/apply/submit/route.ts` patterns; uses `createServiceClient()` from `lib/supabase/`.
- `lib/email/types.ts` — add `PartnershipInquiryEmailData`.
- `lib/email/templates.ts` — partnership template using existing `baseLayout/heading/detailsTable` helpers.
- `lib/email/send.ts` — add `sendPartnershipInquiry()`. Notify ryan@honuvibe.ai (resolve via existing `getAdminEmail()`); CC applicant.
- `messages/{en,ja}.json` — add `partnerships` namespace.
- `app/[locale]/admin/partnerships/page.tsx` + `components/admin/partnership-inquiries-table.tsx` — list view, mirror `app/[locale]/admin/applications/page.tsx`. Detail view optional in v1.

## Phase 5 — Nav + Footer cutover (Day 8)

- `components/layout/nav-client.tsx` — `isMarketingRoute` regex covers locale-aware `/`, `/learn`, `/explore`, `/about`, `/contact`, `/partnerships`. Returns null on those.
- `components/marketing/nav/marketing-nav-client.tsx` — reuse existing `components/layout/user-menu.tsx` and `lang-toggle.tsx` (passed `variant="marketing"` for restyling). Drop Honuhub link.
- `components/marketing/nav/marketing-mobile-menu.tsx` — reuse existing `components/layout/mobile-menu.tsx` restyled for marketing tokens. Design files show no mobile menu state, so we extrapolate.
- `components/marketing/footer/marketing-footer.tsx` — reconcile column links to existing routes only. Drop links to non-existent destinations (Tutorials, FAQ, Case Studies, Become a Mentor, Accessibility).

## Phase 6 — Cleanup (Day 9)

- `next.config.ts` — add the five redirects listed in Decisions. After verification, delete `app/[locale]/{build,community,resources,newsletter,become-an-instructor}/`.
- Audit `components/sections/*` — Grep each for live imports. Delete files only referenced by deleted pages or replaced home: `hero-section.tsx`, `mission-strip.tsx`, `honuhub-feature.tsx`, `featured-courses.tsx`, `exploration-preview.tsx`, `social-proof.tsx`, `partner-strip.tsx`, `newsletter-signup.tsx`, `cta-strip.tsx`, `CTAStrip.tsx`. Anything referenced by `/honuhub` (kept) stays.
- Prune `components/sections/index.ts` barrel exports.
- Hide `<HonuCompanion />` on marketing routes (visually clashes with light shell).

## docs/DESIGN.md outline

1. Principles (light marketing / dark app split, Hawaii-grounded palette, editorial restraint)
2. Tokens — full `--m-*` table with hex + usage
3. Typography — Inter sans, Noto Sans JP, display sizes 80/64/56/48/40/32/24/20, body 18/16/14, weights, leading
4. Spacing — 96 section / 88 hero / 64 sub / 32–4 utility / 1200 container
5. Color usage — when teal vs coral; never both at full strength in one section
6. Primitives — variants for Section, Container, Button, Card, Badge, Overline, BrowserFrame, PhotoPlaceholder, NumberedStep
7. Section grammar — Overline → Heading → Sub → Content composition
8. Buttons & links — hover, focus-visible, disabled
9. Forms — input style, validation, helper text
10. Icons — lucide-react 16/20/24, stroke 1.5
11. Imagery — aspect ratios, gradient placeholder spec
12. Motion — fades only, 250ms `--ease-out`; no parallax on marketing
13. Accessibility — WCAG 2.1 AA contrast pairs verified, focus ring spec
14. Anti-patterns — no glass-morphism, no glow orbs, no gradient text on marketing

## CLAUDE.md updates

Prune from `CLAUDE.md`:
- "Dark mode is default" / "ocean canvas" guidance → re-scope to **app routes only**
- "DM Serif Display, weight 400 only — never bold" → re-scope to app routes
- Gold accent guidance → re-scope to app routes; marketing forbids gold
- Replace design-system sections with: "Marketing pages: see `docs/DESIGN.md` (canonical). App pages: existing tokens in `styles/globals.css`."

## Critical files referenced

- `styles/globals.css` — all tokens live here (Tailwind v4 inline `@theme`)
- `app/fonts.ts` — font registration (next/font/google)
- `app/[locale]/layout.tsx` — provider tree, font className composition
- `components/layout/nav-client.tsx` — auth-route detection regex (extend with marketing-route detection)
- `components/layout/conditional-footer.tsx` — footer visibility regex
- `components/layout/user-menu.tsx` — reuse for marketing avatar dropdown
- `lib/courses/queries.ts::getPublishedCourses()` — Learn course data source
- `lib/email/send.ts` + `lib/email/templates.ts` + `lib/email/types.ts` — partnership notification pipeline
- `supabase/migrations/033_revenue_split.sql` — migration style reference
- `app/api/apply/submit/route.ts` — Zod-validated POST pattern reference
- `app/[locale]/admin/applications/page.tsx` — admin list view pattern reference

## Verification (per phase)

- `pnpm dev` after each phase. Visit `/`, `/ja`, `/learn`, `/ja/learn`, `/explore`, `/about`, `/contact`, `/partnerships`.
- Side-by-side: open `docs/designs/<page>.html` in Chrome at 1440px, dev server at 1440px, walk section-by-section.
- Mobile breakpoints: 375 / 414 / 768. Sticky nav, mobile menu, hero stacking, card-grid collapse, form inputs (no iOS zoom).
- JP locale: verify Noto Sans JP loads, no English fallback in headlines, JP line-breaking acceptable.
- Lighthouse on `/`: LCP < 2.5s, accessibility ≥ 95.
- Phase 4 e2e: submit a real inquiry on dev → row in Supabase → email received → admin list page shows it.
- Phase 5: log in/out cycle on `/`, confirm UserMenu dropdown appears right of LangToggle, disappears when logged out.
- Snapshot tests for primitives only (Button variants, Section variants).

## Risks / open questions before kickoff

1. **i18n volume** (~250 new keys). Suggest stubbing JP with English fallback for soft launch, full JP in follow-up.
2. **Image assets** for About Team headshots, Explore project hero images, Vault product screenshot — designer to deliver, gradient placeholders for v1.
3. **Mobile menu** not in any prototype — reuse current `mobile-menu.tsx` restyled.
4. **Token collision avoidance** — marketing components must not reference unprefixed `text-accent-teal` etc.; use `text-[var(--m-accent-teal)]` or new utilities scoped under `[data-shell="marketing"]`.
5. **Course detail page `/learn/[slug]`** stays dark for now — visitors will feel a mode flip clicking from the new light Learn page into a dark course detail. Defer rebuild to a later phase.
6. **Pricing tiers on Partnerships** — informational only in v1, CTA opens application form. No Stripe products created.
7. **Newsletter band placement** — implement as a separate above-footer section on every marketing page, not nested inside `<MarketingFooter />`, per design.
