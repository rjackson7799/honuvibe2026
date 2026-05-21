# SmashHaus Co-Branded Landing Page — Visual Redesign

**Date:** 2026-05-05
**Design source:** [docs/designs/SmashHaus.html](../designs/SmashHaus.html)
**Target file:** [components/partners/smashhaus/SmashHausLanding.tsx](../../components/partners/smashhaus/SmashHausLanding.tsx)

---

## Context

A new design comp at `docs/designs/SmashHaus.html` ships a refined, more on-brand co-branded landing page for `/partners/smashhaus`. It blends HonuVibe's teal/coral palette with SmashHaus purple (`#7A5AFF`), upgrades typography (Inter + Instrument Serif italic accents), and replaces the current illustration language (CSS blobs, abstract SVGs) with **production-relevant mockups**: a DAW/AI assistant chat card, vinyl record, waveform recording UI, isometric royalty-split receipts, and an instructor earnings dashboard.

The current implementation ([SmashHausLanding.tsx](../../components/partners/smashhaus/SmashHausLanding.tsx) + [smashhaus.css](../../components/partners/smashhaus/smashhaus.css), 922 + 1,414 lines) shipped as the first co-branded page but feels generic next to the new comp. With the SmashHaus demo to Dylan imminent, this redesign brings the page to a state we'd be proud to show.

**Strategic decisions confirmed with Ryan (locked):**
1. **No SmashHaus SSO ever.** Member CTAs use simple language: "Get Started for Free" → existing HonuVibe sign-up. No "members only" / "exclusive access" framing.
2. **Drop FAQ + placeholder instructor roster.** Keep the wired newsletter form — tuck it near the final CTA so we don't lose the only real conversion mechanism.
3. **Vault preview is hybrid.** Query `content_items` tagged with SmashHaus `partner_id`; fall back to hardcoded design placeholders if zero rows.
4. **"Become an instructor" section CTA → `/become-an-instructor`** (existing INS-1 flow). The hv_partner cookie already attributes SmashHaus-sourced applicants.

---

## Section-by-section diff

| # | New design | Current impl | Action |
|---|---|---|---|
| 1 | **Fixed top nav** (co-brand wordmark + nav links + Sign-in CTA) | None | **Add** (likely as a sub-nav scoped to partner page; do NOT replace site-wide nav) |
| 2 | **Hero** — purple wash, waveform texture, DAW/AI chat mockup, vinyl record, "lesson complete" floating chip; headline "Get Heard. Get Seen. Get AI-fluent." with italic serif accent | Pink/peach blob hero, hardcoded "1.2k watching" hero card | **Replace** entirely. CTAs: "Get Started for Free" → `/learn` (or first SmashHaus-tagged course) + "See the curriculum →" → `#course` anchor |
| 3 | **Features** — 4 cards (Write/Mix/Release/Business) with rich SVG illustrations: lyric draft card, DAW timeline, phone+social posts, royalty receipt | "Benefits" 4-up grid with abstract SVG art | **Replace** the Benefits section with new Features section (new illustrations: `IllusSongwriting`, `IllusProduction`, `IllusMarketing`, `IllusBusiness`) |
| 4 | **Curriculum (dark)** — 6-week list with sticky left rail, single column of week cards | "FeaturedCourse" — 6-week with hardcoded free/paid module split | **Replace**. Drop the free/paid distinction. Keep all 6 weeks uniform with chips ("Self-paced", "Lifetime access", "Vault included") |
| 5 | **Vault preview** — 6 gradient cards (templates/prompts/workflows/replays) | None on current page | **Add**. Hybrid data: real `content_items` where `partner_id = smashhaus.id`, fallback to hardcoded design cards |
| 6 | **Catalog** (full course library) | Catalog component pulling DB courses | **Keep** — the existing `Catalog` already renders real DB courses. Restyle to match new design tokens |
| 7 | **Testimonials** — 3-up cards, simpler | 4-up alternating light/dark cards | **Replace** with cleaner 3-up. Keep `<PlaceholderBadge>` dev-only marker |
| 8 | **Instructor** ("Become an instructor") — 2-up split: copy + earnings dashboard mockup with bar chart | "Instructors" — 4 placeholder teacher cards (Maya/Daniel/Tariq/Elle) | **Replace**. New section is recruitment, not roster. CTA → `/become-an-instructor` (preserves `hv_partner` cookie via existing attribution wiring) |
| 9 | **CTA** — dark gradient panel, "Make your next release with AI in your corner" | Email signup form bound to `/api/newsletter/subscribe` | **Combine**: keep the dark gradient panel visually, but inline the working newsletter form as the primary action (replacing "Sign in with SmashHaus"). CTA copy: "Get Started for Free" — submits to existing `/api/newsletter/subscribe` with `source: 'smashhaus_partner_landing'` |
| 10 | **Footer** — minimal dark, co-brand wordmark + 4 links | Bespoke footer with 4 link columns | **Simplify** to match new design. Keep links pointing at real routes (`/learn`, `/about`, `/privacy`, `/terms`, `/contact`) |
| – | **FAQ** | 5 Q&A items | **Remove** |
| – | Placeholder instructor roster | 4 placeholder teacher cards | **Remove** (folded into the redesigned Instructor recruitment section) |

---

## Design tokens (palette + type)

### Color palette (from `T` constant in design HTML, lines 60–71)
Replace the existing palette in [smashhaus.css](../../components/partners/smashhaus/smashhaus.css) with:

```css
/* HonuVibe core */
--smash-teal: #0FA9A0;
--smash-teal-dark: #0B7F78;
--smash-coral: #E8765A;
--smash-coral-dark: #CC5A3E;
--smash-navy: #1A2B33;
--smash-slate: #5A6B73;
--smash-caption: #8B9499;
--smash-canvas: #FDFBF7;
--smash-sand: #F5F0E8;

/* SmashHaus DNA */
--smash-purple: #7A5AFF;
--smash-purple-dark: #5B3FE0;
--smash-purple-soft: #EFEBFF;
--smash-black: #0A0612;
```

### Typography
**Replace** Fraunces + Archivo (current [fonts.ts](../../app/%5Blocale%5D/partners/smashhaus/fonts.ts)) with:
- **Inter** (400/500/600/700/800) — primary UI
- **Instrument Serif** (400, italic) — accent on key phrases ("Get AI-fluent.", "way you make music.", "music maker's reality.", "grows with your craft.")

```ts
// app/[locale]/partners/smashhaus/fonts.ts
import { Inter, Instrument_Serif } from 'next/font/google';

export const inter = Inter({
  subsets: ['latin'],
  weight: ['400', '500', '600', '700', '800'],
  variable: '--font-inter',
  display: 'swap',
});

export const instrumentSerif = Instrument_Serif({
  subsets: ['latin'],
  weight: ['400'],
  style: ['normal', 'italic'],
  variable: '--font-instrument-serif',
  display: 'swap',
});
```

The italic-serif accent on key headline phrases is a strong recurring pattern — codify as a reusable utility class `.smash-serif-accent` rather than repeating `font-family` declarations inline.

### Animations
Define in CSS (port from design HTML lines 26–51):
- `floatA` / `floatB` — gentle float for tilted card mockups
- `pulseDot` — recording / live indicators
- `vuBar` / `vuBar2` / `vuBar3` — VU meter bar variations
- `spinSlow` — vinyl record (18s linear infinite)
- `drift` — subtle position shifts

All wrapped in `@media (prefers-reduced-motion: reduce)` to disable per [CLAUDE.md design rules](../../CLAUDE.md).

---

## Critical files

### Modified
- [components/partners/smashhaus/SmashHausLanding.tsx](../../components/partners/smashhaus/SmashHausLanding.tsx) — full rewrite of section components; preserve top-level structure (`useEffect` cookie + analytics, prop signature)
- [components/partners/smashhaus/smashhaus.css](../../components/partners/smashhaus/smashhaus.css) — full rewrite (current 1,414 lines → expected ~1,500–1,800 lines given richer mockups)
- [components/partners/smashhaus/icons.tsx](../../components/partners/smashhaus/icons.tsx) — update icon set: keep `ArrowIcon`, `CheckIcon`, `PlayIcon`, `SparkleIcon`; add `MicIcon`, `WaveIcon`, `SlidersIcon`, `HonuMark`, `SmashWordmark`. Drop `ClockIcon`, `LockIcon`, `LightningIcon`, `QuoteIcon`, `UsersIcon` if unused after rewrite
- [app/[locale]/partners/smashhaus/fonts.ts](../../app/%5Blocale%5D/partners/smashhaus/fonts.ts) — switch to Inter + Instrument Serif
- [app/[locale]/partners/smashhaus/page.tsx](../../app/%5Blocale%5D/partners/smashhaus/page.tsx) — update font variable className from `${fraunces.variable} ${archivo.variable}` to `${inter.variable} ${instrumentSerif.variable}`. Also extend `fetchSmashHausWithCourses()` to also fetch SmashHaus-tagged vault items (see below)

### New
- A `fetchSmashHausVault()` helper (or extend the existing fetch in `page.tsx`) — query [content_items](../../supabase/migrations/035_partner_ownership.sql) where `partner_id = smashhaus.id`, limit 6, ordered by recency. Return shape compatible with the design's vault card (id, title, type-tag, optional thumbnail). Reuse types from [lib/partner-portal/queries.ts](../../lib/partner-portal/queries.ts) `getPartnerVaultItems()` if signatures align.

### Reuse (no changes)
- [lib/analytics.ts](../../lib/analytics.ts) `trackEvent()` — keep `partner_landing_view`, `partner_cta_click`, `partner_enroll_click`, `newsletter_signup` events
- [/api/newsletter/subscribe](../../app/api/newsletter/subscribe/route.ts) — current FinalCTA form already wired correctly; keep the form logic, restyle the container
- `setPartnerCookie(slug)` / `<PlaceholderBadge>` — keep as-is; the placeholder badge is a useful dev-only signal during the design polish phase
- [@/i18n/navigation](../../i18n/navigation.ts) `Link` — used everywhere already; no change

---

## Safety & error-checking baseline (do BEFORE step 1)

The redesign is large (922 + 1,414 lines being rewritten). Treat each step as an isolated, reversible commit so we can `git revert` cleanly if a regression slips in.

**Pre-flight (run once before starting):**
1. Working tree must be clean except for the known untracked SmashHaus files: `pnpm git status` to confirm.
2. Capture green baseline so we know what "still passes" means:
   - `pnpm type-check` → record pass/fail
   - `pnpm build` → record pass/fail and bundle size of `/partners/smashhaus`
   - `pnpm dev` → manually load `/partners/smashhaus`, `/partners/vertice-society` (regression peer), `/partners/nonexistent` (404), `/learn`, `/` (home). Screenshot or note baseline visuals.
3. If anything is already broken on `main`, **stop and surface it** — do not start the redesign on a red baseline.

**Per-step safety gates (run AFTER every numbered step in the implementation order):**
- **Type check** — `pnpm type-check` must pass. Compile errors = stop, fix, do not advance.
- **Lint** — `pnpm lint` must pass (warnings ok if pre-existing).
- **Dev render** — load `/partners/smashhaus` in the browser; the page must render without console errors (no 404s on font/css, no React hydration warnings, no missing-icon import errors).
- **Regression peers** — load `/partners/vertice-society` and `/learn`; confirm visuals unchanged.
- **Commit** — small, scoped commit per step (e.g. `chore(smashhaus): step 1 — tokens + fonts swap`). Direct to `main` per project convention. This gives clean revert points.

**Hard rules to prevent build breaks:**
- **Never delete an icon export from [icons.tsx](../../components/partners/smashhaus/icons.tsx) until its import in `SmashHausLanding.tsx` is gone.** Step 12 (dead-code cleanup) is the *last* step for that reason.
- **Never delete a CSS class from [smashhaus.css](../../components/partners/smashhaus/smashhaus.css) until the JSX that uses it is gone.** Same ordering rule.
- **Never mutate the `Props` shape of `SmashHausLanding`** without updating `page.tsx` in the same commit. The component is a client island; a mismatched prop crashes the route.
- **Never remove `'use client'` from `SmashHausLanding.tsx`** — the cookie + analytics `useEffect` requires it.
- **Never remove `setRequestLocale(locale)` from `page.tsx`** — required by next-intl static rendering.
- **Vault helper failure mode is silent fallback, not throw.** Wrap the supabase call in a try/catch (or check `error`); on any error log to `console.error` and return `[]` so the placeholder branch renders. The page must never crash because vault content is missing.
- **Font swap is atomic with CSS `--ff-*` vars.** The current CSS at [smashhaus.css:36-38](../../components/partners/smashhaus/smashhaus.css#L36) hard-references `var(--font-fraunces)` and `var(--font-archivo)`. Removing those font.ts exports without simultaneously updating those three CSS lines = silent fallback to system Georgia. Step 1 must touch fonts.ts, page.tsx className, AND those three `--ff-*` lines in one commit.

**Rollback procedure if a step breaks main visually or in CI:**
- `git log --oneline | head -5` to find the offending commit
- `git revert <sha>` (creates a clean inverse commit; do NOT `git reset --hard` since we're on main)
- Push, then re-attempt the step with the lesson learned

---

## Implementation order

Build in this sequence so the page is shippable at each stop. Every step ends with the safety gates above.

1. **Tokens + fonts (atomic)** — in a single commit:
   - Update [fonts.ts](../../app/%5Blocale%5D/partners/smashhaus/fonts.ts) to `Inter` + `Instrument_Serif`.
   - Update [page.tsx](../../app/%5Blocale%5D/partners/smashhaus/page.tsx) className from `${fraunces.variable} ${archivo.variable}` to `${inter.variable} ${instrumentSerif.variable}`.
   - In [smashhaus.css](../../components/partners/smashhaus/smashhaus.css), update the `--ff-serif`, `--ff-sans`, `--ff-display` lines to reference `--font-inter` / `--font-instrument-serif` (keep system fallback chain). Add the new SmashHaus palette variables (`--smash-purple`, `--smash-purple-dark`, `--smash-purple-soft`, `--smash-black`, `--smash-canvas`, `--smash-sand`, plus the renamed `--smash-teal`/`--smash-coral`/`--smash-navy`/`--smash-slate`/`--smash-caption` set) **alongside** the existing `--honu-*` and `--smash-*` (violet/lilac/plum) vars — do not delete the old vars yet; they are still referenced by the legacy CSS and removing them mid-step nukes the visual baseline.
   - **Gate:** page renders with new fonts visible (Inter body, Instrument Serif anywhere we manually apply `.serif`); existing layout unchanged. Network tab shows Inter + Instrument Serif requests, no 404s on Fraunces/Archivo.
2. **Animations + utility classes** — port keyframes (`floatA`, `floatB`, `pulseDot`, `vuBar*`, `spinSlow`, `drift`) and `.smash-serif-accent` utility into [smashhaus.css](../../components/partners/smashhaus/smashhaus.css). All keyframes scoped under `.smash-scope` (or globally prefixed `smash-*` so they can't collide with other site keyframes). Wrap decorative animations in `@media (prefers-reduced-motion: reduce) { ... animation: none; }`.
   - **Gate:** add a temporary test element with the new utility class in the hero, visually confirm font + animation apply, then remove the test element before committing. Verify reduced-motion toggle in DevTools Rendering panel halts the animations.

3. **Hero** — rewrite with purple wash, waveform texture SVG, DAW chat card, vinyl record, recording card, "lesson complete" floating chip. Update headline + CTAs ("Get Started for Free" + "See the curriculum →").
   - **Risk:** the legacy `Hero` component imports `WaveIcon` from icons.tsx — keep the import until the new hero is in. The new hero will need any new icons (`MicIcon`, `SlidersIcon`) added to icons.tsx **first** in the same commit.
   - **Gate:** hero renders, both CTAs are clickable (`/learn` or first SmashHaus course; `#course` smooth-scrolls). No console errors. SECTION SPOT-CHECK with user before continuing.

4. **Features section** — replace `Benefits` with `Features` + 4 illustration sub-components (`IllusSongwriting`, `IllusProduction`, `IllusMarketing`, `IllusBusiness`).
   - **Gate:** all 4 cards render with their illustrations, no broken SVG paths. SECTION SPOT-CHECK.

5. **Curriculum (dark)** — replace `FeaturedCourse` with the new Curriculum section. Drop free/paid module distinction; show all 6 weeks uniformly with `Self-paced`/`EN`/`Lifetime access`/`Vault included` chip set.
   - **Risk:** existing `FeaturedCourse` uses the `primaryHref` prop — preserve the prop wiring through the new component. Anchor `id="course"` must remain on the section so the hero "See the curriculum →" link still scrolls.
   - **Gate:** hero CTA scrolls to the new section. SECTION SPOT-CHECK.

6. **Vault preview** — new section. Wire vault fetch in `page.tsx` (extend `fetchSmashHausWithCourses` → `fetchSmashHausWithCoursesAndVault`, or add `fetchSmashHausVault(partnerId)` and `Promise.all` them). Pass `vault` to `SmashHausLanding` as a new optional prop (`vault?: VaultCard[]`). Render real items if `vault.length > 0`, fallback to hardcoded design cards otherwise. `Browse all` link → `/learn/vault?partner=smashhaus`.
   - **Risk:** the public landing must use server `createClient()` (RLS-respecting), NOT `createAdminClient()`. Wrap the supabase call in try/catch — on any error, log and return `[]`. This guarantees the page survives a missing RLS policy or DB hiccup.
   - **Risk:** the new `vault` prop is OPTIONAL with default `[]` so older deploys/cached page bundles don't crash if the prop is missing momentarily during deploy.
   - **Gate:** with no SmashHaus-tagged content_items, placeholders render with `<PlaceholderBadge>`. Manually insert one row (`UPDATE content_items SET partner_id = '<smashhaus uuid>' WHERE id = '<any>'`) and confirm real card replaces one placeholder. Roll back the UPDATE after testing. SECTION SPOT-CHECK.

7. **Catalog (existing)** — restyle card surfaces with new tokens. No data changes — keeps the existing `partner_courses` join.
   - **Gate:** course cards still link to `/learn/<slug>`; `partner_enroll_click` event still fires on click (verify in network tab). SECTION SPOT-CHECK.

8. **Testimonials** — simpler 3-up grid, drop the alternating dark variant.
   - **Gate:** SECTION SPOT-CHECK.

9. **Instructor recruitment** — replace `Instructors` (placeholder teacher cards) with the recruitment section. CTA → `/become-an-instructor`. Rich earnings-dashboard mockup uses static illustration data (placeholder badge).
   - **Risk:** the `/become-an-instructor` route relies on the `hv_partner` cookie set on mount in `SmashHausLanding`. Confirm the cookie is set BEFORE the user could click the CTA (it is — `useEffect` runs on first paint, button is clickable after).
   - **Gate:** click CTA → land on `/become-an-instructor` with `hv_partner=smashhaus` cookie present (DevTools → Application → Cookies). SECTION SPOT-CHECK.

10. **Final CTA** — port the dark gradient panel; **inline the existing newsletter form** in place of the design's "Sign in with SmashHaus" button. Keep the `useState`/`onSubmit` logic from current `FinalCTA`.
    - **Risk:** breaking the form = losing our only conversion mechanism. Copy the form JSX structure (input + button + success/error states) verbatim from current `FinalCTA`; only restyle, do not refactor logic.
    - **Gate:** submit a test email → 200 from `/api/newsletter/subscribe`, success message renders. Submit invalid email → error message. SECTION SPOT-CHECK.

11. **Footer** — simplify to the minimal dark variant.
    - **Gate:** all footer links resolve (`/learn`, `/about`, `/privacy`, `/terms`, `/contact`) — no 404s. SECTION SPOT-CHECK.

12. **Remove dead code (cleanup pass)** — only NOW drop `FAQ`, `Instructors` (old roster), `CoBrandStrip`, unused CSS classes (grep first to be sure they're orphaned), and unused icon exports (`ClockIcon`, `LockIcon`, `LightningIcon`, `QuoteIcon`, `UsersIcon`). Also drop the legacy `--honu-*` and now-unused old `--smash-violet`/`--smash-lilac`/`--smash-plum` palette vars added in step 1.
    - **Verify each removal with grep** before deleting: `pnpm exec rg "QuoteIcon" components app` etc. If any reference outside the SmashHaus folder, leave it.
    - **Gate:** type-check + dev render + visual diff vs the post-step-11 state — should be visually identical, just leaner.

13. **Top nav (DEFERRED for v1)** — see resolved Open Question #1. Skipping the bespoke fixed sub-nav for v1 ships the redesign without touching the global layout. Track as a follow-up: add `isPartnerLandingRoute()` to `conditional-nav.tsx`, suppress global `<Nav />` for `/partners/[slug]`, then add the bespoke sub-nav inside the SmashHaus scope.

---

## Open questions to resolve at execution time

1. ~~**Site-wide nav stacking** — does the global site nav render on `/partners/smashhaus` today?~~ **RESOLVED:** Yes. `/partners/smashhaus` is not in `MARKETING_PATHS` nor `isAuthShellRoute()` in [conditional-nav.tsx](../../components/layout/conditional-nav.tsx#L9), so the legacy global `<Nav />` renders with `pt-14 md:pt-16` padding on `<main>`. **Strategy chosen:** for v1 of the redesign, **skip the new fixed sub-nav** and start the page at the hero (the cobrand identity already lives in the hero pill + co-brand strip area). Defer the bespoke sub-nav until we're ready to also extend `isAuthShellRoute()` (or add a `isPartnerLandingRoute()`) to suppress the global nav for `/partners/[slug]`. This avoids any layout regression risk for v1.
2. **JP locale strategy** — current implementation has a `TODO(smashhaus-jp-copy)` flag at line 3 noting all bespoke strings are EN-only. The redesign keeps this constraint (DB-driven `name_jp` / `description_jp` are the only JP-aware fields). Ship EN-only, log a follow-up TODO for `partners.smashhaus.*` namespace in `messages/{en,ja}.json` before any JP launch.
3. **Vault card typing** — the design uses tags `TEMPLATE`, `PROMPT`, `WORKFLOW`, `REPLAY` but `content_items.type` may use different enum values. Map at query time or normalize in the helper. **Fallback rule:** if the live row's type doesn't match a known design tag, render with a neutral `RESOURCE` tag — never crash the card.
4. **Vinyl record + animations performance** — verify CPU/GPU impact on lower-end devices. If excessive, gate decorative animations behind `prefers-reduced-motion: no-preference`.
5. **Instrument Serif loading** — the italic-serif accent is on highly visible H1/H2 text. Confirm `display: swap` doesn't cause an FOUC swap that's worse than blocking; consider preload on the bespoke layout.
6. **Vault RLS** — `lib/partner-portal/queries.ts:403 getPartnerVaultItems()` uses `createAdminClient()` (service role). The public landing page **must use the regular server client** (`@/lib/supabase/server`) so RLS applies. Before wiring, confirm `content_items` has an anon-readable RLS policy for SmashHaus-tagged rows; if not, scope the helper to a narrow `select` that only returns columns safe for public display, and add a policy in a follow-up migration. **Hard fail-safe:** if the query errors *or* returns zero rows, the section renders the hardcoded design placeholders (badged with `<PlaceholderBadge>`).

---

## Verification

### Local
1. `pnpm dev` — visit `/partners/smashhaus` and `/ja/partners/smashhaus`
2. DevTools spot-checks:
   - New palette CSS variables present
   - `hv_partner=smashhaus` cookie set with 30-day Max-Age
   - `<meta name="robots" content="noindex, nofollow">` (since seed has `is_public=false`)
   - Inter + Instrument Serif network requests visible; both render correctly
   - All animations respect `prefers-reduced-motion` (toggle in DevTools Rendering panel)
3. Vault preview: verify real items render if SmashHaus-tagged content exists; placeholders render if not
4. CTA buttons:
   - Hero "Get Started for Free" → `/learn` (or first SmashHaus course)
   - Hero "See the curriculum →" → smooth-scrolls to `#course`
   - Curriculum cards → individual course pages (or `/learn` if no course)
   - Vault "Browse all" → `/learn/vault?partner=smashhaus`
   - Instructor "Apply to teach" → `/become-an-instructor`
   - Final CTA email submit → 200 from `/api/newsletter/subscribe`, success state renders
5. Track events fire (verify in Plausible dashboard or browser network tab):
   - `partner_landing_view` on mount
   - `partner_cta_click` (hero/featured)
   - `partner_enroll_click` (catalog)
   - `newsletter_signup` (final CTA)

### Build + regression
1. `pnpm build` and `pnpm type-check` pass
2. `/partners/vertice-society` regression-clean (untouched bespoke page still renders)
3. `/partners/nonexistent` → 404
4. Lighthouse mobile Performance ≥ 90 (per [CLAUDE.md performance budgets](../../CLAUDE.md))
5. Visual diff vs design comp at desktop (1280px+) and mobile (375px). The design HTML has no explicit responsive breakpoints — define our own grid collapses (1.05fr/1fr → single column) below 900px

### Demo readiness (separate from this redesign — see [TODO.md](../../TODO.md))
- Tag at least 1–3 courses with `courses.partner_id = smashhaus.id` so featured course list isn't empty
- Tag 1–2 vault items with `content_items.partner_id = smashhaus.id` so vault preview isn't all-placeholder
- Real SmashHaus logo + brand colors in [supabase/seed_smashhaus_demo.sql](../../supabase/seed_smashhaus_demo.sql) (placeholders today)
