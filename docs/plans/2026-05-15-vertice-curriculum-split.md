# Curriculum Split — "What You Learn" + "How You Learn It"

**Date:** 2026-05-15
**Scope:** Restructure the Vertice landing's curriculum area from one cohort-coded "5週間" section into two sections that serve self-paced Vault buyers and live Cohort buyers equally well.

> **Note:** Per Ryan's standing preference, this plan should be moved to `docs/plans/2026-05-15-vertice-curriculum-split.md` as the first step of implementation. (Plan mode required writing here.)

## Context

The current curriculum section ([VerticeLanding.tsx:865-910](components/partners/vertice/VerticeLanding.tsx#L865-L910)) leads with **"5週間 / 5 weeks"** and uses weekly numbering with per-week durations. This signals "live cohort schedule" even though:

1. The same curriculum is delivered identically to both Vault (self-paced) and Cohort (live) buyers — confirmed by [the Vault FAQ at line 1618](components/partners/vertice/VerticeLanding.tsx#L1618): *"推奨ペースは週6時間 × 5週間 = 約30時間。多忙な方は週2〜3時間で3ヶ月かけて進めることも可能。"*
2. **Vault is the page's primary tier.** The hero's primary CTA is "Vaultに今すぐアクセス / Get Vault Access" ([line 162-167](components/partners/vertice/VerticeLanding.tsx#L162-L167)).
3. The dual framing is buried in the subline ("Self-paced. Or go deeper with a live cohort.") under a headline that reads as a calendar.

Result: a self-paced Vault buyer skimming the page thinks they're committing to a fixed 5-week schedule and may bounce.

The fix is to **split** the curriculum area into two sections:
- **What you learn** — pure content (modules, no time framing).
- **How you learn it** — format comparison (Vault self-paced vs Cohort 5-week live), no prices. Pricing later still owns the tier comparison + price + CTA.

## Changes

### 1. Refactor `Curriculum()` → "What you learn"

**File:** [components/partners/vertice/VerticeLanding.tsx:811-931](components/partners/vertice/VerticeLanding.tsx#L811-L931)

- Rename type `CurriculumWeek` → `CurriculumModule`. Rename const `CURRICULUM_WEEKS` → `CURRICULUM_MODULES`. Drop the `dur` field from the data (durations move to Section 2 as totals).
- Rename function `WeekRow` → `ModuleRow`. Remove the `vertice-week-dur` chip (no per-module hours). Keep the number badge, JP title, EN subtitle, and description.
- Update copy in `Curriculum()`:
  - Eyebrow: `"The curriculum"` → `"What you'll learn"` (and JP equivalent in `vertice-curr-eyebrow-jp` if added — current eyebrow is EN-only; leave EN-only).
  - Headline: drop `"5週間"`. New headline: `"プロのためのカリキュラム。"` with serif accent on a key word, e.g. `<span class="vertice-curr-title-accent">5モジュール。</span>` so "5 modules" is the lavender accent (replaces "プロのためのカリキュラム。" as the accent).
    - Final form: `"5モジュール。<br/><span accent>プロのためのカリキュラム。</span>"` — keeps the visual rhythm but lets the count read as count, not calendar.
  - Sub: `"5 weeks. Built for professionals."` → `"30 hours. Built for professionals."` (totals replace cadence)
  - Body JP: `"自分のペースで学べる。コホートで学べば、さらに深く。"` → `"プロが毎日使うツールとワークフローを、ハンズオンで身につける。"` (outcome-focused, drops mode framing — that's now Section 2's job)
  - Body EN: `"Self-paced. Or go deeper with a live cohort."` → `"Hands-on training in the tools and workflows professionals use every day."`
  - Drop `CURRICULUM_CHIPS` entirely (chips like 自分のペース / 永久アクセス / 修了証 are delivery, not content — they live in Section 2 now). Or trim to a single `日本語サポート / JP support` chip if the visual weight of the rail looks bare.
- Class-rename CSS: change `vertice-week*` classes to `vertice-module*` for clarity (or leave the class names as-is — purely a TS rename, lower risk; keep the CSS keyed to `.vertice-week*` since the structure is identical).

**Recommendation:** keep CSS class names as `.vertice-week*` (zero CSS churn), only rename the TS symbols.

### 2. Add new `LearningFormats()` section — "How you learn it"

**Insertion point:** [VerticeLanding.tsx:56](components/partners/vertice/VerticeLanding.tsx#L56) — render `<LearningFormats />` immediately after `<Curriculum />` and before `<VaultPreview />`.

**New component (sketch, to live in same file):**
```tsx
function LearningFormats() {
  return (
    <section id="how-you-learn" className="vertice-formats" aria-labelledby="vertice-formats-heading">
      <div className="vertice-formats-inner">
        <p className="vertice-formats-eyebrow">How you learn it</p>
        <h2 id="vertice-formats-heading" className="vertice-formats-title">
          同じ内容、<span className="vertice-formats-title-accent">2つの学び方。</span>
        </h2>
        <p className="vertice-formats-sub">Same curriculum. Two ways to learn.</p>

        <div className="vertice-formats-grid">
          <FormatCard
            mode="vault"
            badgeJp="自分のペース"
            badgeEn="Self-paced"
            titleJp="Vault"
            titleEn="Self-paced library"
            bullets={[
              { jp: '永久アクセス・あなたのスケジュールで', en: 'Lifetime access · your schedule' },
              { jp: '合計30時間・週2〜10時間で柔軟に', en: '~30 hours total · 2–10 hrs/week' },
              { jp: '40本以上の動画・テンプレート・プロンプト', en: '40+ videos · templates · prompts' },
              { jp: 'いつでもどこでも、何度でも見返せる', en: 'Watch anywhere, anytime, as many times as you want' },
            ]}
            ctaHref="#pricing"
            ctaJp="Vaultの詳細を見る"
            ctaEn="See Vault pricing"
          />
          <FormatCard
            mode="cohort"
            badgeJp="ライブコホート"
            badgeEn="Live Cohort"
            titleJp="Live Cohort"
            titleEn="5-week live program"
            bullets={[
              { jp: '5週間・週6時間（ライブ + 自習）', en: '5 weeks · 6 hrs/week (live + self-study)' },
              { jp: '週1回のライブZoom・少人数指導', en: 'Weekly live Zoom · small-group coaching' },
              { jp: '同期メンバーとプロジェクトを完走', en: 'Ship a project alongside cohort peers' },
              { jp: '修了証・Vaultの全コンテンツを含む', en: 'Verified certificate · includes full Vault library' },
            ]}
            ctaHref="#pricing"
            ctaJp="コホートの詳細を見る"
            ctaEn="See Cohort pricing"
          />
        </div>

        <p className="vertice-formats-foot">
          <span className="vertice-formats-foot-jp">どちらも同じ5モジュールのカリキュラム。学び方だけが違います。</span>
          <span className="vertice-formats-foot-en">Both modes deliver the same 5-module curriculum. Only the format differs.</span>
        </p>
      </div>
    </section>
  );
}
```

`FormatCard` is a small subcomponent (ICheck list + CTA link). Reuse the existing `IconCheck` and `IconArrow` from [components/partners/vertice/icons.tsx](components/partners/vertice/icons.tsx).

**Visual treatment:**
- Background: cream (`#FAF7F2` — match the live-site tone) so the lavender curriculum band ends and this section reads as a calmer transitional zone before VaultPreview.
- Two cards side-by-side on desktop, stacked on mobile (≤768px).
- Vault card: subtle teal accent (uses `--vertice-seafoam` for badge + checkmarks) since Vault is the primary tier.
- Cohort card: lavender accent (uses `--vertice-lavender`) — visually rhymes with the upstream curriculum band and downstream Final CTA.
- Both cards have the same height; equal visual weight (we're not pushing one over the other in this section — Pricing handles that).
- CTA links anchor to `#pricing` (existing section id at [line 1189](components/partners/vertice/VerticeLanding.tsx#L1189)) for now. Track via `trackEvent('partner_format_click', { partner: PARTNER_SLUG, mode })`.

### 3. Pricing copy nudge (avoid duplicating "Choose how you learn")

**File:** [components/partners/vertice/VerticeLanding.tsx:1193-1203](components/partners/vertice/VerticeLanding.tsx#L1193-L1203)

The Pricing section currently leads with `"あなたに合う、学び方を選ぶ。 / Choose how you learn."` — same framing as the new Section 2. Shift Pricing toward a price/tier framing:

- Headline: `"あなたに合う、学び方を選ぶ。"` → `"あなたに合うプランを選ぶ。"`
- Sub: `"Choose how you learn."` → `"Choose your plan."`
- Body: keep `"自分のペースで学ぶ。コミュニティで深める。ライブで仕上げる。"` — that's the 3-tier ladder narrative which the Section 2 doesn't cover (Section 2 is Vault vs Cohort only; Community is its own animal).

This keeps Section 2 owning the "how" framing and Pricing owning the "which tier + price" framing.

### 4. New CSS for `.vertice-formats*`

**File:** [components/partners/vertice/vertice.css](components/partners/vertice/vertice.css) — append after the existing `.vertice-week*` rules (around line 1493).

Selectors needed:
- `.vertice-formats` (cream background, vertical padding mirroring `.vertice-curr`)
- `.vertice-formats-inner` (max-width 1100px, centered)
- `.vertice-formats-eyebrow` / `.vertice-formats-title` / `.vertice-formats-title-accent` / `.vertice-formats-sub` (mirror the typographic scale of `.vertice-curr-*` but with cream-mode colors: navy text, lavender accent on the title accent)
- `.vertice-formats-grid` (2-col grid on desktop, 1-col stacked ≤768px)
- `.vertice-formats-card` (white card, `border-radius: 16px`, `padding: 32px`, `border: 1px solid rgba(26,43,51,0.08)`, soft shadow `0 8px 24px rgba(26,43,51,0.06)`)
- `.vertice-formats-card-vault` / `.vertice-formats-card-cohort` (left border accent in seafoam / lavender respectively, 4px wide)
- `.vertice-formats-card-badge` (small pill: bilingual JP/EN, tinted bg matching the card accent)
- `.vertice-formats-card-title` / `.vertice-formats-card-title-en` (navy + serif italic English, like other section card titles)
- `.vertice-formats-card-bullets` (ul with checkmark icons inline)
- `.vertice-formats-card-cta` (text-link with arrow icon, hover underline; teal for Vault card, lavender for Cohort card)
- `.vertice-formats-foot` (centered small text below grid, navy at low opacity, EN italic in serif — matches the existing `.vertice-curr-body-*` style)

Reuse tokens from the existing `:root` block at [vertice.css:6-30ish](components/partners/vertice/vertice.css#L6) (`--vertice-navy`, `--vertice-seafoam`, `--vertice-lavender`, `--vertice-ff-jp`, `--vertice-ff-sans`, `--vertice-ff-serif`).

### 5. Render order

[components/partners/vertice/VerticeLanding.tsx:48-66](components/partners/vertice/VerticeLanding.tsx#L48-L66) — insert `<LearningFormats />` between `<Curriculum />` and `<VaultPreview />`:

```tsx
<Curriculum />
<LearningFormats />
<VaultPreview />
```

## Critical files

- [components/partners/vertice/VerticeLanding.tsx](components/partners/vertice/VerticeLanding.tsx) — refactor `Curriculum()`, add `LearningFormats()` + `FormatCard`, nudge Pricing copy, render-order change
- [components/partners/vertice/vertice.css](components/partners/vertice/vertice.css) — append `.vertice-formats*` rules; no changes to existing `.vertice-curr*` / `.vertice-week*` selectors
- [components/partners/vertice/icons.tsx](components/partners/vertice/icons.tsx) — reuse `IconCheck`, `IconArrow` (no new icons needed)

## Verification

1. `pnpm dev`. Visit `/ja/partners/vertice-society` and `/partners/vertice-society`.
2. **Curriculum section** now reads "5モジュール" with the accent on it. No "5週間" anywhere in this section. No per-module hours. Subline emphasizes outcome ("30 hours. Built for professionals."). Chips area trimmed or removed cleanly.
3. **LearningFormats section** appears between Curriculum and VaultPreview. Two equal-height cards: Vault (teal accent, "Self-paced library") and Cohort (lavender accent, "5-week live program"). Each lists 4 format-specific bullets. Cards stack vertically on mobile (≤768px). The "同じ内容、2つの学び方。" headline reads, both languages render, and the "Both modes deliver the same 5-module curriculum" footnote appears below the grid.
4. **Pricing section** headline now reads "あなたに合うプランを選ぶ。 / Choose your plan." — no longer competes with Section 2's framing. The 3-tier ladder + price cards still work as before.
5. **Click each Format card CTA** — should anchor-jump to `#pricing`. Plausible event `partner_format_click` fires with `mode: 'vault'` or `mode: 'cohort'`.
6. **Mobile audit (≤480px):** the LearningFormats cards stack and remain readable; no horizontal overflow; CTA tap targets ≥44px.
7. **Theme audit:** the section sits comfortably between the lavender Curriculum band above and the cream VaultPreview / Testimonials below — visually it should feel like a calm transitional zone.
8. **Skim test:** open the page in JP locale and skim only Curriculum + LearningFormats sections. The dual-mode reality should be unambiguous within ~3 seconds of scanning.
