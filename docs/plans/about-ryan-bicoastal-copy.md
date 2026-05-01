# About page — fix "Born in Hawaii" + Ryan's location (bicoastal)

## Context

The About page reads "Born in Hawaii. / Built for the world." as the Origin Story headline, immediately next to Ryan's photo and credential badge. Even though that sentence is technically about HonuVibe (the company), readers parse it as a personal claim about Ryan — and Ryan was not born in Hawaii. He splits time between Los Angeles and Honolulu.

Two adjacent strings reinforce the misread: the origin-story location pill ("Based in Waikiki, Honolulu, Hawaii") and the Team card's `members_ryan_location` ("Honolulu, Hawaii"). This change updates the headline plus those Ryan-personal location strings to be honest about the LA / Honolulu split. It deliberately leaves the hero "Founded: Honolulu" stat alone — the *company* really was founded in Honolulu.

## Scope

Headline + Ryan's location strings. Hero "Founded: Honolulu" stays. Other Hawaii references in the company narrative (mission, vision, HonuHub Waikiki, "Made in Hawaii", aloha, etc.) stay — they're about HonuVibe and the brand, not Ryan's residence.

## Changes

### 1. `messages/en.json` — `about.origin_story`

| key | old | new |
| --- | --- | --- |
| `headline_line_1` | `Born in Hawaii.` | `People first.` |
| `headline_line_2` | `Built for the world.` | `Built for the world.` (unchanged) |
| `p3` | `So he built HonuVibe from Waikiki — a training company grounded in the Hawaiian concept of aloha: ...` | `So he built HonuVibe — a training company grounded in the Hawaiian concept of aloha: ...` (drop "from Waikiki" so the paragraph no longer locks Ryan to one city; aloha framing stays) |
| `location_marker` | `Based in Waikiki, Honolulu, Hawaii` | `Los Angeles · Honolulu` |

### 2. `messages/en.json` — `about.team`

| key | old | new |
| --- | --- | --- |
| `members_ryan_location` | `Honolulu, Hawaii` | `Los Angeles · Honolulu` |

### 3. `messages/ja.json`

These same four keys currently hold the English strings (JP fallback). Mirror the EN updates so the JP locale doesn't keep stale English copy. Headline lines (`People first.` / `Built for the world.`), `p3` (drop "from Waikiki"), `location_marker` and `members_ryan_location` (`Los Angeles · Honolulu`).

### 4. `__tests__/marketing/about/about-sections.test.tsx`

The OriginStory test at lines 89–98 asserts the old strings:

- line 89 `it('OriginStory renders Born in Hawaii headline + ...')` → rename to `'OriginStory renders headline + credential badge + location marker'`
- line 92 `expect(heading.textContent).toContain('Born in Hawaii.');` → `expect(heading.textContent).toContain('People first.');`
- line 96 `screen.getByText(/Based in Waikiki, Honolulu, Hawaii/)` → `screen.getByText(/Los Angeles · Honolulu/)`

(The AboutHero test at line 84 — `expect(screen.getByText('Honolulu')).toBeInTheDocument()` — stays; that's the "Founded" stat and it's still accurate.)

## Notes / things deliberately NOT touched

- `about.hero.fact_founded_value` ("Honolulu") — true; company was founded in Honolulu.
- `home.hero.quote` ("from Honolulu to Tokyo"), HonuHub copy, mission/vision, "Made in Hawaii with Aloha", `terms.governing_law`, footer "Honolulu, Hawaii" — all about HonuVibe-the-company, not Ryan personally.
- `ryan.location` (`Waikiki, Honolulu, Hawaii`) and `ryan.bio_p3` — there's a separate `/about/ryan` profile page that may also need updating, but that's outside the scope chosen here. Flagging it for a follow-up if you want a fuller bicoastal sweep later.
- `components/marketing/about/origin-story.tsx` — no component changes needed; all copy is i18n-driven.

## Critical files

- [messages/en.json](messages/en.json) — keys `about.origin_story.headline_line_1`, `about.origin_story.p3`, `about.origin_story.location_marker`, `about.team.members_ryan_location`
- [messages/ja.json](messages/ja.json) — same keys
- [__tests__/marketing/about/about-sections.test.tsx](__tests__/marketing/about/about-sections.test.tsx) — lines 89, 92, 96
- [components/marketing/about/origin-story.tsx](components/marketing/about/origin-story.tsx) — read-only reference (consumes the keys)

## Verification

1. `npm run dev` → load `http://localhost:3000/about`. Confirm the Story headline reads `People first. / Built for the world.` and the green pill reads `🌺 Los Angeles · Honolulu`.
2. Scroll to the Team section. Ryan's card should show `Los Angeles · Honolulu` under his title.
3. The hero's "Founded" stat should still read `Honolulu` (unchanged).
4. Visit `/ja/about` — same three checks against the JP page.
5. `npm test -- about-sections` (or the project's equivalent) → the renamed OriginStory test should pass against the new strings; AboutHero `Honolulu` assertion should still pass.
6. `rg -n "Born in Hawaii"` → expect zero matches in `messages/`, `components/`, `app/`, `__tests__/` (the design HTML in `docs/designs/About.html` may keep the old line; that's static reference material, leave it).
