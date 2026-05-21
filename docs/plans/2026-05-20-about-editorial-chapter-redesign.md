# About Page — Editorial Chapter Redesign

**Date:** 2026-05-20
**Status:** Approved, ready to execute
**Scope:** `/about` and `/ja/about`

---

## Context

The About page is the last of the four primary marketing surfaces still rendered in pre-redesign visual language. Learn (2026-05-19), Explore (commit `eb05413`), and Partnerships (commit `9475fe9`) all now follow the same editorial-chapter idiom: navy hero with chip-nav anchors, numbered chapters with serif-italic display headlines and monospace overlines, cadence/stat strips, proof tiles backed by real assets, and a dark navy closing band with a dual CTA. About still uses a light decorative hero, six flat sections, and a soft centered CTA — visually out of step with its siblings.

This redesign brings About into the same house style with three editorial chapters, drops sections that no longer earn their space (the standalone social-links band; the Aloha Standard chapter, which Ryan has called out as no longer needed for this page), and surfaces the second instructor (Chiemi M.) who already has photo and bio assets but isn't currently rendered. The intended outcome: an About page that feels like the next issue of the same magazine as Learn / Explore / Partnerships, preserves Ryan's origin narrative verbatim, and pushes its primary CTA toward course enrollment per the project's stated conversion goal.

---

## Final structure

| # | Section | Variant | Purpose |
|---|---|---|---|
| — | Hero | `navy` | Frame the issue; chip nav to chapters; fact strip |
| 01 | **Origin** | `canvas` | Founder narrative + Ryan proof tile |
| 02 | **The Crew** | `sand` | Render Ryan + Chiemi as portrait pair |
| 03 | **Mission & Vision** | `canvas` | What we're building toward |
| — | Closing band | `navy` | Dual CTA → Learn (primary), Partnerships (secondary) |

**Dropped:** Aloha Standard chapter, standalone Social section, light soft-CTA.
**Hidden but not deleted from i18n:** `about.aloha_standard.*` keys remain in `messages/*.json` (in case the framing returns elsewhere). The component file is deleted.

---

## Chapter specifications

### Hero — `components/marketing/about/hero.tsx` (rewrite)

- `Section variant="navy" spacing="hero"`, `Container`.
- Two-column grid (`md:grid-cols-[7fr_5fr]`).
- **Left column**
  - Monospace overline: `ABOUT HONUVIBE · ISSUE 01` (teal, 11.5px, tracking 0.18em).
  - Serif italic headline, two lines, `clamp(48px, 6.5vw, 96px)`, `leading-[0.94]`. Teal accent period on the final word. Suggested copy: *"Practical AI education,* / *delivered with aloha**.**"* — open to a different second line if Ryan prefers.
  - Chip nav directly under the headline: three `<a href="#origin">` / `#crew` / `#mission` anchors, monospace 11px, with hover underline. Mirror Partnerships chip styling.
- **Right column**
  - Serif italic lede paragraph, `clamp(20px, 2vw, 26px)`, `leading-[1.4]`.
  - Cadence strip below lede, 3-col monospace grid: `FOUNDED · 2024` · `LANGUAGES · EN / 日本語` · `BASED · LA ↔ HONOLULU ↔ TOKYO`.
- Drop the concentric-circles graphic from the current hero entirely.

### CH. 01 · Origin — `components/marketing/about/origin-story.tsx` (restructure)

- `Section variant="canvas"`, `id="origin"`.
- Large background watermark numeral `01`, serif italic, `var(--m-accent-teal)` at ~8% opacity, absolutely positioned behind content.
- Two-column grid (`md:grid-cols-[7fr_5fr]`).
- **Left column**
  - Overline: `CH. 01 · ORIGIN`.
  - Serif italic headline: *"A question that wouldn't go away."*
  - Three paragraphs — **preserve `about.origin_story.p1/p2/p3` verbatim**. The line *"what would happen if AI education felt less like a tech bootcamp and more like learning from someone who actually cares whether you succeed?"* must not be paraphrased.
  - Per-chapter CTA at the bottom of the column: *"See what we're building →"* linking to `/explore`. Match the teal-link-with-arrow pattern from Partnerships chapters.
- **Right column proof tile**
  - Card with sand background, soft border, shadow-lg.
  - Header strip: monospace `FOUNDER · LA ↔ HONOLULU` (teal).
  - Ryan's portrait (`/images/partners/instructors/ryan.webp`) — reuse the gradient background treatment from the existing component.
  - Serif italic name + role beneath the photo.
  - Cadence row inside the tile: `BACKGROUND · BUSINESS + AI` · `TAUGHT · 200+ LEARNERS` · `LANGUAGES · EN`.
  - **⚠ Verify before shipping:** the `200+ LEARNERS` figure is a placeholder. Confirm the real number with Ryan and update both the EN and JP keys. If no defensible number exists yet, swap this stat for something verifiable (e.g. `FOCUS · APPLIED AI`).

### CH. 02 · The Crew — `components/marketing/about/team.tsx` (modify + wire in)

- `Section variant="sand"`, `id="crew"`.
- **Flip the member filter** in `team.tsx:43` from `ALL_MEMBERS.filter((m) => m.key === 'ryan')` to `ALL_MEMBERS.filter((m) => m.key === 'ryan' || m.key === 'chimi')`. Leave Mizuho's record in `ALL_MEMBERS` untouched (kept for future use; not rendered).
- Update grid container from `max-w-md grid-cols-1` to `max-w-3xl grid-cols-1 md:grid-cols-2 gap-6 md:gap-8`.
- Update header block to chapter style:
  - Overline: `CH. 02 · THE CREW` (replaces `about.team.overline` value `"The Team"`).
  - Serif italic headline, two lines: *"Working practitioners.* / *Not script readers**.***"* — replaces existing `headline_line_1/2`.
  - Existing `about.team.subhead` stays as the lede on the right.
- Add a cadence strip *below* the portrait grid: `INSTRUCTORS · 2` · `LANGUAGES · EN + 日本語` · `SPECIALTIES · BUSINESS + HEALTHCARE`.
- **⚠ Verify before shipping:** `BUSINESS + HEALTHCARE` is derived from existing bio text (Ryan = business, Chiemi = OT/healthcare). Confirm this framing reads correctly with Ryan; revise if his preferred specialty framing is different.
- Per-chapter CTA below the cadence: *"See what we teach →"* linking to `/learn`.
- The `TeamCard` internal component does not need structural changes — it already pulls bio/location/lang from i18n correctly for both members.

### CH. 03 · Mission & Vision — `components/marketing/about/mission-vision.tsx` (restyle)

- `Section variant="canvas"`, `id="mission"`.
- Add chapter header above the existing two cards:
  - Overline: `CH. 03 · WHAT WE'RE BUILDING TOWARD`.
  - Serif italic headline: *"For the people the AI industry usually leaves out."* (single line, smaller display than CH. 01/02, ~`clamp(36px, 4.5vw, 56px)`).
- Keep the two-card layout but restyle:
  - Replace the rounded-box treatment with the editorial frame used in Partnerships chapter outcome tiles (thin top border, monospace label, serif body).
  - Card 1: `MISSION` overline + existing `mission_body` text.
  - Card 2: `VISION` overline + existing `vision_body` text.
- Footer cadence row spanning both cards: `MISSION · TODAY` · `VISION · 2030+` · `FOCUS · US + JAPAN`.

### Closing band — `components/marketing/about/closing-cta.tsx` (new file)

- `Section variant="navy" spacing="default"`, `Container`.
- Meta strip at the top: monospace, tertiary-on-navy color, `END OF ISSUE 01 · NEXT CHAPTER AWAITS · FIN`.
- Two-column grid (`md:grid-cols-[6fr_5fr]`).
- **Left column**
  - Serif italic headline: *"Build with us."* (`clamp(56px, 7vw, 96px)`).
- **Right column**
  - Lede: *"Start with a free Vault lesson, join a cohort, or bring HonuVibe to your team."*
  - Dual CTA, stacked on mobile, side-by-side on `md:`:
    - Primary: teal filled button, `Start learning →` → `/learn`.
    - Secondary: outline button, `Partner with us →` → `/partnerships`.
- Per CLAUDE.md the primary conversion goal is course enrollment — Learn is the primary CTA, Partnerships is secondary. Do not swap.

---

## Page wiring — `app/[locale]/about/page.tsx`

Replace the current import + render list with:

```tsx
import { AboutHero } from '@/components/marketing/about/hero';
import { AboutOriginStory } from '@/components/marketing/about/origin-story';
import { AboutTeam } from '@/components/marketing/about/team';
import { AboutMissionVision } from '@/components/marketing/about/mission-vision';
import { AboutClosingCta } from '@/components/marketing/about/closing-cta';
```

Render order inside `MarketingShell`:

```tsx
<AboutHero />
<AboutOriginStory />
<AboutTeam />
<AboutMissionVision />
<AboutClosingCta />
```

Drop the existing `AboutAlohaStandard`, `AboutSocialSection`, and `AboutSoftCta` imports.

---

## Files to delete

- `components/marketing/about/aloha-standard.tsx`
- `components/marketing/about/social-section.tsx`
- `components/marketing/about/soft-cta.tsx`

i18n: `about.aloha_standard.*` and `about.social_section.*` keys remain in `messages/*.json` (kept in case the framing returns elsewhere). `about.soft_cta.*` keys can be deleted from both locale files since they'll never be reused — but if you'd rather leave them, that's fine.

---

## i18n changes

### New keys (add to both `messages/en.json` and `messages/ja.json`)

```
about.hero.overline                       "ABOUT HONUVIBE · ISSUE 01"   /  "アバウト ホヌバイブ · 第一号"
about.hero.chip_origin                    "01 · ORIGIN"                  /  "第一章 · 起源"
about.hero.chip_crew                      "02 · THE CREW"                /  "第二章 · チーム"
about.hero.chip_mission                   "03 · MISSION"                 /  "第三章 · ミッション"
about.hero.fact_founded_label             "FOUNDED"                      /  "創業"
about.hero.fact_founded_value             "2024"                         /  "2024年"
about.hero.fact_languages_label           "LANGUAGES"                    /  "言語"
about.hero.fact_languages_value           "EN / 日本語"                  /  "EN / 日本語"
about.hero.fact_based_label               "BASED"                        /  "拠点"
about.hero.fact_based_value               "LA ↔ HONOLULU ↔ TOKYO"        /  "ロサンゼルス ↔ ホノルル ↔ 東京"

about.origin_story.chapter_overline       "CH. 01 · ORIGIN"              /  "第一章 · 起源"
about.origin_story.cta_label              "See what we're building →"   /  "私たちが作っているものを見る →"
about.origin_story.tile_header            "FOUNDER · LA ↔ HONOLULU"      /  "創業者 · ロサンゼルス ↔ ホノルル"
about.origin_story.tile_stat_1_label      "BACKGROUND"                   /  "バックグラウンド"
about.origin_story.tile_stat_1_value      "BUSINESS + AI"                /  "ビジネス + AI"
about.origin_story.tile_stat_2_label      "TAUGHT"                       /  "指導"
about.origin_story.tile_stat_2_value      "200+ LEARNERS"                /  "200名以上"
about.origin_story.tile_stat_3_label      "LANGUAGES"                    /  "言語"
about.origin_story.tile_stat_3_value      "EN"                           /  "EN"

about.team.chapter_overline               "CH. 02 · THE CREW"            /  "第二章 · チーム"
about.team.headline_line_1                "Working practitioners."       /  "現役の実践者。"   (replaces existing)
about.team.headline_line_2                "Not script readers."          /  "台本の朗読者ではありません。"   (replaces existing)
about.team.cadence_stat_1_label           "INSTRUCTORS"                  /  "講師"
about.team.cadence_stat_1_value           "2"                            /  "2名"
about.team.cadence_stat_2_label           "LANGUAGES"                    /  "言語"
about.team.cadence_stat_2_value           "EN + 日本語"                  /  "EN + 日本語"
about.team.cadence_stat_3_label           "SPECIALTIES"                  /  "専門分野"
about.team.cadence_stat_3_value           "BUSINESS + HEALTHCARE"        /  "ビジネス + ヘルスケア"
about.team.cta_label                      "See what we teach →"          /  "私たちが教えていることを見る →"

about.mission_vision.chapter_overline     "CH. 03 · WHAT WE'RE BUILDING TOWARD"  /  "第三章 · 私たちが目指すもの"
about.mission_vision.headline             "For the people the AI industry usually leaves out."  /  "AI業界が見落としがちな人々のために。"
about.mission_vision.mission_label        "MISSION"                      /  "ミッション"
about.mission_vision.vision_label         "VISION"                       /  "ビジョン"
about.mission_vision.cadence_stat_1_label "MISSION"                      /  "ミッション"
about.mission_vision.cadence_stat_1_value "TODAY"                        /  "現在"
about.mission_vision.cadence_stat_2_label "VISION"                       /  "ビジョン"
about.mission_vision.cadence_stat_2_value "2030+"                        /  "2030年以降"
about.mission_vision.cadence_stat_3_label "FOCUS"                        /  "フォーカス"
about.mission_vision.cadence_stat_3_value "US + JAPAN"                   /  "米国 + 日本"

about.closing.meta_strip                  "END OF ISSUE 01 · NEXT CHAPTER AWAITS · FIN"  /  "第一号 終 · 次章へ続く · 完"
about.closing.headline                    "Build with us."               /  "一緒につくろう。"
about.closing.lede                        "Start with a free Vault lesson, join a cohort, or bring HonuVibe to your team."  /  "無料のVaultレッスンから始めるか、コホートに参加するか、チームにHonuVibeを導入してください。"
about.closing.cta_primary                 "Start learning →"             /  "学び始める →"
about.closing.cta_secondary               "Partner with us →"            /  "パートナーになる →"
```

The Japanese values above are starting points — the executing agent should adjust to idiomatic JP and respect the project's JP typography rules (no `text-justify`, generous letter-spacing, line-height 1.7–1.8).

### Keys to delete

- `about.soft_cta.*` from both locale files.

---

## Reuse — existing primitives

These already exist and should not be re-implemented:

- `components/marketing/primitives/index.ts` — `Section`, `Container`, `Overline`, `SectionHeading`, `Button`
- `components/marketing/learn/learn-chapter-vault.tsx` — reference for chapter header + cadence row + per-chapter CTA layout
- `components/marketing/partnerships/cohort-chapter.tsx` — reference for proof tile composition
- `components/marketing/partnerships/closing-band.tsx` *(or equivalent — confirm exact file)* — reference for navy closing band with meta strip and dual CTA
- `components/marketing/about/team.tsx` — `TeamCard` sub-component reused as-is; only the parent filter and grid change

If during execution it becomes obvious that two or more chapters share so much markup that a shared `<ChapterShell>` primitive would simplify things, extract it. Otherwise keep chapters inline — Partnerships and Learn currently keep them inline and that's fine.

---

## Verification

Run `pnpm dev` and walk the page in both locales.

**Visual / structural**

1. `/about` opens to a navy hero. Chip nav links scroll smoothly to `#origin`, `#crew`, `#mission`.
2. CH. 01 renders Ryan's portrait inside the proof tile with the cadence row visible underneath.
3. CH. 02 renders two portrait cards side-by-side on `md:` (Ryan left, Chiemi right). Stacks to one column on mobile.
4. CH. 03 renders the two cards (Mission, Vision) with the editorial frame, not the old rounded boxes. The cadence row sits beneath both cards.
5. Closing band is navy with the meta strip across the top and the dual CTA on the right.
6. The Aloha Standard, social-links, and soft-CTA sections are no longer on the page.
7. Section anchors work for direct deep links: `/about#crew` lands on the Crew chapter.

**Bilingual**

8. `/ja/about` walks identically with all overlines, chip labels, cadence labels, and meta strip in Japanese — **no `CH. 0X` / `END OF ISSUE` strings leaking through in English**.
9. JP body copy maintains `line-height: 1.7–1.8`, no `text-justify` on any paragraph.
10. No `MISSING_MESSAGE` warnings in the dev console on either locale.

**Responsiveness / a11y**

11. At 375px width: hero stacks, chapters stack, no horizontal scroll, all touch targets ≥ 44px.
12. Theme toggle: dark and light both legible; teal-on-navy passes WCAG AA contrast.
13. `prefers-reduced-motion`: no janky reveals.

**Conversion plumbing**

14. Closing band's primary CTA (`Start learning →`) navigates to `/learn`; secondary navigates to `/partnerships`.
15. Per-chapter CTAs in CH. 01 → `/explore` and CH. 02 → `/learn`.

**Regression**

16. `pnpm build` succeeds with zero new warnings.
17. `pnpm lint` clean.
18. Other marketing pages (Home, Learn, Explore, Partnerships, Contact) render unchanged — quick spot-check that nothing in `messages/*.json` got accidentally renamed under a shared key.

---

## Out of scope (intentionally not in this plan)

- Restoring the Aloha Standard framing anywhere else on the site. The legacy i18n keys remain for future use; no other surfaces are touched.
- Adding Mizuho as a third Crew portrait. Her record stays in `ALL_MEMBERS` but is not rendered.
- New photo assets. The redesign uses the existing `ryan.webp` and `chimi.webp`.
- Changing the `MarketingShell`, nav, or Newsletter footer.
