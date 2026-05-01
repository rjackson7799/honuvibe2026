# Plan — Japanese Translation for the About Page

## Context

When viewing `localhost:3000/ja/about`, every body string on the About page renders in English even though the nav, footer, and JP locale chrome are correctly localized. The visible English-on-JP includes the hero ("People first. Always.", subhead, fact labels), the origin story, team bios, the Aloha Standard principles, mission/vision, the social section, and the soft CTA at the bottom.

**Root cause:** The `about.*` namespace in `messages/ja.json` (lines **2359–2446**) is byte-identical to `messages/en.json`. It was added during the Phase 3 About rebuild ([a6de682](https://github.com/) `feat(marketing): add About page section components and i18n`) as an English placeholder and never translated. All eight About section components in [components/marketing/about/](components/marketing/about/) — `hero.tsx`, `origin-story.tsx`, `team.tsx`, `aloha-standard.tsx`, `mission-vision.tsx`, `social-section.tsx`, `soft-cta.tsx` — are correctly instrumented with `useTranslations('about.*')` and `getTranslations('about.meta')`. The bug is purely in the translation file, not in component code.

This is the same shape of gap we shipped a fix for on the home page — see [docs/plans/jp-home-translation.md](docs/plans/jp-home-translation.md). We are reusing that pattern and voice here.

**Outcome:** Replace the **70 untranslated string values** under `about.*` in [messages/ja.json](messages/ja.json) with proper Japanese translations following the project's established JP voice. After this change, `localhost:3000/ja/about` renders fully in Japanese while `localhost:3000/about` is unchanged.

## Scope

**Single file change:**
- [messages/ja.json](messages/ja.json) lines 2359–2446 (the entire `about` block)

**No code changes required.** Components are already i18n-correct and tests at [__tests__/marketing/about/about-sections.test.tsx](__tests__/marketing/about/about-sections.test.tsx) already pass against the wired keys.

## Translation Guidelines

Same rules as the home plan, applied to About-specific content. Derived from existing JP voice in `about_page.*` (HonuHub about page, lines ~700–1000 of [messages/ja.json](messages/ja.json)) and the home plan's confirmed conventions.

### Brand & proper-noun preservation (keep in Roman script)
- `HonuVibe`, `HonuVibe.AI`, `Honu`, `HonuHub`
- `AI`, `LLM`, `LLMs`
- `Aloha` — keep Roman; cultural brand value (matches `about_page.aloha_standard` which uses 「アロハ」 in body and `Aloha Standard` styling — for **this** namespace's section header `aloha_standard.headline_line_1/2`, render as 「アロハ・」 / 「スタンダード。」 to mirror the existing `about_page.aloha_standard.heading: "アロハ・スタンダード"`)
- Person names: `Ryan Jackson`, `Mizuho H.`, `Chiemi M.` — keep Roman
- Credentials: `Northwestern BS`, `USC Marshall MBA` — keep Roman
- Locations: translate to katakana — `Honolulu` → ホノルル, `Los Angeles` → ロサンゼルス, `Tokyo` → 東京, `Waikiki` → ワイキキ, `Japan` → 日本
- Course names if referenced: `AI Essentials`, `AI Mastery`, `Builder Track` — keep Roman
- Social platform names: `TikTok`, `Instagram`, `YouTube`, `LINE` — keep Roman (matches `about_page.social.*`)

### Voice & register
- Polite-neutral (です/ます), concise, no exclamation points.
- Marketing copy should feel native, not literal. The hero's three-beat headline `People` / `first.` / `Always.` should land as three short JP beats with the same forward-leaning tonality, not a literal kanji-for-word transliteration. Recommended: 「人を、」 / 「いちばんに。」 / 「いつも。」
- The Aloha Standard principle headlines in EN are short imperatives ("We give generously.", "We never hard sell."). Render as concise JP statements ending in 。, matching the existing `about_page.aloha_standard.principles.*.title` pattern (e.g., 「惜しみなく与える。」「決して押し売りしない。」).
- "Pro-bono work is real work." → reuse the existing voice from `about_page.aloha_standard.principles.pro_bono.title: "プロボノも本気の仕事"` — phrase as 「プロボノも本気の仕事です。」.
- "Practitioner / working practitioner" → 実践者 (consistent with `about_page` glossary).
- Keep the em dash `—` in English-text contexts where the visual rhythm matters (e.g., the founder bio's parenthetical credential listing); prefer `・` (middle dot) between short JP clauses, matching the `about_page` voice.

### Typography & punctuation
- Full-width JP punctuation (`、` `。`) in body text; ASCII inside brand strings.
- The hero `fact_founded_value: "Honolulu"` → ホノルル. `fact_languages_value: "EN · JP"` → keep `EN・JP` (compact label, mirrors existing course-card chip convention from the home plan).
- `location_marker: "Los Angeles · Honolulu"` → 「ロサンゼルス・ホノルル」.
- `members_*_location` strings: `Tokyo, Japan` → 「東京、日本」; `Japan` → 「日本」.

### Tone-specific decisions to confirm in-line
1. **Hero headline cadence.** Three sharp JP beats: 「人を、」 / 「いちばんに。」 / 「いつも。」 The accent-teal third line stays as the most emotionally weighted beat.
2. **Origin story headline.** `People first.` / `Built for the world.` → 「人を、いちばんに。」 / 「世界のために。」 — keeps thematic continuity with the hero.
3. **Aloha Standard section headline.** `The Aloha` / `Standard.` → 「アロハ・」 / 「スタンダード。」 (mirrors `about_page.aloha_standard.heading: "アロハ・スタンダード"`).
4. **Soft CTA headline.** `Ready to start?` → 「はじめる準備はできましたか？」 (matches the voice of `nav.get_started: "はじめる"`).
5. **`subhead` and `p1/p2/p3` paragraphs in `origin_story`.** Translate as flowing JP prose (です/ます), not a sentence-by-sentence literal mirror of the EN. Preserve the meaning beats: (p1) the founding question, (p2) Ryan's background and the gap he saw, (p3) the aloha-grounded answer he built.

## Files Modified

| File | Change |
|---|---|
| [messages/ja.json](messages/ja.json) | Replace string values under the `about` key (lines 2359–2446). Keys, structure, and ordering stay identical. No keys added or removed. |

## Critical Files for Reference (read-only)

- [messages/en.json](messages/en.json) — source-of-truth English values for the `about.*` block (8 sub-namespaces, 70 string values). Read first to confirm scope.
- [messages/ja.json](messages/ja.json) — the file being edited. The `about_page.*` block earlier in the same file is the gold-standard JP voice reference for tone, punctuation, and proper-noun handling on About-adjacent content.
- [docs/plans/jp-home-translation.md](docs/plans/jp-home-translation.md) — sibling plan whose conventions we are reusing.
- [components/marketing/about/hero.tsx](components/marketing/about/hero.tsx), [origin-story.tsx](components/marketing/about/origin-story.tsx), [team.tsx](components/marketing/about/team.tsx), [aloha-standard.tsx](components/marketing/about/aloha-standard.tsx), [mission-vision.tsx](components/marketing/about/mission-vision.tsx), [social-section.tsx](components/marketing/about/social-section.tsx), [soft-cta.tsx](components/marketing/about/soft-cta.tsx) — confirm key usage. Each component reads only from its matching `about.<section>` sub-namespace; no cross-section reads, no fallbacks to other namespaces.
- [__tests__/marketing/about/about-sections.test.tsx](__tests__/marketing/about/about-sections.test.tsx) — existing tests assert presence of keys; must continue to pass.

## Verification

1. **Visual smoke test on the dev server:**
   - Run `npm run dev` and visit `http://localhost:3000/ja/about`.
   - Confirm each section renders fully in JP: hero (overline, three headline lines, subhead, three fact labels+values), origin story (overline, two headline lines, three paragraphs, founder badge name + 2 credentials, location marker), team (overline, two headline lines, subhead, three member cards × name/title/location/bio), aloha standard (overline, two headline lines, lede, four principle title/body pairs), mission/vision (two label/body pairs), social section (overline, headline, four platform labels, newsletter link), soft CTA (headline, subhead, two CTA buttons).
   - Verify `localhost:3000/about` (no locale prefix) still renders English correctly — confirms `messages/en.json` was untouched.
   - Toggle the language switcher in the nav and confirm it round-trips between `/about` and `/ja/about` cleanly.

2. **JSON integrity:**
   - `node -e "JSON.parse(require('fs').readFileSync('messages/ja.json'))"` must succeed (no parse errors).
   - `node -e "const en=require('./messages/en.json'); const ja=require('./messages/ja.json'); function flatten(o,p=''){const r={};for(const k in o){const np=p?p+'.'+k:k;if(typeof o[k]==='object'&&o[k]!==null)Object.assign(r,flatten(o[k],np));else r[np]=o[k]}return r} const fe=flatten(en.about),fj=flatten(ja.about); const missing=Object.keys(fe).filter(k=>!(k in fj)); const sameAsEn=Object.keys(fe).filter(k=>fe[k]===fj[k] && fe[k].length>3 && !['EN · JP','HonuVibe','TikTok','Instagram','YouTube','LINE'].includes(fe[k])); console.log('missing:',missing.length,'still-english:',sameAsEn.length); if(sameAsEn.length) sameAsEn.forEach(k=>console.log(' ',k));"` — `missing` must be 0; `still-english` must be 0 (or only deliberately-Roman strings like brand names and the `EN・JP` chip; the script already excludes the obvious ones).

3. **Tests:**
   - `npm test -- about-sections` — existing About section tests must pass.
   - `npm run lint` — no new warnings.

4. **Build check:**
   - `npm run build` succeeds. next-intl fails the build on missing keys; success confirms no key was renamed or dropped.

5. **Visual regression spot-check:**
   - Hero `headline_line_1/2/3` width: JP beats 「人を、」「いちばんに。」「いつも。」 are shorter than `People` / `first.` / `Always.` and won't overflow the `clamp(52px, 6vw, 80px)` font size.
   - Team card bios are the longest single strings; confirm they wrap on mobile (320px wide) without overlap. The existing `about_page` JP bios are similar length and wrap correctly today, so no layout breakage expected.
   - Aloha Standard four-principle grid: confirm the JP titles fit on one line at desktop and wrap to two lines at mobile, same as EN.

## Out of Scope

- Translating other namespaces (`learn`, `contact`, `partnerships`, `home`, `exploration_page` are still untranslated but tracked separately).
- Component code changes (none needed).
- Adding new translation keys.
- SEO `meta` tag wording beyond a faithful JP translation of the existing EN `about.meta.title` and `about.meta.description`.
- Touching `about_page.*` (HonuHub about page) — that namespace is already translated.
