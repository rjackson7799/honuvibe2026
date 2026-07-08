# Front-End Value-Prop Simplification — Research & Page-by-Page Improvement Plan

## Context

Ryan wants to re-examine the HonuVibe marketing front end (Home, Learn, Explore, Partnerships, About, Contact) against a competitor-style reference (aisquads.org) whose offering is similar but whose site is much simpler and more conversion-focused. HonuVibe monetizes two ways: (1) **Learning** — Vault access + live cohorts, (2) **Studio** — design/dev services at studio.honuvibe.ai. Suspicion: our site is overly complicated and the value proposition / path-to-purchase is unclear.

## Part 1 — What AI Squads does (from screenshots + site)

### Site anatomy (4 pages + apply CTA — that's the whole nav)
Nav: `AI Launch Camp · AI Squads VIP · Meet Sepehr · For Business · [Apply free →]`
Four pages, each with ONE job:
1. **Home / AI Launch Camp** — sell the flagship program
2. **AI Squads VIP** — sell the recurring membership (the "keep going" upsell)
3. **Meet Sepehr** — founder credibility + router ("How can I help you?" → 3 doors)
4. **For Business** — B2B services + consultation form

### Conversion patterns worth stealing
- **Outcome + timeframe headline**: "LAUNCH YOUR AI APP IN 30 DAYS" — concrete deliverable, concrete deadline. Sub-bullets answer the 3 objections instantly (live by demo day / credible instructor / no experience needed).
- **Numbers strip immediately under hero**: 9,023 in community · 132+ member reviews · $18,000+ · Any age. Social proof before any scrolling decision.
- **"Who is this for?"** — 3 persona cards (middle/high schoolers, college students, adults) so every visitor self-identifies in one glance.
- **One program, one promise**: "30 days. One real AI app." Weekly milestone badges (Ideation → Design → No-code build → Advanced logic → Launch & demo day) make the journey legible.
- **Community as retention product**: VIP = "an inner circle of ambitious people using AI to WIN" — benefit-first ("Five ways your life levels up"), not feature-first.
- **Price anchoring everywhere**: ~~$1,100~~ → **$60** summer deal (camp + 3 months VIP); "worth $300+" per component; monthly alternative shown ($100/mo) to make the bundle obvious.
- **Urgency + scarcity**: "only 12 reserved seats at this price", cohort start date, countdown bar in the top ribbon.
- **"The room isn't for everyone"** — join-if / skip-if columns. Qualifies leads and adds credibility by pushing people away.
- **Founder page doubles as router**: stats (5,000+ taught, 4.9★, 78 NPS), "watch me teach" video proof, then "How can I help you?" → 3 cards routing to Camp / Teen program / Business.
- **For Business page = 3 offers + form**: AI Solutioning / Team Training (badged "most popular") / 1-on-1. Single CTA: Book a Free Consultation. Zero fluff.
- **Every page ends with the same CTA** (apply / claim deal). No page is a dead end.

### The underlying lesson
One flagship offer per audience, one primary CTA per page, proof stacked early, price framed against an anchor, and the whole site is 4 pages. Complexity lives inside the product, not the marketing site.

## Part 2 — HonuVibe front-end audit

### Shared chrome
- Nav: Learn · Explore · Partnerships · About · Contact + "Get Started"→/learn (Home only). 5 destinations vs AI Squads' 4, but ours are *categories*, not *offers*.
- Newsletter band + 5-column footer on every page. Social links are `href="#"` placeholders (`marketing-footer.tsx:19-24`).

### Home (`app/[locale]/page.tsx`) — 8 sections
- Hero: "Learn AI. / Apply It. / Move Forward." — brand voice, but **no outcome, no timeframe, no audience** in the headline. CTAs: "Explore Courses"→/learn, "Partner With Us"→/partnerships.
- Social proof inconsistency: hero says "500+ learners" (hardcoded in en.json) while Learn says 1,400 (`lib/constants/social.ts:1`).
- Sections: How It Works → Value Props → Vault pitch → Featured Courses → For Organizations → Exploration (studio work) → Testimonials. **No pricing anywhere on Home.**
- All 3 course-card CTAs hardcode `/learn` (`featured-courses.tsx:78,138`) — no deep links.
- Exploration project cards are non-interactive (`cursor-default`).

### Learn (`app/[locale]/learn/page.tsx`) — 9 sections, the conversion page
- Hero: "I want to…" rotating intent picker (3 intents). CTAs "Start learning"→#vault, "Take the tour"→#courses.
- Sells **three products at once**: Ch.01 Vault ($99/mo, + Community $29/mo), Ch.02 Public Courses ($1,250+), Ch.03 Private Cohorts (Custom) — then a 3-column comparison table, FAQ, and a closing 3-price-card section. The visitor must choose between 3 offers 3 separate times.
- Checkout wiring: `/api/stripe/subscribe?tier=community|vault` and `/learn/auth?intent=vault`. All price amounts are display strings in `messages/en.json`, not a pricing module.
- No price anchoring on the $99 Vault beyond one passing "$1,250 cohorts" reference; no urgency, no cohort dates, no persona cards, no money-back framing on cards (refund policy buried in checkout copy).

### Explore (`app/[locale]/explore/page.tsx`) — 6 sections, magazine/"issue" concept
- Interactive film-reel hero (Now Playing / Scene / Frame chrome), Index catalog table, Method, "Built with Aloha" give-back, Questions FAQ (mentions "~$20K USD" minimum engagement), dark closing CTA with 3 links incl. "Build with our Studio" → studio.honuvibe.ai.
- This is effectively the **services portfolio** page but the editorial concept (Ch. III / Vol. MMXXVI / "next issue?") makes the sales purpose oblique.

### Partnerships (`app/[locale]/partnerships/page.tsx`) — 6 sections, editorial "Vol. 01" concept
- Hero "Partner / with us." — three ways in: cohorts (#cohort), project work (#project), consulting (#consulting). All CTAs → `/partnerships/apply?type={cohort|project|consulting}` lead form.
- No pricing ("at-cost", "by application"). **Project + consulting chapters directly overlap Studio's offering** — two competing funnels for the same business buyer.
- Copy bug: `partnerships.consulting.quote` (en.json:3080) is a garbled sentence.

### About (`app/[locale]/about/page.tsx`) — 5 sections
- Hero "Practical AI education, / made personal." Origin story (Ryan), The Crew, Mission/Vision, closing CTA (Start learning / Partner with us).
- Team component filters Mizuho out (`team.tsx:38-40`) though her en.json strings exist; `about.aloha_standard` + `about.social_section` copy is dead/unrendered.
- Compare AI Squads "Meet Sepehr": stats strip (5,000+ taught, 4.9★, NPS), "watch me teach" video proof, and a "How can I help you?" 3-door router — our About has none of these conversion elements.

### Contact (`app/[locale]/contact/page.tsx`) — 4 sections
- Solid and simple: hero, form (subject select incl. Partnership Inquiry), info strip, social section (real URLs here — but the global footer's social icons are `href="#"` placeholders).

### Studio site (`app/studio-site/`, studio.honuvibe.ai) — separate EN-only tree
- Home: "Grow without / growing a team." + Featured work + 3 tiers + industries + process + CTA band. Pricing page: **Starter $500 + $25/mo · Pro $2,500 + $75/mo · AI-Native from $7,500 + $200/mo** (source of truth `lib/pricing.ts:97-102`). All CTAs → `/contact` lead form (`/api/studio-leads/submit`) or Cal.com discovery call. No checkout — by design.
- **Cross-linking is nearly zero**: main site links to Studio from exactly ONE place (Explore's closing section, `next-issue.tsx:31-39`). No nav or footer presence, despite Studio being half the business.

### Conversion paths (traced)
- **Vault/Community**: `/learn` pricing cards → `/api/stripe/subscribe?tier=…` → Stripe Checkout → `/learn/dashboard/billing`. Fully self-serve. Alternate: `/learn/auth?intent=vault`.
- **Courses**: `/learn/${slug}` → per-course Stripe checkout.
- **Cohorts/Partnerships**: application form only, no price.
- **Studio**: lead form / discovery call only, no checkout.

### Cross-cutting inconsistencies found
1. Learner count: Home hero hardcodes "500+" in en.json; Learn uses `TOTAL_LEARNERS = 1400`.
2. **Price-signal contradiction**: Explore FAQ says engagements start "~$20K USD" (en.json:2789) while Studio advertises $500–$7,500 tiers.
3. Footer social icons `href="#"` vs real URLs on Contact.
4. Garbled consulting quote (en.json:3080); dead About copy; Mizuho filtered from team.
5. Home course cards all link to bare `/learn` instead of course pages.

## Part 3 — Diagnosis (HonuVibe vs AI Squads)

| Dimension | AI Squads | HonuVibe today |
|---|---|---|
| Flagship promise | "Launch your AI app in 30 days" — outcome + deadline | "Learn AI. Apply It. Move Forward." — vibe, no outcome |
| Offers per page | 1 primary + 1 upsell | Learn page sells 3–4 offers, asks visitor to choose 3 separate times |
| Proof placement | Numbers strip directly under hero | Testimonials at bottom of Home; inconsistent learner counts |
| Price anchoring | ~~$1,100~~ → $60 bundle, "worth $300+" | Vault $99 with one passing "$1,250 cohorts" mention |
| Urgency | Cohort date, seat count, countdown | None anywhere |
| Persona routing | "Who is this for?" cards + founder-page 3-door router | Intent picker on Learn only; Home doesn't route personas |
| Business door | "For Business" in nav → 1 page, 3 offers, 1 form | Studio invisible from main site; Partnerships duplicates its offering |
| Site size | 4 pages, every page ends at the same CTA | 6+ marketing pages + separate Studio site, editorial concepts on 3 of them |

Root cause: complexity lives in the **marketing site** (magazine concepts, 3-way choices, parallel funnels) instead of inside the product. AI Squads' lesson: one flagship per audience, one CTA per page, proof early, price anchored.

## Part 4 — Decisions (made by Ryan, 2026-07-06)

1. **Vault-first flagship** — The Vault ($99/mo) leads everywhere; live cohorts = premium accelerator; Community $29 = entry tier.
2. **One business door** — single business entry in main nav; Partnerships narrows to organizational learning (cohorts); project/consulting inquiries route to Studio.
3. **Studio owns services pricing** — remove the "~$20K" line from Explore; project-pricing curiosity routes to Studio's $500–$7,500 tiers.
4. **Scope: restructure key pages** — keep the design system; rework sections, headlines, CTAs. Not a ground-up rebuild.

## Part 5 — Phased implementation plan

Each phase is independently shippable in one session, ordered by revenue impact. Per dev workflow, on approval this plan is copied to `docs/plans/2026-07-06-marketing-simplification.md`; Phase 1 can ship immediately, and phases 2–6 each get Ryan's copy sign-off during execution (headline/pricing copy shown before commit).

### Phase 1 — Quick-wins trust & routing bundle (ship first)
No structural changes; removes conversion leaks and credibility bugs.
- **Remove ~$20K line**: rewrite `explore.questions.q_1_a` (en.json ~2789) to route pricing to Studio ("transparent tiers start at $500… full pricing at studio.honuvibe.ai; learning engagements are scoped on the partnerships page"). Mirror ja.json — **JA human review**.
- **Learner count**: parameterize `home.hero.social_proof` (`<count>500+</count>` → `<count>{count}+</count>`) and pass `TOTAL_LEARNERS.toLocaleString()` in `components/marketing/home/hero.tsx:65` (pattern already in `learn-hero.tsx:52`).
- **Home course-card links**: `featured-courses.tsx:78,138` → `/learn#courses` (anchor exists at `learn-chapter-courses.tsx:41`).
- **Garbled consulting quote**: fix `partnerships.consulting.quote` (en.json:3080) + JA review.
- **Restore Mizuho**: remove filter at `components/marketing/about/team.tsx:38-40`; bump `about.team.cadence_stat_1_value` 2→3.
- **Footer social**: add `SOCIAL_LINKS` to `lib/constants/social.ts` (real URLs from `contact/social-section.tsx:22-33`), consume in footer (`marketing-footer.tsx:19-24`) + contact; swap footer's LINE (no URL) for LinkedIn.
- **Delete dead copy**: `about.aloha_standard`, `about.social_section` from en/ja.json.

### Phase 2 — Learn: one pricing moment, Vault-first (biggest revenue lever)
Restructure `app/[locale]/learn/page.tsx` from 9 sections → 7; visitor chooses once, not three times.
1. **Hero rework** (`learn-hero.tsx`): retire the "I want to…" intent picker; Vault-first editorial headline (direction: *"Every lesson we teach. One membership."*), primary CTA "Join the Vault — $99/mo" → `#vault`.
2. **Proof band**: merge `LearnPartnerStrip` into a numbers strip (1,400+ learners · {N} bilingual lessons · EN/日本語 · partner logos); lesson count from `getVaultContentTypeCounts()` already fetched in page.
3. **`LearnChapterVault` becomes THE pricing moment**: 3-card anchored ladder — Community $29 (14-day trial) · **Vault $99 RECOMMENDED** (14-day refund badge, "Same teachers as our $1,250 cohorts" promoted visually) · Live Cohorts $1,250+ → `#courses`. Stripe hrefs (`learn-chapter-vault.tsx:52,74`) unchanged.
4. **`LearnChapterCourses` keeps** `id="courses"`, reframed as "the accelerator — live cohorts."
5. **`LearnChapterCohorts` compressed** to a slim router band ("Training a whole team or community?" → `/partnerships`), reusing its existing final band (`learn-chapter-cohorts.tsx:209`).
6. **Keep `LearnFAQ`.**
7. **`LearnStartTonight` de-priced**: single "Join the Vault — $99/mo" CTA + refund line + text links; becomes the shared "every page ends here" pattern.
- **Cut**: `LearnPathChooser`, `LearnComparisonDark` (fold "best for" rows into pricing-card captions). Delete `learn.path_chooser` + `learn.comparison` keys.
- **JA review**: hero + pricing-ladder copy (anchoring rhetoric must be re-composed, not translated).

### Phase 3 — Home: outcome hero, numbers strip, persona router
1. **Hero copy rework** (action voice, structure unchanged): outcome-based headline; primary CTA "Join the Vault — $99/mo" → `/learn#vault`; secondary "For Organizations" → `/partnerships`.
2. **New `home/numbers-strip.tsx`** under hero (AI Squads pattern): learners/lessons/languages/partners; server component sharing one renderer with Learn's proof band.
3. **New persona router** ("Who is this for?"): Professionals & solopreneurs → `/learn#vault` · Organizations → `/partnerships` · Need something built → Studio URL. Model on the retired path-chooser card pattern.
4. **Merge** `HomeHowItWorks` into `HomeValueProps` (overlapping content); **cut** `HomeExploration` (non-interactive cards).
5. **`HomeVaultSection`** CTA → "Join the Vault — $99/mo" → `/learn#vault`.
6. **`HomeFeaturedCourses`**: ideally server-fed by `getPublishedCoursesWithPartners()` with `/learn/[slug]` deep links; fallback keeps Phase 1 anchors.
7. **New shared `components/marketing/final-cta.tsx`** (extracted from de-priced start-tonight): used on Home, later About/Explore.
- **JA review**: hero + personas + final CTA.

### Phase 4 — Nav + footer: one business door
- `marketing-nav.tsx:4-10`: relabel `nav.partnerships` → "For Organizations" (route stays `/partnerships`; JA e.g. 法人・団体向け — review).
- Get Started CTA (`marketing-nav-client.tsx:113`): `/learn` → `/learn#vault`.
- Footer: relabel Partnerships; add Studio entry → `NEXT_PUBLIC_STUDIO_URL` (centralize the URL fallback currently duplicated in `next-issue.tsx:6` and `lib/email/send.ts:732`).

### Phase 5 — Partnerships: narrow to organizational learning
- Hero: 3 chips → single focus (*"AI programs, built for your community."*).
- Keep + promote `CohortChapter` (Vertice proof); **cut Project + Consulting chapters from the page**, replaced by one slim `studio-router.tsx` band ("Need something built or advised, not taught? That's HonuVibe Studio.") → Studio URL.
- Keep component files + `partnerships.project/consulting` keys for now (apply form `?type=project|consulting` backward compat); retire in a follow-up.
- Method table: rework to cohort lifecycle, or cut if the session runs long. Closing CTA → `/partnerships/apply?type=cohort` + secondary Studio link.
- **JA review**: whole namespace.

### Phase 6 — Explore + About polish
- Explore: structure stays; `next-issue.tsx:41` "Tell us about your project" → Studio URL (project inquiries belong to Studio now); "Start learning" → `/learn#vault`; tighten subhead to name Studio.
- About: add credibility stat row (reuse numbers-strip) under hero; swap `ClosingCta` for shared `final-cta.tsx`.

## Verification (every phase)
1. `pnpm verify` (type-check → vitest app project → build).
2. Update co-located `__tests__/marketing/*/*-sections.test.tsx` in the same commit as section changes.
3. Browser smoke: changed routes in EN **and** `/ja/…`; click every CTA on changed pages.
4. Known baseline: `marketing-routes.test.ts` has 4 pre-existing `/partners/smashhaus` failures — not regressions.
5. Never touch: `/api/stripe/*`, `lib/pricing.ts` amounts, `MarketingShell`, CSS tokens.
6. i18n discipline: en.json/ja.json stay line-parallel; ship JA machine-drafts flagged with a review checklist; JA hero headlines re-composed per JP typography rules (serif-italic doesn't work in JP — use weight contrast).

## Out of scope (noted for later)
- Urgency mechanics (cohort dates, seat counts) — needs a scheduled cohort to be honest; revisit when one is on the calendar.
- A bundle offer (e.g. cohort + 3 months Vault, AI Squads' summer-deal pattern) — pricing decision for Ryan, not a site change.
- Studio site itself — it already follows the simple pattern; only the main site's visibility of it changes.
- About-page "watch me teach"-style video proof — needs assets that don't exist yet.
