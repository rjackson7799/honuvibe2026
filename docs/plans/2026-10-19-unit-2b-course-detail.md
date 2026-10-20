# Unit 2b — Course detail `/learn/[slug]` (green restyle + access-aware CTA)

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Status:** PLAN rev 2 — APPROVED by Ryan 2026-10-19: D1–D13 all as recommended, including the D2/D4/D11 EN copy tables as written and D12 (ship with "Join the Vault" on no prod course; converting AI Essentials to a self-study Vault course is a later admin change). Rev 2 folds in an adversarial plan review (see "Plan review" at the end). **Ready to execute** in a fresh session. Not built.
**Baseline:** `main` = `origin/main` = `5d7ec62` (checked 2026-10-19). The execution session re-checks `origin/main` first; another session pushes to main.
**Roadmap:** `docs/plans/2026-10-05-marketing-redesign-green.md` §Unit 2 (`/learn/[slug]` bullet), "Review amendments" Unit 2 bullet, Locked decisions (not reopened). Follows 2a (`2026-10-18-unit-2a-learn-catalog.md`, shipped a30e73b) and B3 (`2026-10-18-b3-vault-course-access.md`, shipped 6e11e5f, 087 on prod).
**Design source of truth:** `docs/design_2026_green/pages/03 Course - AI Essentials.dc.html` (README §03 `README.md:169-180`, screenshot `screenshots/03 Course - AI Essentials.png`). Line refs `:NN` are into that `.dc.html`.

**Goal:** Rebuild `/learn/[slug]` on the hv design system with a CTA that follows the viewer's access (enrolled / Vault reader / Vault-included / paid / free / full / closed / 1v1), and stop the legacy dark Nav double-mounting on it.

**Architecture:** The page stays dynamic (`ƒ`). One server read of the course (unchanged `getCourseWithCurriculum`, wrapped in React `cache()` so metadata and page share it) and one access read (`hasCourseAccess`). Two pure modules turn that into a whitelisted view model (`buildCourseDetailView`) and a CTA decision (`resolveCourseCta`); every component receives only those. Two small client islands: the curriculum accordion and the CTA button (only for the free-enroll server action).

**Tech Stack:** Next.js 16 App Router, next-intl, Tailwind v4 `--hv-*` tokens, `components/marketing/hv/*`, Supabase (cookie client, unchanged reads), Vitest + Testing Library.

**Spec:** the roadmap sections above + the design file + this plan's §1–§3. **No migration.**

## Global Constraints

- **No migration, no SQL, no RLS change.** If execution finds one is needed, stop and tell Ryan.
- Page stays `ƒ`. No `generateStaticParams`, no `unstable_cache`/`'use cache'` around any read that uses the cookie client or returns per-user data. Paid fields (`zoom_link`, `community_link`, session `replay_url`/`zoom_link`/`materials_*`/`transcript_url`/`slide_deck_url`, resource `url`, `esl_settings_json`, `instructor_revenue_share_pct`, `proposal_*`) never reach a component prop — enforced by the view-model test (Task 1).
- `vault_included` is read as `course.vault_included === true` (absent = false), matching `hasCourseAccess`.
- "Join the Vault" is shown **only** when `vault_included` (review amendment). Per-course checkout stays for every non-included course (Locked #5). Included courses never show a price or an enroll button.
- `/api/*` hrefs render as plain `<a>` with `apiHrefForLocale(href, locale)` (`components/marketing/nav/nav-cta.ts:32`); page hrefs use the next-intl `Link` (via `HvButton`). Never let next-intl prefix `/ja` onto `/api/…`.
- New UI uses only `components/marketing/hv/*` and `--hv-*` tokens; no hardcoded colours, no inline styles. Server Components by default; `'use client'` only for `course-curriculum.tsx` and `course-cta-button.tsx`. Named exports, kebab-case files.
- Touch targets ≥ 44px; text ≥ 12px; WCAG AA in the hv palette (2a: 12px captions use ink-500, not taupe); `prefers-reduced-motion` honoured (no accordion/rotate transitions, no smooth scroll, carousel timer off).
- JA: headings `[word-break:auto-phrase]`, letter-spacing 0 on headings, body line-height 1.75. All JA copy machine-drafted, flagged for native review.
- Never ship design placeholders: "Placeholder bios…" (`:200`), "Placeholder testimonials…" (`:245`), "Placeholder Name" quotes (`:285-287`), `<image-slot>` boxes, the fixed AI-Essentials copy (modules, FAQ, instructors, facts) — all come from course data or i18n templates.
- **Never stage:** `middleware.ts`, `app/[locale]/layout.tsx`, `components/layout/conditional-nav.tsx`, the dirty marketing nav files (`marketing-lang-toggle.tsx`, `marketing-mobile-menu.tsx`, `marketing-user-menu.tsx`), `components/marketing/home/hero.tsx`, any auth hunk, untracked `supabase/migrations/084_auth_email_security.sql`, `supabase/config.toml`. Dirty shared files: 2b touches only `messages/en.json` + `messages/ja.json` (new `course_detail` namespace inserted directly after `learn_catalog`, i.e. before `resources_page` — HEAD `en.json:1031-1187`, working-tree `~:1060-1216` — far from the WIP auth hunk at HEAD `:847`) — take only 2b's hunks. 2b does **not** touch `app/sitemap.ts` or `next.config.ts`.
- pnpm only. `NODE_OPTIONS=--max-old-space-size=8192` for `type-check` and `build` only, never tests. Unit tests: `pnpm vitest run --project app --maxWorkers=2`. One gate at a time. Never pipe a gate through `| tail`.

## Review Focus

1. **A Vault reader must never see a buy button or "Join the Vault" on a course they can already read** (the B3 carry-over bug: `EnrollButton` showed them "Continue" only by accident of `isEnrolled = hasAccess`). → Task 2 rows R3, R5; Task 5 page test `vault reader sees Open in your Vault and no price`.
2. **The only public prod course is a cohort that started 2026-04-09** (`ai-essentials-first-steps-future`, $1,250, not included). Today signed-out visitors get *no* CTA at all (`EnrollButton` returns `null` when in progress). It must render a clear "enrollment closed" state with a working next step, not an empty card. → Task 2 R10; Task 6 browser smoke.
3. **`/learn/<slug>` matcher vs real siblings.** A too-wide matcher hides the dark Nav on `/learn/dashboard/*` or `/learn/vault/*` (members lose their nav); a too-narrow one keeps the double nav. → Task 4 test derives the sibling list from `fs.readdirSync('app/[locale]/learn')`, so a future sibling fails CI until excluded.
4. **Course data holes** (prod rows have null `total_weeks`, no instructors, no weeks for 1v1, `price_jpy = 0` on paid USD courses, EN-only `format`). No section renders empty; no fact shows "null"/"0 weeks"; JA price falls back to USD like checkout does (`checkout-embed/route.ts:98-102`). → Task 1 view-model tests; Task 3 section tests for empty inputs.
5. **Unlisted (`is_private`) courses** stay reachable by link but must not be indexed. → Task 5 `private course metadata is noindex`.

---

## 1. Verified facts (2026-10-19)

| Claim | Reality (file:line) |
|---|---|
| B3 gives `hasCourseAccess` | `lib/enrollments/access.ts:46-62` → `{ hasAccess, source: 'enrollment'\|'vault'\|null, enrollment }`; enrollment checked first. Re-exported from `lib/enrollments/queries.ts`. |
| Page uses a one-line shim | `app/[locale]/learn/[slug]/page.tsx:65-66` `isEnrolled = access?.hasAccess ?? false`, fed to `CurriculumAccordion`, `BonusSessionsSection`, `StickyEnrollSidebar`, `CourseDetailFinalCta`, `StickyEnrollBar`. |
| Page already uses the hv chrome | `:123-124` `MarketingShell` (no `theme`) + `MarketingNav` (default CTA), body on legacy `--m-*` primitives. |
| **Dark Nav double-mounts today** | Confirmed from prod SSR HTML of `/learn/ai-essentials-first-steps-future` (2026-10-19): contains `dark-zone fixed top-0 left-0 right-0 z-[200]` (legacy Nav, `components/layout/nav-client.tsx:66-70`) **and** three `data-shell="hv"` blocks (MarketingNav/footer/newsletter), and `<main class="min-h-screen pt-14 md:pt-16">` (`ConditionalMain`). Cause: `isMarketingPath('/learn/<slug>')` is false (`lib/marketing-routes.ts:22-32`), so `NavClient` (`nav-client.tsx:62`) does not yield. A browser screenshot is still owed in Task 6 Step 3. |
| Who reads `isMarketingPath` | `nav-client.tsx:38` (yield), `conditional-nav.tsx:41` (`ConditionalMain` padding — imports the helper, **file not edited**), `honu-companion.tsx:45` (hide). All three fix themselves once the matcher matches. |
| `/learn` children | `app/[locale]/learn/{[slug],auth,dashboard,library,paths,plans,vault}`; `[slug]/checkout` is two segments deep. |
| Component callers | Page-only (deletable): `StickyEnrollSidebar`, `StickyEnrollBar`, `CourseDetailFinalCta`, `CourseDetailHero`. Shared with `CourseHub` (**keep**): `EnrollButton`, `CurriculumAccordion`, `LearningOutcomes`, `ToolsBadges`, `HowItWorks`, `BonusSessionsSection`, `InstructorCard`, `PriceDisplay`. `AvailabilityBadge` (keep) is used by `CourseCard` + the sidebar being deleted. |
| Checkout bounces unpriced courses | `checkout/page.tsx:89-91`: when the locale's price formats to `null` (EN: `price_usd` null/0; JA: no `price_jpy` and no `price_usd`) it `redirect`s back to `/learn/<slug>`. So a "paid" course with no usable price must not get a buy link (§3 R11a). |
| No 404 chrome | No `not-found.tsx` exists under `app/`. Once `/learn/<slug>` is a marketing path, an unknown slug would render with neither nav (dark Nav yields, `MarketingNav` never mounts). `/learn/account` is middleware-protected (`middleware.ts:11`) and linked from `join/invite/[token]/page.tsx:119` but has no route, so it also lands here. → Task 5 adds `app/[locale]/learn/[slug]/not-found.tsx`. |
| `cn` has no tailwind-merge | `lib/utils.ts:3-5` is plain `clsx`, so `HvSection`'s default `spacing` (`pt-16 md:pt-20`) would beat a `pt-[108px]` className at md+. Hero uses `spacing="flush"`. |
| `course_weeks.phase` is EN-only | `lib/courses/types.ts:151` (`phase: string \| null`, no `_jp`). |
| `checkEnrollment` | Defined `lib/enrollments/queries.ts:28`; **0 callers**; mentioned in a comment at `lib/progress/queries.ts:326`. |
| Free-enroll path (072) | `simulatedEnroll` (`lib/enrollments/actions.ts:6`) → RPC `enroll_in_free_course`: rejects unpublished, status `in-progress/completed/archived`, `1v1`, any non-zero price or both-null prices, full courses, and a prior refunded/cancelled row ("Please contact support…"). |
| Paid path | `/learn/<slug>/checkout` page redirects anyone with access to the hub (`checkout/page.tsx:46-50`); `checkout` + `checkout-embed` return `409 included_in_vault` for Vault readers; embed uses JPY only when `price_jpy` is truthy, else USD (`checkout-embed/route.ts:98-102`). |
| Subscribe GET, signed out | `app/api/stripe/subscribe/route.ts:144-146` → `buildAuthRedirect` → `${origin}${/ja?}/signin?redirect=<sanitized /api/stripe/subscribe?…>`; `/api/stripe/subscribe` is in the HEAD allowlist (`lib/auth/safe-redirect.ts`). Active subscribers are sent to `/learn/dashboard/billing?upgrade=true` (`:159-171`). |
| NavCtaAnchor `/api/` fix | Landed in B3 (6e11e5f); `MarketingNav({ cta })` accepts `'join_vault'` (`marketing-nav.tsx:21`, `nav-cta.ts:9-19`). |
| Syllabus API | `GET /api/courses/[courseId]/syllabus?locale=en\|ja` (`app/api/courses/[courseId]/syllabus/route.ts`) generates on demand for any published course and caches to storage; redirects to the cached URL when present. |
| hv primitives | `HvFaqAccordion` is **single-open** (README FAQ) — the curriculum needs a new multi-open component. `HvTestimonialCarousel`, `HvCtaBand`, `HvButton` (handles `/api/` as plain `<a>`), `HvBreadcrumb`, `HvEyebrow`, `HvHeading`, `HvCard`, `HvSection` exist (`components/marketing/hv/index.ts`). |
| Nav geometry | `MarketingNav` header is `fixed top-[var(--m-strip-h)] h-[68px] z-[200]` (`marketing-nav-client.tsx:44`); 2a pads heroes `pt-[108px]` and uses `scroll-mt-[88px]`. |
| Testimonials | B5 (per-surface proof) not shipped. 2a's pattern: `getPublishedTestimonials(3)`, else `social_proof.testimonials.{two,one,three}` (`app/[locale]/learn/page.tsx:64-81`). |
| Certificates | **No certificate feature exists** in code (only a comment in `lib/enrollments/types.ts:33`). |
| i18n | `learn` namespace has 105 keys and 22 consumers (`components/learn/*`, the dashboard pages). 2b adds a new `course_detail` namespace and deletes **no** `learn.*` keys. Newsletter band anchor `id="newsletter"` exists (`hv/newsletter-band.tsx:57`). |
| Sitemap | No course URLs at HEAD; 2b does not add them. |

**Prod courses (anon `course_catalog`, published, 2026-10-19):**

| slug | type | status | private | start | price ¢/¥ | max/cur | weeks | live/rec | lang | syllabus cached | included |
|---|---|---|---|---|---|---|---|---|---|---|---|
| ai-essentials-first-steps-future | cohort | published | – | **2026-04-09 (past)** | 125000 / 0 | 15 / 2 | 5 | 5 / 5 | both | en only | – |
| ai-for-music-professionals | cohort | published | ✓ | 2026-05-01 (past) | 19800 / 0 | 250 / 0 | 6 | 0 / 16 | en | – | – |
| how-to-make-different-types-of-martinis | cohort | published | ✓ | null | 100 / 0 | 1000 / 2 | 8 | 0 / 16 | en | – | – |
| teaching-ai-for-teachers | cohort | published | ✓ | null | **0 / 0 (free)** | null / 4 | 1 | 3 / 2 | en | – | – |
| test-1v1 | 1v1 | published | ✓ | null | null / null | 1 / 1 | null | null | both | – | – |

None is `self-study`, none is included (B3 D7). So after 2b ships, the "Join the Vault" / Vault-reader states are visible on **no** prod page until Ryan flags a self-study course.

## 2. Design ↔ reality

| # | Design says | Reality | Handling |
|---|---|---|---|
| F1 | Every course is "Included in the Vault, $99/month" (`:73-76`, `:266-269`) | 0 included courses; included is self-study-only (087 CHECK) | CTA matrix (§3); price card has 6 variants (D2) |
| F2 | Hero CTA "Start learning in the Vault" for everyone | Depends on access | Matrix label per row (D2 copy) |
| F3 | Badges "Beginner · Self-paced · HV-AIE100" | `level`, derived format kind, `course_id_code` | Data; each badge hidden when null |
| F4 | Facts `<dl>`: Format / Length / Language / **Finish with: Certificate** | No certificate feature; `format` is EN-only free text | D5: derived bilingual Format, Length, Language, + Starts (future cohort) or Community months; **no certificate fact** |
| F5 | Modules: stage, title, "3 lessons · ~60 min", lessons with bullets, Practice task | `course_weeks` (phase, title), `course_session_catalog` (title, `topics_*[].title`, `duration_minutes`, `session_number`), `course_assignment_catalog` (title) | Map 1:1 (Task 1); length/task rows hidden when data missing |
| F6 | Footer note "Finish all five modules to earn your certificate…" (`:177`) | No certificate | Dropped |
| F7 | Two instructors with tags | `course.instructors` (name, title, bio_short, photo, role); no tags | Cards without tags; fallback `instructor` / `instructor_name`; section hidden when none |
| F8 | H2 "Taught in English and 日本語" | Language varies | Copy keyed by `course.language` (D11) |
| F9 | Syllabus: two fixed PDF rows with page counts | On-demand API per locale; page count unknown | EN row always; JA row when `language !== 'en'`; meta "PDF"; band hidden for `1v1` or zero weeks (D6) |
| F10 | FAQ copy is AI-Essentials-specific ("No. AI Essentials is now self-paced…") | Course-agnostic page | D4: data-driven FAQ templates, each hidden when its data is missing |
| F11 | Placeholder testimonials | Locked #11 | 2a pattern, extracted to a shared helper (Task 3) |
| F12 | No Logistics / Materials table / How it works / Bonus sessions sections | Today's page has them | D7: drop from the marketing page (hub keeps them); cancellation policy becomes an FAQ item |
| F13 | Header CTA "Join the Vault" on every course | Locked #5 + amendment: gate on the flag | D3: `cta="join_vault"` only on included courses without Vault access |
| F14 | Sticky sub-nav always 6 links | Sections are conditional | Sub-nav lists rendered sections only; hidden when < 3 |
| F15 | Hero image slot | `hero_image_url ?? thumbnail_url` | `next/image` (`priority`, `sizes`); no image → plain `bg-hv-green-800` 16:9 block, no placeholder text |
| F16 | JA subtitle line = `title_jp` | On `/ja` the H1 is already `title_jp` | D10: show the *other* language's title when present and different |

## 3. CTA matrix (the contract for Task 2)

Precedence top-down; first match wins. `prefix` = `/ja` on JA else `''`. `hub` = `/learn/dashboard/<slug>`.

| Row | Viewer / course state | `kind` | href (rendered via) | Hero + closing-band label (EN, D2) | Price card |
|---|---|---|---|---|---|
| R1 | signed-out, included | `join_vault` | `apiHrefForLocale('/api/stripe/subscribe?tier=vault', locale)` (plain `<a>`; route bounces through `/signin`) | "Start learning in the Vault" | `vault_join` |
| R2 | signed-in, no access, included | `join_vault` | same | same | `vault_join` |
| R3 | access `source='vault'` | `open_vault` | `hub` (Link) | "Open in your Vault" | `vault_member` |
| R4 | access `source='enrollment'` (any type, any state) | `open_enrolled` | `hub` (Link) | "Go to your course" | `enrolled` |
| R5 | enrolled **and** included | `open_enrolled` (enrollment wins, B3 order) | `hub` | "Go to your course" | `enrolled` |
| R6 | no access, `course_type='1v1'` | `contact` | `/contact` (Link) | "Ask about 1-on-1" | `contact` (1v1 copy) |
| R7 | no access, not included, closed: `status ∈ {in-progress, completed, archived}` **or** (`course_type='cohort'` and `start_date ≤ now`) | `closed` | `#newsletter` (plain `<a>`) | "Get notified about the next cohort" | `course_price` + closed note |
| R8 | no access, not included, full (`max_enrollment` set and `current ≥ max`) | `full` | `#newsletter` (plain `<a>`, a link like R7 — not a disabled button) | "Cohort full — get notified" | `course_price` + full note |
| R9 | no access, not included, free (`coalesce(usd,0)=0 ∧ coalesce(jpy,0)=0 ∧ ¬(usd null ∧ jpy null)`), signed-out | `enroll_free` | `/signin?redirect=${encodeURIComponent(prefix+'/learn/'+slug)}` (Link) | "Enroll free" | `free` |
| R10 | same, signed-in | `enroll_free` | `null` → `CourseCtaButton` calls `simulatedEnroll`, then `router.push(prefix+hub+'?enrolled=true')` + `router.refresh()`; error shown inline | "Enroll free" | `free` |
| R11a | no access, not included, not free, and `formatCoursePrice(usd, jpy, locale) === null` (unpriced in this locale: both null, or EN with `usd` 0/null and only a JPY price) | `contact` | `/contact` (Link) | "Ask about this course" | `contact` (generic copy) |
| R11 | no access, not included, paid with a usable price, signed-out | `buy` | `/signin?redirect=${encodeURIComponent(prefix+'/learn/'+slug)}` (Link) — same as today's `EnrollButton` | "Enroll — {price}" | `course_price` |
| R12 | same, signed-in (an active Vault member included) | `buy` | `/learn/<slug>/checkout` (Link) | "Enroll — {price}" | `course_price` |

Notes: capacity and dates never block R1–R5 (Vault access ignores `max_enrollment`; B3). `is_private` is not an input — unlisted courses follow the same rows (metadata differs, Task 5). R7's cohort-only date rule is D9 (today any type closes on a past `start_date`). Every row gets one test (Task 2), plus: R12 for an active Vault member on a non-included course; R9 with `usd 0 / jpy null` (free); R11a with both prices null and with `(0, 2980)` on EN; R12 with `(125000, 0)` on JA (USD fallback, as checkout does); R1 on `/ja` (`…&locale=ja`); R7 for a self-study course with a past `start_date` → **not** closed (falls to R11/R12).

## 4. Decisions for Ryan (recommendations marked)

- **D1 — Rendering: keep `/learn/[slug]` dynamic (`ƒ`).** *Recommended.* Why: the hero's primary button and the price card depend on auth + access, and this repo has no Cache Components/PPR (`next.config.ts` has no `cacheComponents`), so a static shell would need a new client-fetched access API and would flash the signed-out CTA for members before swapping. Prod has one public course, so the ISR win is small. Safety stays as today: the page reads through the cookie client, the `course_catalog`/session views null paid fields per viewer, and nothing per-user is cached. 2b adds a whitelisted view model so paid fields can't leak into marketing markup, which also makes a later static split cheap. (Alternative: static shell via a cookieless `getPublicCourseDetail` + `/api/courses/[id]/viewer` island. Rejected for 2b: more surface, CTA flash, new API route.)
- **D2 — EN copy** (Ryan signs off before commit; JA machine-drafted):

  | Where | Design | Recommended |
  |---|---|---|
  | Hero/band CTA by row | "Start learning in the Vault" | §3 labels |
  | Price card `vault_join` | "Included in the Vault" / "$99 / month · cancel anytime" / "One membership opens this course and every other course in every track, in English and 日本語." / "Join the Vault" / "See what's inside ↓" | keep eyebrow, price line and buttons; body → "One membership opens this course and every other course included in the Vault." (not every course is included or bilingual) |
  | `vault_member` | — | "Included in your Vault" ✓ / "You're a member, so this course is already open to you." / "Open in your Vault" |
  | `enrolled` | — | "You're enrolled" / "Pick up where you left off." / "Go to your course" |
  | `course_price` | — | eyebrow "Course" / `{price}` + "one-time" / starts line "Starts {date}" (future cohort) / spots line "{n} spots left" (when ≤ 5) / closed note "This cohort is under way. Enrollment is closed." / full note "This cohort is full." |
  | `free` | — | eyebrow "Free course" / "Create a free account and enroll." |
  | `contact` | — | 1v1: eyebrow "1-on-1 program" / "We arrange 1-on-1 programs directly with each learner." · other (R11a): eyebrow "Course" / "Get in touch and we'll tell you how to join." |
  | Closing band | "Start AI Essentials today." / "Included in the Vault at $99 / month, with every other course. Cancel anytime." | title "Start {course} today." (closed/full: "Want the next cohort?"); body per card variant (above); button = §3 CTA |
  | Curriculum H2 / sub | "Five modules, one practice task each" / "Suggested pace: one module a week…" | "{n, plural, one {One module} other {# modules}}" (+ ", one practice task each" only when every module has a task) / sub: cohort "One module a week, live with your cohort." · self-paced "Suggested pace: one module a week. Go faster or slower as you like." · 1v1 hidden |
  | Overview H2 | "Built for people new to AI" | "Who this course is for" (audience varies) |
  | Instructors H2 | "Taught in English and 日本語" | D11 |
  | Syllabus band | "Take the full syllabus with you" / "Every module, lesson and practice task on four pages…" | title keep; body "Every module, lesson and practice task in one PDF. Useful if you need to share the course with your manager or team." |
- **D3 — Header CTA:** `MarketingNav cta="join_vault"` when the course is included **and** the viewer has no access; otherwise the default (`get_started_free`). *Recommended* (Locked #5 + amendment "gate Join the Vault on the flag"; avoids implying the Vault unlocks a paid cohort, and avoids sending a member to `billing?upgrade=true`).
- **D4 — FAQ = data-driven templates**, each hidden when its data is missing; the first one open (`defaultOpen={0}`):
  1. "Is this course live?" — `live_cohort` → "Yes. It runs as a live cohort{, starting {date}}." / `self_paced` → "No. Every lesson is recorded, so you can start any time and go at your own pace." / `one_on_one` → "Yes. Sessions are scheduled 1-on-1 with your instructor."
  2. "How long does it take?" — `total_weeks` → "{n} weeks{, about one module a week}." (hidden when null)
  3. "Is it available in Japanese?" — `both` → "Yes. It's taught in English and 日本語." / `en` → "It's taught in English." / `ja` → "It's taught in 日本語."
  4. "How do I get access?" — by price-card variant: `vault_*` → "It's included in the Vault ($99 / month). Join, and every included course opens."; `course_price` → "Enroll once for {price}."; `free` → "It's free. Create an account and enroll."; `contact` → 1v1 "Programs are arranged directly. Ask us about 1-on-1." / other "Get in touch and we'll tell you how to join."; `enrolled` → hidden.
  5. "What's the cancellation policy?" — `cancellation_policy_{en,jp}` text (hidden when null).
  *Recommended.* (Alternative: per-course FAQ columns — needs a migration; out of scope.)
- **D5 — Facts `<dl>`** (each omitted when its value is null; `<dl>` hidden when < 2 facts): Format (`live_cohort` "Live cohort" / `self_paced` "Self-paced video" / `one_on_one` "1-on-1"), Length ("{n} modules · ~{h} hrs" when every session has `duration_minutes`, else "{n} weeks", else "{n} modules"), Language ("EN" / "日本語" / "EN / 日本語"), and a 4th: "Starts {date}" for a cohort with a future `start_date`, else "Community: {n} months" when `community_duration_months`. **No "Finish with: Certificate"** until a certificate feature exists. *Recommended.* `format` kind derivation: `1v1` → `one_on_one`; `live_sessions_count > 0` → `live_cohort`; else `self_paced`.
- **D6 — Syllabus band:** EN row always; JA row when `course.language !== 'en'`; links are plain `<a href="/api/courses/<id>/syllabus?locale=…">`; meta "PDF"; band (and the hero "Download syllabus" button) hidden for `1v1` and for courses with zero weeks. *Recommended.*
- **D7 — Drop from the marketing page:** How it works, Bonus sessions, Logistics card, Materials table, partner badge component (partner name stays as a hero badge "with {partner}"), free-preview *links*. Cancellation policy moves into FAQ (D4.5); schedule notes are dropped (the hub still shows them). Lessons in the first `free_preview_count` sessions get a small "Free preview" tag only (prod: all 0). *Recommended.*
- **D8 (= B3 D6 carry-over) — Vault-read courses on `/learn/dashboard` and in "resume": a separate follow-on (call it 2c), not 2b.** *Recommended.* Why: it is invisible until a course is flagged (D12); it changes member-dashboard queries (`getResumePoint`, `lib/dashboard/queries.ts`, `app/api/dashboard/courses`, `getVaultCourseRecommendations`) that have nothing to do with the marketing redesign; and it needs its own design for "started" (driven by `course_session_opens` / `course_item_completions`). A Vault reader still reaches the hub from the course page's "Open in your Vault".
- **D9 — "Closed" by date applies to cohorts only** (R7). Self-study courses never close on a past `start_date`; `status` still closes any type. *Recommended.* (Today any type with a past `start_date` hides the CTA; no self-study course exists on prod, so nothing visible changes.)
- **D10 — Subtitle = the other language's title** when present and different (EN page: `title_jp`; JA page: `title_en`). *Recommended.*
- **D13 (new, from plan review) — Module "stage" (`course_weeks.phase`) is EN-only free text:** shown on EN, hidden on `/ja` (the label reads "Module {n}" only). *Recommended.* (Alternative: show it on JA too and accept English words in the JA page.)
- **D11 — Instructors H2** by `course.language`: `both` → "Taught in English and 日本語"; `en` → "Your instructors" / "Your instructor" (by count); `ja` → same as `en`. *Recommended.*
- **D12 — Course hub `/learn/dashboard/[course-slug]`: not touched in 2b.** *Recommended.* B3 already gates it on `hasCourseAccess`; its `EnrollButton` path is unchanged. **And** confirm D7-from-B3: 2b ships with "Join the Vault" visible on no prod course. Note this is a real **deviation from the roadmap amendment** (`2026-10-05-…md:383-385`: "Ryan flips the flag per course BEFORE Unit 2 ships"), forced by 087's self-study-only CHECK and the absence of any self-study course — not just a confirmation. Related question for Ryan: the design's FAQ ("AI Essentials is now self-paced") reads as if AI Essentials is meant to become a self-study, Vault-included course. If so, that is a data change (convert `course_type` to `self-study`, then flip the flag) Ryan does in admin after 2b ships; until then its page shows R7 "enrollment closed".

## 5. File map

Create
- `lib/learn/course-detail.ts` — view model (Task 1)
- `lib/learn/course-cta.ts` — CTA resolver (Task 2)
- `lib/proof/page-quotes.ts` — `getPageQuotes(locale)` extracted from the 2a page (Task 3)
- `components/marketing/course/{course-hero,course-price-card,course-subnav,course-overview,course-outcomes,course-curriculum,course-instructors,course-syllabus,course-faq,course-closing,course-cta-button,index}.tsx` (Task 3)
- Tests: `__tests__/lib/learn/course-detail.test.ts`, `__tests__/lib/learn/course-cta.test.ts`, `__tests__/lib/proof/page-quotes.test.ts`, `__tests__/marketing/course/course-sections.test.tsx`, `__tests__/marketing/course/course-page.test.tsx`

Rewrite: `app/[locale]/learn/[slug]/page.tsx`. Create: `app/[locale]/learn/[slug]/not-found.tsx` (Task 5).

Edit: `lib/marketing-routes.ts` (+ course-detail matcher), `components/marketing/hv/newsletter-band.tsx` (`scroll-mt` on `#newsletter`, Task 5), `__tests__/marketing/marketing-routes.test.ts` (rows `:62,131,132` flip to `true`; `:63` checkout stays `false`), `app/[locale]/learn/page.tsx` (use `getPageQuotes`; still ●), `lib/analytics.ts` (+ `trackCourseJoinVaultClick`), `lib/enrollments/queries.ts` (− `checkEnrollment`), `lib/progress/queries.ts:326` (comment), `messages/{en,ja}.json` (+ `course_detail`).

Delete (grep-confirm each has no importer outside the page first): `components/learn/{StickyEnrollSidebar,StickyEnrollBar,CourseDetailFinalCta,CourseDetailHero}.tsx`.

Not edited: `components/learn/{EnrollButton,CurriculumAccordion,CourseHub,…}`, `app/[locale]/learn/dashboard/**`, `app/[locale]/learn/[slug]/checkout/**`, any `/api` route, `components/layout/*`, `components/ocean/*`, `lib/courses/queries.ts`, any `learn.*` i18n key, `app/sitemap.ts`, `next.config.ts`.

## 6. Ship mechanics (same as 2a §6 / B3 §6)

Build in a clean worktree from `origin/main` (hoisted `.npmrc`, copy `.env.local`, `pnpm install`). Ship:
1. Worktree: `git add -A -- . ':!.npmrc'` → `git diff --cached --binary origin/main --output=2b.patch` (PowerShell `>` writes UTF-16 — use `--output`).
2. Main: `git apply --cached 2b.patch`; eyeball `git diff --cached --stat` (no auth paths, no 084, no never-stage path).
3. `git write-tree` equals the worktree's tree.
4. Commit + push in one command.
5. Reconcile main's working copy: `git checkout -- <2b paths that are clean in main>`; for `messages/en.json` and `messages/ja.json` run `git diff <baseline> HEAD -- <file> | git apply` on the working tree (hunks don't overlap the WIP at `:847`; if one does, stop and tell Ryan).
6. `git status` shows only the pre-existing WIP.

---

## Tasks

### Task 1: Course detail view model

**Files:** Create `lib/learn/course-detail.ts`, `__tests__/lib/learn/course-detail.test.ts`.

**Interfaces:**
- Consumes: `CourseWithCurriculum` (`lib/courses/types.ts`), `getFreeSessionIds` (`lib/courses/utils.ts`).
- Produces:
  ```ts
  export type CourseFormatKind = 'live_cohort' | 'self_paced' | 'one_on_one';
  export type CourseLessonView = { id: string; code: string; title: string; points: string[]; freePreview: boolean };
  export type CourseModuleView = { id: string; number: number; stage: string | null; title: string;
    lessonCount: number; minutes: number | null; lessons: CourseLessonView[]; task: string | null };
  export type CourseInstructorView = { name: string; role: 'lead' | 'instructor' | 'guest' | null;
    title: string | null; bio: string | null; photoUrl: string | null };
  export type CourseFact =
    | { key: 'format'; value: CourseFormatKind }
    | { key: 'length'; modules: number; hours: number | null; weeks: number | null }
    | { key: 'language'; value: CourseLanguage }
    | { key: 'starts'; date: string }
    | { key: 'community'; months: number };
  export type CourseDetailView = {
    id: string; slug: string; code: string | null; title: string; altTitle: string | null; description: string | null;
    level: CourseLevel | null; formatKind: CourseFormatKind; language: CourseLanguage; courseType: CourseType;
    imageUrl: string | null; partnerName: string | null; isPrivate: boolean; vaultIncluded: boolean;
    priceUsd: number | null; priceJpy: number | null; startDate: string | null; totalWeeks: number | null;
    spotsLeft: number | null; facts: CourseFact[]; audience: string[]; prerequisites: string | null; tools: string[];
    outcomes: string[]; modules: CourseModuleView[]; instructors: CourseInstructorView[];
    syllabusLocales: ('en' | 'ja')[]; cancellationPolicy: string | null;
  };
  export function buildCourseDetailView(course: CourseWithCurriculum, locale: 'en' | 'ja', now: Date): CourseDetailView;
  export function formatCoursePrice(priceUsd: number | null, priceJpy: number | null, locale: 'en' | 'ja'): string | null;
  // JA + truthy priceJpy → '¥{n:ja-JP}'; else priceUsd → '$' + (cents/100):en-US; else null (mirrors PriceDisplay + checkout-embed)
  ```
- [ ] **Step 1: Write the failing tests:**
  - `whitelists fields` — build from a fixture that sets `zoom_link`, `community_link`, `esl_settings_json`, `instructor_revenue_share_pct`, `proposal_review_notes`, and a session with `replay_url`/`zoom_link`/`materials_en`/`slide_deck_url`/`transcript_url`; `JSON.stringify(view)` contains none of those values.
  - `locale fallback` — `'ja'` uses `title_jp`/`description_jp`/`learning_outcomes_jp`/`who_is_for_jp`/`topics_jp`, falls back to EN per field when null or empty; `altTitle` = the other language's title, `null` when absent or equal (D10).
  - `modules map weeks` — `number = week_number`, `stage = phase`, lesson `code = '{week}.{session_number ?? index+1}'`, `points = topics[].title`, `task` = first assignment title or `null`, `minutes` = sum of `duration_minutes` or `null` if any is null, `freePreview` true for ids in `getFreeSessionIds(free_preview_count, weeks)`.
  - `facts` — AI-Essentials-shaped fixture (cohort, 5 live, past start, 5 weeks, all durations 60) → `[format live_cohort, length {modules:5,hours:5,weeks:5}, language both, community {months:1}]` (no `starts`: date is past); future start → `starts` replaces `community`; 1v1 fixture with nulls → `[format one_on_one, language both]`; never a `length` with `modules: 0`.
  - `formatKind` — `1v1` → `one_on_one`; `live_sessions_count 3` → `live_cohort`; `0`/null → `self_paced`.
  - `syllabusLocales` — `'both'` → `['en','ja']`; `'en'` → `['en']`; 1v1 or zero weeks → `[]`.
  - `spotsLeft` — `max 15 / cur 2` → 13; `max null` → `null`; never negative.
  - `instructors` — from `course.instructors` ordered as given; when empty, falls back to `course.instructor` then `instructor_name` (`{ name, role: null, … }`); `[]` when none.
  - `formatCoursePrice` — `(125000, 0, 'ja')` → `'$1,250'`; `(19800, 2980, 'ja')` → `'¥2,980'`; `(19800, 0, 'en')` → `'$198'`; `(null, null, 'en')` → `null`.
- [ ] **Step 2: Run** `pnpm vitest run --project app __tests__/lib/learn/course-detail.test.ts` — Expected: FAIL (module not found).
- [ ] **Step 3: Implement** (pure; no React, no I/O; `now` injected).
- [ ] **Step 4: Run** the same command — Expected: PASS.
- [ ] **Step 5: Commit** (worktree) `feat(learn): course detail view model`.

### Task 2: CTA resolver (the §3 matrix)

**Files:** Create `lib/learn/course-cta.ts`, `__tests__/lib/learn/course-cta.test.ts`.

**Interfaces:**
- Consumes: `apiHrefForLocale` (`components/marketing/nav/nav-cta.ts`), `CourseAccess['source']` (`lib/enrollments/types.ts`).
- Produces:
  ```ts
  export type CourseCtaKind = 'join_vault' | 'open_vault' | 'open_enrolled' | 'contact' | 'closed' | 'full' | 'enroll_free' | 'buy';
  export type PriceCardVariant = 'vault_join' | 'vault_member' | 'enrolled' | 'course_price' | 'free' | 'contact';
  export type CourseCta = { kind: CourseCtaKind; href: string | null; plainAnchor: boolean; priceCard: PriceCardVariant; navCta: 'join_vault' | null };
  export type CourseCtaInput = {
    slug: string; locale: 'en' | 'ja'; signedIn: boolean; accessSource: 'enrollment' | 'vault' | null; now: Date;
    course: { course_type: CourseType; status: CourseStatus; vault_included: boolean; start_date: string | null;
      max_enrollment: number | null; current_enrollment: number; price_usd: number | null; price_jpy: number | null };
  };
  export function isFreeCourse(priceUsd: number | null, priceJpy: number | null): boolean; // mirrors 072 RPC
  export function resolveCourseCta(input: CourseCtaInput): CourseCta;
  ```
  `plainAnchor` is true for `join_vault` and `#newsletter` hrefs. `navCta` = `'join_vault'` only for R1/R2 (D3). R11a uses `formatCoursePrice` from Task 1.
- [ ] **Step 1: Write the failing tests** — one `it` per §3 row, named `R1 signed-out on an included course → join_vault` … `R12 …` (incl. `R11a`), each asserting `kind`, `href`, `plainAnchor`, `priceCard`, `navCta`; plus `R1 on /ja appends locale=ja`, `R12 active Vault member on a non-included paid course → buy`, `R9 usd 0 / jpy null is free`, `R11a both prices null → contact`, `R11a (0, 2980) on EN → contact`, `R12 (125000, 0) on JA → buy (USD fallback)`, `R7 self-study with a past start_date is not closed`, `R7 status completed closes a self-study course`, `R8 full → #newsletter link, plainAnchor`, `R4 enrolled on a full, started cohort → open_enrolled`, `R6 1v1 with an enrollment → open_enrolled`, `R2 included + full + no access → join_vault (capacity ignored)`, `signin redirect encodes /ja/learn/<slug> on JA`.
- [ ] **Step 2: Run** `pnpm vitest run --project app __tests__/lib/learn/course-cta.test.ts` — Expected: FAIL.
- [ ] **Step 3: Implement** — first-match `if` chain in §3 order; `now` injected; date compare on `new Date(start_date) <= now`.
- [ ] **Step 4: Run** — Expected: PASS.
- [ ] **Step 5: Commit** `feat(learn): course CTA matrix (enrolled / Vault / included / paid / free / closed / 1v1)`.

### Task 3: Sections, CTA island, shared quotes helper, `course_detail` i18n

**Files:**
- Create: `components/marketing/course/*` (§5), `lib/proof/page-quotes.ts`, `__tests__/lib/proof/page-quotes.test.ts`, `__tests__/marketing/course/course-sections.test.tsx`
- Modify: `app/[locale]/learn/page.tsx` (use `getPageQuotes`), `lib/analytics.ts`, `messages/en.json`, `messages/ja.json` (Node script on the worktree copies; insert `course_detail` right after `learn_catalog`)

**Interfaces:**
- Consumes: Tasks 1–2; hv primitives; `simulatedEnroll`, `trackCourseEnrollCtaClick`.
- Produces:
  - `getPageQuotes(locale: string): Promise<Testimonial[]>` — moves 2a's `toQuote` + `MIN_REAL_QUOTES = 3` + `social_proof.testimonials` fallback out of `app/[locale]/learn/page.tsx` unchanged. Cookieless (the 2a static guard must stay green).
  - `trackCourseJoinVaultClick(props: { course_slug: string; locale: string })` → `trackEvent('course_join_vault_click', …)`.
  - All sections are **sync** components using `useTranslations` (no async `getTranslations` inside sections), so the page test can render the tree with a `NextIntlClientProvider`.
  - `CourseHero({ view, cta, ctaLabel })` — server. `HvSection variant="dark" spacing="flush" className="pt-[108px] pb-16"` (`flush`, because `cn` is plain `clsx` and the default `md:pt-20` would win); `HvBreadcrumb` Home / Learn / `{title}`; badges (level amber, format outline, `code` muted, `with {partnerName}`); H1 `h1-lg`; `altTitle` line; description; buttons: `CourseCtaButton` (hero size) + outline "Download syllabus" → `#syllabus` (hidden when `syllabusLocales` empty); facts `<dl>` (D5); right column `CoursePriceCard`.
  - `CoursePriceCard({ view, cta, ctaLabel })` — server; six variants per `cta.priceCard` (D2 copy; `contact` copy keyed by `view.courseType`); image `next/image` 16:9 (`priority`, `sizes="(min-width:1024px) 560px, 100vw"`) or `bg-hv-green-800` block; "See what's inside ↓" → `#curriculum` when modules exist.
  - `CourseCtaButton({ cta, label, courseId, slug, size, tone })` — `'use client'`; `courseId = view.id`; locale from `useLocale()`; router from **`next/navigation`** (the push already carries `prefix`; next-intl's router would make `/ja/ja/…`). `href` → `HvButton` (plain `<a>` when `cta.plainAnchor`); `enroll_free` signed-in (`href === null`) → `<button>` calling `simulatedEnroll(courseId, locale)` with loading + inline error (`role="alert"`), then `router.push(prefix + '/learn/dashboard/' + slug + '?enrolled=true')` + `router.refresh()`; fires `trackCourseEnrollCtaClick({ course_slug, is_paid: cta.kind === 'buy', locale })` for `buy`/`enroll_free`, `trackCourseJoinVaultClick` for `join_vault`. No disabled state (R8 is a link).
  - `CourseSubnav({ sections: { id: string; label: string }[] })` — server; returns `null` when `< 3`; `<nav aria-label>` sticky `top-[calc(var(--m-strip-h)+68px)] z-[190]`, horizontal scroll, 52px links.
  - `CourseOverview`, `CourseOutcomes`, `CourseInstructors`, `CourseSyllabus`, `CourseFaq({ items, quotes })`, `CourseClosing({ title, body, cta, ctaLabel })` — server; each returns `null` when its data is empty. Every section has `id` + `scroll-mt-[calc(var(--m-strip-h)+68px+52px+16px)]`.
  - `CourseCurriculum({ modules, curriculumOpen = 'first', heading, sub, showStage })` — `'use client'`; `showStage = locale === 'en'` (D13); multi-open `Set<number>`; initial from `curriculumOpen: 'first' | 'all' | 'none'`; "Expand all" / "Collapse all" (label flips when all open); each header `<button aria-expanded aria-controls>`; panel `id`; same border open/closed; `+` rotates 45° (no transition under reduced motion).
  - i18n `course_detail` (no meta title suffix — the layout template already appends the brand, `app/[locale]/layout.tsx:23`): `breadcrumb.{home,learn}`, `not_found.{title,body,cta}`, `badges.{level.*,format.*,code,with_partner}`, `facts.{format,length,language,starts,community, values.*}`, `cta.{join_vault,open_vault,open_enrolled,contact,closed,full,enroll_free,buy}`, `price_card.{vault_join.*,vault_member.*,enrolled.*,course_price.*,free.*,contact.{one_on_one.*,other.*},see_inside}`, `subnav.{label,overview,outcomes,curriculum,instructors,syllabus,faq}`, `overview.{eyebrow,title,before,tools}`, `outcomes.{eyebrow,title}`, `curriculum.{eyebrow,title,title_with_tasks,sub_cohort,sub_self_paced,module_label,lessons_length,lesson_label,practice_task,free_preview,expand_all,collapse_all}`, `instructors.{eyebrow,title_both,title_one,title_many,role.*}`, `syllabus.{eyebrow,title,body,row_en,row_ja,meta}`, `faq.{eyebrow,title,items.*}` (D4 templates), `closing.{title,title_closed,body.*}`. ICU plurals for module/lesson/spots counts. EN per D2/D4; JA machine-drafted.
- [ ] **Step 1: Write the failing tests** (`NextIntlClientProvider` with real `messages/en.json`; `next/navigation` router mocked; `simulatedEnroll` mocked):
  - `getPageQuotes`: 3 real quotes → real; 2 → the three i18n fallbacks.
  - hero: H1 = title; `altTitle` shown; level/format/code badges; facts `<dl>` has `dt`/`dd` pairs and no "Certificate"; "Download syllabus" absent when `syllabusLocales=[]`.
  - price card, one test per variant: `vault_join` shows "$99" and a plain `<a href="/api/stripe/subscribe?tier=vault">`; `vault_member` shows "Included in your Vault" and no `$`; `course_price` shows "$1,250" and the closed note for R7; `free`; `contact` with 1v1 copy and with generic copy; `enrolled`.
  - `CourseCtaButton`: `enroll_free` with `href=null` calls `simulatedEnroll('c1','en')` then pushes `/learn/dashboard/s1?enrolled=true` (on `ja`: `/ja/learn/dashboard/s1?enrolled=true`, never `/ja/ja`); on rejection shows the error in `role="alert"` and re-enables; `full` renders a link to `#newsletter`; `join_vault` on `ja` has `href` ending `locale=ja` and is not a Next `Link`.
  - curriculum on `ja`: stage text hidden, "Module {n}" label shown (D13).
  - curriculum: `curriculumOpen='first'` → only module 1 `aria-expanded="true"`; opening module 2 keeps module 1 open (multi-open); "Expand all" opens all and its label becomes "Collapse all"; `'none'` → all closed; `'all'` → all open; practice-task row absent when `task=null`; "Free preview" tag on a preview lesson.
  - subnav: 2 sections → renders nothing; 4 → 4 links with `#id` hrefs.
  - syllabus: `['en']` → one row `href="/api/courses/c1/syllabus?locale=en"`; `['en','ja']` → two; `[]` → nothing.
  - FAQ: hides "How long" when `totalWeeks` null; cancellation item only when present; first item open; carousel absent when `quotes=[]`.
  - instructors: `title_both` for `language='both'`; section absent when no instructors.
  - no `console.error` while rendering every section with the AI-Essentials fixture and with the 1v1 all-null fixture.
- [ ] **Step 2: Run** `pnpm vitest run --project app __tests__/marketing/course __tests__/lib/proof/page-quotes.test.ts` — Expected: FAIL.
- [ ] **Step 3: Implement** the components, helper, analytics fn and i18n script; switch `app/[locale]/learn/page.tsx` to `getPageQuotes`.
- [ ] **Step 4: Run** Step 2's command, `pnpm vitest run --project app __tests__/i18n __tests__/marketing/learn` — Expected: PASS (parity test covers `course_detail`; 2a static guard + sections still green).
- [ ] **Step 5: Commit** `feat(learn): green course-detail sections + course_detail copy`.

### Task 4: Course-detail marketing route matcher (fixes the double nav)

**Files:** Modify `lib/marketing-routes.ts`, `__tests__/marketing/marketing-routes.test.ts`.

**Interfaces:**
- Produces: `export const LEARN_RESERVED_SEGMENTS = ['dashboard', 'vault', 'auth', 'paths', 'plans', 'library'] as const;` and `export function isCourseDetailPath(pathname: string): boolean` (locale-stripped; true iff exactly `/learn/<seg>` with one non-empty segment not in the reserved list; trailing slash tolerated). `isMarketingPath` returns true for it; `isMarketingPathWithLocale` inherits.
- [ ] **Step 1: Failing tests:** flip `:62` (`/learn/some-course-slug`), `:131`, `:132` to `true`; add `/learn/ai-essentials/` → true, `/learn/ai-essentials/checkout` → false, `/learn/dashboard` / `/learn/library/x` / `/learn/plans` / `/ja/learn/paths/x` → false; and `every static /learn child route is reserved` — `fs.readdirSync('app/[locale]/learn', { withFileTypes: true })`, directories not starting with `[`, each `isCourseDetailPath('/learn/'+name) === false` and listed in `LEARN_RESERVED_SEGMENTS`.
- [ ] **Step 2: Run** `pnpm vitest run --project app __tests__/marketing/marketing-routes.test.ts components/layout/conditional-nav.test.ts` — Expected: FAIL on the new rows. (`conditional-nav.test.ts` is dirty in main — run the worktree copy; it must stay green, it tests `isAuthShellRoute` only.)
- [ ] **Step 3: Implement.**
- [ ] **Step 4: Run** the same command plus `pnpm vitest run --project app __tests__/marketing/conditional-main.test.tsx` — Expected: PASS.
- [ ] **Step 5: Commit** `fix(nav): course detail is a marketing route (no legacy dark Nav double-mount)`.

### Task 5: Page assembly, metadata, deletions

**Files:**
- Rewrite: `app/[locale]/learn/[slug]/page.tsx`
- Create: `app/[locale]/learn/[slug]/not-found.tsx` — `MarketingShell theme="hv"` + `MarketingNav` + a short hv section (`course_detail.not_found.*`, CTA "Browse courses" → `/learn`) + `MarketingFooter`. Needed because the course path is now a marketing route (§1 "No 404 chrome"); it also covers `/learn/account`.
- Modify: `components/marketing/hv/newsletter-band.tsx:57` — add `scroll-mt-[calc(var(--m-strip-h)+84px)]` to the `#newsletter` element so R7/R8 land below the fixed header (the sticky sub-nav lives inside `<main>` and has scrolled away by then). Harmless on other pages.
- Delete: `components/learn/{StickyEnrollSidebar,StickyEnrollBar,CourseDetailFinalCta,CourseDetailHero}.tsx`; `checkEnrollment` in `lib/enrollments/queries.ts` (+ the comment at `lib/progress/queries.ts:326`)
- Test: create `__tests__/marketing/course/course-page.test.tsx`

**Interfaces:**
- Consumes: Tasks 1–3; `getCourseWithCurriculum`, `hasCourseAccess`, `createClient` (`@/lib/supabase/server`), `getPageQuotes`, `MarketingShell`, `MarketingNav`, `MarketingNewsletter`, `MarketingFooter`, `HvReveal`.
- Produces: the route.
  - `const loadCourse = cache(getCourseWithCurriculum)` (React `cache`) used by both `generateMetadata` and the page.
  - `generateMetadata` → title/description (locale fallback); `alternates: { canonical: '/learn/<slug>' | '/ja/learn/<slug>', languages: { en, ja } }`; `robots: { index: false, follow: false }` when `is_private`; not-found → `{ title }` as today.
  - Page: `setRequestLocale`; `notFound()` when null; `user` via `supabase.auth.getUser()`; `access = user ? await hasCourseAccess(user.id, course) : null`; `view = buildCourseDetailView(course, locale, now)`; `cta = resolveCourseCta({ …, accessSource: access?.source ?? null })`; quotes via `getPageQuotes`; render `MarketingShell theme="hv"` → `MarketingNav cta={cta.navCta ?? undefined}` → `<main>`: `CourseHero`, `CourseSubnav` (rendered sections), `CourseOverview`, `CourseOutcomes`, `CourseCurriculum curriculumOpen="first"`, `CourseInstructors`, `CourseSyllabus`, `CourseFaq`, `CourseClosing` → `MarketingNewsletter source="course"` (provides `#newsletter`) → `MarketingFooter` → `HvReveal animateHero scrollReveal`. Page constants `SHOW_SUBNAV = true`, `CURRICULUM_OPEN = 'first'` (design flags).
- [ ] **Step 1: Failing tests** (`vi.mock` `@/lib/courses/queries`, `@/lib/supabase/server`, `@/lib/enrollments/queries`, `@/lib/proof/page-quotes`, `next-intl/server` (`setRequestLocale` no-op, `getTranslations` backed by real `messages/en.json`), `next/navigation` (`notFound` throws a sentinel; `useRouter`, `usePathname`), `@/i18n/navigation` (`Link` → `<a>`), `next/image` → `<img>`; nav/footer/newsletter/`HvReveal` mocked to stubs that print their props; wrap in `NextIntlClientProvider` — same pattern as `__tests__/marketing/home/proof-band.test.tsx:8-33` and `learn/learn-sections.test.tsx:17-23`; render `await CourseDetailPage({ params: Promise.resolve({ locale: 'en', slug: 's1' }) })`):
  - `unknown slug calls notFound`.
  - `signed-out on the in-progress cohort shows the closed state` (AI-Essentials fixture with `start_date` in the past): "Get notified about the next cohort" links `#newsletter`; no "Join the Vault" anywhere; nav stub received no `join_vault`.
  - `vault reader sees Open in your Vault and no price` (`hasCourseAccess` → `source 'vault'`, included self-study fixture): link to `/learn/dashboard/s1`; no `$1,250`; no subscribe href; nav stub `cta` undefined.
  - `signed-out on an included course gets Join the Vault in hero, price card, closing band and nav` (4 occurrences incl. nav prop).
  - `enrolled user sees Go to your course`.
  - `hasCourseAccess is not called when signed out`.
  - `private course metadata is noindex` and `public course metadata has canonical + languages`.
  - `not-found renders the hv nav and footer` (render `not-found.tsx` with the same mocks).
  - (No "loaded once" test: React `cache` does not memoize outside an RSC request in Vitest. The `loadCourse = cache(…)` wrapper is still used by both `generateMetadata` and the page.)
- [ ] **Step 2: Run** `pnpm vitest run --project app __tests__/marketing/course/course-page.test.tsx` — Expected: FAIL.
- [ ] **Step 3: Implement**; then the deletions after `grep -rn "StickyEnrollSidebar\|StickyEnrollBar\|CourseDetailFinalCta\|CourseDetailHero\|checkEnrollment" app components lib __tests__` lists only the page/definitions.
- [ ] **Step 4: Run** the page test, `pnpm vitest run --project app __tests__/marketing __tests__/lib/learn __tests__/lib/enrollments`, then `NODE_OPTIONS=--max-old-space-size=8192 pnpm type-check` — Expected: PASS, exit 0.
- [ ] **Step 5: Commit** `feat(learn): green course detail page with access-aware CTA`.

### Task 6: Gates, smoke, review, ship

- [ ] **Step 1: Gates in the worktree, one at a time:** `NODE_OPTIONS=--max-old-space-size=8192 pnpm type-check`; `pnpm vitest run --project app --maxWorkers=2`; `NODE_OPTIONS=--max-old-space-size=8192 pnpm build`. Expected: all exit 0; route table **unchanged** vs a baseline build: `ƒ /[locale]/learn/[slug]`, `●` for `/`, `/ja`, `/about`, `/learn`, `/ja/learn`.
- [ ] **Step 2: Data check:** with `pnpm start` (reads prod, read-only), every published prod course page (5 slugs, §1) renders 200 EN + `/ja`, no section shows "null", "NaN", "0 weeks" or an empty heading; `test-1v1` shows R6 with no syllabus/curriculum; `teaching-ai-for-teachers` shows R9.
- [ ] **Step 3: Browser smoke** EN + `/ja`, 1440 and 375 px (Chrome extension if it attaches, else headless Chromium as in 2a): exactly **one** nav (hv) and no legacy `dark-zone` nav, no honu companion, no 56/64px gap above the hero; console clean; sub-nav sticks under the header (and under the event strip when the banner is on) and anchors land below it; curriculum multi-open + Expand/Collapse all + keyboard (Tab, Enter/Space); reduced motion; 44px targets; JA wrapping; "Download syllabus" EN row downloads; signed-out R11 on a private paid course → `/signin?redirect=…` → back. Logged-in Vault-reader / included states: **not smokable on prod data** (no included course) — covered by Task 2/5 tests; owed after Ryan flags a course.
- [ ] **Step 4: Adversarial review** (`requesting-code-review`, told to refute) over the worktree diff with this plan attached; attack: paid-field leakage into props, matcher width, CTA precedence vs B3 semantics, `/api` links under `/ja`, the free-enroll error path, reduced motion. Triage with `receiving-code-review`; re-run affected gates.
- [ ] **Step 5: STOP only if EN copy changed** from the approved D2/D4/D11 tables (e.g. after Step 2's data check or the review): Ryan signs off the changed strings. Otherwise continue.
- [ ] **Step 6: STOP — Ryan approves the push.** Ship per §6.
- [ ] **Step 7: Post-deploy:** Vercel status on the sha = success; `curl -sS https://www.honuvibe.ai/learn/ai-essentials-first-steps-future` and `/ja/…` → 200, HTML has **no** `dark-zone fixed top-0`, has `id="curriculum"`, has the closed-state CTA; `/learn/dashboard` still shows the dark member chrome (signed-in, Ryan). Append an execution record; update memory `project_marketing_redesign_green` (2b shipped; 2c = Vault-read dashboard listing if D8 as recommended).

## Plan review (2026-10-19, fresh sub-agent told to refute against HEAD 5d7ec62)

Each finding was checked against the code before folding in. No Critical findings; no migration needed (confirmed: `course_catalog` exposes `is_private`/`vault_included` and nulls paid fields per viewer).

Folded in as rev 2:
- **I1 — unpriced "paid" course bounced back** (`checkout/page.tsx:89-91` redirects to the course page when the locale's price is null). New row R11a → `contact`; tests for `(null, null)`, `(0, 2980)` on EN, and `(125000, 0)` on JA.
- **I2 — "full" contradicted itself** (§3 link vs Task 3 disabled button). R8 is a `#newsletter` link; the disabled branch is gone.
- **I3 — `CourseCtaButton` had no `courseId`** for `simulatedEnroll`, and no `is_paid` for analytics. Props now carry `courseId = view.id`; `is_paid = kind === 'buy'`; router pinned to `next/navigation` (avoids `/ja/ja`).
- **M4 — hero padding** would lose to `HvSection`'s default `md:pt-20` (`cn` = plain `clsx`, `lib/utils.ts:3-5`). Hero uses `spacing="flush"`.
- **M5 — unknown slugs would render with no nav** once the path is marketing (no `not-found.tsx` anywhere; `/learn/account` is protected in `middleware.ts:11` but has no route). Added `app/[locale]/learn/[slug]/not-found.tsx` + test.
- **M6 — Task 5 mocks incomplete; React `cache` untestable in Vitest.** Mock list completed from existing test patterns; sections required sync; the "loaded once" test dropped.
- **M7 — meta title suffix would double the brand** (layout template `%s | HonuVibe.AI`). Key dropped.
- **M8 — `#newsletter` had no `scroll-mt`; `phase` is EN-only.** `scroll-mt` added to the band; new D13 hides stage on `/ja`.
- **M9 — factual slips:** `AvailabilityBadge` is not used by `CourseHub` (deletion still safe); `learn_catalog` line refs now give both HEAD and working-tree offsets. D12 now states plainly that shipping with no included course deviates from the roadmap amendment.

Held as true (reviewer verified): `hasCourseAccess` contract and order; the page shim and component callers; the double-nav cause and that the matcher fix also corrects `ConditionalMain` padding and the companion (footer unaffected; checkout's own regex separate); the six `/learn` siblings; 072 RPC rules; checkout hub redirect + 409s; JPY→USD fallback; subscribe GET signed-out bounce and `/ja` handling; `/ja/learn` allowlisted for `redirect=`; `apiHrefForLocale`, `MarketingNav({cta})`, `HvButton` `/api/`+`#` plain anchors, `HvReveal` props, `MarketingShell theme="hv"`; `course_detail` free; parity test structural; `getPageQuotes` keeps `/learn` static; no plan edit target is dirty except `messages/*`; no certificate feature.

## Out of scope

- Vault-read courses on `/learn/dashboard` / resume (D8 → 2c), the course hub (D12), certificates.
- Course URLs in the sitemap; JSON-LD `Course` schema; per-course FAQ/testimonial data (needs a migration / B5).
- Deleting now-unused `learn.*` keys (Unit 6 prunes dead i18n); restyling `/learn/[slug]/checkout`.
- Return-to-course after Vault checkout (Stripe `success_url` goes to the dashboard today).
- `checkVaultAccess` legacy step 4, `getEnrollmentByCourseId` (B3 §8).

## Out-of-band (Ryan)

1. Review this plan; answer D1–D13 (recommendations marked).
2. EN copy sign-off before commit (Task 6 Step 5); JA native review after ship.
3. Approve the push (Task 6 Step 6). Logged-in smokes after ship; included-course smoke after a course is flagged.

## Execution record (2026-10-19)

**Shipped:** `d1ced3f` feat(learn): Unit 2b course detail, on top of `750e32d` (origin/main had not moved). It is one commit, 38 files (+3558/−858), squashed from six worktree commits in `hv-land-a` (d5a9847 → ad1ebe0) and applied to main as a patch. `git write-tree` matched the worktree tree `8ddc28f`. Vercel deployed it successfully. No migration.

**Gates** (on the final tree):
- type-check: exit 0.
- `vitest --project app --maxWorkers=2`: 204 files, 2333/2333.
- build: exit 0, route table unchanged (`/`, `/ja`, `/about`, `/learn`, `/ja/learn` ●; `/[locale]/learn/[slug]` ƒ). This was compared against B3's recorded table; no fresh baseline build was run.
- Build flakiness on this 8 GB machine: one transient Turbopack `next/font/google` error, then three out-of-memory crashes after the review fixes. All passed once other apps were closed.

**Data check** (`pnpm start`, reading prod):
- All 5 published prod courses return 200 in EN and `/ja`, with no "null", "NaN", "0 weeks" or "undefined".
- The 4 private courses are noindex.
- `test-1v1` has no curriculum or syllabus.
- An unknown slug returns a 404 with the hv not-found page in both locales.

**Browser smoke:** the Chrome extension attached but could not screenshot or run JS ("Cannot attach to this target"), so I used headless Chromium 1243 via playwright-core in a scratch dir.
- EN and `/ja` at 1440 and 375 px:
  - Exactly one visible header, 0 `.dark-zone`, no companion, no horizontal scroll.
  - `<main>` has lost the `pt-14 md:pt-16` padding.
  - The sub-nav sticks at 68px, and `#curriculum` lands at 136px, below the sub-nav.
  - The curriculum is multi-open and works with Enter and Space; Expand all and Collapse all work.
  - The only small targets are the nav EN/日本語 pill (36px). It predates 2b.
- The console shows only `/_vercel/insights/script.js` 404, which only exists on Vercel.
- The EN syllabus link returns 200 `application/pdf`.
- Signed out, R11 on the private paid course goes to `/signin?redirect=%2Flearn%2F…`. The return after sign-in was not smoked (no test credentials).
- Not smokable on prod data: the Vault-reader and included-course states (no course is included). Task 2 and Task 5 tests cover them.

**Prod checks:**
- `/learn/ai-essentials-first-steps-future` and its `/ja` page return 200, with no `dark-zone fixed top-0`, no `pt-14 md:pt-16` main padding, `id="curriculum"` present, the closed-state CTA, and no subscribe link.
- An unknown slug returns 404.
- `/learn` and `/ja/learn` still serve `x-vercel-cache: PRERENDER`.
- `/learn/dashboard` returns 307 signed out, as before.

**Changes against this plan (rulings):**
- Added a shared test fixture, `__tests__/fixtures/course-detail.ts`.
- The length fact is omitted for a course with zero modules. Hours are rounded, with a minimum of 1.
- `CourseFaq` takes `{ view, cta, quotes }` and builds the D4 items itself (`buildCourseFaqItems`). `CourseClosing` takes `{ view, cta, ctaLabel }`.
- `cta.contact` is split into `contact.{one_on_one, other}`, because R6 and R11a carry different labels.
- New EN strings outside the approved tables (no approved copy changed):
  - `not_found.{title, body}`
  - `cta.enrolling`, `cta.enroll_error`
  - `syllabus.{row_en, row_ja, download}`
  - The instructors eyebrow is "Instructors". The design's "Your instructors" would duplicate the D11 H2.
  - Curriculum length and title variants.
  - FAQ length: ", about one module a week" is added only when modules = weeks.
- The closing-band body reuses the price-card body for each variant. Vault-join uses the design's closing line. A buy has no body, and closed or full use their notes.
- The enroll error shows a translated generic message, because prod masks server-action errors.
- Added `formatCourseDate` (UTC; en-US short, ja-JP long).
- The price-card button reads "Join the Vault" for vault_join; every other variant uses the §3 label.
- The error text colour follows its surface (amber on dark, terracotta-dark on light) for AA.
- `EnrollmentCheck` is still in `lib/enrollments/types.ts`, but nothing uses it.
- Smooth scroll is not disabled under reduced motion. The cause is the site-wide `html { scroll-behavior: smooth }` in `styles/globals.css`, which has WIP in main, so it was left alone and flagged.

**Review** (a fresh sub-agent told to refute the diff): no Critical. It held the paid-field whitelist, matcher width, CTA precedence vs B3, `/api` links under `/ja`, and that `/learn` still prerenders.
- Fixed, each with a test that failed first:
  - "See what's inside ↓" was terracotta on sand at 3.86:1, an AA failure. It now uses the green-900 link variant.
  - The FAQ answered "Enroll once for $1,250" on a closed cohort, shown on the only public course. "How do I get access?" is now hidden when the course is closed or full.
- Deferred minors:
  - The closed-state copy assumes a cohort that is under way. A completed or archived cohort, or a self-study course closed by status, reads wrong. Fixing it needs new EN copy.
  - `start_date` is compared at UTC midnight, so a Hawaii cohort closes about 10 hours before its local start day.
  - The enroll button re-enables during `router.push` after success. The RPC is idempotent.
  - "~1 hrs" is singular-unaware.
  - The outcomes gap-grid shows empty cells when the last row isn't full (a design pattern).

**JA:** the whole `course_detail` namespace is machine-drafted and needs native review. Known slips: 録画動画で自分のペースで (dangling particle) and 全1モジュール.

**Owed:**
- Ryan's logged-in smokes: an enrolled learner sees "Go to your course", the free enroll on `teaching-ai-for-teachers`, and the R11 return after sign-in.
- Flag a self-study course as Vault-included, then smoke the Join the Vault and Vault-reader states.
- JA native review.
- Reduced-motion smooth scroll in `globals.css`.
- **Next: 2c**, Vault-read courses on `/learn/dashboard` and in resume (D8).
