# Unit 2a — Learn catalog (prerendered) + retire /free-lesson and the /sandbox landing

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Status:** SHIPPED 2026-10-18 as a30e73b (pushed, live). See "Execution record" at the end.
**Baseline:** `main` at `5e0e141` (Slice E). The execution session re-checks `origin/main` first; another session pushes to main.
**Roadmap:** `docs/plans/2026-10-05-marketing-redesign-green.md` §Unit 2 + review amendments. Its locked decisions are not reopened. Unit 2 is split (Ryan, 2026-10-18): **2a = `/learn` catalog + retirements (this plan)**; **2b = course detail `/learn/[slug]`, after B3** (needs `hasCourseAccess` + migration 081).
**Design source of truth:** `docs/design_2026_green/pages/02 Learn - Catalog.dc.html` (README §02 at `README.md:157-162`, screenshot `screenshots/02 Learn - Catalog.png`). Line refs below (`:NN`) are into that `.dc.html`.

**Goal:** Replace the old multi-chapter `/learn` with the green catalog page — Vault lessons + public courses in one filterable grid — served as a prerendered (ISR) page, and retire `/free-lesson` and the `/sandbox` landing with redirects to `/learn`.

**Architecture:** The page is a Server Component with only cached, cookieless reads (`getPublicCatalog()` + a new `getPublicCourseCatalog()` over the anon-readable `course_catalog` view + `getPublishedTestimonials`). It builds a serializable `LearnCatalogEntry[]` and hands it to client islands. Filter state (`track`, `q`, `free`) lives in one tiny URL-synced store (`useSyncExternalStore` over `location.search` + `history.replaceState`), read **after hydration** — the page never reads `searchParams`, so it stays `●`.

**Tech Stack:** Next.js 16 App Router, next-intl, Tailwind v4 `--hv-*` tokens, `components/marketing/hv/*`, Supabase anon client + `unstable_cache`, Vitest + Testing Library.

**Spec:** the roadmap Unit 2 section + the design file above. **No migration.**

## Global Constraints

- Every server read on the page is cookieless and cached. Forbidden in the page's import graph: `next/headers`, `cookies(`, the cookie-bound `createClient` from `@/lib/supabase/server`, `getVaultTrending`, `searchParams`. (Enforced by a static-guard test, Task 5.)
- Public course reads go through the **`course_catalog` view with an explicit column list** — never `select('*')`, never `zoom_link`/`community_link`/`proposal_*`/`esl_settings_json`/`instructor_revenue_share_pct`. Anon can no longer read raw `courses` (since 5e0e141).
- New UI only uses `components/marketing/hv/*` and `--hv-*` tokens; no hardcoded colours, no inline styles except the design's per-card cover tones expressed as hv tokens/classes.
- Server Components by default; `'use client'` only for the islands named below. Named exports, kebab-case files.
- Touch targets ≥ 44px; inputs ≥ 16px font; text ≥ 12px; WCAG AA in the hv palette; `prefers-reduced-motion` honoured (rotator static, no smooth scroll, no hover lift).
- JA: headings `[word-break:auto-phrase]`, body line-height 1.75, letter-spacing 0 on headings; all JA copy is machine-drafted and flagged for native review.
- Never ship design placeholders: "Illustrative lesson previews…" note (`:147`), "Placeholder Name" quotes (`:339`), "Drop an image" slots.
- Redirects: 307 (`permanent: false`), each with a `/ja` twin, sources **exactly** `/free-lesson`, `/ja/free-lesson`, `/sandbox`, `/ja/sandbox` — never `/sandbox/:path*` (would swallow the demo apps and `/sandbox/*.webp`).
- pnpm only. Build/type-check with `NODE_OPTIONS=--max-old-space-size=8192`; tests without it. Gates one at a time (8 GB machine). Never pipe a gate through `| tail` (masks exit codes).

## Review Focus

1. **Deep link `/learn?track=marketing_growth` on a prerendered page** (Home links to it, `home-panel-learn.tsx:31,80`): the grid must show that track after hydration; an invalid `?track=nope` falls back to "All tracks" without throwing. → Task 3 tests.
2. **Partial or failed data:** catalog/courses fetch errors return `[]`; the page still renders, the free feature card and hot topics hide, the empty state shows. → Task 4 tests.
3. **`/ja` with missing JA fields:** `title_jp`/`description_jp` null → EN fallback; search matches whichever text is displayed. → Task 2 tests.
4. **Search input edge cases:** whitespace-only, regex metacharacters (`c++ (beta)`), 500-char paste, full-width JA characters — no crash, trimmed, capped at 100 chars, case-insensitive, NFKC-normalised. → Task 2 tests.
5. **Paid data never reaches the page:** the course reader's select string contains no link/staff column. → Task 1 test asserts the exact column list.

---

## 1. Dependencies (verified 2026-10-18)

| Needs | State |
|---|---|
| B2 (`track`, `getPublicCatalog`, `tracks` i18n) | Shipped f619bc7; `lib/vault/catalog.ts:61-89` (anon, `unstable_cache` 600 s, tag `vault-catalog`, `partner_id IS NULL`, explicit columns, no `url`/`embed_url`) |
| `course_catalog` readable by anon with `track`, `vault_included` | Shipped 5e0e141 (085/086 on prod, verified) |
| 0A hv primitives, 0B chrome, Unit 1 patterns | Shipped; Home (`app/[locale]/page.tsx`) is the composition template |
| B3 (`hasCourseAccess`) | **Not built — not needed by 2a** |

## 2. Today

- `app/[locale]/learn/page.tsx` is `ƒ` because it awaits `searchParams` (`?owner=`, `:43-45`) and calls four cookie-client readers (`lib/courses/queries.ts:29,89`, `lib/vault/queries.ts:175,218`). It renders legacy `components/marketing/learn/*` chapters on the old shell.
- Everything in `components/marketing/learn/` is imported only by that page and `__tests__/marketing/learn/learn-sections.test.tsx` (`learn-partnership-brief.tsx` is already orphaned). `components/marketing/proof-band.tsx` is shared with `/about` — **keep it**.
- `PartnerFilterChips` (`?owner=`) stays on `/learn/vault` and `/learn/vault/series`; `/learn` drops the owner filter.
- Prod data (Unit 1 §2, 2026-10-13): 27 published Vault items — 8 free (4 in ai_essentials), 11 single-language, 16 with NULL `duration_minutes`, newest published 2026-03-15. Public courses (published, not private) on 2026-10-18: **1** (`ai-essentials-first-steps-future`).
- Lesson detail = `/learn/vault/[slug]` (public route, gates the body itself); course detail = `/learn/[slug]`.

**Working-tree hazards (main tree, never stage these hunks):** `next.config.ts` (unrelated `allowedDevOrigins` hunk), `app/sitemap.ts` (unrelated rewrite that also *adds* `/learn` and changes the return shape), `messages/en.json` + `ja.json` (auth keys), `middleware.ts`, `app/[locale]/layout.tsx`, `components/layout/conditional-nav.tsx`, the dirty marketing nav files, untracked `components/marketing/home/hero.tsx`. 2a edits only the first four of these, and only by applying 2a's hunks — see §6.

## 3. Design ↔ reality

| # | Design says | Reality | Handling |
|---|---|---|---|
| F1 | Grid of sample "lessons" with fixed cover phrases, lesson counts | Real items are single Vault items + courses | Cards from data (D1); no cover phrase — cover shows track label + title initials-free tone block |
| F2 | "Every lesson … in English and 日本語" (`:50`, FAQ `:340`) | 11/27 single-language | Soften (D2) |
| F3 | "updated weekly", "New lessons land every month" | Newest item 2026-03-15 | Soften (D2) |
| F4 | Hot topics = 4 static fictional lessons (`:326-331`) | Those lessons don't exist | Real items (D3) |
| F5 | Free feature card fixed copy "Ten prompts you'll reuse every week" | — | First free item's own title/blurb (D4) |
| F6 | Study-path goal links with lesson counts (`:363-368`) | Counts fictional | Goal links set the track filter; no counts (D5) |
| F7 | Meta `{len} · {level}` | 16/27 NULL duration | `N min` → else content-type label; courses `N weeks`; level when known (D6) |
| F8 | Two-letter newsletter | Locked decision #10 | `MarketingNewsletter source="learn"` as Home does |
| F9 | Placeholder testimonials | Decision #11; prod had 0 proof rows | `getPublishedTestimonials(3)` with the `social_proof.testimonials.*` fallback the auth layout already uses |
| F10 | "Inside every lesson" lists video + guide + templates + Workbench task | Not every item has all four | Reword (D2) |
| F11 | Hot chips "Second brain / Automation / Prompts" | May match nothing | i18n array; executor verifies each returns ≥ 1 result on prod data before ship, swaps any that don't |

## 4. Decisions for Ryan (recommendations marked)

- **D1 — Grid = Vault lessons + public courses, one list.** Courses carry a small "Course" tag and link to `/learn/<slug>`; lessons link to `/learn/vault/<slug>`. Order: lessons in `getPublicCatalog` order (track order), courses appended after lessons of the same track. *Recommended.*
- **D2 — EN copy softenings** (Ryan signs off before commit):

  | Where | Design | Recommended |
  |---|---|---|
  | Hero lead | "Every lesson we've made, organized by track, in English and 日本語. Search for what you need this week." | "Every lesson we've published, organized by track — many in both English and 日本語. Search for what you need this week." |
  | Hot topics H2 / right label | "What members are learning this week" / "Short lessons · updated weekly" | "Good places to start" / "Short, practical lessons" |
  | Empty state | "Nothing matches yet. New lessons land every month." | "Nothing matches yet. Try another track or clear the filters." |
  | FAQ "Are lessons available in Japanese?" | "Every lesson exists in English and 日本語…" | "Many lessons are in both English and 日本語, and we're adding Japanese versions of the rest." |
  | FAQ "How often are lessons updated?" | cadence claim | "We add new lessons and refresh existing ones as tools change." |
  | Sidebar light card | "Inside every lesson" | "What a lesson can include" |
  | Pricing strip | design copy verbatim (true today) | keep |
- **D3 — Hot topics = 4 real lessons:** featured first, then newest `publish_date`, lessons only. Section hides if < 2. *Recommended.*
- **D4 — Free feature card = first free lesson**, preferring `ai_essentials`, then featured. Shows that item's title + blurb, badge "Free lesson", meta "{track label}". Hidden when no free lesson exists; the pricing-strip CTA then points to `/signup`. *Recommended.*
- **D5 — Study paths card:** the four goal sentences stay (i18n array, each mapped to a `TrackId`); clicking sets the track filter and scrolls to `#catalog`. No lesson counts. *Recommended.*
- **D6 — Card meta:** lessons `"{n} min"` when `duration_minutes`, else the content-type label; courses `"{n} weeks"` when `total_weeks`; append ` · {level}` when known. Free badge: lesson `access_tier === 'free'`; course `price_usd === 0 && price_jpy === 0`.
- **D7 — Pricing strip gets a second, outline button "Join the Vault" → `/api/stripe/subscribe?tier=vault`** next to the design's amber "Try a free lesson →". The Vault is the primary conversion goal (CLAUDE.md). *Recommended;* Ryan may keep the design's single button.
- **D8 — `?owner=` on `/learn` is dropped** (no inbound links; the owner chips live on `/learn/vault`). Old `?owner=` URLs just render the full catalog.
- **D9 — Course data staleness:** courses are cached 600 s (tag `course-catalog`); admin course edits show within 10 minutes. No admin `revalidateTag` wiring in 2a. *Recommended.*
- **D10 — Sitemap:** HEAD's sitemap has no `/learn`; the dirty WIP in main adds it. 2a only removes `/sandbox` and does not add `/learn` (avoids colliding with that WIP). *Recommended;* alternative: Ryan ships the sitemap WIP first.
- **D11 — Sandbox demo chrome links** (`components/sandbox/demo-chrome.tsx:41,80`, brand + "Exit", currently `/sandbox`) → `/`. *Recommended.*

## 5. File map

Create
- `lib/learn/public-courses.ts` — `getPublicCourseCatalog()` (Task 1)
- `lib/learn/catalog.ts` — entry type, builder, filter, URL params, pickers (Task 2)
- `components/marketing/learn/catalog-state.ts` — client store (Task 3)
- `components/marketing/learn/{learn-hero,learn-search,learn-free-card,learn-hot-topics,learn-catalog,learn-catalog-card,learn-sidebar,learn-faq,learn-pricing-strip,index}.tsx` (Task 4)
- Tests: `__tests__/lib/learn/public-courses.test.ts`, `__tests__/lib/learn/catalog.test.ts`, `__tests__/marketing/learn/catalog-state.test.ts`, `__tests__/marketing/learn/learn-sections.test.tsx` (rewrite), `__tests__/marketing/learn/learn-static-guard.test.ts`, `__tests__/config/retired-redirects.test.ts`

Rewrite: `app/[locale]/learn/page.tsx`

Delete (grep-confirm each has no other importer first): every current file in `components/marketing/learn/` (`learn-hero`, `learn-chapter-{vault,courses,cohorts}`, `courses-catalog-client`, `learn-vault-{preview,preview-cards,sample}`, `learn-faq`, `learn-start-tonight`, `learn-partnership-brief`, `index`); `app/[locale]/free-lesson/`, `app/api/free-lesson/`, `components/marketing/free-lesson/`, `lib/free-lesson/`; `app/[locale]/sandbox/page.tsx`, `components/marketing/sandbox/`, `lib/sandbox/demos.ts`, `public/sandbox/{miles-chaser,health-hub}.webp` (only if `grep -r "sandbox/miles-chaser.webp\|health-hub.webp"` finds no other user); `trackFreeSampleStarted` in `lib/analytics.ts:32-37`.

Edit: `next.config.ts` (4 redirects), `app/sitemap.ts` (−`/sandbox`), `lib/marketing-routes.ts` (−`/free-lesson`, −`/sandbox`), `components/sandbox/demo-chrome.tsx` (D11), `messages/{en,ja}.json` (new `learn_catalog`; delete the marketing-only `learn.*` subtrees and `sandbox` + `nav.sandbox`), tests `__tests__/marketing/marketing-routes.test.ts`, `__tests__/marketing/sandbox-sitemap.test.ts`.

Not edited: `app/sandbox/**` demo apps, `middleware.ts`, `components/learn/*`, `components/marketing/proof-band.tsx`, `lib/courses/queries.ts`, the shared root of the `learn` i18n namespace.

## 6. Ship mechanics (same as Slice E / Unit 1)

Build in a clean worktree from `origin/main` (hoisted `.npmrc`, copy `.env.local`, `pnpm install`). Ship: worktree `git add -A -- . ':!.npmrc'` → `git diff --cached --binary HEAD > 2a.patch` → in main `git apply --cached 2a.patch`, `git diff --cached --stat` eyeballed (no auth/WIP paths), `git write-tree` equals the worktree tree → commit + push in one command. Then bring main's working copy in line: for files clean in main, `git checkout -- <paths>`; for the four dirty files (`next.config.ts`, `app/sitemap.ts`, `messages/en.json`, `messages/ja.json`) run `git diff <baseline> HEAD -- <file> | git apply` on the working tree (2a's hunks don't overlap the WIP; if one does, stop and tell Ryan). Confirm `git status` shows only the pre-existing WIP.

---

## Tasks

### Task 1: Cached, cookieless public course reader

**Files:**
- Create: `lib/learn/public-courses.ts`
- Test: `__tests__/lib/learn/public-courses.test.ts`

**Interfaces:**
- Produces: `export type PublicCourse = Pick<Course, 'id'|'slug'|'title_en'|'title_jp'|'description_en'|'description_jp'|'level'|'language'|'total_weeks'|'thumbnail_url'|'price_usd'|'price_jpy'|'is_featured'|'created_at'> & { track: TrackId | null; vault_included: boolean }`; `export const PUBLIC_COURSE_COLUMNS: string`; `export const COURSE_CATALOG_TAG = 'course-catalog'`; `export const getPublicCourseCatalog: () => Promise<PublicCourse[]>`.

- [ ] **Step 1: Write the failing tests** (mock `@supabase/supabase-js` `createClient` and `next/cache` `unstable_cache` as identity, as `__tests__/lib/vault/catalog.test.ts` does):
  - `reads course_catalog with the exact public columns` — `from` called with `'course_catalog'`; `select` called with `PUBLIC_COURSE_COLUMNS`; `PUBLIC_COURSE_COLUMNS.split(',').map(s => s.trim())` equals `['id','slug','title_en','title_jp','description_en','description_jp','level','language','total_weeks','thumbnail_url','price_usd','price_jpy','is_featured','created_at','track','vault_included']`; and for each of `zoom_link, community_link, proposal_review_notes, esl_settings_json, instructor_revenue_share_pct, '*'` the string does not contain it.
  - `filters published, non-private` — `.eq('is_published', true)` and `.eq('is_private', false)` both called; ordered `created_at` desc.
  - `returns [] and logs on error` — query resolves `{ data: null, error: { message: 'x' } }` → `[]`, `console.error` called once.
  - `caches under the course-catalog tag for 600s` — `unstable_cache` called with key `['learn-public-courses']` and `{ revalidate: 600, tags: ['course-catalog'] }`.
- [ ] **Step 2: Run** `pnpm vitest run --project app __tests__/lib/learn/public-courses.test.ts` — Expected: FAIL (module not found).
- [ ] **Step 3: Implement** `getPublicCourseCatalog` with the inline anon client exactly like `lib/vault/catalog.ts:64-68` (`createClient(NEXT_PUBLIC_SUPABASE_URL, NEXT_PUBLIC_SUPABASE_ANON_KEY, { auth: { persistSession: false } })`) inside `unstable_cache`.
- [ ] **Step 4: Run** the same command — Expected: 4/4 PASS.
- [ ] **Step 5: Commit** (worktree) `feat(learn): cached anon course_catalog reader`.

### Task 2: Catalog model — entries, filter, URL params, pickers

**Files:**
- Create: `lib/learn/catalog.ts`
- Test: `__tests__/lib/learn/catalog.test.ts`

**Interfaces:**
- Consumes: `PublicCatalogItem` (`lib/vault/catalog.ts:20-38`), `PublicCourse` (Task 1), `TrackId`, `isTrackId` (`lib/tracks.ts`).
- Produces:
  ```ts
  export type CatalogMeta = { kind: 'minutes' | 'weeks'; value: number } | { kind: 'type'; value: string } | null;
  export type LearnCatalogEntry = {
    kind: 'lesson' | 'course'; id: string;
    href: string;            // '/learn/vault/<slug>' | '/learn/<slug>' — locale-less, rendered via next-intl Link
    title: string; blurb: string;   // locale-resolved, EN fallback
    track: TrackId | null; free: boolean; featured: boolean; publishedAt: string | null;
    meta: CatalogMeta; level: 'beginner' | 'intermediate' | 'advanced' | null;
    coverTone: 0 | 1 | 2 | 3 | 4 | 5;  // stable: hash of id mod 6
  };
  export type CatalogState = { track: TrackId | 'all'; query: string; freeOnly: boolean };
  export const DEFAULT_CATALOG_STATE: CatalogState;
  export function buildLearnCatalog(items: PublicCatalogItem[], courses: PublicCourse[], locale: 'en' | 'ja'): LearnCatalogEntry[];
  export function normalizeQuery(raw: string): string;          // NFKC, trim, collapse spaces, lowercase, max 100 chars
  export function filterCatalog(entries: LearnCatalogEntry[], state: CatalogState, trackLabel: (t: TrackId) => string): LearnCatalogEntry[];
  export function parseCatalogParams(search: string): CatalogState;   // '?track=&q=&free=1'
  export function serializeCatalogParams(state: CatalogState): string; // '' for defaults, else '?…' (no empty keys)
  export function pickFreeFeature(entries: LearnCatalogEntry[]): LearnCatalogEntry | null;
  export function pickHotTopics(entries: LearnCatalogEntry[], n: number): LearnCatalogEntry[];
  ```

- [ ] **Step 1: Write the failing tests:**
  - `buildLearnCatalog`: lesson → `href '/learn/vault/s1'`, `kind 'lesson'`, `free` true iff `access_tier==='free'`; course → `href '/learn/c1'`, `free` true iff both prices 0; on `'ja'` uses `title_jp`/`description_jp`, falls back to EN when null; courses placed after the lessons of the same track and untracked entries last; `meta` = `{kind:'minutes',value:12}` for duration 12, `{kind:'type',value:'video'}` when duration null, `{kind:'weeks',value:4}` for a 4-week course, `null` when neither; unknown `difficulty_level` → `level null`; `coverTone` identical across two calls for the same id.
  - `normalizeQuery`: `'  Second   BRAIN '` → `'second brain'`; full-width `'ＡＩ'` → `'ai'`; 500-char string → length 100; `'   '` → `''`.
  - `filterCatalog`: track filter; `freeOnly`; query matches title, blurb, or the track label (`trackLabel('ai_essentials') === 'AI Essentials'` → query `'essentials'` matches an untitled-match ai_essentials entry); `'c++ (beta)'` does not throw; empty query = no text filter; filters combine (AND).
  - `parseCatalogParams`: `'?track=marketing_growth&q=seo&free=1'` → `{track:'marketing_growth',query:'seo',freeOnly:true}`; `'?track=nope'` → track `'all'`; `''` → defaults; `q` normalised.
  - `serializeCatalogParams`: defaults → `''`; round-trip `parse(serialize(s))` equals `s` for 3 states.
  - `pickFreeFeature`: prefers free `ai_essentials` lesson, then featured free lesson, then first free lesson; ignores courses; `null` when none.
  - `pickHotTopics(entries, 4)`: lessons only, featured first then `publishedAt` desc (nulls last), length ≤ 4.
- [ ] **Step 2: Run** `pnpm vitest run --project app __tests__/lib/learn/catalog.test.ts` — Expected: FAIL (module not found).
- [ ] **Step 3: Implement** in `lib/learn/catalog.ts` (pure, no React, no I/O). Query matching = `normalizeQuery(text).includes(normalizedQuery)` — plain substring, never `RegExp`. `coverTone` = sum of char codes of `id` mod 6.
- [ ] **Step 4: Run** the same command — Expected: all PASS.
- [ ] **Step 5: Commit** `feat(learn): catalog model, filter and URL params`.

### Task 3: URL-synced filter store (client)

**Files:**
- Create: `components/marketing/learn/catalog-state.ts` (`'use client'`)
- Test: `__tests__/marketing/learn/catalog-state.test.ts`

**Interfaces:**
- Consumes: `CatalogState`, `DEFAULT_CATALOG_STATE`, `parseCatalogParams`, `serializeCatalogParams` (Task 2).
- Produces: `export function useCatalogState(): CatalogState;` `export function setCatalogState(patch: Partial<CatalogState>, opts?: { scroll?: boolean }): void;` `export function resetCatalogState(): void;` `export function __resetCatalogStoreForTests(): void`. The server snapshot is `DEFAULT_CATALOG_STATE` (so SSR/prerender renders the full catalog); the client snapshot is read from `window.location.search` on first subscribe.

- [ ] **Step 1: Write the failing tests** (jsdom; `renderHook`):
  - `server snapshot is the default` — `getServerSnapshot` path returns `DEFAULT_CATALOG_STATE` (assert via the exported store's server getter or by rendering with `react-dom/server` `renderToString`).
  - `hydrates from ?track= after mount` — set `window.history.replaceState({}, '', '/learn?track=marketing_growth')`, render hook → `track === 'marketing_growth'`.
  - `invalid track falls back` — `?track=nope` → `'all'`.
  - `setCatalogState writes the URL without navigation` — spy `history.replaceState`; `setCatalogState({ query: 'seo' })` → called with a URL ending `/learn?q=seo`; `window.location.pathname` unchanged; all subscribers re-render with the new state.
  - `resetCatalogState clears the query string` — URL becomes `/learn`.
  - `scroll option scrolls #catalog` — with a `#catalog` element and `matchMedia('(prefers-reduced-motion: reduce)')` false → `scrollIntoView({ behavior: 'smooth' })`; when reduced → `behavior: 'auto'`.
  - `preserves the /ja prefix` — path `/ja/learn` stays `/ja/learn?…`.
- [ ] **Step 2: Run** `pnpm vitest run --project app __tests__/marketing/learn/catalog-state.test.ts` — Expected: FAIL.
- [ ] **Step 3: Implement** a module-level store (listeners set + cached snapshot) consumed through `useSyncExternalStore(subscribe, getSnapshot, () => DEFAULT_CATALOG_STATE)`. Writes use `history.replaceState(history.state, '', pathname + serialize(state) + hash)` — never `router.replace` (that would re-request the RSC payload).
- [ ] **Step 4: Run** — Expected: all PASS.
- [ ] **Step 5: Commit** `feat(learn): URL-synced catalog filter store`.

### Task 4: Page sections + `learn_catalog` i18n

**Files:**
- Delete: all current `components/marketing/learn/*` except `catalog-state.ts` (grep-confirm importers first: only `app/[locale]/learn/page.tsx` and the old test)
- Create: `components/marketing/learn/{learn-hero,learn-search,learn-free-card,learn-hot-topics,learn-catalog,learn-catalog-card,learn-sidebar,learn-faq,learn-pricing-strip,index}.tsx`
- Modify: `messages/en.json`, `messages/ja.json` (Node script against the worktree copies — the worktree is clean)
- Test: rewrite `__tests__/marketing/learn/learn-sections.test.tsx`

**Interfaces:**
- Consumes: Tasks 2–3; `HvSection`, `HvContainer`, `HvBreadcrumb`, `HvHeading`, `HvEyebrow`, `HvButton`, `HvCard`, `HvPillToggle`, `HvRotatingWord`, `HvFaqAccordion`, `HvTestimonialCarousel`, `HvCtaBand` (`components/marketing/hv/index.ts`).
- Produces (all named exports from `index.ts`):
  - `LearnHero({ freeFeature: LearnCatalogEntry | null })` — server. Dark `HvSection variant="dark" spacing="hero"`, `pt-[108px]` like `/build`; `HvBreadcrumb` Home / Learn; `HvHeading level="h1-lg"` "Learn in the Vault"; rotator line "Finish a lesson with" + `HvRotatingWord` (interval 2800, fixed min-height so swaps don't shift layout); lead (D2); `<LearnSearch/>`; hot chips; `<LearnFreeCard entry={freeFeature}/>` (renders nothing when null).
  - `LearnSearch()` — client. `<form role="search">`, `<input type="search">` 60px tall, ≥16px font, placeholder "Search lessons, tools or topics", `aria-label` "Search lessons", amber submit "Search" → `setCatalogState({ query }, { scroll: true })`. Hot chips (eyebrow "Hot" with pulsing dot) from `learn_catalog.hero.hot_chips` (`t.raw` array of `{label, query}`) → `setCatalogState({ query, track: 'all' }, { scroll: true })`.
  - `LearnHotTopics({ topics: LearnCatalogEntry[] })` — server; returns `null` when `topics.length < 2`; numbered cards "01"… with meta, title, blurb, "Open →" linking to `entry.href`.
  - `LearnCatalog({ entries: LearnCatalogEntry[] })` — client, `id="catalog"`. Track chips "All tracks" + five (`HvPillToggle tone="light"`, `aria-pressed`), switch "Free lessons only" (`role="switch"`, `aria-checked`), result headline (`Results for “{query}”` / all-tracks heading / `{label}: {blurb}` from `tracks.*`), count with ICU plural `{count, plural, one {# lesson} other {# lessons}}`, grid `auto-fill minmax(min(100%,228px),1fr)` gap 20px, empty state (D2) + "Clear filters" → `resetCatalogState()`. Live region `aria-live="polite"` on the count.
  - `LearnCatalogCard({ entry: LearnCatalogEntry })` — server-safe component: cover (150px, tone class `hv-cover-{0..5}` mapped to existing `--hv-*` cover tints), track label, "Free" badge, "Course" tag for courses, title (h3), blurb (2-line clamp), CTA "Try it free →" / "Start this →", meta (D6). Whole card is one link; hover lift 4px disabled under reduced motion.
  - `LearnSidebar()` — client (sticky `top-[88px]` on ≥ lg). Dark card "Study paths" / "Lessons, in order" / "Pick the goal that sounds like you." + 4 goal buttons from `learn_catalog.sidebar.goals` (`{label, track}`) → `setCatalogState({ track, query: '', freeOnly: false }, { scroll: true })`. Light card "What a lesson can include" with 4 parts.
  - `LearnFaq({ quotes: { text: string; name: string; org: string }[] })` — server wrapper: eyebrow "Questions", H2 "Before you start.", `HvTestimonialCarousel tone="light"` (hidden when `quotes.length === 0`), `HvFaqAccordion items={6 from t.raw} defaultOpen={0}`.
  - `LearnPricingStrip({ freeHref: string })` — `HvCtaBand tone="sand"` with the design title/body; amber "Try a free lesson →" → `freeHref`; outline "Join the Vault" → `/api/stripe/subscribe?tier=vault` (D7; `HvButton` renders `/api/` as plain `<a>` so `/ja` is not prefixed).
- i18n: new top-level `learn_catalog` namespace — `meta.{title,description}`, `hero.{breadcrumb_home,breadcrumb_learn,title,rotator_prefix,rotator_items[4],lead,search_placeholder,search_label,search_button,hot_label,hot_chips[3]}`, `free_card.{badge,cta}`, `hot_topics.{eyebrow,title,aside,open}`, `catalog.{eyebrow,title,all_heading,results_for,count,free_only,empty,clear,course_tag,free_badge,cta_free,cta_start,minutes,weeks,levels.{beginner,intermediate,advanced},types.*}`, `sidebar.{eyebrow,title,sub,goals[4],inside_title,inside_parts[4]}`, `faq.{eyebrow,title,items[6]}`, `pricing.{title,body,cta_free,cta_vault}`. EN = design copy with the D2 table applied; JA machine-drafted. Delete the marketing-only `learn.{meta,hero,chapter_vault,chapter_courses,chapter_cohorts,partnership_brief,faq,start_tonight,courses_catalog}` after `grep -rn "learn\.\(meta\|hero\|chapter_\|partnership_brief\|faq\|start_tonight\|courses_catalog\)" app components lib` shows no consumer outside the deleted files. Keep every other `learn.*` key.

- [ ] **Step 1: Write the failing tests** in `learn-sections.test.tsx` (NextIntlClientProvider with the real `messages/en.json`; a fixture of 6 entries across 3 tracks, 2 free, 1 course):
  - hero renders h1 "Learn in the Vault", a `searchbox` named "Search lessons", and the free card title from the fixture; free card absent when `freeFeature={null}`.
  - submitting "seo" in the search updates the grid to matching cards only and the URL to `?q=seo`.
  - clicking the "Marketing & Growth" chip → `aria-pressed="true"`, only that track's cards, headline = `tracks.marketing_growth.label: …blurb`.
  - "Free lessons only" switch → only free cards; count text "2 lessons".
  - a query with no match → empty-state text (D2) + "Clear filters" restores all 6 and URL `/learn`.
  - sidebar goal click sets the mapped track.
  - course card shows "Course" tag and links to `/learn/<slug>`; lesson card links to `/learn/vault/<slug>`.
  - `LearnHotTopics` with 1 entry renders nothing.
  - FAQ: 6 questions, first open; carousel absent when `quotes=[]`.
  - pricing strip: "Join the Vault" is a plain anchor with `href="/api/stripe/subscribe?tier=vault"`.
  - no `console.error` during render of the full page tree.
  - `messages/en.json` and `ja.json` both contain every `learn_catalog` key (rely on the existing `__tests__/i18n/message-parity.test.ts`; add no duplicate).
- [ ] **Step 2: Run** `pnpm vitest run --project app __tests__/marketing/learn/learn-sections.test.tsx` — Expected: FAIL (components missing).
- [ ] **Step 3: Implement** the components and the i18n script. Mark headings `[word-break:auto-phrase]` for JA. Use `data-intro` on hero children and `data-reveal` on sections (HvReveal is mounted once by the page).
- [ ] **Step 4: Run** the test file, then `pnpm vitest run --project app __tests__/i18n` — Expected: PASS.
- [ ] **Step 5: Commit** `feat(learn): green catalog sections + learn_catalog copy`.

### Task 5: Page assembly, metadata, prerender guard

**Files:**
- Rewrite: `app/[locale]/learn/page.tsx`
- Create: `__tests__/marketing/learn/learn-static-guard.test.ts` (copy of `__tests__/marketing/home/home-static-guard.test.ts` with `PAGE = 'app/[locale]/learn/page.tsx'`, same forbidden list plus `searchParams`)

**Interfaces:**
- Consumes: Tasks 1, 2, 4; `getPublicCatalog`, `getPublishedTestimonials`, `MarketingShell`, `MarketingNav`, `MarketingNewsletter`, `MarketingFooter`, `HvReveal`.
- Produces: the route. `generateMetadata({ params })` → `learn_catalog.meta` title/description + `alternates: { canonical: '/learn' | '/ja/learn', languages: { en: '/learn', ja: '/ja/learn' } }` (match `app/[locale]/build/page.tsx:20-27`).

- [ ] **Step 1: Write the guard test**; run `pnpm vitest run --project app __tests__/marketing/learn/learn-static-guard.test.ts` — Expected: FAIL against the old page (it imports `@/lib/supabase/server` via `lib/courses/queries`).
- [ ] **Step 2: Rewrite the page:** `setRequestLocale(locale)`; `const [items, courses, proof] = await Promise.all([getPublicCatalog(), getPublicCourseCatalog(), getPublishedTestimonials(3)])`; `entries = buildLearnCatalog(items, courses, locale)`; quotes = proof mapped like Home's `toHomeProofQuote`, else the `social_proof.testimonials.{one,two,three}` fallback (auth layout precedent `app/[locale]/(auth)/layout.tsx:19-24`); render `MarketingShell theme="hv"` → `MarketingNav` (default CTA) → `<main>`: `LearnHero` (free = `pickFreeFeature`), `LearnHotTopics` (`pickHotTopics(entries, 4)`), catalog section (two-column grid: `LearnCatalog` + `LearnSidebar`), `LearnFaq`, `LearnPricingStrip` (`freeHref` = free feature href or `/signup`) → `MarketingNewsletter source="learn"` → `MarketingFooter` → `HvReveal animateHero scrollReveal`. No `searchParams`, no route-segment config.
- [ ] **Step 3: Run** the guard test — Expected: PASS.
- [ ] **Step 4: Prerender proof:** temporarily add `export const dynamic = 'error'` to the page; `NODE_OPTIONS=--max-old-space-size=8192 pnpm build` — Expected: build succeeds and the route table shows `● /[locale]/learn` with `/en/learn` and `/ja/learn` listed; `.next/prerender-manifest.json` contains `/en/learn` and `/ja/learn`. Remove the `dynamic` line.
- [ ] **Step 5: Commit** `feat(learn): prerendered green /learn page`.

### Task 6: Retire /free-lesson and the /sandbox landing

**Files:**
- Delete: `app/[locale]/free-lesson/`, `app/api/free-lesson/`, `components/marketing/free-lesson/`, `lib/free-lesson/`, `app/[locale]/sandbox/page.tsx`, `components/marketing/sandbox/`, `lib/sandbox/demos.ts`, landing-only `public/sandbox/*.webp` (grep first), `trackFreeSampleStarted` (`lib/analytics.ts:32-37`)
- Modify: `next.config.ts` (`redirects()`), `app/sitemap.ts` (−`'/sandbox'`), `lib/marketing-routes.ts` (−`/free-lesson`, −`/sandbox`), `components/sandbox/demo-chrome.tsx:41,80` (→ `/`), `messages/{en,ja}.json` (−`sandbox`, −`nav.sandbox`)
- Test: create `__tests__/config/retired-redirects.test.ts`; update `__tests__/marketing/marketing-routes.test.ts` (rows `:21,22,24,66,67,100,109` — keep any row asserting `/sandbox/miles-chaser` is *not* a marketing path), `__tests__/marketing/sandbox-sitemap.test.ts` (assert **no** `/sandbox` entry), `__tests__/sandbox/middleware-matcher.test.ts` (unchanged; must still pass)

**Interfaces:**
- Consumes: none from earlier tasks.
- Produces: 307s `/free-lesson`→`/learn`, `/ja/free-lesson`→`/ja/learn`, `/sandbox`→`/learn`, `/ja/sandbox`→`/ja/learn`.

- [ ] **Step 1: Write the failing tests:** `retired-redirects.test.ts` imports `next.config.ts` default, awaits `redirects()`, and asserts the four entries exist with `permanent: false`; asserts **no** entry's `source` starts with `/sandbox/` or equals `/sandbox/:path*`. Update the sitemap and marketing-routes tests as listed.
- [ ] **Step 2: Run** `pnpm vitest run --project app __tests__/config __tests__/marketing/marketing-routes.test.ts __tests__/marketing/sandbox-sitemap.test.ts` — Expected: FAIL.
- [ ] **Step 3: Implement** the deletes and edits. Before deleting, `grep -rn "free-lesson\|free_lesson\|marketing/sandbox\|sandbox/demos\|trackFreeSampleStarted" app components lib __tests__` must list only files in the delete set.
- [ ] **Step 4: Run** the Step 2 command plus `pnpm vitest run --project app __tests__/sandbox` — Expected: all PASS (demo-app tests untouched and green).
- [ ] **Step 5: Commit** `chore(learn): retire /free-lesson and the /sandbox landing (307 → /learn)`.

### Task 7: Gates, smoke, review, ship

- [ ] **Step 1: Gates, one at a time, in the worktree:** `NODE_OPTIONS=--max-old-space-size=8192 pnpm type-check`; `pnpm vitest run --project app --maxWorkers=2`; `NODE_OPTIONS=--max-old-space-size=8192 pnpm build`. Expected: all exit 0; route table `● /[locale]/learn`; `/`, `/ja`, `/about`, `/ja/about` still prerendered; no other route changed classification vs a baseline build (diff the route tables as Slice E did).
- [ ] **Step 2: Hot-chip data check (F11):** with the built catalog (local `pnpm start` against prod data, read-only), each hot chip query returns ≥ 1 card; swap any that return 0 for a term that does, in both locales.
- [ ] **Step 3: Browser smoke** (`pnpm start`), EN + `/ja`, 1440 and 375 px: console clean; `/learn?track=marketing_growth` shows that track after load; search, chips, free switch, clear filters, sidebar goals; reduced-motion (rotator static, no smooth scroll, no lift); 44px targets; JA wrapping; `/free-lesson`, `/ja/free-lesson`, `/sandbox`, `/ja/sandbox` → 307 to `/learn` / `/ja/learn`; `/sandbox/miles-chaser` still renders; demo "Exit" goes to `/`.
- [ ] **Step 4: Adversarial review** (`requesting-code-review`, told to refute) over the worktree diff; triage with `receiving-code-review`; re-run affected gates.
- [ ] **Step 5: STOP — Ryan signs off the EN copy (D2 table + any F11 chip swaps).**
- [ ] **Step 6: STOP — Ryan approves the push.** Then ship per §6 (one command: apply --cached → write-tree match → commit → push), and reconcile main's working copy.
- [ ] **Step 7: Post-deploy:** wait for the Vercel status on the sha = success; `curl -sSI https://www.honuvibe.ai/learn` and `/ja/learn` → `x-vercel-cache: PRERENDER` or `HIT`; the four redirects return single-hop 307s; PSI mobile on `/learn` (this machine's Lighthouse is unreliable). Append an execution record to this plan; update memory (`project_marketing_redesign_green`: Unit 2a shipped, 2b waits on B3).

## Out of scope

- Course detail `/learn/[slug]` (Unit 2b, after B3), "Join the Vault" on course pages, `hasCourseAccess`.
- Admin `revalidateTag('course-catalog')` wiring (D9), adding `/learn` to the sitemap (D10), `HvRotatingWord` pause control (WCAG 2.2.2 carry-over from Unit 1), `getCachedVaultTotalCount` counting partner items, the `NavCtaAnchor` `/api` fix (before B3).
- Server-side search (move off client filtering only past ~500 items).

## Out-of-band (Ryan)

1. Review this plan; answer D1–D11 (recommendations marked).
2. EN copy sign-off before commit (Task 7 Step 5); JA native review after ship.
3. Approve the push (Task 7 Step 6).

## Execution record (2026-10-18)

**Shipped:** a30e73b on `main` (one squashed commit of the worktree's 10; tree hash matched the worktree's exactly), pushed 5e0e141..a30e73b, Vercel success. No migration; prod DB untouched.

**Decisions:** D1–D11 as recommended. EN copy signed off by Ryan with one change: the all-tracks heading is "Every lesson and course, in one place" (no "five tracks"). JA machine-drafted — native review owed.

**Gates (clean worktree):** type-check 0; vitest app 193 files / 2152 tests; build 0. Prerender proof: build with a temporary `dynamic = 'error'` passed; `/en/learn`, `/ja/learn` in the prerender manifest. Route table vs baseline: only `/[locale]/learn` ƒ → ●, and `/free-lesson`, the `/sandbox` landing and `/api/free-lesson/subscribe` removed.

**Prod checks:** `/learn`, `/ja/learn` → `x-vercel-cache: PRERENDER`, then `HIT`; `/free-lesson`, `/ja/free-lesson`, `/sandbox`, `/ja/sandbox` → single 307 to `/learn` / `/ja/learn`; `/sandbox/miles-chaser` 200; 27 lesson links + 1 course in the HTML; headless Chromium: `?track=marketing_growth` → 3 lessons, `/ja/learn?free=1` → 8.

**Changes against this plan (rulings):**
- F11: hot chip "Second brain" matched nothing on prod → "Research" / "リサーチ"; "Automation" queries `automation`.
- Copy softened beyond D2 for truth: FAQ Free-vs-Vault says "every lesson" (courses join the Vault in B3); "How long does a track take?" drops the 2–4 week claim; "A written guide" drops "in English and 日本語".
- `LearnPricingStrip` takes `hasFreeLesson` ("Get started free" when it points at `/signup`); Join the Vault uses `apiHrefForLocale` on `/ja`.
- Small captions use ink-500 (design taupe fails AA at 12px); cover tone 5 = amber + green-900.
- Adversarial review (fresh reviewer) found one Important bug, fixed with tests: `history.replaceState(history.state, …)` never synced Next's router (the state carries Next's `__NA` marker) → now `replaceState(null, …)`, plus `CatalogUrlSync` (`useSearchParams` in its own `<Suspense fallback={null}>`) so router navigations re-sync the filters. The page stays ●.
- About final CTA links moved from the dead `/learn#vault` / `/learn#courses` to `/learn` and `/learn#catalog`.
- Duplicate brand in the meta title removed (the layout template adds it).

**Owed:**
- Ryan: browser smoke EN + `/ja` (real clicks, reduced motion, console). The Chrome extension could not attach this session, so the smoke ran in headless Chromium only.
- PSI mobile on `/learn` (pagespeed.web.dev).
- JA native review of `learn_catalog`.
- `components/marketing/nav/marketing-mobile-menu.tsx:97` still links `/learn#vault` (dirty WIP file, not touched).

**Deferred minors:** "{n} lessons" also counts the course card; a fetch error is cached as an empty catalog for 600 s (same as `getPublicCatalog`); "Clear filters" drops keyboard focus; one-frame stale filter on a second soft visit with a different `?track=`; dead `.learn-chapter` CSS (Unit 6); the 100-char query cap can split an emoji.
