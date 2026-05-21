# Learn Page — Pre-Launch Redesign

**Date:** 2026-05-19
**Owner:** Ryan (review) / execution agent (build)
**Scope:** Full redesign of `/learn` and `/ja/learn` ([app/[locale]/learn/page.tsx](app/[locale]/learn/page.tsx))
**Status:** Ready to execute
**Execution template:** [docs/plans/_EXECUTION_TEMPLATE.md](docs/plans/_EXECUTION_TEMPLATE.md)

---

## Context

The current Learn page underdelivers on three measurable axes:

1. **Text-heavy.** 6 sections that explain what the offer is, but show very little of it.
2. **Not visual.** One video card (Vault Moment) is the only "look at the product" moment. The course catalog renders with empty space because only 1 course card displays.
3. **Weak CTAs.** "Browse Courses", "Join the Vault", and "Apply for Partnership" all sit at the same visual weight, with no progressive ladder for an undecided visitor.

Four 3rd-party design concepts (Vibrant Dashboard / Polished Refresh / Magazine / Bold Editorial) were reviewed side-by-side. None is right wholesale; the chosen direction synthesizes the strongest moves from each:

- **Intent picker hero** (Bold Editorial / Concept 4) → directly answers "which path is right for me?" at scroll 0.
- **Real bilingual lesson screenshots** (real product assets Ryan provided) → replace fabricated dashboard mockups; pre-sell the "Try a Vault lesson, free" moment.
- **Magazine-style chapter structure** (Magazine / Concept 3) → forces engagement with each path before the decision.
- **Embedded interactive lesson sample** (Bold Editorial / Concept 4) → strongest risk-reversal in the deck.
- **"Start tonight. 今夜から。" close** (Magazine / Concept 3) → real conversion close with 14-day refund mention.
- **Partner logo strip + populated catalog + photo evidence** (Vibrant Dashboard / Concept 1) → visual credibility throughout.

The intended outcome: Learn becomes a self-routing decision page where the visitor's intent shapes the experience, three chapters carry the case, and two dark anchors land at the decision moments.

---

## Resolved design decisions

| # | Decision | Choice |
|---|---|---|
| 1 | Hero approach | **D — Hybrid**: intent picker (left) + locale-matched lesson screenshot (right) |
| 2 | Intent picker action | **Soft-highlight + scroll** to the matching chapter |
| 3 | Supporting sections | Partner logo strip + Free Vault lesson + Comparison table + FAQ |
| 4 | Course catalog | **Embed inside Chapter 02** (3+ live course cards) |
| 5 | Closing | **"Start tonight. 今夜から。"** with 14-day refund |
| 6 | Visual personality | Light shell + **2 dark anchors** (comparison table, closing CTA) |
| 7 | Bilingual chapter headers | **Locale-specific** (matches home page behavior) |
| 8 | Hero lesson screenshot | **Locale-matched** (EN page → EN screenshot, JP page → JP screenshot) |
| 9 | Cohort cards | **Vertice Society only + "Apply to be next"** card. SmashHaus blocked until deal closes (per memory) |
| 10 | Lesson sample format | **Embedded video trailer** (60–90 sec, no auth required) |

---

## Final page structure

```
┌─────────────────────────────────────────────────────────────────────┐
│  1. Hero                            [light]                          │
│     Left: "I want to..." intent picker (3 options) + CTAs            │
│     Right: locale-matched lesson screenshot                          │
│     Below: 1,400+ social proof + face circles                        │
├─────────────────────────────────────────────────────────────────────┤
│  2. Partner logo strip              [light]                          │
│     "Trusted by communities, schools, and visionaries" + logos       │
├─────────────────────────────────────────────────────────────────────┤
│  3. Chapter 01 — The Vault          [light]    #vault                │
│     Large "01" + chapter title + italic intro                        │
│     Bullet list + price + Join the Vault / Take the tour CTAs        │
│     "Try a Vault lesson, free." → embedded 60–90s video trailer      │
├─────────────────────────────────────────────────────────────────────┤
│  4. Chapter 02 — Public Courses     [light]    #courses              │
│     Large "02" + chapter title + italic intro                        │
│     3+ live course cards (cover, tags, price)                        │
│     "Browse all courses →" link                                      │
├─────────────────────────────────────────────────────────────────────┤
│  5. Chapter 03 — Private Cohorts    [light]    #cohorts              │
│     Large "03" + chapter title + italic intro                        │
│     Vertice Society partner card + "Apply to be next" CTA card       │
│     "Partnership Brief" mini-card (Your Community / Co-branded /…)   │
├─────────────────────────────────────────────────────────────────────┤
│  6. Comparison table                [DARK teal]                      │
│     "Which path is right for me? / 自分に合う学び方は?"               │
│     3 columns with row-by-row comparison                             │
│     CTAs INSIDE each column's footer (per Concept 1's smart move)    │
├─────────────────────────────────────────────────────────────────────┤
│  7. FAQ                             [light]                          │
│     "Read this before you decide. / 決める前に読んでください。"      │
│     ~6 bilingual question pairs, 2-column layout                     │
├─────────────────────────────────────────────────────────────────────┤
│  8. Closing CTA                     [DARK teal]                      │
│     "Start tonight. 今夜から。"                                       │
│     14-day refund mention + 3 path-recap cards                       │
├─────────────────────────────────────────────────────────────────────┤
│  9. Newsletter (existing MarketingNewsletter — no change)            │
├─────────────────────────────────────────────────────────────────────┤
│ 10. Footer (existing MarketingFooter — no change)                    │
└─────────────────────────────────────────────────────────────────────┘
```

Anchor IDs (`#vault`, `#courses`, `#cohorts`) on each chapter so the intent picker can smooth-scroll + soft-highlight.

---

## Files to modify

| File | Action | Reason |
|------|--------|--------|
| [app/[locale]/learn/page.tsx](app/[locale]/learn/page.tsx) | Modify | Replace section imports with new component composition |
| [components/marketing/learn/](components/marketing/learn/) | Heavy refactor | Most sub-components rewritten or replaced |
| [messages/en.json](messages/en.json) | Major additions | All new copy under `learn.*` namespace |
| [messages/ja.json](messages/ja.json) | Major additions | Parallel JP copy for everything |

## New components to create

All under `components/marketing/learn/`:

| Component | Purpose | Notes |
|---|---|---|
| `learn-hero.tsx` | Replaces current `LearnHero` | Client component (intent picker has state) |
| `learn-intent-picker.tsx` | The "I want to..." control | Used inside `learn-hero.tsx` |
| `learn-partner-strip.tsx` | "Trusted by..." logo band | Server component |
| `learn-chapter-vault.tsx` | Chapter 01 layout | Renders `learn-vault-sample.tsx` inside |
| `learn-vault-sample.tsx` | "Try a Vault lesson, free." | Embedded video trailer |
| `learn-chapter-courses.tsx` | Chapter 02 layout | Reuses existing `LearnCoursesCatalog` for the 3-card grid |
| `learn-chapter-cohorts.tsx` | Chapter 03 layout | Replaces current `LearnPrivateCohorts` |
| `learn-partnership-brief.tsx` | Mini-card inside Chapter 03 | Bordered, sand background |
| `learn-comparison-dark.tsx` | Dark-themed comparison table | Replaces current `LearnComparisonTable`; CTAs in each column |
| `learn-faq.tsx` | "Read this before you decide" | 2-column accordion or open list |
| `learn-start-tonight.tsx` | Closing CTA band | Dark teal, 14-day refund line, 3 path-recap cards |

## Components to remove (or repurpose)

- `LearnThreePaths` — replaced by intent picker + chapter structure
- `LearnVaultMoment` — content absorbed into Chapter 01 (`learn-chapter-vault.tsx`)
- `LearnPrivateCohorts` — replaced by `learn-chapter-cohorts.tsx`
- `LearnComparisonTable` — replaced by `learn-comparison-dark.tsx`

Keep `LearnCoursesCatalog` — but wrap it inside Chapter 02's container so it inherits the chapter visual treatment.

---

## Detailed section specs

### Section 1 — Hero

**Component:** `learn-hero.tsx` (client component — needs state for intent selection)

**Layout (desktop):** 2-column grid, 12-col on lg:
- Left (cols 1–6): intent picker + CTAs + social proof
- Right (cols 7–12): browser-framed lesson screenshot

**Left column content:**

```
PRACTICAL AI TRAINING   •   EN / 日本語     (eyebrow, coral dot)

I want to                                    (italic serif headline)
─────────────────────────────────────
  ○  learn at my own pace          →         (radio-style cards)
     The Vault — always-on library
  ○  build with a small group      →
     Public Courses — live cohorts
  ○  train my whole community      →
     Private Cohorts — for orgs
─────────────────────────────────────

[ Start learning  → ]  [ Take the tour ]    (primary teal + outline)

●●● Join 1,400+ learners across EN & JP
```

**Intent picker behavior:**
- Click any option → that option becomes the active state (teal border, teal background tint)
- After 250ms delay, smooth-scroll to the corresponding chapter (`#vault`, `#courses`, or `#cohorts`)
- The chosen chapter gets a subtle `data-active="true"` attribute → CSS applies a teal left-border glow for 1.5s, then fades to normal
- Other chapters get `data-active="false"` → CSS applies a brief opacity-90 dim (also auto-clears after 1.5s)
- Selection persists in component state but does NOT persist across page reloads (no localStorage)

**Right column content:** Locale-matched lesson screenshot inside a `BrowserFrame` (reuse `components/marketing/primitives/browser-frame.tsx` per home page pattern):
- EN locale: shows a **HonuVibe-branded** EN lesson screenshot — same visual language as the JP one (HonuVibe brand chrome, `learn.honuvibe.ai` browser URL, teal accents, instructor video bubble). The AI Academy / Prompt Design image Ryan circulated during brainstorm is a **reference-only sample**, not the asset that ships. The shipping EN asset must be a real (or realistic-mockup) HonuVibe product screenshot in English.
- JP locale: shows the HonuVibe AI Essentials JP screenshot Ryan provided (dark, teal, `learn.honuvibe.ai/ai-essentials/lesson-04`).
- Both images live at `public/images/learn/hero-lesson-en.webp` and `public/images/learn/hero-lesson-jp.webp`
- Use `next/image` with explicit dimensions; `priority` since it's above-the-fold
- Both screenshots should match visually: same browser frame style, same brand chrome, same approximate aspect ratio, same teal palette. The only differences should be language and the specific lesson content shown.

**Mobile:** Stack — intent picker first, lesson screenshot below. Lesson screenshot drops to a thumbnail. CTAs full-width.

**Social proof copy (1,400+):** Pull number from a shared constant — also used in home hero. If we don't have one, create `lib/constants/social.ts` with `export const TOTAL_LEARNERS = 1400;`.

---

### Section 2 — Partner logo strip

**Component:** `learn-partner-strip.tsx`

**Layout:** Horizontal, centered, light sand background. ~80px tall on desktop, stacks on mobile.

```
TRUSTED BY COMMUNITIES, SCHOOLS, AND VISIONARIES

[Vertice Society logo]    [Placeholder]    [Placeholder]    [Placeholder]
```

**Logos for launch:**
- Real: **Vertice Society only.**
- Placeholders: 3 generic monogram-style placeholders ("Studio Aoyama", "Folio Labs", "Tunes" — names from concepts) marked with a subtle "Coming soon" or grayed-out treatment until real partners sign.
- **DO NOT include SmashHaus** until Ryan confirms the deal closes (per project memory).

**Behavior:** Each logo is a link → `/partnerships#<partner-slug>` if the partner has a section there; otherwise no link (cursor: default).

---

### Section 3 — Chapter 01: The Vault

**Component:** `learn-chapter-vault.tsx` with `learn-vault-sample.tsx` embedded.

**Anchor:** `id="vault"`

**Layout (desktop):** 12-col grid:
- Cols 1–7: large "01" outlined chapter number + chapter title + italic intro + bullet list + price + CTAs
- Cols 8–12: feature bullets in a stacked card

**Content (EN):**

```
01    The Vault              [MOST POPULAR pill, teal]
      ヴォルト

An always-on AI library you keep coming back to.   (italic, larger)

  ✓ 100+ lessons across 6 libraries
  ✓ Bilingual EN / 日本語 toggle
  ✓ New content drops every month
  ✓ Searchable & bookmark-able
  ✓ Members-only community access

$49 / month   Founding member rate
[ Join the Vault  → ]  [ Take the tour ]
```

**Below the chapter intro:** "Try a Vault lesson, free." subsection.

```
Try a Vault lesson, free.
レッスンを体験してみる。

[Video player: 60–90 second sample lesson trailer]
[Below player: small caption + "See all lessons →" link]
```

**Video implementation:**
- Use a standard `<video>` element with `controls`, `playsInline`, `preload="metadata"`, `poster="/images/learn/vault-sample-poster.webp"`
- Source: `public/videos/vault-sample-trailer.mp4` (asset to be provided by Ryan separately — if not available at build time, render a placeholder `BrowserFrame` with the poster image and a "Coming soon" overlay; do NOT block deployment on missing video)
- No autoplay. User must press play.
- Add a `<track>` element for captions if/when a `.vtt` file is provided.

---

### Section 4 — Chapter 02: Public Courses

**Component:** `learn-chapter-courses.tsx`

**Anchor:** `id="courses"`

**Layout:** Chapter intro (same big "02" treatment) above, then `LearnCoursesCatalog` (existing component, reuse) below.

**Content (EN):**

```
02    Public Courses
      公開コース

Live cohorts with real instructors, real classmates. Per-course enrollment.

[ Filter tabs: All Levels / Beginner / Intermediate / Advanced / Use Case ]
[ Search: search courses... ]

┌─────────┐  ┌─────────┐  ┌─────────┐
│ [cover] │  │ [cover] │  │ [cover] │
│ tags    │  │ tags    │  │ tags    │
│ Title   │  │ Title   │  │ Title   │
│ Desc... │  │ Desc... │  │ Desc... │
│ lessons │  │ lessons │  │ lessons │
│ Price   │  │ Price   │  │ Price   │
│ [View]  │  │ [View]  │  │ [View]  │
└─────────┘  └─────────┘  └─────────┘

                                    See all courses →
```

**Course catalog requirements:**
- Pull from existing `getPublishedCoursesWithPartners` query — already in [app/[locale]/learn/page.tsx](app/[locale]/learn/page.tsx#L42)
- Show at minimum 3 courses. If fewer than 3 published, fill remaining slots with "Coming soon" placeholder cards (use the existing course card shape; gray cover; "Notify me" button instead of "View course").
- Each card needs: cover image, level tag, EN/JP availability tag, title, 1-line description, lesson count + duration, price, primary CTA.
- The empty-state we have today (1 card + empty space) MUST be fixed before launch.

---

### Section 5 — Chapter 03: Private Cohorts

**Component:** `learn-chapter-cohorts.tsx`

**Anchor:** `id="cohorts"`

**Layout (desktop):** 2-column:
- Left col: chapter intro + bullet list + Custom pricing + Apply CTA
- Right col: `learn-partnership-brief.tsx` mini-card + Vertice Society partner card + "Apply to be next" CTA card

**Content (EN):**

```
03    Private Cohorts
      プライベートコホート

Custom AI programs for communities and orgs.

  ✓ Custom curriculum to your audience
  ✓ Bilingual EN / 日本語 delivery
  ✓ Branded co-delivery with your community
  ✓ Cohort sizes from 20 to 200+

Custom    Founding partner rate
[ Apply for partnership  → ]   Read partner stories →
```

**Partnership Brief mini-card** (right column, top):

```
┌────────────────────────────────┐
│  PARTNERSHIP BRIEF             │
│  Your Community  ×  HonuVibe.AI│
├────────────────────────────────┤
│  Co-branded  ·  Custom  ·  EN/JP│
│                                │
│  ●  2 active partner cohorts   │
│     in 2026                    │
└────────────────────────────────┘
```

**Partner cards (below brief):**
- Card 1: Vertice Society (real, full content — pull from existing `LearnPrivateCohorts` content)
- Card 2: "Apply to be next" — generic teal-bordered card with handshake icon, headline "Want HonuVibe to build a program for your community?", body "If you lead a network, professional society, creative community, or organization that wants AI training tailored to your members, we'd love to talk.", CTA "Apply for partnership →"

**DO NOT include SmashHaus card** until Ryan signals the deal is closed (per project memory: `project_smashhaus_partner_visibility`).

---

### Section 6 — Comparison table (DARK)

**Component:** `learn-comparison-dark.tsx`

**Palette:** Dark zone — applies `.dark-zone` class wrapper so the existing CSS variables flip to the dark token set (per CLAUDE.md design system). Background: `--bg-primary` (dark teal); foreground: light.

**Content (EN):**

```
WHICH PATH FITS YOU BEST?
Compare learning paths.
自分に合う学び方は？

           THE VAULT       PUBLIC COURSES    PRIVATE COHORTS
           [SOLO]          [TOGETHER]        [CUSTOM]
                           ★ MOST POPULAR

Best for   Self-directed   Those who want    Communities &
           learners        structure +       organizations
                           accountability

Format     Self-paced      Live cohort-based Custom-built program
           library

Time       Your pace       4–5 weeks         Varies by partner
commitment

Investment Monthly         Per course        By application
           membership

Start      Anytime         Next cohort date  Partnership
                                             conversation

           [ Join the    ] [ Browse       ]  [ Apply for     ]
           [ Vault →     ] [ courses →    ]  [ partnership →]
```

**CTAs in each column footer** — this is the smart move from Concept 1. By the time the user has read the comparison row by row, they're primed to act and shouldn't have to scroll back up.

**Mobile:** Stack to single column; each path becomes a card with the same row labels as left-column meta.

---

### Section 7 — FAQ

**Component:** `learn-faq.tsx`

**Layout:** 2-column on desktop (left: heading + intro, right: FAQ list). Single column on mobile.

**Content (EN):**

```
Read this before you decide.
決める前に読んでください。

Still got questions? hello@honuvibe.ai — we get back within a day.
                                        24時間以内にお返事します。

──────────────────────────────────────────────

Q: Are lessons in English or Japanese?
   レッスンは日本語？それとも英語？
A: Both. Every Vault lesson + every Public Course has fully
   bilingual content. Switch any time. Private cohorts can run
   in either language or fully bilingual.

Q: How long does the Vault membership last?
A: It's monthly. Cancel any time. The first 14 days are
   refundable if it's not for you.

Q: Can I switch from the Vault to a cohort later?
A: Yes. The Vault library counts as foundational prep — many
   cohort students join the Vault first.

Q: Do you offer scholarships or partner pricing?
A: Yes — apply on the partnerships page if you represent a
   community, school, or nonprofit.

Q: I'm not in Hawaii or Japan. Can I still join?
A: Yes. Public Courses run on Pacific time; Vault is async; 
   Private Cohorts schedule around your community.

Q: What if I'm new to AI?
A: Start with the Vault's AI Foundations library. Three lessons in
   and you'll know what to do next.
```

JP parallel: every question shows EN above + JP below (just the question text); answers locale-specific.

**Behavior:** Open list by default (not accordion) for first launch — accordion can come later. Keeps the answers indexable for SEO.

---

### Section 8 — "Start tonight" closing CTA (DARK)

**Component:** `learn-start-tonight.tsx`

**Palette:** Dark zone (same `.dark-zone` wrapper as comparison table).

**Content (EN):**

```
                  ─── ready to start? ───

              Start tonight.
              今夜から。

   Start solo with the Vault, join a cohort, or bring HonuVibe
   to your community. The Vault is open 24/7 — even if it's
   11:48 pm where you are.

   14-day refund if the Vault isn't right for you.

   ┌──────────┐   ┌──────────┐   ┌──────────┐
   │ THE VAULT│   │  PUBLIC  │   │  PRIVATE │
   │          │   │  COURSES │   │  COHORTS │
   │  $49/mo  │   │  $1,250+ │   │  Custom  │
   │ [Join →] │   │ [Browse→]│   │ [Apply →]│
   └──────────┘   └──────────┘   └──────────┘
```

**Mobile:** Stack the three path cards vertically.

**Tone:** Direct, time-aware, low-pressure. The "even if it's 11:48 pm" line is the one that should land — keep it idiomatic in JP (suggested: "今が深夜23時48分でも、いつでも始められます。").

---

## Translation keys

All new strings live under `learn.*` namespace in [messages/en.json](messages/en.json) and [messages/ja.json](messages/ja.json). Suggested structure:

```jsonc
{
  "learn": {
    "meta": { ... existing },
    "hero": {
      "eyebrow_label": "...",
      "eyebrow_lang": "EN / 日本語",
      "headline": "I want to",
      "intent_1_label": "learn at my own pace",
      "intent_1_caption": "The Vault — always-on library",
      "intent_2_label": "build with a small group",
      "intent_2_caption": "Public Courses — live cohorts",
      "intent_3_label": "train my whole community",
      "intent_3_caption": "Private Cohorts — for orgs",
      "cta_primary": "Start learning",
      "cta_secondary": "Take the tour",
      "social_proof": "Join <count>1,400+</count> learners across EN & JP"
    },
    "partners": {
      "label": "Trusted by communities, schools, and visionaries"
    },
    "chapter_vault": {
      "number": "01",
      "title": "The Vault",
      "title_jp": "ヴォルト",
      "pill": "MOST POPULAR",
      "intro": "An always-on AI library you keep coming back to.",
      "bullet_1": "100+ lessons across 6 libraries",
      "bullet_2": "Bilingual EN / 日本語 toggle",
      "bullet_3": "New content drops every month",
      "bullet_4": "Searchable & bookmark-able",
      "bullet_5": "Members-only community access",
      "price": "$49",
      "price_unit": "/ month",
      "price_note": "Founding member rate",
      "cta_primary": "Join the Vault",
      "cta_secondary": "Take the tour",
      "sample_heading": "Try a Vault lesson, free.",
      "sample_subheading": "レッスンを体験してみる。",
      "sample_link": "See all lessons"
    },
    "chapter_courses": { ... },
    "chapter_cohorts": { ... },
    "comparison": { ... },
    "faq": { ... },
    "start_tonight": { ... }
  }
}
```

**Removed keys** (clean up after refactor): any `learn.three_paths.*`, `learn.vault_moment.*`, `learn.private_cohorts.*` (old version), `learn.comparison.*` (old version). Run a final grep before commit to confirm no orphaned references.

**JP translation guidance for the execution agent:**
- Headlines: keep concise, idiomatic. Don't translate "Vibe" — leave it as English brand word.
- Body copy: line-height 1.7–1.8 (handled by global CSS); avoid `text-justify`.
- "Start tonight" → "今夜から。" is set.
- "Read this before you decide" → "決める前に読んでください。" is set.
- For new strings without explicit JP guidance, write idiomatic JP and FLAG in the completion report as a judgment call.

---

## Assets needed

| Asset | Location | Status |
|---|---|---|
| EN hero lesson screenshot | `public/images/learn/hero-lesson-en.webp` | **Ryan provides** — must be HonuVibe-branded, matching the visual language of the JP screenshot (same browser frame, `learn.honuvibe.ai` URL, teal palette). The AI Academy / Prompt Design image circulated during brainstorm is reference-only — do NOT ship it. |
| JP hero lesson screenshot | `public/images/learn/hero-lesson-jp.webp` | Ryan provides (HonuVibe AI Essentials JP screenshot — already exists) |
| Vault sample video | `public/videos/vault-sample-trailer.mp4` | Ryan provides separately. If missing at build, render poster + "Coming soon" placeholder (do NOT block launch). |
| Vault sample poster | `public/images/learn/vault-sample-poster.webp` | Same. |
| Partner logos (3 placeholder) | `public/images/partnerships/*.svg` | Already exist for Vertice; placeholders can use monogram SVGs created inline (no asset blocker). |

**Asset-missing fallback:** Every image/video should have a graceful fallback — a `BrowserFrame` with the right aspect ratio + "Image loading" or "Coming soon" overlay. Never let a missing asset cause a layout shift or a broken image icon.

---

## Build sequencing

Recommend one cohesive commit per the project's "commit to main" workflow, but the execution agent should mentally proceed in 4 phases to keep the work checkpointed:

1. **Scaffold + Hero** — create all new component files (empty exports), update `app/[locale]/learn/page.tsx` to import them, build out `learn-hero.tsx` and `learn-intent-picker.tsx` end-to-end. Verify hero renders on `/` and `/ja` before moving on.
2. **Chapters 01 / 02 / 03** — build each chapter component, wire smooth-scroll + soft-highlight from intent picker, integrate `LearnCoursesCatalog` into Chapter 02 with the 3-card minimum guarantee.
3. **Dark anchors + supporting sections** — `learn-comparison-dark.tsx`, `learn-faq.tsx`, `learn-start-tonight.tsx`, `learn-partner-strip.tsx`.
4. **Cleanup + verification** — remove old components, delete orphaned translation keys, run all verification checks, commit.

If the agent hits a blocker on assets (missing screenshots or video), it should ship phases 1–3 with placeholder rendering and report the missing-asset gap in the completion report — do NOT block the commit on assets that will land later.

---

## Verification

Run from project root (PowerShell):

```powershell
pnpm dev
```

1. **EN Learn page** — open `http://localhost:3000/learn`
   - Hero: intent picker visible, all 3 options clickable, EN lesson screenshot loads
   - Click "learn at my own pace" → page smooth-scrolls to Chapter 01, chapter shows brief highlight (1.5s teal glow), other chapters dim briefly
   - Click "build with a small group" → scrolls to Chapter 02, same highlight behavior
   - Click "train my whole community" → scrolls to Chapter 03
   - Partner strip shows Vertice Society + 3 placeholders (or however many real partners are available — NO SmashHaus)
   - Chapter 01 video sample renders (real video or "Coming soon" poster)
   - Chapter 02 shows ≥ 3 course cards (real or "Coming soon" placeholders to fill)
   - Chapter 03 shows Vertice Society card + "Apply to be next" card
   - Comparison table renders DARK with CTAs inside each column footer
   - FAQ renders with all questions visible (not accordion)
   - "Start tonight" closing renders DARK with 3 path-recap cards
   - Newsletter band still present and functional
   - No console warnings about missing translation keys
   - No console errors of any kind

2. **JP Learn page** — open `http://localhost:3000/ja/learn`
   - Hero: JP lesson screenshot loads (different from EN)
   - All chapter copy is JP
   - Intent picker labels and CTAs are JP
   - JP typography reads cleanly around the new strings (line-height feels right, no awkward line breaks)
   - FAQ shows EN question above + JP question below (per spec); answers JP-only on this page

3. **Responsive checks** — at 375px width:
   - Hero stacks (intent picker on top, lesson screenshot below as thumbnail)
   - Chapter "01/02/03" numbers don't overflow
   - 3-card course catalog stacks to single column
   - Comparison table converts to stacked cards (each path becomes a card)
   - Closing CTA's 3 path cards stack vertically
   - No horizontal scroll anywhere
   - All touch targets ≥ 44px

4. **Theme toggle** — dark ↔ light:
   - All sections render correctly in BOTH themes
   - The "dark zones" (comparison + closing) stay dark even in light theme — they're palette-pinned, not theme-dependent
   - No hardcoded-color leakage; all colors come from CSS variables

5. **Build** — run `pnpm build`. Must finish with zero TS errors, zero ESLint errors.

6. **Search regression** — grep the codebase for the removed translation key prefixes (`learn.three_paths`, `learn.vault_moment`, etc.). Should return zero matches:
   ```
   pnpm grep "learn.three_paths"
   pnpm grep "learn.vault_moment"
   ```

7. **Cross-page regression** — click through:
   - Home → Learn (nav link) — page renders, no broken assets
   - Learn → Vault chapter via intent picker — scroll works
   - Learn → /learn/courses (if any "See all courses" link exists) — page exists or 404 gracefully
   - Learn → /partnerships (via partner logo click or chapter 03 CTA) — page renders

8. **Lighthouse (mobile)** — run on `/learn`. Performance ≥ 90, Accessibility ≥ 95, no broken-link errors.

If any check fails: STOP, do not commit, report the failure per the [_EXECUTION_TEMPLATE.md](docs/plans/_EXECUTION_TEMPLATE.md) protocol.

---

## Completion protocol

Follow the standard execution template ([docs/plans/_EXECUTION_TEMPLATE.md](docs/plans/_EXECUTION_TEMPLATE.md)) — check off every verification item in this plan file, commit to main with the suggested message below, push, then print the structured completion report.

**Suggested commit message:**

```
redesign(learn): intent-driven hero, magazine chapters, dark anchors, lesson sample

Full rebuild of /learn page based on synthesis of 4 design concepts:
- Hero: "I want to..." intent picker + locale-matched lesson screenshot
- Partner logo strip (Vertice Society + placeholders)
- Three chapters (Vault / Courses / Cohorts) with embedded "how it works"
- Try a Vault lesson, free — embedded 60–90s video sample in Chapter 01
- Populated 3-card course catalog inside Chapter 02
- Vertice Society + "Apply to be next" in Chapter 03 (no SmashHaus per memory)
- Dark anchor sections: comparison table (CTAs in columns) + "Start tonight" close
- Bilingual FAQ ("Read this before you decide")

Removes: LearnThreePaths, LearnVaultMoment, old LearnPrivateCohorts,
old LearnComparisonTable. Cleans orphaned translation keys.
```

---

## Judgment calls the execution agent should flag

Per the execution template, the agent must surface its judgment calls. For this redesign, expect these specifically:

- JP phrasing for any new copy where this plan didn't give a verbatim JP suggestion
- Specific filter/use-case labels chosen for the Public Courses catalog tabs
- Exact monogram styling chosen for placeholder partner logos
- Any minor responsive breakpoint adjustments made to keep the chapter numbers from overflowing on mid-size viewports
- The exact teal glow/dim values used for the soft-highlight scroll effect (durations, opacity values)
- Any course catalog placeholder card content if fewer than 3 real courses are published

---

## Out of scope (later passes)

- Actual interactive lesson player (currently spec'd as video trailer only)
- Course catalog filters going beyond level/use-case (e.g. instructor filter, partner filter)
- FAQ accordion behavior
- Animations beyond the soft-highlight scroll (page-load reveal, parallax, etc.)
- Adding SmashHaus partner card (waits on deal close)
- Building `/learn/courses` as a dedicated catalog page (current scope keeps catalog in Chapter 02)
- Lesson sample auth flow / progress tracking
- Real instructor video preview library on the page
