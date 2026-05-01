# Plan: learn.honuvibe.com Dedicated Sales Landing Page

## Context

The subdomain-migration plan at [docs/plans/learn-subdomain-migration.md](../plans/learn-subdomain-migration.md) currently routes `learn.honuvibe.com/` to `/learn` — which today is just the course catalog. That works for returning students but fails cold traffic landing from partner referrals (SmashHaus, Vertice), paid ads, and SEO: no pitch, no community story, no social proof before they bounce.

We need `/learn` to become a sales-driven landing page that:

1. Pitches HonuVibe's value prop quickly (hero).
2. Showcases the **multi-vertical community vision** — HonuVibe (general AI education), Vertice Society (its own vertical community), SmashHaus (music-driven), and the expansion story (more verticals / industries coming). This is the key differentiator — a learner finds *their tribe*, not just a course.
3. Previews featured courses.
4. Shows social proof (testimonials, founder story).
5. Funnels to the catalog one click away at `/learn/courses`.

Decisions locked:
- **Route swap**: catalog moves to `/learn/courses`; `/learn` becomes the landing everywhere (both subdomain and main domain).
- **Hero CTAs**: explore-led — "Browse Courses" (primary) + "Join Community" (secondary).
- **No hard community numbers** at launch — copy focuses on the vertical/community vision, not member counts.

---

## Architecture

```
learn.honuvibe.com/           → serves /learn          (NEW landing)
learn.honuvibe.com/courses    → serves /learn/courses  (catalog, relocated)
learn.honuvibe.com/[slug]     → serves /learn/[slug]   (course detail, unchanged)
learn.honuvibe.com/dashboard  → serves /learn/dashboard (unchanged)
honuvibe.com/learn            → NEW landing (consistent with subdomain)
honuvibe.com/learn/courses    → catalog (relocated)
```

The existing middleware rewrite (`/foo` → `/learn/foo` on subdomain) needs **no changes** — we're just changing which page lives at `/learn`.

---

## Landing Page Composition

`app/[locale]/learn/page.tsx` composes these sections in order:

| # | Section | Component | Reuse or New |
|---|---------|-----------|--------------|
| 1 | Hero | `LearnLandingHero` | **New** — sales headline + dual CTA + floating course card |
| 2 | Value Props ("Why HonuVibe") | `LearnValueProps` | **New** — 4-icon strip (patterned on `MissionStrip`) |
| 3 | Featured Courses (3 from DB) | `FeaturedCourses` | **Reuse** — already pulls via `getFeaturedCourses(3)` |
| 4 | How It Works | `HowItWorks` | **Reuse** from `components/learn/` |
| 5 | **Community Verticals** (the differentiator) | `CommunityVerticals` | **New** — 3 cards: HonuVibe, Vertice Society, SmashHaus + "more coming" placeholder |
| 6 | Social Proof | `SocialProof` | **Reuse** (existing 3 testimonials) |
| 7 | Founder Story | `RyanBioStrip` | **Reuse** |
| 8 | Newsletter + Final CTA | `NewsletterSignup` + `CtaStrip` | **Reuse** |

---

## File Changes

### Create

- **[app/[locale]/learn/page.tsx](../../app/[locale]/learn/page.tsx)** — Replace with landing composition. Current content moves to `courses/page.tsx`.
- **[app/[locale]/learn/courses/page.tsx](../../app/[locale]/learn/courses/page.tsx)** — New route. Receives the entire existing body of `app/[locale]/learn/page.tsx` verbatim (hero, `LevelFilter`, `LearnPathCards`, course grid).
- **[components/learn/LearnLandingHero.tsx](../../components/learn/LearnLandingHero.tsx)** — Sales hero. Pattern from [components/sections/hero-section.tsx](../../components/sections/hero-section.tsx), but:
  - Headline reads from `learn_landing.hero.*` i18n keys
  - Two CTAs: `Link href="/learn/courses"` (primary, gradient) + `Link href="#communities"` (secondary, ghost) — anchors down to the verticals section
  - Floating side card can reuse hero-section's course preview card pattern
  - Uses existing `FloatingTechBg` or `AbyssalEchoBackground` for ocean atmosphere
- **[components/learn/LearnValueProps.tsx](../../components/learn/LearnValueProps.tsx)** — Grid of 4 glass cards with icon + title + body. Pattern cloned from [components/sections/mission-strip.tsx](../../components/sections/mission-strip.tsx). Values: "Build real projects, not theory", "Bilingual (EN/JP)", "Learn with a community", "Made by a founder who ships".
- **[components/learn/CommunityVerticals.tsx](../../components/learn/CommunityVerticals.tsx)** — 3-up card grid (4th slot is "Your vertical coming soon" teaser). Each card: vertical name, tagline, color accent, CTA ("Explore HonuVibe community", "Visit Vertice Society", "Go to SmashHaus"). Pattern from `MissionStrip` but larger/denser cards.

### Modify

- **[messages/en.json](../../messages/en.json)** — Add `learn_landing` namespace (keys listed below).
- **[messages/ja.json](../../messages/ja.json)** — Same namespace with JP translations. LINE mentioned in community context if applicable (or we scope LINE as a HonuVibe community surface).
- **[components/sections/featured-courses.tsx](../../components/sections/featured-courses.tsx)** — "See all" link: `/learn` → `/learn/courses`. Verify with grep.
- **Nav / footer links pointing to `/learn`** — audit whether each should point to the landing (`/learn`) or the catalog (`/learn/courses`):
  - Top nav "Learn" / "Courses" → likely `/learn` (landing is the entry point).
  - Any explicit "Browse all courses" CTA → `/learn/courses`.
  - Home page's FeaturedCourses "See all" → `/learn/courses`.
  - Footer — audit based on link label.

### Middleware

No changes — the existing rewrite logic from [docs/plans/learn-subdomain-migration.md](../plans/learn-subdomain-migration.md) works as-is.

---

## i18n: `learn_landing` Namespace

```
learn_landing.hero.overline           = "Learn AI the HonuVibe way"
learn_landing.hero.headline           = "Ship real AI projects. Find your people."
learn_landing.hero.sub                = "Bilingual AI education built around communities — HonuVibe, Vertice Society, SmashHaus. Pick the vertical. Build the thing. Share the win."
learn_landing.hero.cta_primary        = "Browse Courses"
learn_landing.hero.cta_secondary      = "Join a Community"

learn_landing.value_props.overline    = "Why HonuVibe"
learn_landing.value_props.heading     = "Built for builders"
learn_landing.value_props.items.[0..3] = {title, description} x 4

learn_landing.communities.overline    = "Your vertical, your community"
learn_landing.communities.heading     = "Find your tribe"
learn_landing.communities.sub         = "HonuVibe is the umbrella. Each vertical has its own community and culture."
learn_landing.communities.honuvibe    = {name, tagline, description, cta, href}
learn_landing.communities.vertice     = {name, tagline, description, cta, href}
learn_landing.communities.smashhaus   = {name, tagline, description, cta, href}
learn_landing.communities.coming_soon = {name: "Your industry, next", tagline: "We're adding verticals. Tell us what you'd learn."}

learn_landing.final_cta.heading       = "Start where you are."
learn_landing.final_cta.cta           = "Browse Courses"
```

---

## Reusable Utilities Confirmed

- `getFeaturedCourses(3)` — [lib/courses/queries.ts:24](../../lib/courses/queries.ts#L24)
- `FeaturedCourseCard` rendering — [components/sections/featured-courses.tsx:41](../../components/sections/featured-courses.tsx#L41)
- `SocialProof` testimonials — keys at [messages/en.json](../../messages/en.json) under `social_proof.*`
- `RyanBioStrip` — reads from `bio.*` i18n namespace
- `NewsletterSignup` posts to `/api/newsletter/subscribe` — no changes needed

---

## Links To Audit / Update

Run a grep for `href="/learn"` and `href={'/learn'}` to find every link that points to what is currently the catalog. For each, decide: does the author mean "go to the learn landing" or "go to the course catalog"? Likely mapping:

| Link source | Current → New |
|-------------|---------------|
| Nav top-level "Learn"/"Courses" | `/learn` → `/learn` (now the landing — keep) |
| Home `FeaturedCourses` "See all" | `/learn` → `/learn/courses` |
| Home hero CTA (if any) | audit individually |
| Footer "Courses" | `/learn` → `/learn/courses` |
| Footer "Learn" (umbrella) | `/learn` (landing — keep) |
| Any "Browse courses" button | `/learn/courses` |

---

## Verification

**Local dev** (after adding `learn.localhost` to `/etc/hosts`):

- [ ] `http://learn.localhost:3000/` shows the new landing (sections 1–8 above)
- [ ] `http://learn.localhost:3000/courses` shows the course catalog (what was at `/learn`)
- [ ] `http://learn.localhost:3000/[course-slug]` still shows a course detail page
- [ ] `http://localhost:3000/learn` shows the new landing (main domain consistency)
- [ ] `http://localhost:3000/learn/courses` shows the catalog
- [ ] `http://localhost:3000/ja/learn` shows the landing with JP copy; all sections render correctly
- [ ] `http://localhost:3000/ja/learn/courses` shows the JP catalog

**Content & interaction**:

- [ ] Hero "Browse Courses" CTA navigates to `/learn/courses`
- [ ] Hero "Join a Community" CTA smooth-scrolls to the `#communities` section
- [ ] CommunityVerticals cards link correctly: HonuVibe → Skool (`https://www.skool.com/honuvibe`), Vertice Society → `/vertice` (or its URL), SmashHaus → `/partner/smashhaus` or its portal URL
- [ ] "Your industry, next" card has either a tell-us form, newsletter CTA, or disabled state
- [ ] FeaturedCourses renders 3 featured courses from DB (or fallback)
- [ ] Newsletter signup still works
- [ ] `LearnPathCards` still renders on the catalog page (moved cleanly)

**Regression**:

- [ ] `/learn/dashboard`, `/learn/auth`, `/learn/library`, `/learn/vault`, `/learn/paths` all still work
- [ ] Home page `FeaturedCourses` "See all" now points to `/learn/courses`
- [ ] Top nav "Learn" link works (audit confirmed target)
- [ ] No dead links from footer to `/learn` that meant "catalog"
- [ ] Lighthouse mobile ≥ 90 on the new landing
- [ ] Mobile layout clean at 375px; no horizontal scroll

---

## Out of Scope

- Building out Vertice Society, SmashHaus, or future-vertical landing *destinations* — the community cards link to whatever pages exist today (may be placeholder/TBD). The landing assumes those communities have their own homes already or will by the time this ships.
- Hard membership/enrollment counters — deferred until we have numbers we're proud of.
- A/B testing framework for hero variants — not needed for v1.
- SEO metadata overhaul for `/learn` landing — the default `generateMetadata` copy will be updated in this plan, but no structured-data/schema.org work.

---

## Build Sequence

1. Create `app/[locale]/learn/courses/page.tsx` by copying current `app/[locale]/learn/page.tsx` verbatim. Verify catalog works at `/learn/courses`.
2. Create new i18n keys (`learn_landing.*`) in both `en.json` and `ja.json`.
3. Build `LearnValueProps` and `CommunityVerticals` components.
4. Build `LearnLandingHero` component.
5. Rewrite `app/[locale]/learn/page.tsx` as the new landing composition.
6. Update the `/learn` → `/learn/courses` references (FeaturedCourses "See all", footer, etc.).
7. Local-dev verification (checklist above).
8. Deploy. (Subdomain rewrite from the original migration plan still handles the routing.)
