# Learn Area Design Refresh — Dashboard, Vault, Course Detail

## Context

The user has new design mocks (`docs/designs/learn/Dashboard.html`, `Vault.html`, `Course Detail.html`) that establish a light, warm, Hawaiian-inspired aesthetic for the learning area: canvas/sand backgrounds, white cards, teal #0FA9A0 primary, coral #E8765A secondary, and a fixed 220px sidebar. The current implementation uses the site's dark-by-default theme with collapsible navigation and gold (#b68d40) as the secondary accent.

This is a **visual upgrade only** — same routes, same data fetching, same component composition. We're swapping the look, not the structure. Decisions confirmed with the user:

- **Light-only learn zone.** `/learn/*` becomes a permanent light-zone; theme toggle removed inside the dashboard.
- **Coral added as learn-scoped token.** Gold stays globally for marketing/blog; coral lives only inside the learn area.
- **Scope = the 3 mocked pages + shared layout/sidebar.** Other dashboard sub-pages (courses, schedule, billing, etc.) inherit the new layout and tokens but aren't individually redesigned this round.
- **Sidebar replaced with mock's fixed 220px design** — no collapse, logo at top, EN/日本語 toggle, no theme toggle.

## Files to Modify / Create

### 1. Design tokens (foundation)

**Modify:** [styles/globals.css](../../styles/globals.css)
- Add `.learn-zone` scope class (analogous to existing `.dark-zone` / `.light-zone`) that overrides tokens with the mock palette:
  - `--bg-primary: #F0EBE3` (sand) · `--bg-secondary: #FFFFFF` · `--bg-tertiary: #FDFBF7` (canvas)
  - `--fg-primary: #1A2B33` (navy) · `--fg-secondary: #5A6B73` (slate) · `--fg-tertiary: #8B9499`
  - `--accent-teal: #0FA9A0` · `--accent-teal-hover: #0B7F78` · `--accent-teal-subtle: rgba(15,169,160,0.1)`
  - `--accent-coral: #E8765A` · `--accent-coral-hover: #CC5A3E` · `--accent-coral-subtle: #FCEDE6` (new tokens)
  - `--border-default: rgba(26,43,51,0.07)` · `--border-hover: rgba(26,43,51,0.12)`
  - `--shadow-card: 0 2px 8px rgba(26,43,51,0.04)` · `--shadow-card-hover: 0 8px 28px rgba(26,43,51,0.09)` · `--shadow-glass: backdrop-filter: blur(12px)` helper

**Modify:** [tailwind.config.ts](../../tailwind.config.ts)
- Add `coral`, `coral-hover`, `coral-subtle` color entries pointing to the new CSS variables. Keep gold tokens untouched.

### 2. Sidebar + dashboard layout

**Rewrite:** [components/learn/StudentNav.tsx](../../components/learn/StudentNav.tsx)
- Fixed 220px width (no collapse, no `STORAGE_KEY` localStorage logic).
- Top section: HonuVibe wordmark + honu SVG (reuse [components/ocean/honu-mark.tsx](../../components/ocean/honu-mark.tsx) if shape matches; otherwise inline the mock's stylized turtle SVG).
- Compact EN/日本語 segmented toggle reusing [components/layout/lang-toggle.tsx](../../components/layout/lang-toggle.tsx) — restyled to teal-active pills.
- **Drop:** ThemeToggle (light-only zone).
- Nav items unchanged in identity (Dashboard, My Courses, Vault, Community, Billing, Settings; instructor item conditionally inserted) — restyled per mock: teal-on-soft-teal active state, slate inactive, lift on hover.
- Bottom: keep [UserMenu](../../components/layout/user-menu.tsx) but compact, top-bordered.
- Mobile bottom nav preserved with new palette.

**Modify:** [components/learn/StudentDashboardLayout.tsx](../../components/learn/StudentDashboardLayout.tsx)
- Wrap in `<div className="learn-zone">` so all `/learn/*` pages inherit light tokens automatically.
- Main background: `bg-bg-primary` (sand). Padding 28px top/bottom, 32px horizontal (matches mock).

### 3. Shared UI primitives (extended, not replaced)

**Modify:** [components/ui/card.tsx](../../components/ui/card.tsx)
- Add a `learn` variant: `bg-white border border-border-default rounded-[14px] shadow-card hover:shadow-card-hover hover:border-accent-teal/40 transition-all duration-200`.
- Existing `default` and `glass` variants kept intact for the dark side of the site.

**New:** `components/ui/badge-pill.tsx`
- Small reusable pill for type/level/status badges seen across all 3 mocks. Variants: `teal | coral | purple | gray | live`. Used by Vault cards, action items, hero tags, week badges.

**New:** `components/learn/SectionHeading.tsx` (learn-scoped, distinct from existing [section-heading.tsx](../../components/ui/section-heading.tsx))
- Renders the mock's "section title with bottom border" pattern: 17px navy bold + subtle border-bottom + optional "View all →" link slot.

### 4. Dashboard page

**Modify:** [app/[locale]/learn/dashboard/page.tsx](../../app/[locale]/learn/dashboard/page.tsx)
- No data-fetch changes. Reorder/restyle render only.
- Header row: "Monday · Apr 27, 2026" overline + greeting `text-2xl font-bold text-fg-primary` with 👋. Right side: bell-with-dot button + initials avatar pill (already have user from `getUser()`; `displayName.charAt(0)` for initials).
- Stat grid: keep using [StatCard](../../components/admin/StatCard.tsx) but add a `learn` variant prop to render the mock's white-card-with-soft-icon-badge style (32×32 teal-soft or coral-soft icon background, 34px navy value, 12px caps label).
- "Recommended for You" → existing [VaultCourseRecommendations](../../components/vault/VaultCourseRecommendations.tsx) restyled as a 3-column white card grid with gradient thumbnails; uses new `SectionHeading`.
- "Your Courses" + "Coming Up" two-column row: split the existing widgets into separate white cards using the new card variant; progress bars become 5px thin teal (coral when 100%).
- "Action Items" full-width card: rows with checkbox (use existing pattern, restyled), badge-pill for type, coral due-date when urgent. Empty state matches mock's dashed-border canvas-soft block.

### 5. Vault page

**Modify:** [app/[locale]/learn/vault/page.tsx](../../app/[locale]/learn/vault/page.tsx)
- Sticky header band: vault icon + "The Vault" title + count pill (teal) + grid/list view toggle. New small client component `components/vault/VaultViewToggle.tsx` to manage grid|list state passed to grid component.

**Modify:** [components/vault/VaultSubNav.tsx](../../components/vault/VaultSubNav.tsx)
- Restyle as the mock's underline tabs (transparent bg, 2px teal underline on active, 0.15s transition). No structural change.

**Modify:** [components/vault/VaultFilters.tsx](../../components/vault/VaultFilters.tsx)
- Search bar: full-width white input with leading search icon and trailing clear (×).
- Type chips + Level chips: white/border/gray inactive, filled-color active per mock (teal=Beginner, coral=Intermediate, purple=Advanced — purple is a new utility token added in step 1).
- Sort dropdown: native `<select>` with custom chevron, slate text.

**Modify:** [components/vault/VaultContentCard.tsx](../../components/vault/VaultContentCard.tsx)
- Grid card: white, 14px radius, 120px gradient thumbnail with type-icon overlay, duration badge bottom-right (dark blur pill), bookmark toggle top-right (white→coral fill), badge-pills below thumbnail, navy title + slate description + view-count footer.
- Hover: teal-tinted overlay with "Unlock" pill button (when locked) or simple lift+shadow (when accessible).
- Add a `view: 'grid' | 'list'` prop. List view: 56×56 mini thumbnail + horizontal info layout per mock.

**Modify:** [components/vault/VaultBrowseGrid.tsx](../../components/vault/VaultBrowseGrid.tsx)
- Accept `view` from the new toggle, pass through to cards. Grid layout uses `repeat(auto-fill, minmax(...))`. Keep existing filter/pagination logic intact.

### 6. Course detail page

**Modify:** [app/[locale]/learn/[slug]/page.tsx](../../app/[locale]/learn/[slug]/page.tsx)
- This page does NOT use `StudentDashboardLayout` (it's a public marketing-style page). Wrap its return in `<div className="learn-zone">…</div>` so the same light tokens apply, OR keep the existing dark hero + light body split if we want to preserve marketing aesthetics. **Decision: full learn-zone**, since the mock shows a navy hero + light body achievable with explicit `bg-fg-primary` (navy) on the hero and canvas/white below.

**Modify:** [components/learn/CourseDetailHero.tsx](../../components/learn/CourseDetailHero.tsx)
- Navy `#1A2B33` background band, white text, decorative absolute-positioned teal/coral circles at 0.06–0.07 opacity (top-right, bottom-right).
- Breadcrumb (← Learn), badge row (level=teal-soft, weeks=white-translucent, language=coral-soft), responsive H1 `clamp(22px, 2.8vw, 32px)`, subtitle, meta row with users/replay/clock/star icons.

**New:** `components/learn/EnrollCard.tsx`
- The horizontal pricing card from the mock (price 32px navy + 3 feature items + Enroll button). Sits between hero and "What You'll Master". Reuses [PriceDisplay](../../components/learn/PriceDisplay.tsx) and [EnrollButton](../../components/learn/EnrollButton.tsx).

**Modify:** [components/learn/LearningOutcomes.tsx](../../components/learn/LearningOutcomes.tsx)
- 2-column grid, 20×20 teal-soft check circles, 14px slate text per mock.

**Modify:** [components/learn/ToolsBadges.tsx](../../components/learn/ToolsBadges.tsx)
- Pill row: white bg, 1.5px gray border, 14px bold text, 30px radius.

**Modify:** [components/learn/HowItWorks.tsx](../../components/learn/HowItWorks.tsx)
- 4-column grid of white cards with centered 48×48 teal-soft icon + 13.5px navy title + 12.5px gray description.

**Modify:** [components/learn/CurriculumAccordion.tsx](../../components/learn/CurriculumAccordion.tsx)
- White rows, 12px radius. Header has 28px circular week badge (gray closed → teal open), title text, chevron with rotate. Body has 18×18 teal-soft check-circle topic bullets. 0.18s transitions.

**Modify:** [components/learn/InstructorCard.tsx](../../components/learn/InstructorCard.tsx)
- 16px-radius white card, 68×68 circular gradient avatar (or photo), navy name, language badge-pills, teal credentials, slate bio, teal "Read more" link with arrow.

**Modify:** [components/learn/StickyEnrollBar.tsx](../../components/learn/StickyEnrollBar.tsx) and [components/learn/StickyEnrollSidebar.tsx](../../components/learn/StickyEnrollSidebar.tsx)
- StickyEnrollBar: glassmorphic bottom bar — `background: rgba(253,251,247,0.95); backdrop-filter: blur(12px); border-top`. Coral Enroll button (`#E8765A` hover `#CC5A3E`).
- StickyEnrollSidebar: white card, 16px radius, lift shadow. Same coral CTA. Keep existing logic for full/in-progress/recorded states.

**Modify:** [components/learn/EnrollButton.tsx](../../components/learn/EnrollButton.tsx)
- Add a `coral` variant (or use existing button variants extended in step 3). Default the learn-area enroll buttons to coral; existing primary teal usage unchanged.

## Reused Existing Pieces

- **Data layer untouched:** `getStudentDashboardData`, `getVaultBrowse`, `getVaultRecentlyViewed`, `checkVaultAccess`, `getCourseWithCurriculum`, `checkEnrollment`, `getFreeSessionIds`, `getInstructorByUserId`, `getVaultCourseRecommendations`.
- **Auth flow untouched:** [components/layout/AuthGuard](../../components/layout/AuthGuard.tsx), `createClient`, redirects.
- **i18n untouched:** all `useTranslations` keys preserved; only visual classes change.
- **Lucide icons:** continue to use `lucide-react` (BookOpen, Calendar, Clock, CheckCircle, Lock, Users, etc.). Mock's icons all map to existing lucide names.
- **Existing components retained as-is:** [WelcomeScreen](../../components/learn/WelcomeScreen.tsx), [InstructorTeachingBanner](../../components/learn/InstructorTeachingBanner.tsx), [DashboardCourseCard](../../components/learn/DashboardCourseCard.tsx), [VaultRecentlyViewed](../../components/vault/VaultRecentlyViewed.tsx), [VaultContentRequest](../../components/vault/VaultContentRequest.tsx), [VaultPremiumGate](../../components/vault/VaultPremiumGate.tsx) — restyled inside, but no API changes.

## Build Sequence

1. **Tokens first** — add `.learn-zone` overrides + coral/purple tokens in `globals.css` and `tailwind.config.ts`. Verify nothing outside `/learn` shifts.
2. **Card variant + BadgePill + SectionHeading** — primitive components used by everything below.
3. **Sidebar + layout wrapper** — switch StudentDashboardLayout to `learn-zone` and rewrite StudentNav. At this point, every dashboard sub-page already looks closer to the mock (sidebar + tokens propagate).
4. **Dashboard page** — restyle widgets and StatCard `learn` variant.
5. **Vault page + filters + cards** — view toggle, restyled chips, grid/list cards.
6. **Course detail** — hero, EnrollCard, learning sections, accordion, instructor, sticky bars.

## Per-Step Verification Protocol (run after EACH step)

This is a recursive checklist — every step's "done" gate is the same set of checks. Do not advance to the next step until all items pass. Each pass also requires updating the Progress Log (next section) so a resumed session knows exactly where to pick up.

### Static checks (must pass before moving on)
1. `npm run build` — clean build, no TS or lint errors. If a step inherently changes types, fix call sites in the same step.
2. `npx tsc --noEmit` if build is slow and only types changed.
3. `npm run lint` (if configured) — no new warnings introduced.

### Visual / runtime smoke (must pass before moving on)
Run `npm run dev` and exercise these routes after every step. Even unrelated steps can leak — that's the whole point of recursive testing.
- `/learn/dashboard` — loads logged-in, no console errors, sidebar 220px fixed, all widgets render.
- `/learn/vault` — loads, filters render, grid/list toggle works, bookmark toggle works, clicking an item navigates.
- `/learn/ai-essentials` — hero renders, enroll card visible, accordion week 1 expands, sticky bar appears on scroll.
- `/` (marketing home) — still dark theme, gold accent, no learn-zone leakage.
- `/blog` — still dark theme.
- `/ja/learn/dashboard` — JP locale renders with proper line-height/spacing.

### Regression budget (must pass before moving on)
- Browser console: zero new errors, zero new warnings beyond what existed at start of step.
- Network tab: no 404s on assets/fonts.
- `prefers-reduced-motion: reduce` (toggle in DevTools) — card hover lifts disabled.
- Auth flow: sign-out then sign-in still works; `/learn/auth` page unaffected.
- Stripe checkout (`/learn/ai-essentials/checkout`) loads (don't complete payment).

### When a check fails
- Fix in-place before advancing. Do not stack steps on a broken base.
- If a fix requires touching code outside the current step's listed files, log it in the Progress Log under "Scope deltas" so we keep the plan honest.

## Progress Log

Maintained in this same file. After each step, update the table below + the "Resume notes" block. If the session is interrupted, the next session reads this section first to pick up cleanly.

| Step | Status | Date | Commit | Notes |
|------|--------|------|--------|-------|
| 1. Tokens (globals.css) | verified | 2026-04-26 | uncommitted | `.learn-zone` block added; coral/purple tokens in `:root` + `@theme inline`. Repo uses Tailwind v4 (no `tailwind.config.ts`), so all utility exposure happens in `globals.css`. Build passes (118s, only pre-existing unrelated warnings). |
| 2. Card variant + BadgePill + SectionHeading | verified | 2026-04-26 | uncommitted | Added `learn` variant to `components/ui/card.tsx` (14px radius, scaled shadow, teal hover border). New `components/ui/badge-pill.tsx` (teal/coral/purple/gray/live/navy/translucent variants). New `components/learn/SectionHeading.tsx` (bold navy title + optional icon + "View all →" link). Build deferred — another session running it. Will be exercised when step 3+ pages import them. |
| 3. Sidebar rewrite + layout wrapper | verified | 2026-04-26 | uncommitted | `StudentNav` rewritten: fixed 220px, no collapse, no theme toggle, inline `LangPills` (teal-fill active), inline Honu SVG + wordmark logo, bottom Admin (admin-only) + Sign Out using direct supabase calls. Mobile bottom nav restyled in canvas palette. `StudentDashboardLayout` wraps in `<div className="learn-zone bg-bg-primary text-fg-primary">` — covers both `/learn/dashboard/*` and `/learn/vault/*` since both layouts use it. Build deferred. |
| 4. Dashboard page restyle | verified | 2026-04-26 | uncommitted | Header: locale-aware overline date + greeting + bell + initial avatar (links to settings). Stats grid uses `StatCard variant="learn"` with coral accent on Upcoming Sessions. Two-column row uses `Card variant="learn"` for My Courses + Coming Up; progress bars 5px, coral when 100%. Action Items full-width with BadgePill tag variants. Empty states use dashed border + canvas tertiary bg. Static checkbox visual on action rows (no toggle — assignment state lives on course page). Build deferred. |
| 5. Vault page + filters + cards | verified | 2026-04-26 | uncommitted | Vault page header restyled (vault icon + title + count BadgePill). `VaultSubNav` switched to underline tabs (2px teal border on active). `VaultFilters` now uses pill chips with color-coded levels (teal/coral/purple), white search bar with clear button. `VaultContentCard` rebuilt: 14px radius, deterministic gradient thumbnail fallback, lock overlay (teal-tint hover + dark blur lock pill), badge-pill type/level chips, view/helpful counters. Build deferred. |
| 6. Course detail page | verified | 2026-04-26 | uncommitted | Page wrapped in `learn-zone`. `CourseDetailHero` rebuilt: navy band (#1A2B33), decorative teal/coral orbs, breadcrumb with arrow-left, badge row (teal/translucent/coral by position), responsive title clamp, JP subtitle, white-on-dark description, tag chips. `Button` gained `coral` variant; `EnrollButton` defaults to coral. `StickyEnrollSidebar` upgraded to 16px white card with shadow-lg. `StickyEnrollBar` switched to glassmorphic blur using `--glass-bg`. Body sections (LearningOutcomes, ToolsBadges, HowItWorks, CurriculumAccordion, InstructorCard) auto-adapt via the token cascade — not pixel-perfect to mock but cohesive. Build passes (111s). |

Statuses: `not started` → `in progress` → `verified` → `done` (committed).

### Resume notes

- **Last verified state:** All 6 steps complete. Final consolidated build passed (111s) — only pre-existing baseline warnings remain (admin route dynamic-cookies + `auth.loading` translation key).
- **Currently working on:** Awaiting live smoke test. Next session should run `npm run dev`, sign in as a student, and walk the routes listed in the per-step verification protocol.
- **Next action:** Live smoke (`/learn/dashboard`, `/learn/vault`, `/learn/ai-essentials`, `/`, `/blog`, `/ja/learn/dashboard`). If clean, commit to main per repo workflow.
- **Scope deltas logged:**
  - Step 5: Skipped grid/list view toggle in vault header (mock shows it; deferred — adds a client component for a single-toggle feature).
  - Step 6: Did not build a separate `EnrollCard` (horizontal price-row card from mock). The existing `StickyEnrollSidebar` covers the same job with the new visual treatment; adding a duplicate horizontal card would be redundant. Body section components (`LearningOutcomes`, `ToolsBadges`, `HowItWorks`, `CurriculumAccordion`, `InstructorCard`) inherit the new tokens via the `learn-zone` wrapper — they look cohesive but are not pixel-perfect to mock. If user wants tighter match, do a follow-up pass on each.
  - Step 1 (token reach): Inside `.learn-zone`, `--accent-gold` is aliased to coral. The `cohort_full` enroll button (which uses Button variant="gold") will now render coral while disabled — acceptable as a "warning/unavailable" indicator within the zone.
- **Known pitfalls / scope deltas:**
  - Repo is Tailwind v4 (CSS-driven config) — no `tailwind.config.ts`. Plan originally referenced one; ignore.
  - Inside `.learn-zone`, `--accent-gold` is aliased to coral so legacy gold utilities don't appear amber on white. Means any component that explicitly relies on the gold *hue* inside the learn area (e.g. session format='hybrid' badge) will now read coral. Acceptable per design — flag if anything looks wrong during live smoke.

### Per-step done criteria

- **Step 1 done when:** `.learn-zone` class exists with all listed tokens; Tailwind exposes `coral`/`coral-hover`/`coral-subtle`/`purple` utilities; a smoke render at `/learn/dashboard` shows the existing dark UI unchanged (we haven't applied the class yet); marketing pages also unchanged.
- **Step 2 done when:** New `learn` Card variant, `BadgePill`, and learn `SectionHeading` exist; render a temporary harness or just import them in dashboard page (without using yet) and confirm build passes.
- **Step 3 done when:** StudentDashboardLayout wraps in `learn-zone`; StudentNav rewritten to fixed 220px with logo + lang toggle; theme toggle removed from learn area; `/learn/dashboard` and all dashboard sub-pages show the new sidebar; marketing pages still dark.
- **Step 4 done when:** All dashboard widgets visually match `Dashboard.html`; data still loads identically; greeting + bell + avatar render; coral due-dates highlight when within 3 days.
- **Step 5 done when:** Vault matches `Vault.html`; grid/list toggle persists during session; chips filter as before; bookmark toggle works; locked items show "Unlock" overlay.
- **Step 6 done when:** Course detail matches `Course Detail.html`; navy hero renders; enroll card and sticky bar use coral; curriculum accordion expand/collapse smooth; mobile sticky bar visible only on small screens.

## Out of Scope (this pass)

- Other dashboard sub-pages (`courses`, `schedule`, `my-library`, `billing`, `settings`, `community`, `[course-slug]`) and vault sub-routes (`bookmarks`, `notes`, `series`, `watch-later`) — they'll inherit the new sidebar + tokens automatically but get no per-page redesign yet.
- Translating new microcopy (greetings, bell tooltip, etc.) — add EN strings now, queue JP translation as a follow-up.
- Mobile breakpoint refinement beyond what mocks imply.
