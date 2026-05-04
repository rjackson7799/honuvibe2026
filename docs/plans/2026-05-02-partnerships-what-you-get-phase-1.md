# Partnerships "What You Get" — Phase 1 Enhancement

## Context

The "What You Get" section on `/partnerships` currently renders a 2x2 grid of cards using flat Lucide line icons (`FileText`, `TrendingUp`, `Handshake`, `PlayCircle`) inside uniform seafoam-soft squares. There are no proof points grounding the value props, and the section ends without a section-level CTA — visitors must keep scrolling past three more sections to reach the application form.

This Phase 1 pass keeps the existing 2x2 layout and copy structure but adds three improvements:

1. **Richer icon treatment** — larger Lucide icons (Path B fallback, since no 3D rendered assets exist) with per-card accent colors, soft container backgrounds, and subtle shadow.
2. **Proof-point lines** — one italic supporting line per card, set off with a thin seafoam left bar.
3. **Section-level CTA** — anchor-scroll button to the existing `#apply` application form already lower on the same page, plus an optional secondary link to the Vertice Society case study.

The full redesign (mini-mockup icons, partner logo bar, layout restructure) is Phase 2 and out of scope.

## Files to modify

| File | Change |
|---|---|
| [components/marketing/partnerships/what-you-get.tsx](components/marketing/partnerships/what-you-get.tsx) | Per-card accent config, larger icon treatment, proof-point line, CTA block |
| [messages/en.json](messages/en.json) (lines 2550–2563 area) | Add `cards.*_proof` keys + new `cta` block under `partnerships.what_you_get` |
| [messages/ja.json](messages/ja.json) (lines 2550–2563 area) | Mirror keys, JP placeholders flagged for Mizuho review |
| [styles/globals.css](styles/globals.css) | Add `--m-accent-verdigris` + `--m-accent-verdigris-soft` tokens (marketing shell block, near existing coral tokens) |

## Critical files (read-only references)

- [components/marketing/partnerships/application-form.tsx:111](components/marketing/partnerships/application-form.tsx#L111) — `<Section id="apply">` is the anchor target the CTA will link to (already exists).
- [components/marketing/partnerships/what-you-get.tsx](components/marketing/partnerships/what-you-get.tsx) — current implementation; reuse `Card`, `Container`, `Overline`, `Section`, `SectionHeading` from `@/components/marketing/primitives` (no new primitives needed).
- [components/ui/button.tsx](components/ui/button.tsx) — `primary` variant for the CTA button. Reuse rather than ad-hoc inline classes.
- [styles/globals.css](styles/globals.css) — existing tokens `--m-accent-teal`, `--m-accent-teal-soft`, `--m-accent-coral`, `--m-accent-coral-soft`, `--m-ink-secondary`, `--m-ink-tertiary` are reused as-is.

## Implementation

### 1. Add verdigris CSS tokens

In [styles/globals.css](styles/globals.css), inside the `:root[data-shell="marketing"]` block (alongside existing `--m-accent-coral` lines around L409–411):

```css
--m-accent-verdigris: #2C7A6B;       /* deeper teal than seafoam */
--m-accent-verdigris-soft: #DCEAE6;
```

Values are starting points; tune in browser if Ryan wants a different deep-teal.

### 2. Restructure `what-you-get.tsx`

Extend the `CARDS` config to carry per-card accent metadata:

```ts
type CardConfig = {
  key: CardKey;
  Icon: LucideIcon;
  iconBg: string;          // background CSS expression
  iconColor: string;       // icon color CSS var
};

const CARDS: ReadonlyArray<CardConfig> = [
  { key: 'curriculum', Icon: FileText,    iconBg: 'bg-[var(--m-accent-teal-soft)]',      iconColor: 'text-[var(--m-accent-teal)]' },
  { key: 'monetize',   Icon: TrendingUp,  iconBg: 'bg-[var(--m-accent-coral-soft)]',     iconColor: 'text-[var(--m-accent-coral)]' },
  { key: 'cobranded',  Icon: Handshake,   iconBg: 'bg-gradient-to-br from-[var(--m-accent-teal-soft)] to-[var(--m-accent-coral-soft)]', iconColor: 'text-[var(--m-accent-teal)]' },
  { key: 'live',       Icon: PlayCircle,  iconBg: 'bg-[var(--m-accent-verdigris-soft)]', iconColor: 'text-[var(--m-accent-verdigris)]' },
];
```

Update the icon container in the card body:

```tsx
<div className={`mb-5 flex h-14 w-14 items-center justify-center rounded-xl shadow-[0_2px_8px_rgba(0,0,0,0.04)] ${iconBg}`}>
  <Icon size={28} strokeWidth={1.75} className={iconColor} />
</div>
```

Add proof-point line under the body `<p>`:

```tsx
<p className="mt-4 border-l-2 border-[var(--m-accent-teal)] pl-3 text-[13px] italic leading-relaxed text-[var(--m-ink-tertiary)]">
  {t(`cards.${key}_proof`)}
</p>
{/* PROOF-POINT COPY: placeholder pending Ryan review (EN) / Mizuho review (JP) */}
```

Add the CTA block after the grid `</div>`, still inside `<Container>`:

```tsx
import Link from 'next/link';
// ...
const locale = useLocale(); // from 'next-intl'

<div className="mt-16 flex flex-col items-center text-center">
  <p className="mb-3 text-[14px] text-[var(--m-ink-secondary)]">{t('cta.lead')}</p>
  <Link
    href="#apply"
    className="inline-flex items-center justify-center rounded-full bg-[var(--m-accent-teal)] px-6 py-3 text-[15px] font-semibold text-white shadow-[var(--m-shadow-teal-sm)] transition-colors hover:bg-[var(--m-accent-teal-dark)]"
  >
    {t('cta.button')} →
  </Link>
  <Link
    href={`/${locale}/partners/vertice-society`}
    className="mt-3 text-[13px] text-[var(--m-accent-teal)] hover:underline"
  >
    {t('cta.case_study')} →
  </Link>
</div>
```

(The Vertice Society case study at [app/[locale]/partners/vertice-society/page.tsx](app/%5Blocale%5D/partners/vertice-society/page.tsx) is confirmed live — secondary link is included.)

### 3. i18n additions

**`messages/en.json`** — under `partnerships.what_you_get`:

```jsonc
"cards": {
  // ... existing keys ...
  "curriculum_proof": "Bilingual programs delivered to Vertice Society and other partner organizations.",
  "monetize_proof":   "Partner-led programs typically launch within 4–6 weeks.",
  "cobranded_proof":  "Your brand. Your community. Our infrastructure and instruction.",
  "live_proof":       "5-week live cohorts on Zoom, with permanent access to The Vault."
},
"cta": {
  "lead":       "Ready to bring AI training to your people?",
  "button":     "Schedule a partnership conversation",
  "case_study": "Or read the Vertice Society case study"
}
```

**`messages/ja.json`** — mirror keys:

```jsonc
"cards": {
  // ... existing keys ...
  // FOR MIZUHO REVIEW: all four *_proof strings below are placeholders
  "curriculum_proof": "Vertice Societyなど、パートナー企業向けのバイリンガルプログラムを提供。",
  "monetize_proof":   "パートナー主導のプログラムは通常4〜6週間で開始。",
  "cobranded_proof":  "ブランドとコミュニティはあなた。インフラと指導は私たち。",
  "live_proof":       "5週間のZoomライブコホートと、The Vaultへの永続アクセス。"
},
// FOR MIZUHO REVIEW: cta block placeholders
"cta": {
  "lead":       "あなたの組織にAIトレーニングを届けませんか？",
  "button":     "パートナーシップについて相談する",
  "case_study": "Vertice Societyの事例を読む"
}
```

Comments cannot live inside `.json` — flag review status in a code comment in `what-you-get.tsx` (above the proof-point JSX) and via the commit message body. Ryan + Mizuho confirm before deploy.

## Acceptance criteria

- Each card icon container is ~56px (`h-14 w-14`), rounded-xl, with subtle shadow and per-card accent (seafoam / coral / mixed gradient / verdigris)
- Each card has an italic proof-point line under body copy, separated by `mt-4`, with a 2px seafoam left bar
- CTA block: lead-in text + primary teal pill button + optional secondary case-study link, centered, `mt-16` from the grid
- Primary button anchors to `#apply` (existing application form); secondary link routes to `/{locale}/partners/vertice-society`
- `messages/en.json` + `messages/ja.json` both updated; JP strings flagged in component comment for Mizuho review
- Mobile: cards stack to one column (already), CTA stays centered, proof-points wrap cleanly
- Dark mode and light mode both render correctly (CSS vars handle this)
- No regressions in sections above (`PartnershipsHero`) or below (`PartnershipsHowItWorks`, `PartnershipsApplicationForm`)

## Verification

1. `pnpm dev` → visit `/partnerships` and `/ja/partnerships`
2. Confirm 4 cards show distinct accent colors and the proof-point line under each body
3. Click "Schedule a partnership conversation →" → page should smooth-scroll to the application form (`#apply`)
4. Click "Or read the Vertice Society case study →" → should navigate to `/partners/vertice-society` (locale-aware)
5. Resize to ~375px width → cards stack, CTA centered, proof-points wrap without breaking layout
6. Toggle dark/light theme → verify all 4 accent colors and the proof-point bar render correctly in both themes
7. `pnpm tsc --noEmit` → no TypeScript errors
8. If `__tests__/marketing/partnerships/what-you-get.test.tsx` exists, run it; otherwise visual smoke test only

## Out of scope (Phase 2)

- Restructuring 2x2 grid into hero card + 3-card row layout
- Replacing icons with detailed mini-mockups (curriculum outline, revenue dashboard, etc.)
- Partner logo bar above the section
- Testimonial quotes from partners
- Modifying any other section on the Partnerships page
