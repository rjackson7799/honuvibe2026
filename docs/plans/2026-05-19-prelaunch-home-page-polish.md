# Home Page — Pre-Launch Polish

**Date:** 2026-05-19
**Owner:** Ryan (review) / execution agent (build)
**Scope:** EN + JP home page only (`app/[locale]/page.tsx`)
**Status:** Ready to execute

---

## Context

This is the first page in a page-by-page pre-launch optimization pass. The home page is the top of the funnel and the first impression for both EN and JP audiences. Three targeted changes came out of a collaborative review:

1. **Hero social proof copy** — shift from passive observation ("Joined by...") to active invitation ("Join..."). Higher psychological pull and doubles as a soft CTA. Faces will be added later once we have permission from real students; circles stay for now.
2. **Hero vault mockup** — currently shows a Claude-specific course ("Claude & LLMs" with lessons named "How Claude Works", "Writing System Prompts", etc.). Reposition to an outcome-focused, vendor-neutral project so HonuVibe reads as the neutral guide, not as "Claude school." Opens partnership doors to OpenAI, Google, Cohere, etc.
3. **Remove dead Skool community link** — we don't have a Skool community and don't plan to build one. Every visible link must resolve before launch. The dashboard `/learn/dashboard/community` is the community surface.

A cross-cutting rule comes out of #2: **all marketing-surface copy is LLM-agnostic.** Use "AI" / "AI agents" externally; name vendors only inside lesson content where it's functionally relevant. The execution agent should apply this rule wherever it shows up on the home page (not just where called out below).

---

## Files to modify

| File | Reason |
|------|--------|
| [messages/en.json](messages/en.json) | Hero copy + vault mockup strings + Skool string |
| [messages/ja.json](messages/ja.json) | Parallel JP changes |
| [components/marketing/newsletter/marketing-newsletter.tsx](components/marketing/newsletter/marketing-newsletter.tsx) | Remove Skool anchor block |
| [components/marketing/home/vault-lesson-mockup.tsx](components/marketing/home/vault-lesson-mockup.tsx) | Neutralize Claude-named tag + footer button |

No component logic changes in [components/marketing/home/hero.tsx](components/marketing/home/hero.tsx) — all hero changes flow through translation keys.

---

## Detailed changes

### Change 1 — Hero social proof copy

**File:** [messages/en.json:2184](messages/en.json#L2184)

```diff
- "social_proof": "Joined by <count>500+</count> learners across EN & JP",
+ "social_proof": "Join <count>500+</count> learners across EN & JP",
```

**File:** [messages/ja.json](messages/ja.json) — find the parallel `home.hero.social_proof` key and shift from passive ("〜が参加しています") to invitational ("〜と一緒に学ぼう" or similar). Use whatever phrasing reads as inviting in JP — `仲間入りしよう` is one good option.

Faces will land in a later pass — colored circles in [hero.tsx:57-65](components/marketing/home/hero.tsx#L57-L65) stay as-is.

---

### Change 2 — Hero vault mockup → outcome-focused

The mockup currently presents the active chapter as a Claude tutorial. Reframe it as a real-world project.

**File:** [messages/en.json:2188-2208](messages/en.json#L2188-L2208)

```diff
- "vault_chapter_title": "Claude & LLMs",
+ "vault_chapter_title": "Building an Automated Customer Research Agent",
```

**Sidebar topics** (lines 2191-2196). Replace the Claude-named topic so the active sidebar entry matches the chapter:

```diff
  "vault_topic_1": "AI Fundamentals",
  "vault_topic_2": "Prompt Engineering",
- "vault_topic_3": "Claude & LLMs",
+ "vault_topic_3": "AI Agents",
  "vault_topic_4": "Workflow Automation",
  "vault_topic_5": "Real-World Projects",
  "vault_topic_6": "Business Applications",
```

**Lesson list** (lines 2197-2208). Replace all four lessons with outcome-named lessons that fit "Building an Automated Customer Research Agent":

```json
"lesson_1_title": "Defining the agent's job",
"lesson_1_desc": "Clarify what to research, who the customer is, and what good output looks like.",
"lesson_1_time": "9 min",

"lesson_2_title": "Collecting customer signals",
"lesson_2_desc": "Gather transcripts, support tickets, and surveys into one workable corpus.",
"lesson_2_time": "11 min",

"lesson_3_title": "Drafting research briefs",
"lesson_3_desc": "Turn raw signals into pain points, themes, and follow-up questions.",
"lesson_3_time": "8 min",

"lesson_4_title": "Reviewing and shipping insights",
"lesson_4_desc": "Sanity-check the brief, package it for stakeholders, and close the loop.",
"lesson_4_time": "10 min"
```

**File:** [messages/ja.json](messages/ja.json) — mirror all of the above in JP. Suggested translations (final wording is the agent's judgment; flag if unsure):

- chapter title: 「顧客リサーチエージェントを構築する」
- topic 3: 「AIエージェント」
- lesson 1: 「エージェントの役割を定義する」 / 「リサーチ対象・顧客像・理想のアウトプットを明確にします。」
- lesson 2: 「顧客の声を集める」 / 「インタビュー、サポート問い合わせ、アンケートを一つのコーパスにまとめます。」
- lesson 3: 「リサーチブリーフを作成する」 / 「生のシグナルを、ペインポイント・テーマ・追加質問に変換します。」
- lesson 4: 「インサイトを共有する」 / 「ブリーフを検証し、ステークホルダー向けにパッケージ化して締めくくります。」

**Verify** by visiting `/` and `/ja` after the change — the active sidebar pill should read "AI Agents" / 「AIエージェント」 and the chapter card should show the new title and four outcome-named lessons.

---

### Change 3 — Remove Skool community link

**File:** [components/marketing/newsletter/marketing-newsletter.tsx:106-113](components/marketing/newsletter/marketing-newsletter.tsx#L106-L113)

Delete the entire `<a>` element:

```diff
- <a
-   href="https://www.skool.com/honuvibe"
-   target="_blank"
-   rel="noopener noreferrer"
-   className="border-b border-[rgba(90,107,115,0.3)] pb-0.5 text-[14px] text-[var(--m-ink-secondary)] transition-colors hover:text-[var(--m-ink-primary)]"
- >
-   {t('marketing_skool_cta')}
- </a>
```

After removal, check the newsletter band visual balance — the form may need a small bottom-spacing adjustment so the section doesn't feel top-heavy. If so, adjust `mb-5` on the form or the section padding.

**Also delete the now-unused translation key** in both files:
- [messages/en.json:164](messages/en.json#L164) — remove `"marketing_skool_cta": "Or join the free Skool community →",`
- [messages/ja.json](messages/ja.json) — remove the parallel `marketing_skool_cta` key

---

### Change 4 — Vault section mockup: neutralize remaining Claude references

The second mockup (in the Vault section, further down the home page) also references Claude.

**File:** [components/marketing/home/vault-lesson-mockup.tsx](components/marketing/home/vault-lesson-mockup.tsx)

- **Line 238** — `tag_claude` is in the tag row. Rename the translation key to `tag_agents` (or similar neutral term) and update the value to "AI Agents" / 「AIエージェント」.
- **Line 263** — `footer_open_in_claude` button. Rename to `footer_try_prompt` (or similar) and update the value to "Try this prompt →" / 「このプロンプトを試す →」.

Update both keys in [messages/en.json](messages/en.json) and [messages/ja.json](messages/ja.json) under the `home.vault_section.lesson` namespace.

**Leave the embedded system prompt code block alone** (the `# Role`, `# Task`, etc. inside `SystemPrompt()` at line 339+) — it's vendor-neutral already and looks like a generic prompt template.

---

## Cross-cutting rule (apply throughout home page)

While making these changes, scan the rest of the home page sections (`HomeHowItWorks`, `HomeValueProps`, `HomeVaultSection`, `HomeFeaturedCourses`, `HomeOrgSection`, `HomeExploration`, `HomeTestimonials`) for any other Claude/OpenAI/GPT/Gemini-specific copy in their translation keys. Reframe to vendor-neutral ("AI", "AI agents", "LLM-based workflows") **unless** the mention is functionally necessary (e.g., a real course title that genuinely teaches Claude).

If you find more than 3 such mentions, list them in the verification PR description rather than batch-replacing — Ryan should sign off on each.

---

## Verification

Run from project root (PowerShell):

```powershell
pnpm dev
```

1. **EN home** — open `http://localhost:3000/`
   - Hero social proof line reads: "Join **500+** learners across EN & JP"
   - Hero mockup chapter title: "Building an Automated Customer Research Agent"
   - Active sidebar topic shows "AI Agents" highlighted (teal pill)
   - All four lesson titles match the new outcome-named list
   - Scroll to vault section: tag chips include "AI Agents" (not "Claude"), footer button reads "Try this prompt →" (not "Open in Claude →")
   - Scroll to newsletter band: no Skool link below the email form; layout balanced
   - Open dev console: no missing-translation warnings, no React key warnings

2. **JP home** — open `http://localhost:3000/ja`
   - All of the above checks pass with JP copy
   - JP typography (line-height, letter-spacing) still feels comfortable around the new lesson descriptions

3. **Build** — run `pnpm build` and confirm a clean production build with no type errors.

4. **Lighthouse** — run a mobile Lighthouse pass on `http://localhost:3000/` after the changes. Performance ≥ 90, no accessibility regressions, no broken-link errors.

5. **Search the codebase** for any other usage of `marketing_skool_cta` (should be zero matches after the cleanup):
   ```
   pnpm grep "marketing_skool_cta"
   ```

If any step fails, stop and report back rather than patching around it.

### Verification status (2026-05-19)

- [x] All four file edits applied as planned (en.json, ja.json, vault-lesson-mockup.tsx, marketing-newsletter.tsx).
- [x] `messages/en.json` and `messages/ja.json` parse as valid JSON.
- [x] Codebase grep for `marketing_skool_cta`, `tag_claude`, `footer_open_in_claude` across `messages/ components/ app/ lib/` → zero matches.
- [x] `pnpm build` → `✓ Compiled successfully in 68s`, no new errors. (Pre-existing `MISSING_MESSAGE: auth.loading` and `cookies` dynamic-server warnings are unrelated to this plan.)
- [ ] EN home browser walkthrough — **not run**; browser automation unavailable in this session. Needs Ryan to verify in browser.
- [ ] JP home browser walkthrough — **not run**; same blocker.
- [ ] Mobile Lighthouse pass — **not run**; same blocker.

Flagged judgment calls:
- JP hero social proof phrasing chosen: 「英語・日本語あわせて<count>500+</count>名の学習者と一緒に学ぼう」
- Newsletter form lost its `mb-5` after the Skool link removal — layout balance to confirm visually.

---

## Out of scope (later pages / later passes)

- Adding real student face photos to the hero social proof
- Other pages (about, learn landing, course detail, blog, contact, exploration) — each gets its own plan file
- Cross-cutting items already identified by exploration (hreflang on root layout, `<img>` → `next/image` migration, wiring `trackEvent` calls, skip-to-content link) — these will be bundled into a separate cross-cutting plan after the per-page passes are complete

---

## Commit guidance

Commit directly to `main` per project workflow. Suggested commit message:

```
polish(home): activate hero CTA, neutralize vault mockup, drop dead Skool link

- Hero: "Joined by 500+" → "Join 500+" (invitational, doubles as soft CTA)
- Hero mockup: Claude-specific course → outcome-focused "Building an
  Automated Customer Research Agent" with vendor-neutral lesson names
- Newsletter band: remove non-functional Skool community link + key
- Vault section: rename Claude-named tag and CTA to vendor-neutral
```
