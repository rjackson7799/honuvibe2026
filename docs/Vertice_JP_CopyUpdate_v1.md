# Vertice Society JP Page — Copy Update Spec
**File:** `Vertice_JP_CopyUpdate_v1.md`  
**Page:** `/ja/partners/vertice-society`  
**Status:** Ready for implementation  
**Date:** March 2026  

---

## How to Use This File

This document is the single source of truth for all copy changes to the Vertice Society Japanese landing page. Each section maps to a specific location in the codebase. For every change:

- **WHERE** identifies the file(s) likely containing the string (check `messages/ja.json` first, then the page component at `app/[locale]/partners/vertice-society/page.tsx`)
- **FIND** shows the current string (exact or approximate — search for it)
- **REPLACE WITH** shows the new string, ready to paste
- **NOTE** provides rationale and any conditional logic

Do not change English copy unless explicitly instructed in a change block. This spec is Japanese-only.

---

## Change 1 — Hero Tagline

**WHERE:** `messages/ja.json` → key likely `vertice.hero.subtitle` or `vertice.tagline`  
OR page component hero section  

**FIND:**
```
未来へのはじめの一歩
```

**REPLACE WITH:**
```
AIを先に知る、仕事で差をつける。
```

**NOTE:** Communicates competitive positioning without fear-based messaging. "先に" (first/ahead) signals proactive advantage. If stakeholders prefer an alternative, two backup options are available:
- Alt B: `選ばれたプロのための、実践AI。`  
- Alt C: `5週間で、AIを自分の武器にする。`

---

## Change 2 — Add Launch Date + Deadline Below Hero Tagline

**WHERE:** Page component hero section — add immediately below the tagline element  
OR `messages/ja.json` → add new key `vertice.hero.deadline`

**FIND:** The element immediately following the hero tagline (e.g. the first `✦` bullet or the program badge)

**ADD THIS ELEMENT** (insert between tagline and first bullet):
```
📅 2026年4月1日（火）開講 — 申込締切：3月28日（土）
```

**STYLING:** Render as a small pill/badge. Suggested Tailwind classes:
```
text-sm font-medium text-teal-400 bg-navy-800 border border-teal-400/30 
rounded-full px-4 py-1 inline-block mt-3 mb-2
```

**NOTE:** Replaces the vague `2026年春開講` that currently appears only in the footer area. A specific date creates real decision pressure. Update the footer instance too (see Change 9).

---

## Change 3 — First Feature Bullet: Exclusivity Reframe

**WHERE:** `messages/ja.json` → key likely `vertice.features[0]` or similar  
OR the first `✦` bullet in the hero section of the page component

**FIND:**
```
Vertice Societyメンバー限定 — 毎回のセッションで講師に直接質問できる、きめ細やかな学習環境。
```
*(Search for "Vertice Societyメンバー限定" — it may be split across keys)*

**REPLACE WITH:**
```
Vertice Societyメンバーへの特別招待 — このプログラムは一般公開されていません。定員15名の非公開AI集中プログラム。
```

**NOTE:** Flips framing from restriction ("limited to members") to privilege ("special invitation for members"). "非公開" (not publicly available) is a strong trust and exclusivity signal for Japanese professionals.

---

## Change 4 — Second Feature Bullet: Surface Ryan's Credentials

**WHERE:** `messages/ja.json` → key likely `vertice.features[1]` or the second `✦` bullet

**FIND:**
```
実践者が教える、講義型ではない授業 — Ryanは毎日AIを使って実際のプロダクトを構築 — 教科書のスライドではありません。
```

**REPLACE WITH:**
```
USCマーシャルMBA × 毎日AIを使う起業家が教える、講義型ではない授業 — 教科書ではなく、現場から。
```

**NOTE:** USC Marshall and Northwestern are recognized prestige signals for Japanese professionals. Leads with credentials, closes with the practitioner contrast. Shorter is better here — this is a bullet, not a bio.

---

## Change 5 — Third Feature Bullet: ESL Module Reframe

**WHERE:** `messages/ja.json` → key likely `vertice.features[2]` or the third `✦` bullet

**FIND:**
```
無料ESLコンパニオンモジュール — 言語がAI学習の障壁になってはいけません。バイリンガルサポートを標準装備。
```

**REPLACE WITH:**
```
Verticeメンバー限定特典：AIを学びながら英語も強くなる — 無料ESLコンパニオンモジュール付き。
```

**NOTE:** Reframes from "solving a weakness" to "dual-ROI premium benefit." Vertice is an English education community — improving English is an aspiration, not a problem. Lead with the benefit, close with the feature.

---

## Change 6 — Enrollment Button (Primary CTA)

**WHERE:** `messages/ja.json` → key likely `vertice.cta.primary` or `vertice.enroll`  
OR directly in the page component button element

**FIND:**
```
今すぐ登録
```

**REPLACE WITH:**
```
参加を申し込む →
```

**NOTE:** "参加を申し込む" (apply to join) implies community membership, not a transaction. The arrow `→` adds forward momentum. Apply to all instances of this CTA text on the page.

---

## Change 7 — Enrollment Section Button / Secondary CTA

**WHERE:** The enrollment flow section (the area with the Vertice access code input)

**FIND:**
```
受講申し込みへ進む
```

**REPLACE WITH:**
```
このプログラムへの参加を確定する
```

**NOTE:** "確定する" (confirm/lock in) creates a sense of decisive positive action. Avoids bureaucratic "申請" or transactional "購入" language.

---

## Change 8 — Seat Scarcity Badge Near Enrollment Button

**WHERE:** Page component — the enrollment section, adjacent to or directly above the primary CTA button

**FIND:** The existing text or badge element:
```
定員15名、Zoomライブ5回（各60分）
```
*(This appears in the three-item summary strip below the curriculum)*

**ADD** a new scarcity badge element immediately above the CTA button in the enrollment section:
```
定員15名限定 · 残り〇席 · 締切3月28日
```

**STYLING:** Use a high-visibility treatment. Suggested Tailwind:
```
text-sm font-semibold text-amber-400 bg-amber-400/10 border border-amber-400/40 
rounded px-3 py-1.5 inline-flex items-center gap-2 mb-3
```

**NOTE:** Replace `〇` with an actual remaining seat count if available from your enrollment data. Even a static number like `残り12席` is more compelling than `残りわずか`. Update this manually as seats fill, or wire to enrollment data if the LMS exposes a seats-remaining count.

---

## Change 9 — Footer Launch Date

**WHERE:** Page component footer / bottom section

**FIND:**
```
2026年春開講 · ホノルル、ハワイ
```

**REPLACE WITH:**
```
2026年4月1日開講 · 申込締切3月28日 · ホノルル、ハワイ
```

**NOTE:** Consistency with Change 2. Both instances should show the specific date.

---

## Change 10 — Instructor Credential Badge (Ryan's Card)

**WHERE:** Page component instructor section — the card for Ryan Jackson  
OR `messages/ja.json` → key likely `vertice.instructors.ryan.title` or similar

**FIND** (in Ryan's instructor card, below his name):
```
AI教育ディレクター
```

**REPLACE WITH:**
```
AI教育ディレクター · MBA, USC Marshall
```

OR if a separate credential/badge element can be added below the title line, add:
```html
<span class="text-xs text-teal-400 font-medium tracking-wide">
  MBA, USC Marshall  ·  AI実践者  ·  日米起業家エコシステム
</span>
```

**NOTE:** Surfaces the credential at the point where visitors evaluate the instructor, not buried in the bio paragraph. The bio text itself does not need to change.

---

## Change 11 — "Skills You'll Gain" Section Header (Minor Tone Lift)

**WHERE:** `messages/ja.json` → key likely `vertice.skills.header`  
OR the section header `得られるスキル`

**FIND:**
```
得られるスキル
```

**REPLACE WITH:**
```
このコースで身につくもの
```

**NOTE:** Minor but meaningful — "身につく" (internalized/embodied) implies deeper ownership than "得られる" (obtainable). Signals transformation, not just acquisition. Low-risk change.

---

## Change 12 — Near-Enrollment Exclusivity Reminder

**WHERE:** Page component — the enrollment / access code section, near the CTA

**FIND:** The existing instructional text:
```
Vertice Societyアクセスコード
```
*(This appears as a label above the access code input)*

**ADD** a one-line trust statement immediately above the access code label:
```
このプログラムはVertice Societyメンバーにのみご案内しています。
```

**STYLING:**
```
text-xs text-slate-400 italic mb-2
```

**NOTE:** Reinforces exclusivity at the highest-intent moment — just before the person enters their code and commits. Short, non-pressuring, factual.

---

## Summary Table

| # | Location | Change Type | Priority |
|---|---|---|---|
| 1 | Hero tagline | Rewrite | Medium |
| 2 | Hero — add deadline badge | New element | High |
| 3 | Feature bullet 1 | Rewrite | High |
| 4 | Feature bullet 2 | Rewrite | Medium |
| 5 | Feature bullet 3 | Rewrite | Medium |
| 6 | Primary CTA button | Rewrite | Medium |
| 7 | Enrollment section button | Rewrite | Medium |
| 8 | Enrollment — add scarcity badge | New element | High |
| 9 | Footer launch date | Rewrite | High |
| 10 | Instructor card credential | Addition | Medium |
| 11 | Skills section header | Minor rewrite | Low |
| 12 | Near CTA — exclusivity line | New element | Medium |

**Changes 2, 3, 8, 9 are the highest-impact items. Implement these first if doing a staged rollout.**

---

## Brand Guardrails

All changes in this spec have been reviewed against HonuVibe.AI brand principles:

- ✅ **No fear-based messaging** — urgency is created through specific deadlines and exclusivity, not threat or anxiety
- ✅ **No fake scarcity** — seat counts should reflect actual enrollment data
- ✅ **Aloha Standard** — tone remains warm and inviting throughout; no aggressive sales language
- ✅ **Japanese native phrasing** — all JP copy is written for native Japanese professional readers, not translated from English

---

*Vertice_JP_CopyUpdate_v1.md · HonuVibe.AI × Vertice Society · March 2026*  
*Made in Hawaii with Aloha 🐢*
