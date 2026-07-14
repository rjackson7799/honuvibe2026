# Sandbox — new main-menu section showcasing interactive demo apps (rev 2)

> Approved by Ryan 2026-07-13 (rev 2, after external review).
> Phased delivery: each phase is its own execution unit (fresh session per phase).
> Rev 2 incorporates external review: mutable demo state, cross-root analytics, HealthHub provider composition, portal-aware CSS scoping, sensitive-data manifest, lint + route-resolution tests.

## Context

Explore shows shipped client work as a static catalog. It doesn't demonstrate the *complex, interactive* app builds. A new top-level **Sandbox** nav item gives visitors live, clickable demos with 100% simulated data — proof of capability you can touch.

**Decisions (Ryan, 2026-07-13):**
- Demos **ported into this repo** as **curated core slices**.
- Demo 1: **MilesChaser** (own product, `C:\Users\HCI\Desktop\Projects\MilesChaser`).
- Demo 2: **HealthHub CEO dashboard**, **anonymized** as a fictional practice (source: `C:\Users\HCI\Desktop\HCI 2026\pasadena-health-hub\apps\public\src\{pages,components}\ceo`). Source seed contains real payroll/vendor data — none may ship (see Anonymization).
- Demo 3 later — architecture must make adding demos repeatable.
- i18n: **bilingual EN/JP landing; demos EN-only** (JP landing carries an "English only" note).

**Stack (verified):** Next 16.1.6 / React 19.2.3 / Tailwind v4 (CSS-first `@theme inline`, `styles/globals.css:525`; no tailwind.config). Both source apps use `recharts ^2.15.4` (React-19 OK). Tailwind v4 default `dark:` = media query = MilesChaser's v3 behavior. `pnpm verify` = type-check → tests → build (**no lint** — each phase runs `pnpm lint` explicitly).

## Architecture

### Routes
- Landing: `app/[locale]/sandbox/page.tsx` → `/sandbox` + `/ja/sandbox`. Marketing page mirroring `app/[locale]/explore/page.tsx` (MarketingShell → Nav → sections → Newsletter → Footer), **including its `generateMetadata` pattern** (localized title/description from `sandbox.meta`, canonical + EN/JA alternates, OG image/description).
- Demos: `app/sandbox/miles-chaser/**`, `app/sandbox/health-hub/**` — static siblings of `app/[locale]/`, each with its **own root layout** (`<html lang="en">`, precedent: `app/studio-site/`). Full-app feel; demo deps (recharts, radix, react-query) stay in demo route chunks.
- **Middleware** (`middleware.ts:254`): exclude demo paths from the intl matcher:
  `matcher: '/((?!api|trpc|_next|_vercel|studio(?:$|/)|sandbox/|.*\\..*).*)'`
  Plus one explicit rule in middleware: **redirect `/ja/sandbox/<demo>` → `/sandbox/<demo>`** (canonical EN demo) so the fourth URL case is designed, not accidental.
- **Cross-root navigation is a full document load** (different root layouts). Consequences handled below (analytics, links).
- **Link rule:** demo links use plain `next/link`, never `@/i18n/navigation` Link (would prefix `/ja` → 404/redirect).
- **Route-resolution spike (Phase B step 1, before porting anything):** matcher change + stub demo page; verify in `next build` + prod-mode server: `/sandbox` (EN landing), `/ja/sandbox` (JP landing), `/sandbox/miles-chaser` (demo), `/ja/sandbox/miles-chaser` (redirect). Add a small vitest file exercising the matcher regex against: `/sandbox`, `/sandbox/`, `/sandbox/miles-chaser`, `/sandboxish`, `/ja/sandbox`, dotted asset paths, query-string paths.
- Documented constraint (comment at the matcher): no future *marketing* child pages under `/sandbox/<x>` — that namespace belongs to demos.

### Demo registry — `lib/sandbox/demos.ts`
Presentation metadata only (it does not generate routes — each demo also follows the "adding a demo" checklist below):
```ts
export type SandboxDemo = {
  slug: string;                      // route + analytics identifier ('miles-chaser')
  key: string;                       // i18n key: sandbox.demos.<key>.{name,tagline,alt}
  image: string;                     // '/sandbox/<slug>.webp'
  stack: readonly string[];
  status: 'live' | 'coming_soon';
};
export const demoHref = (slug: string) => `/sandbox/${slug}`;  // single derivation, no href field
```
**Adding a demo checklist** (goes in the plan doc): registry entry + i18n block → `app/sandbox/<slug>/layout.tsx` from the template below → scoped `.demo-<slug>` CSS → mock data layer + contract tests → screenshot from the *sanitized* running demo → flip `status` → QA checklist.

### Demo root layout template (per demo)
- `<html lang="en">`, `<body className="demo-<slug>">` — **the scope class lives on `<body>`**, so Radix portals/toasts (which attach under `body`) inherit the demo's CSS variables. This is the portal strategy.
- Own `next/font` setup (demos don't inherit locale-layout font classes — MilesChaser: Inter; HealthHub: the preset's font stack).
- `metadata`: title, `robots: { index: false, follow: true }` (follow stays true so crawlers honor the Exit link; verify `noindex` in rendered HTML as a done criterion).
- Analytics parity with the locale root: **Plausible script block + `@vercel/analytics` `<Analytics />`** (separate root layouts inherit neither).
- `DemoChrome` (below), then full-viewport demo area.

### Demo chrome — `components/sandbox/demo-chrome.tsx`
Slim sticky bar (~44px, `print:hidden`): "HonuVibe Sandbox" wordmark → `/sandbox`, demo name, persistent "Simulated data" badge with a tooltip stating the demo's exact reset behavior (per-demo copy, see State), Exit link. Styled with HonuVibe dark tokens (reads as frame around a foreign app). Badge text also present as visually-hidden intro for screen readers.

### Analytics — pageview-based, no unload race
Because landing→demo is a full document load, an `onClick` `trackEvent` is unreliable (confirmed by `lib/analytics.ts:15-18`). Design:
- **Demo launches are measured as demo pageviews** — the Plausible script inside each demo layout auto-tracks the pageview; the URL carries the slug. No click-side launch event, no sendBeacon complexity.
- Coming-soon cards navigate nowhere and fire a distinct `trackSandboxDemoInterest({ demo_slug, locale })` (client-side, no unload → plain `trackEvent` is safe). Live cards fire nothing on click.

### CSS isolation (Tailwind v4)
- **HealthHub:** raw shadcn HSL vars scoped under `body.demo-health-hub` in `components/sandbox/health-hub/health-hub.css` (light theme only; strip `dark:` from ported files) + scoped border-color preflight (`.demo-health-hub, .demo-health-hub *, ::before/::after { border-color: hsl(var(--border)) }`) + body background/color/font declarations. Utility-name mappings (`--color-background: hsl(var(--background))` etc.) in new `styles/sandbox-demos.css` `@theme inline` imported from `globals.css`. Verified zero name collisions with HonuVibe's `--color-bg-*`/`--color-fg-*`; outside the demo body these utilities resolve to undefined vars → inert. Accepted trade-off: the utility names exist globally — Phase C QA includes a marketing-shell regression sweep (home/learn/explore EN+ja) to prove nothing shifted.
- **Print:** port the source print CSS that `ReportsTab`/`*Report.tsx` rely on (per-section print) into `health-hub.css`; chrome `print:hidden` alone is not sufficient. QA includes an actual print-preview check + afterprint cleanup.
- **MilesChaser:** stock utilities + `dark:` media variants port unchanged. `body.demo-miles-chaser` gets its `:root`/`body` styles + scoped v3-compat default border color.
- Known v3→v4 drift to QA visually: `border` currentColor default, `ring`/shadow scales, HonuVibe's global `--radius-*` overrides.

### MilesChaser data layer — client-side store, no API route
The source dev-mock API is GET-only fixtures (POST/PATCH/DELETE return `{success:true}` without state; create returns the wrong shape). A server route with module state would leak between visitors. Design instead:
- `lib/sandbox/miles-chaser/mock-data.ts` — verbatim seed copy of source `devMockData.ts` (minus admin/billing/OCR/CSV).
- `lib/sandbox/miles-chaser/store.ts` — **client-side store, seeded from mock-data, persisted to per-tab `sessionStorage`**. Exposes async read(path) + createTrip/updateTrip/deleteTrip (create returns the new trip with a generated id, so navigation to `/trips/[id]` works). Deep-clones on read/write.
- Ported SWR hooks keep their keys; the fetcher becomes the store's `read` (SWR is fetcher-agnostic). Mutations call the store then `mutate(key)` — real loading states and updates survive with minimal surgery. No `app/api` route, no middleware involvement.
- **Projection realism:** port the pure engine modules (`projectionEngine`, `pacingCalculator`, `gapAnalyzer` — plain TS) so the dashboard chart/pacing recompute when trips change. Requires **`date-fns`** (used by the engine — missing from rev 1's dep list).
- **State definition (exact, mirrored in the badge tooltip):** "Your changes live in this browser tab and reset when you close it." (sessionStorage: survives reload, ends with the tab.)
- Deps: `swr`, `recharts`, `date-fns` + a **transitive-import inventory step** before porting (walk imports of the selected slice; add exactly what it needs).

### HealthHub data layer — in-memory, explicit composition
- Provider composition (replaces the dropped `RequireCeoAuth`, which currently loads the snapshot):
  `app/sandbox/health-hub/layout.tsx` (server: html/body/chrome/css) → `providers.tsx` ('use client'): **QueryClientProvider → seeded `['ceo','snapshot']` query resolved by `mock-api.ts` from `seed.ts` → ScratchProvider(current) → dashboard**. Toast provider + viewport mount in `providers.tsx` (portal content inherits vars via the body scope class).
- `components/sandbox/health-hub/mock-api.ts` — same signatures as source `api.ts` (~10 functions), in-memory with 200–400ms latency; scenarios live in module-level *client* memory (per-tab by nature). **Deep-clone every boundary** so current/scratch/scenarios never share nested references.
- `lib/sandbox/health-hub/{seed.ts, canned-analysis.ts}` — fully fabricated (see Anonymization); canned analyze/suggest-mix with fake thinking delay + one canned failure path (exercises the error UI).
- **State definition (tooltip):** "Edits and saved scenarios reset when you reload the page."
- Deps: derived from the actual copied primitives during a **dependency-inventory step** — known so far: `@tanstack/react-query`, `tailwind-merge`, `class-variance-authority`, `@radix-ui/react-slot` (Button), tabs/select/slider/label/checkbox + the toast primitives the selected UI actually uses. **Verify React 19 compat for the exact Radix versions installed.** Local `cn` with `tailwind-merge` (repo's clsx-only `cn` breaks cva overrides).

### Mock contract tests (vitest, per demo)
- MilesChaser store: trip create/read/update/delete shapes; create returns a routable id; projection recomputes after trip changes; sessionStorage round-trip; deep-clone (mutating a returned object doesn't corrupt the store).
- HealthHub mock-api: current-snapshot load; scenario save/load/delete/promote lifecycle; deleting the active scenario; canned analysis success + failure; deep-clone immutability between current and scratch.
- Port source `revenue-groups.test.ts` (guards hand-written types against `formulas.ts`).

## Anonymization (Phase C gate — manifest, not name-grep)
1. **Sensitive-source manifest first** (built from the source repo before porting): every real person/org/vendor identifier, plus distinctive numerics (salaries, rents, reimbursement rates), addresses/phones/emails/URLs, logo assets. Kept outside the repo (scratchpad), used as the scan list.
2. **Fabricated data is structurally independent** — different employee count, different role/pay mix, different vendor set, different revenue mix and expense distribution. Not a renamed copy: relationships and exact amounts are confidential too.
3. **Scan scope:** the entire introduced source tree AND the built client output (`.next` demo chunks) against the manifest — components, titles, toast copy, print headers, alt text, comments, canned AI responses, not just `seed.ts`.
4. **Fictional identity collision check:** web search the fictional practice name/wordmark before shipping; must not identify or imitate a real practice.
5. **Images:** no HealthHub screenshot may be captured until the anonymized seed + fictional branding are running. Screenshots reviewed visually and metadata-stripped.

## Phases

### Phase A — nav item + bilingual landing (both cards `coming_soon`)
- Nav: add `{ href: '/sandbox', key: 'sandbox' }` to `navLinks` in `components/marketing/nav/marketing-nav.tsx` (mobile free; teal accent default). Footer link in `marketing-footer.tsx` (~line 63). `'/sandbox'` into `MARKETING_PATHS` (`lib/marketing-routes.ts`) and `app/sitemap.ts`.
- Page: `app/[locale]/sandbox/page.tsx` + `components/marketing/sandbox/{hero,demo-grid,demo-card,method-strip,index}.tsx` + `lib/sandbox/demos.ts`. **Hero voice: action** (bold DM Sans) — try-it energy; editorial stays Explore's voice.
- Card: browser-frame screenshot via `next/image` (**WebP/AVIF, responsive sizes** — not PNG), name, tagline, stack chips, "Simulated data" pill, Coming-soon state firing `trackSandboxDemoInterest` (new helper in `lib/analytics.ts`).
- Images: MilesChaser screenshot capturable now (its mock fixtures are fictional — confirm visually). **HealthHub card ships a stylized placeholder** until Phase C (leakage rule above).
- i18n: `nav.sandbox` + `sandbox` namespace (`meta`, `hero`, `demos.<key>.{name,tagline,alt}`, `card.{launch,coming_soon,simulated,en_only}`, `method`) in `messages/en.json` + `ja.json`.
- **Done:** `/sandbox` + `/ja/sandbox` bilingual with nav/footer + active state + metadata/alternates/OG verified in rendered HTML; sitemap contains exactly the two localized landing entries and no demo entries (assert in the existing sitemap/marketing-routes test if present, else add); `pnpm lint` + `pnpm verify` green; EN + /ja browser smoke.
- Separately (own maintenance commit, not in this phase's diff): correct CLAUDE.md's stale "Next 14 / Tailwind 3.4" to Next 16 / React 19 / Tailwind v4.

### Phase B — MilesChaser port (deps: `swr`, `recharts`, `date-fns` + inventory)
- **Step 1: route-resolution spike** (matcher edit + `/ja/sandbox/<demo>` redirect + stub page + the 4-case prod-build verification + matcher regex test). Only then port.
- Slice: dashboard (chart, QM/QS/QD bars, pacing), trips list/new/[id], path-to-gold, micro-vacations. Skip auth/admin/billing/OCR/CSV/notifications.
- Files: `middleware.ts`; `app/sandbox/miles-chaser/{layout,page,trips/*,path-to-gold,micro-vacations}`; `components/sandbox/demo-chrome.tsx`; `components/sandbox/miles-chaser/{nav (4 links),dashboard/*,trips/*,micro-vacations/*,hooks/*,miles-chaser.css}`; `lib/sandbox/miles-chaser/{mock-data,store,engine/*}.ts` + store contract tests. Internal absolute links get the `/sandbox/miles-chaser` prefix; drop `/ocr`,`/audit` quick actions.
- **Done:** launch from landing → dashboard with real SWR loading states; trip create→appears in list→detail by new id→delete→empty-state renders; projection updates after changes; reload keeps tab state, new tab starts fresh; chrome + noindex-in-HTML + Plausible + Vercel Analytics verified; registry flipped `live`; **final screenshot recaptured from the running demo**; QA checklist (below) passed; `pnpm lint` + `pnpm verify` green.

### Phase C — HealthHub port (deps: inventory-derived, listed above)
- Slice: 6 tabs + P&L sidebar + ExpenseDonut + canned AI. Login dropped; composition per the provider design above.
- Files: `app/sandbox/health-hub/{layout,providers,page}`; `components/sandbox/health-hub/{dashboard (de-routered, fictional wordmark),~20 tab/report/provider files,ui/*,mock-api,types,health-hub.css}`; `lib/sandbox/health-hub/{seed,canned-analysis}.ts`; `styles/sandbox-demos.css` + import; mock-api contract tests + `revenue-groups.test.ts`.
- **Done:** all tabs interactive; scratch-vs-current delta + dirty badge; scenario lifecycle incl. deleting the active scenario; canned AI success + failure states; malformed numeric input handled; print reports correct (chrome hidden, source print CSS working, afterprint cleanup); **anonymization gate (manifest scan of tree + built output, image review, collision check) passed**; marketing-shell CSS regression sweep passed; registry flipped `live`; screenshot captured from sanitized demo; QA checklist passed; `pnpm lint` + `pnpm verify` green.

## QA checklist (Phases B/C — repeatable manual list; Playwright out of scope for now)
- Interactions: every promised flow above, plus deep-link refresh on inner routes.
- Accessibility (site is WCAG 2.1 AA): keyboard operation of tabs/selects/sliders + visible focus + focus return from dialogs/selects; chart text alternative; contrast in both demo themes; 44px touch targets; no mobile horizontal overflow; `prefers-reduced-motion` respected; "Simulated data" meaningful to screen readers.
- Performance: demo chunks inspected (`next build` output) — recharts/radix/react-query confined to demo routes; landing meets existing Lighthouse budgets; images optimized.
- Visual: v3→v4 drift sweep per ported screen; EN + /ja landing.

## Explicitly out of scope (rejected review items, with reasons)
- Playwright/E2E infra — repo is vitest-only; manual checklist + contract tests cover a demo showcase. Revisit if demos become products.
- Exhaustive query-string/API contract matrices and full failure-state matrix — no server API exists anymore (client store), and fixtures are controlled; the realistic cases are in the done criteria.
- Extra registry fields (launch dates, preview dimensions, theme options) — YAGNI until a demo needs them.
- sendBeacon/tracked-redirect launch instrumentation — unnecessary once launches are demo pageviews.
