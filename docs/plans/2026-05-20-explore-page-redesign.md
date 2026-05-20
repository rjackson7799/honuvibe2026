# /explore Redesign — Reel Hero + Editorial Index Spine

**Date:** 2026-05-20
**Owner:** Ryan
**Status:** Plan — awaiting approval

---

## Context

The current `/explore` page ([app/[locale]/explore/page.tsx](app/[locale]/explore/page.tsx)) is competent but generic: card-grid stats, two featured projects in a standard frame, a three-step process, and a dual CTA. It reads like every other portfolio. Meanwhile, [/learn](app/[locale]/learn/page.tsx) was just redesigned (commit c589ba1) into a magazine experience — intent-driven hero, chapter structure, dark anchors, an embedded sample. `/explore` now feels weaker than its sibling.

Three design references were reviewed (Atlas/Index editorial, Postcards tactile, The Reel cinematic). Decision: **hybrid** — open with a cinematic Reel-style hero that gives the two flagship projects real presence, then drop into a restrained editorial Index spine (Method, Aloha, Questions, Next-issue CTA) that mirrors `/learn`'s magazine cadence. The Reel does the heavy lifting on personality; the Index keeps the page scannable and content-forward.

**Outcome we want:** `/explore` feels like a deliberate object — a portfolio that earns trust through craft, makes the work look serious, and routes interest into `/partnerships` (build with us) or `/learn` (learn the same playbook).

**Constraints honored:**
- Locale-pure content: EN-only on `/explore`, JP-only on `/ja/explore` (mockup mixes them for design reference only)
- Vertice Society visibility per Ryan's approval gate ([[project_vertice_jp_only_post_approval]])
- No SmashHaus until deal closes ([[project_smashhaus_partner_visibility]])
- No fabricated projects (Tonari Tea / Folio Labs in the mockup don't exist in the codebase — we use real projects + honest "Confidential / In progress" placeholders instead)

---

## Final composition

New `app/[locale]/explore/page.tsx` section order:

| # | Section | Variant | Purpose |
|---|---|---|---|
| 1 | `ExploreReelHero` | `navy` (dark) | Cinematic featured reel. Frame progress strip, "Scene NN · Take 1" badge, browser-frame mockup left + headline/quote/outcome stats right. Horizontally scrollable / paginated through 2–3 live projects. |
| 2 | `ExploreIndex` | `canvas` | Editorial table of all projects: `#`, `YEAR`, `PROJECT · BRIEF`, `INDUSTRY · STACK`, `STATUS`. Rows for Kwame (LIVE), HCI (LIVE), Vertice (IN PROGRESS, pending approval), plus 1–2 `CONFIDENTIAL` placeholder rows for in-flight work. "Filter by industry" pills above. "— END OF INDEX —" footer rule. |
| 3 | `ExploreMethod` | `sand` | Re-skin of existing [how-we-build.tsx](components/marketing/explore/how-we-build.tsx) into the Index-style chapter: `Method.` serif headline, `CH. III · HOW WE BUILD` overline, three numbered rows (Discovery / Design & Build / Launch & Support) each with copy + artifact note + duration. |
| 4 | `ExploreAlohaStandard` | `sand` darker tone | Re-skin of existing [aloha-standard.tsx](components/marketing/explore/aloha-standard.tsx) with Index-style stat trio: **25%** of quarterly capacity / **4+** pro-bono partners / yr / **1:1** commercial ↔ community. Inline link to "Get in touch" (mailto or `/partnerships` anchor). |
| 5 | `ExploreQuestions` | `canvas` | **New chapter.** Accordion FAQ, 5 questions: smallest project size, tool lock-in, what "AI-native development" means, code ownership, JP localization. `CH. VI · NOTES FOR THE READER` overline. |
| 6 | `ExploreNextIssue` | `navy` (dark) | Replaces existing [two-path-cta.tsx](components/marketing/explore/two-path-cta.tsx). Final dark anchor — "Want to be in the next issue?" headline, dual CTA (`Tell us about your project` → `/partnerships`, `Start learning` → `/learn`). Mirrors `/learn`'s `LearnStartTonight` dark close. |

**Removed from current page:**
- `ExploreStatsStrip` — stats fold into the Reel hero (per-project outcome tiles already convey "real outcomes") and the Aloha stat trio.
- `ExploreFeaturedProjects` — replaced by `ExploreReelHero` + `ExploreIndex`.
- `ExploreTwoPathCta` — replaced by `ExploreNextIssue`.

**Explicitly NOT added:** A `Services` chapter. The Index sample shows one, but [PartnershipsWhatYouGet](components/marketing/partnerships/what-you-get.tsx) already covers offerings comprehensively. Adding it here would muddy intent (Explore is "work we've shipped," Partnerships is "what we offer") and step on `/partnerships`. Instead, `ExploreIndex` and `ExploreNextIssue` route service-curious visitors to `/partnerships`.

---

## New components to build

All under `components/marketing/explore/`:

1. **`reel-hero.tsx` → `ExploreReelHero`**
   - Props: `projects: ReelProject[]` (Kwame, HCI, + optional 3rd)
   - Composition: film-strip top border (CSS sprocket holes via repeating gradient), "NOW PLAYING · 01 · KwameBrathwaite.com" status bar with frame progress, "SCENE 01 · TAKE 1" badge top-left of mockup, left = `BrowserFrame` with project screenshot, right = `FRAME NN / 05`, `LIVE` pill, italic display headline (project name), subhead, pull-quote (bordered left rule), three outcome tiles (e.g. "3× Faster load time / Mobile-First / AI-Powered"), industry · stack monospace footer.
   - Behavior: client component. Horizontal snap-scroll on mobile (`overflow-x-auto snap-x`), prev/next arrows on desktop, frame-progress bar reflects active project. Keyboard: ← / → cycle.
   - Reduced motion: snap remains, no auto-advance.

2. **`index-table.tsx` → `ExploreIndex`**
   - Props: `projects: IndexProject[]` with `{ number, year, name, brief, industry, stack[], status: 'live' | 'in-progress' | 'confidential' }`
   - Composition: serif `Index.` headline + teal full-stop accent, top meta strip (`HONUVIBE · ATLAS OF WORK | VOL. 02 · MMXXVI | 0X ENTRIES · X INDUSTRIES · 2 LANGUAGES`), industry filter pills (client component, filters rows in-place — pills: All work / Cultural / Healthcare / Community / Commerce / Enterprise), table with monospace column headers, status pills (`● LIVE` teal, `● IN PROGRESS` coral, `● CONFIDENTIAL` muted), `+` expand affordance per row (Phase 2 — initial implementation can link to existing project pages where they exist), `— END OF INDEX —` centered rule footer.
   - Behavior: client component for filter. Confidential rows are not links.

3. **`method-chapter.tsx` → `ExploreMethod`**
   - Replaces `how-we-build.tsx`. Index-style: serif `Method.` headline, `CH. III · HOW WE BUILD` overline right-aligned, three rows each: large teal numeral (01/02/03), step title + JP subtitle (EN-only on EN page — JP subtitle dropped), step description column, artifact + duration column right-aligned with monospace.

4. **`aloha-chapter.tsx` → `ExploreAlohaStandard`**
   - Replaces existing `aloha-standard.tsx`. Same copy, new layout: serif `Built with` / `Aloha.` two-line display headline (teal "Aloha." accent), narrative paragraph right column, stat trio below (25% / 4+ / 1:1) with caption + JP caption dropped on EN, "Interested in a community or nonprofit collaboration? Get in touch →" inline teal link.

5. **`questions-chapter.tsx` → `ExploreQuestions`** *(new)*
   - Serif `Questions.` headline, `CH. VI · NOTES FOR THE READER` overline, accordion of 5 Q&A rows with monospace `NOTE 01` left labels, `+` expand glyph right. Q&As stored as i18n keys.

6. **`next-issue.tsx` → `ExploreNextIssue`**
   - Replaces `two-path-cta.tsx`. Dark navy section. Top meta strip `END OF ISSUE · — FIN — · NEXT ISSUE · SPRING MMXXVII`. Display headline "Want to be in the next issue?" with italic "next issue?" accent. Right column: subhead + dual CTA (`Tell us about your project` primary teal → `/partnerships`, `Start learning` outline → `/learn`).

---

## Components to reuse

- [components/marketing/primitives/Section.tsx](components/marketing/primitives/Section.tsx) — `variant="navy" | "canvas" | "sand"`, `spacing="hero" | "default" | "tight"`
- [components/marketing/primitives/Container.tsx](components/marketing/primitives/Container.tsx)
- [components/marketing/primitives/Overline.tsx](components/marketing/primitives/Overline.tsx) — `tone="teal" | "coral" | "caption"`
- [components/marketing/primitives/SectionHeading.tsx](components/marketing/primitives/SectionHeading.tsx)
- [components/marketing/primitives/Button.tsx](components/marketing/primitives/Button.tsx)
- [components/marketing/primitives/BrowserFrame.tsx](components/marketing/primitives/BrowserFrame.tsx) — used inside ReelHero
- Existing project screenshots at [public/images/projects/kwame-brathwaite/KB_1.jpg](public/images/projects/kwame-brathwaite/KB_1.jpg) and [public/images/projects/hci-medical/HCI_1.jpg](public/images/projects/hci-medical/HCI_1.jpg)

No new primitives required. The "film strip" sprocket-hole border is a pure-CSS detail inside `ExploreReelHero` (no new shared component needed).

---

## Data + i18n changes

**Project data** — promote inline arrays into a single typed module:
- New: `lib/explore/projects.ts` exporting `REEL_PROJECTS` and `INDEX_PROJECTS` (typed). Source of truth for both Reel and Index. Confidential rows have no slug/link.

**Translation keys** ([messages/en.json](messages/en.json) + [messages/ja.json](messages/ja.json)) — replace current `explore.*` shape:
```
explore:
  meta: { title, description }
  reel_hero: { now_playing_label, scene_label, frame_label, live_label, prev_label, next_label, projects: { kwame: {...}, hci: {...} } }
  index: { headline, meta_strip, filter_label, filter_all, filter_cultural, filter_healthcare, filter_community, filter_commerce, filter_enterprise, col_year, col_project, col_industry, col_status, status_live, status_in_progress, status_confidential, end_of_index, confidential_brief }
  method: { chapter_label, headline, step_01: {...}, step_02: {...}, step_03: {...}, artifact_label, duration_label }
  aloha: { chapter_label, headline_1, headline_2, body, stat_capacity: {...}, stat_partners: {...}, stat_ratio: {...}, link }
  questions: { chapter_label, headline, q1: { q, a }, q2: { q, a }, q3: { q, a }, q4: { q, a }, q5: { q, a } }
  next_issue: { meta_strip, headline_1, headline_2, subhead, primary_cta, secondary_cta }
```
JP file mirrors with translated values; JP-side stat captions and step subtitles get JP-native text (no inline EN).

---

## Files to create / modify

**Create:**
- `lib/explore/projects.ts`
- `components/marketing/explore/reel-hero.tsx`
- `components/marketing/explore/index-table.tsx`
- `components/marketing/explore/method-chapter.tsx`
- `components/marketing/explore/aloha-chapter.tsx`
- `components/marketing/explore/questions-chapter.tsx`
- `components/marketing/explore/next-issue.tsx`

**Modify:**
- [app/[locale]/explore/page.tsx](app/[locale]/explore/page.tsx) — swap imports and compose the new 6 sections
- [messages/en.json](messages/en.json) — replace `explore.*` block
- [messages/ja.json](messages/ja.json) — replace `explore.*` block

**Delete (after new page is wired):**
- [components/marketing/explore/hero.tsx](components/marketing/explore/hero.tsx)
- [components/marketing/explore/stats-strip.tsx](components/marketing/explore/stats-strip.tsx)
- [components/marketing/explore/featured-projects.tsx](components/marketing/explore/featured-projects.tsx)
- [components/marketing/explore/how-we-build.tsx](components/marketing/explore/how-we-build.tsx)
- [components/marketing/explore/aloha-standard.tsx](components/marketing/explore/aloha-standard.tsx)
- [components/marketing/explore/two-path-cta.tsx](components/marketing/explore/two-path-cta.tsx)

---

## Build sequence

1. Stub `lib/explore/projects.ts` with typed data for Kwame + HCI + 1 placeholder.
2. Build `ExploreReelHero` standalone, wire into page, confirm horizontal scroll + browser frame + outcome tiles render on desktop + mobile.
3. Build `ExploreIndex` with filter pills working client-side.
4. Re-skin Method → `ExploreMethod`, Aloha → `ExploreAlohaStandard`.
5. Build `ExploreQuestions` accordion (native `<details>`/`<summary>` for zero-JS baseline + reduced motion).
6. Build `ExploreNextIssue` dark close.
7. Replace `app/[locale]/explore/page.tsx` composition.
8. Migrate `messages/en.json` + `messages/ja.json` `explore.*` blocks.
9. Delete the 6 old section components.
10. Visual QA at 360 / 768 / 1280 / 1440, EN + JP, dark + light themes.

---

## Open questions for Ryan (before/during build)

1. **Vertice Society in the Index?** Memory says JP-only post-approval. Is approval done? If yes, list it as `IN PROGRESS` (EN side too). If no, drop it to a `CONFIDENTIAL` row.
2. **Stat trio numbers for Aloha** — confirm `25% / 4+ per yr / 1:1` are real, or set provisional copy.
3. **`SCENE 01 · TAKE 1` chrome on the Reel** — keep cinematic vocabulary, or trim to plain `01 / 05` if it feels too on-the-nose? Default: keep.
4. **Industry filter scope** — pills currently planned for `Cultural / Healthcare / Community / Commerce / Enterprise`. With only 2–3 visible projects at launch, several filters will show "no results." Acceptable as future-proofing, or trim to filters with content?

---

## Verification

1. `pnpm dev` and load `http://localhost:3000/explore` and `http://localhost:3000/ja/explore`.
2. Confirm Reel hero paginates (arrows + horizontal swipe on mobile), browser-frame mockups render, frame-progress bar updates with active project.
3. Confirm Index filter pills hide/show rows correctly and "All work" restores full list.
4. Confirm all six sections compose without overlap and respect `prefers-reduced-motion`.
5. Confirm EN page has zero JP characters and JP page has zero EN body copy (status pills like `LIVE` and stack monospace are intentional exceptions).
6. Confirm dark sections (`ExploreReelHero`, `ExploreNextIssue`) pass WCAG AA contrast on body text.
7. Click both CTAs in `ExploreNextIssue` — `/partnerships` and `/learn` route correctly with locale preserved.
8. `pnpm build` succeeds and no TypeScript errors.
9. Lighthouse mobile: Performance ≥ 90, LCP < 2.5s (Reel hero is the LCP candidate — ensure project screenshot is `next/image` with `priority`).
