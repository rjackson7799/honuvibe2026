# How HonuVibe Works — Typographic Redesign

## Context

The current "How HonuVibe Works" section on the homepage uses three illustrated cards (Compass / Wrench / ArrowRight icons in seafoam tiles, sitting in white card containers) for Learn / Apply / Move Forward. The treatment reads as generic SaaS, not editorial — out of step with the "Apple meets Aloha" direction.

We are replacing the three illustrated cards with a clean typographic row: large serif numerals (01 / 02 / 03) at reduced opacity as the dominant visual element, with a thin seafoam divider, the step label, and the existing body copy. No card containers, no icons, no background fills — the columns sit directly on the section's sand background.

The existing `How HonuVibe Works` overline (eyebrow) is preserved. No "Learn. Apply. Move Forward." headline will be added — it would simply repeat the three step labels rendered immediately below.

## File to modify

- [components/marketing/home/how-it-works.tsx](components/marketing/home/how-it-works.tsx) — full body of `HomeHowItWorks` is rewritten. No other files need to change. Translations already exist for all required strings; `messages/en.json` and `messages/ja.json` are not modified.

## Implementation

Rewrite [components/marketing/home/how-it-works.tsx](components/marketing/home/how-it-works.tsx) as follows:

```tsx
import { useTranslations } from 'next-intl';
import { Container, Overline, Section } from '@/components/marketing/primitives';

export function HomeHowItWorks() {
  const t = useTranslations('home.how_it_works');

  const steps = [1, 2, 3].map((n) => ({
    numeral: String(n).padStart(2, '0'),
    title: t(`card_${n}_title` as 'card_1_title'),
    body: t(`card_${n}_body` as 'card_1_body'),
  }));

  return (
    <Section variant="sand">
      <Container>
        <Overline tone="caption" className="mb-12 text-center">
          {t('overline')}
        </Overline>
        <div className="grid gap-16 md:grid-cols-3 md:gap-12 lg:gap-16">
          {steps.map(({ numeral, title, body }) => (
            <div key={numeral} className="flex flex-col">
              <p
                className="font-serif font-normal leading-none tracking-[-0.02em] text-[var(--m-accent-teal)] opacity-40"
                style={{ fontSize: 'clamp(64px, 9vw, 112px)' }}
              >
                {numeral}
              </p>
              <span
                aria-hidden="true"
                className="mt-6 block h-px w-10 bg-[var(--m-accent-teal)]"
              />
              <h3 className="mt-6 font-serif text-[32px] font-normal leading-tight tracking-[-0.015em] text-[var(--m-ink-primary)] md:text-[40px]">
                {title}
              </h3>
              <p className="mt-4 max-w-[34ch] text-[15.5px] leading-[1.7] text-[var(--m-ink-secondary)]">
                {body}
              </p>
            </div>
          ))}
        </div>
      </Container>
    </Section>
  );
}
```

### Notes on the choices

- **Drops `Card` and the lucide icons** (`Compass`, `Wrench`, `ArrowRight`) — neither is used elsewhere in this file. The new layout sits directly on the `Section variant="sand"` background.
- **Numeral font** uses `font-serif` (DM Serif Display, weight 400) — same family already used for the partnerships metrics numerals in [components/marketing/partnerships/metrics.tsx:28](components/marketing/partnerships/metrics.tsx#L28). Sized with `clamp(64px, 9vw, 112px)` so it scales fluidly from ~64px on mobile to ~112px on wide desktop, matching the spec's `text-7xl md:text-8xl` intent without locking to a single breakpoint.
- **Seafoam at 40% opacity** is applied via `text-[var(--m-accent-teal)] opacity-40`. The opacity utility is the cleanest way to keep the token reference; it's the same approach used in [components/marketing/home/testimonials.tsx:29](components/marketing/home/testimonials.tsx#L29) for the decorative serif quote mark.
- **Divider** is a 40px-wide, 1px-tall span of full-opacity seafoam (`bg-[var(--m-accent-teal)] h-px w-10`), `aria-hidden` since it's purely decorative.
- **Step label** uses `font-serif` (DM Serif Display) at 32px / 40px responsive — matches the editorial direction. Keeps the existing `--m-ink-primary` ink color used by the previous `<h3>`.
- **Body copy** preserves the prior styles exactly: `text-[15.5px] leading-[1.7] text-[var(--m-ink-secondary)]`. A `max-w-[34ch]` cap keeps each block to ~3 lines at desktop width per the spec.
- **Grid spacing**: `gap-16` mobile (vertical stack, generous breathing room between numerals), `md:gap-12 lg:gap-16` between columns on desktop.
- **No headline added** between the eyebrow and the row. Adding "Learn. Apply. Move Forward." would duplicate the step labels rendered immediately below; keeping just the eyebrow is more in line with the editorial restraint goal.
- **i18n / RTL safety**: layout is left-aligned (flush-left numeral, divider, label, body) by default flex behavior — no `text-left` needed since the parent `Container` doesn't impose a center. Japanese strings flow into the same slots; the numerals stay as Arabic numerals per the spec.

## What is removed

- `Card`, `Compass`, `Wrench`, `ArrowRight` imports
- The `cardIcons` constant
- The icon tile (`mb-6 flex h-12 w-12 items-center justify-center rounded-[12px] bg-[var(--m-accent-teal-soft)] ...`)
- The card container wrapping each step
- The `interactive` hover state on the cards

## What is preserved

- `<Section variant="sand">` and the `<Container>` wrapper (existing section padding and width are unchanged)
- The `Overline` eyebrow ("How HonuVibe Works" / "HonuVibeの仕組み"), including its `mb-12 text-center` placement
- The translation keys: `home.how_it_works.overline`, `card_{1,2,3}_title`, `card_{1,2,3}_body` — no changes to `messages/en.json` or `messages/ja.json`
- Full bilingual EN/JP support — Japanese step labels ("学ぶ" / "実践する" / "前へ進む") and body copy render in the new layout unchanged

## Verification

1. **Build & type-check** — `npm run build` (or `npm run typecheck` if defined) — confirms no unused imports, no type regressions.
2. **Visual check (EN)** — `npm run dev`, open `http://localhost:3000`, scroll to the section.
   - Eyebrow "How HonuVibe Works" centered above the row.
   - Three columns left-aligned with large faded seafoam numerals 01 / 02 / 03.
   - Thin seafoam divider under each numeral.
   - Serif step labels Learn / Apply / Move Forward.
   - Body copy below each label.
   - No card backgrounds, borders, shadows, or icons anywhere in the section.
3. **Visual check (JP)** — open `http://localhost:3000/ja`, confirm the JP eyebrow ("HonuVibeの仕組み") and step labels ("学ぶ" / "実践する" / "前へ進む") render in the same layout, with numerals unchanged.
4. **Responsive** — resize the browser narrower than the `md` breakpoint (768px). Columns should stack to a single column, numerals scale down (~64px floor), spacing between stacked items remains generous (`gap-16`).
5. **Theme/contrast** — section uses the `sand` variant; confirm the 40%-opacity seafoam numerals are still legible against the cream background and that the ink-primary step labels remain WCAG AA compliant.
6. **Reduced motion** — no animations are added; section continues to respect `prefers-reduced-motion` via existing global rules.

## Out of scope

- The "Practical / Bilingual by design / The Vault" three-column row (a separate section)
- Featured Courses, Explore Our Work, hero, or any other homepage section
- Site-wide typography or color tokens
- The shared `NumberedStep` primitive at [components/marketing/primitives/numbered-step.tsx](components/marketing/primitives/numbered-step.tsx) — its existing colored-circle treatment is intentionally different and is used by other sections; we inline the new editorial markup in `how-it-works.tsx` rather than extending it.
