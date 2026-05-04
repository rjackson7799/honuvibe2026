# Partnerships "What You Get" — Phase 2 Redesign

## Context

Phase 1 enhanced the existing 2x2 grid with per-card colored icon containers, italic proof-point lines (seafoam left bar), and a section CTA block. Phase 2 completes the redesign promised in scope:

1. Replace the flat colored icon containers with new **3D-rendered illustration assets**
2. Restructure the layout from **2x2 grid → hero card on top + 3-card row below**
3. Promote **A New Revenue Stream** to the hero card (the most differentiated value prop) with a coral "MOST DIFFERENTIATED" eyebrow tag

The intent is to draw the eye to the strongest revenue argument while keeping the other three benefits as supporting pillars — same pattern Linear, Vercel, and Notion use on pricing/marketing pages.

## Assets to add

Place the four 3D illustration PNGs in **`public/images/partnerships/`** (new directory):

- `partnership-curriculum.png` — stacked seafoam cards
- `partnership-revenue.png` — ascending coral discs (HERO)
- `partnership-cobrand.png` — interlocking seafoam + coral rings
- `partnership-ondemand.png` — layered seafoam panels

All are square, matte 3D renders on cream background. The user will drop these in before/during implementation.

## Files to modify

- [components/marketing/partnerships/what-you-get.tsx](components/marketing/partnerships/what-you-get.tsx) — restructure JSX, swap icon containers for `<Image>`, add hero-card variant
- [messages/en.json](messages/en.json) — add `partnerships.what_you_get.overline_most_differentiated`
- [messages/ja.json](messages/ja.json) — add JP placeholder, flag for Mizuho

No new design tokens needed — all required tokens exist in [styles/globals.css](styles/globals.css):
`--m-seafoam-pale`, `--m-seafoam-faint`, `--m-accent-coral-soft`, `--m-accent-coral`, `--m-border-teal`, `--m-shadow-sm`, `--m-shadow-xs`, `--m-radius-2xl`, `--m-ink-tertiary`.

## Component restructure

Current shape (lines 50–86 of `what-you-get.tsx`): single `CARDS` array of 4, mapped into a 2x2 grid using the `Card` primitive with internal `IconContainer`.

New shape:

```
<Section> <Container>
  <Overline>What You Get</Overline>
  <SectionHeading ... />

  {/* Hero card — A New Revenue Stream */}
  <HeroRevenueCard />     {/* full-width, seafoam-tinted bg, 2-col internal */}

  {/* 3-column secondary row */}
  <div className="mt-5 grid grid-cols-1 gap-5 md:grid-cols-3">
    {SECONDARY_CARDS.map(...)}    {/* curriculum, cobranded, live */}
  </div>

  <CtaBlock />            {/* preserved as-is from Phase 1 */}
</Container> </Section>
```

Split `CARDS` into:
- `HERO_CARD` (single object: `monetize` key)
- `SECONDARY_CARDS` (array of 3: `curriculum`, `cobranded`, `live`)

Drop the per-card `accent` config used by the icon containers — illustrations replace them entirely. Keep the `key` field so i18n lookups (`cards.${key}_title`, `_body`, `_proof`) still work.

## Hero card spec

**Container:**
- Full-width (spans `Container`'s max-width)
- `bg-[var(--m-seafoam-faint)]` — barely-perceptible cream-seafoam wash
- `border border-[var(--m-border-teal)]` — already at ~22% opacity, matches "~25%" target
- `rounded-[var(--m-radius-2xl)]` (20px, slightly larger than secondary cards' 16px to reinforce hierarchy)
- `shadow-[var(--m-shadow-sm)]` — slightly more lift than secondary `shadow-xs`
- Padding: `p-8 md:px-14 md:py-12` (~32px mobile / ~48v×56h desktop)

**Internal layout:**
- `grid grid-cols-1 md:grid-cols-[40%_1fr] gap-8 md:gap-12 items-center`
- Image left (~40%), content right on desktop; stacks on mobile

**Image (left column):**
- `<Image src="/images/partnerships/partnership-revenue.png" alt={t('cards.monetize_alt')} width={360} height={360} priority className="mx-auto md:mx-0 max-w-[280px] md:max-w-[360px] w-full h-auto" />`
- No surrounding container box — sits directly in the card
- `priority` flag (above the fold)

**Content (right column), vertical stack:**
1. **Eyebrow tag** — coral pill, small uppercase
   ```tsx
   <span className="inline-flex items-center rounded-full bg-[var(--m-accent-coral-soft)] px-3 py-1 text-[11px] font-semibold uppercase tracking-[0.14em] text-[var(--m-accent-coral)]">
     {t('overline_most_differentiated')}
   </span>
   ```
   `mb-4`
2. **Title** — `text-[20px] md:text-[22px] font-bold tracking-[-0.01em]` (Phase 1 base was 18px; +10–15% bump)
3. **Body** — same as secondary: `mt-3 text-[15px] leading-[1.72] text-[var(--m-ink-secondary)]`
4. **Proof point** — preserved exactly from Phase 1: `mt-4 border-l-2 border-[var(--m-accent-teal)] pl-3 text-[13px] italic leading-relaxed text-[var(--m-ink-tertiary)]`

## Secondary card spec (3 cards in row)

Each card uses the `Card` primitive (interactive) — same component already in use:
- `p-7 md:p-8` (slightly tighter than current `p-9` since the 3-col cards are narrower than the previous 2-col cards)
- White background and 16px radius come from `Card` defaults — no override needed

Vertical content stack:
1. **Image (left-aligned, top of card):**
   ```tsx
   <Image src={`/images/partnerships/partnership-${imgKey}.png`} alt={t(`cards.${key}_alt`)} width={88} height={88} className="h-22 w-22 object-contain" />
   ```
   - `~88px` square, no surrounding container
   - Left-aligned (matches existing card rhythm where Phase 1 icon container sat top-left)
   - `mb-6` before title
2. **Title** — unchanged: `text-[18px] font-bold tracking-[-0.01em]`
3. **Body** — unchanged: `mt-3 text-[15px] leading-[1.72]`
4. **Proof point** — unchanged Phase 1 styling

`imgKey` mapping: `curriculum → partnership-curriculum`, `cobranded → partnership-cobrand`, `live → partnership-ondemand`.

## Card order in secondary row

1. Custom Curriculum (`curriculum`)
2. Co-Branded Experience (`cobranded`)
3. Live + On-Demand (`live`)

## i18n additions

In [messages/en.json](messages/en.json), under `partnerships.what_you_get`:

```json
"overline_most_differentiated": "MOST DIFFERENTIATED",
"cards": {
  ...
  "curriculum_alt": "Stacked rounded cards illustration representing custom curriculum design",
  "monetize_alt": "Ascending coral discs illustration representing new revenue stream",
  "cobranded_alt": "Interlocking rings illustration representing co-branded partnership",
  "live_alt": "Layered panels illustration representing live and on-demand learning"
}
```

In [messages/ja.json](messages/ja.json), same keys with JP translations:
```json
"overline_most_differentiated": "最も差別化された価値"
```
Add a comment in the JSON adjacent commit / PR (JSON itself can't carry comments) flagging Mizuho review for the eyebrow phrase. Alt text JP: translate the four alt strings; mark with `// MIZUHO_REVIEW` in commit message.

## Removal checklist

- Remove `IconContainer` JSX block (the rounded square wrapper around `<Icon size={28} />`)
- Remove `accent` field from card config and the per-card `accentClasses`/`gradient` logic
- Remove the `lucide-react` icon imports (`FileText`, `TrendingUp`, `Handshake`, `PlayCircle`) if unused elsewhere in the file
- Remove the original 2x2 `grid` wrapper (`grid-cols-1 md:grid-cols-2`)

## Responsive behavior

| Breakpoint | Hero card | Secondary row |
|---|---|---|
| `<768px` | Stacked: image (max ~240px, centered) above content; padding `p-8` | Single column, gap-5 |
| `768–1023px` | Hero stays 1-col stacked (avoids cramped 2-col) | 3-col grid, gap-4 |
| `≥1024px` | 2-col internal: image left 40%, content right 60% | 3-col grid, gap-5 |

Hero card breakpoint: use `md:grid-cols-[40%_1fr]` (768px+) — judgment call: at 768–1023px the 2-col still works because hero card padding scales down. If it looks cramped during dev, bump to `lg:grid-cols-[40%_1fr]`.

## Preserved from Phase 1 (do not touch)

- Section `Overline` ("What You Get") and `SectionHeading` (two-line headline)
- All card body copy and titles
- All four proof-point lines (italic, seafoam left bar) and their i18n keys
- CTA block (lead text + teal pill button to `#apply` + secondary case-study link)
- `--m-accent-verdigris` tokens (orphaned by removing the icon container; leave them — they're used elsewhere or harmless)

## Verification

1. Run `pnpm dev` and visit `/partnerships`
2. Visual checks at 1440px, 1024px, 768px, 375px:
   - Hero card spans full container width with seafoam-tinted bg, coral eyebrow visible, title noticeably larger than secondary cards
   - 3-column row of secondary cards below, equal widths, white bg
   - All four illustrations render at correct size with no surrounding container box
   - Proof-point lines (italic + seafoam bar) appear on all four cards
   - Hero stacks (image-on-top) below `md` breakpoint
   - Secondary row collapses to 1-col below `md`
3. Visit `/ja/partnerships` — confirm JP eyebrow renders and JP alt text fires (inspect alt attribute in devtools)
4. Lighthouse / DevTools network tab: `partnership-revenue.png` is fetched with priority hint; other three are lazy-loaded
5. Confirm CTA block below the section is unchanged (button still scrolls to `#apply`, secondary link still routes to `/partners/vertice-society`)
6. Run `pnpm typecheck` and `pnpm lint` — zero new errors
7. Existing tests: `pnpm test` — Phase 1 didn't have tests for this section; if any partnerships test exists, confirm green
