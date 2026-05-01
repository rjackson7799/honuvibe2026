# Plan — Japanese Translation for the Home Page

## Context

When viewing `localhost:3000/ja`, the entire home page renders in English even though the rest of the JP locale (nav, footer, partners section, buttons like 「はじめる」) is correctly localized. The hero shows "Learn AI. Apply It. Move Forward.", "Practical AI training and community...", "Explore Courses" / "Partner With Us", the vault preview card lessons, and every section below the fold — all in English on `/ja`.

**Root cause:** The `home.*` namespace in `messages/ja.json` (lines 2148–2279) is byte-identical to `messages/en.json`. It was never translated — the English block was copied in as a placeholder. All home page section components (`HomeHero`, `HomeHowItWorks`, `HomeValueProps`, `HomeVaultSection`, `HomeFeaturedCourses`, `HomeOrgSection`, `HomeExploration`, `HomeTestimonials`) are correctly instrumented with `useTranslations()` — the bug is purely in the translation file, not in component code.

**Outcome:** Replace the 76 untranslated string values under `home.*` in `messages/ja.json` with proper Japanese translations following the project's established JP voice (see `partners` block at lines 2141–2146 for tone reference: concise, uses 「・」, preserves brand names like "HonuVibe.AI" in Roman script).

## Scope

**Single file change:**
- `messages/ja.json` lines 2148–2279 (the entire `home` block)

**No code changes required.** Components are already i18n-correct.

## Translation Guidelines

These rules apply to every value being translated. They are derived from existing JP translations in the same file (e.g., `partners`, `value_props.card_2_jp_badge: "日本語対応"`) and from CLAUDE.md JP typography rules.

### Brand & proper-noun preservation (keep in Roman script)
- `HonuVibe`, `HonuVibe.AI`, `HonuHub`, `Honu`
- `The Vault` — keep as-is (it is a product name in this app; consistent with JP marketing convention of leaving English product names untouched)
- `Claude`, `LLMs`, `LLM`, `API`, `SaaS`, `AI`
- `Aloha` — keep Roman; it is a cultural term Ryan uses as a brand value
- Course track names: `AI Essentials`, `AI Mastery`, `Builder Track` — keep English (matches how `partners.featured_courses_heading` references courses)
- Project names: `KwameBrathwaite.com`, `MamaTree Market`, `HonuHub Scheduler` — keep
- Person names: `Keiko T.`, `Marcus A.`, `Sarah L.` — keep
- Locations: translate to katakana — `Tokyo` → 東京, `Honolulu` → ホノルル, `San Francisco` → サンフランシスコ, `Waikiki` → ワイキキ

### Markup & placeholder preservation
- `social_proof` contains the rich-text tag `<count>500+</count>` — the tag MUST be preserved verbatim around the `500+` numeral. Example translation: `"英語・日本語あわせて<count>500+</count>名の受講者が学んでいます"`.
- `eyebrow_lang: "EN / 日本語"` — leave unchanged (it is already bilingual and serves as a locale indicator).

### Typography & punctuation
- Use `・` (middle dot) instead of em dash `—` between short clauses, matching the existing `partners.powered_by` style.
- Use full-width punctuation in JP body text (`、` `。`) but keep ASCII punctuation inside brand strings.
- Course duration labels like `5 weeks` → `5週間`; `9 min` → `9分`; `~3 hours` → `約3時間`; `8–12 min` → `約8〜12分`.
- `EN / JP` (used as a course-language label) → keep as `EN / JP` for visual brevity in card chips.

### Voice & register
- Match the established JP marketing voice in `partners`: polite-neutral (です/ます), concise, no exclamation points, no machine-translation tells.
- Marketing copy should feel native, not literal. E.g., "Learn AI. Apply It. Move Forward." is a three-beat headline — render it as three short JP beats that carry the same forward-motion feeling, not a literal kanji-for-word transliteration. Suggested: 「AIを学ぶ。」「実践する。」「前へ進む。」
- "Practical, not theoretical" → 理論より、実践. (a paired contrast preserved)
- "Members only" → 会員限定
- "In progress" → 受講中
- "Completed" → 修了
- "Library" → ライブラリ
- "Progress" → 進捗
- "TRACK" ribbon → keep `TRACK` (it is a visual ribbon label)

## Files Modified

| File | Change |
|---|---|
| `messages/ja.json` | Replace string values under the `home` key (lines 2148–2279). Keys, structure, and ICU placeholders stay identical. |

## Confirmed Tone Decisions

1. **"The Vault" stays Roman** — rendered as `The Vault` everywhere (consistent with `HonuVibe.AI`, `Claude`, `LLM`).
2. **Headline cadence** — three sharp verb-final beats: `AIを学ぶ。` / `実践する。` / `前へ進む。`
3. **Testimonial roles fully Japanized** — roles in katakana, cities in JP (`東京`, `ホノルル`, `サンフランシスコ`). Names stay Roman (`Keiko T.`, `Marcus A.`, `Sarah L.`).

## Verification

1. **Visual smoke test on the dev server:**
   - Run `npm run dev` and visit `http://localhost:3000/ja`.
   - Confirm hero shows JP for: eyebrow, three headline lines, subhead, both CTAs, social proof line.
   - Scroll through all eight sections (How It Works, Value Props, Vault Section, Featured Courses, Org Section, Exploration, Testimonials) and confirm zero English strings remain.
   - Verify `localhost:3000/` (no locale prefix) still renders English correctly — i.e., `messages/en.json` was untouched.

2. **JSON integrity:**
   - `messages/ja.json` must remain valid JSON. After editing, run `node -e "JSON.parse(require('fs').readFileSync('messages/ja.json'))"` (or equivalent) to confirm no parse errors.
   - Run the existing translation/messages tests if any: `npm test -- messages` and `npm test -- home`.

3. **Build check:**
   - `npm run build` succeeds (next-intl will fail the build on missing keys; success confirms no key was accidentally renamed/dropped).

4. **Visual regression spot-check:**
   - Confirm hero layout still fits — JP strings are typically shorter than EN but headline_line_3 ("Move Forward.") translated to 「前へ進む。」 is similar width, so no layout breakage expected.
   - Confirm vault preview card lesson titles wrap acceptably; the longest JP string (`lesson_3_desc`) should not overflow.

## Out of Scope

- Translating other namespaces (already done — only `home` was missed).
- Component code changes (none needed).
- Adding new translation keys.
- SEO meta tags for the home page (not in the `home` block; tracked separately if missing).
