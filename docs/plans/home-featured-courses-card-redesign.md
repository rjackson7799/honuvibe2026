# Home — Featured Courses Card Redesign

## Context

The Featured Courses section on the home page currently uses a text-only card: three coral pills, a sans-serif bold title, body copy, and a small inline "Enroll Now →" link. The new design (provided as a reference mockup of the AI Essentials card) introduces:

1. A **full-width image header** at the top of each card.
2. **Three meta pills with icons** — level (teal-tinted, sprout-style level icon), duration (calendar), language (globe).
3. A **DM Serif Display** title (matching the site's headline typography rule in CLAUDE.md).
4. A **prominent dark-teal full-width CTA button** replacing the small inline link.

The goal is more visual weight per card to better convert home-page visitors into course enrollees, and to align the Featured Courses cards with the existing image-led project cards in `HomeExploration` for visual consistency.

The user will supply the three header images separately. This plan scaffolds image paths and uses a sand-colored placeholder while images are pending so the layout works the moment a JPG is dropped in.

## Files to modify

- `components/marketing/home/featured-courses.tsx` — rewrite card markup (only file with substantive change).

## Files to read for reference (do not modify unless noted)

- `components/marketing/home/exploration.tsx` — image header pattern (`relative h-40 overflow-hidden` + `Image fill object-cover`) to mirror.
- `components/marketing/primitives/card.tsx` — keep `Card interactive` wrapper, switch to `p-0` and put padding on inner content div.
- `components/ui/button.tsx` — reuse `Button variant="primary" size="lg" fullWidth`. Verify `primary` variant matches the dark teal in the reference; if it's the bright accent teal, fall back to a custom-styled link button using `bg-[var(--m-ink-primary)]` (deep navy/teal) — decide while implementing.
- `components/ui/badge-pill.tsx` — `BadgePill` exists with `teal` and `gray` variants and supports an `inline-flex items-center gap-1` baseline that fits an icon + text. Reuse it.
- `__tests__/marketing/home/home-sections.test.tsx` (lines 131–142) — update the Featured Courses test (see Verification).
- `messages/en.json` and `messages/ja.json` — no key changes; existing keys cover all copy.

## New assets (user supplies images)

Add these three images to the repo. Until the images exist, the card renders a `bg-[var(--m-sand)]` placeholder div in place of the `<Image>`:

- `public/courses/ai-essentials/Card_AIEssentials.jpg`
- `public/courses/ai-mastery/Card_AIMastery.jpg`
- `public/courses/builder-track/Card_BuilderTrack.jpg`

Recommended dimensions: 1600×1000 (16:10) source, served at ~640px wide on a 3-column desktop grid. JPEG, < 200 KB each (per `CLAUDE.md` perf budget).

## Implementation

### 1. Course config

At the top of `featured-courses.tsx`, replace the inline `[1, 2, 3].map(...)` with a typed config array carrying icon + image metadata:

```ts
import { Sprout, BrainCircuit, Rocket, Calendar, Globe, ArrowRight } from 'lucide-react';

const courseConfig = [
  {
    n: 1 as const,
    slug: 'ai-essentials',
    levelIcon: Sprout,
    image: { src: '/courses/ai-essentials/Card_AIEssentials.jpg', alt: 'AI Essentials course header' },
    track: false,
  },
  {
    n: 2 as const,
    slug: 'ai-mastery',
    levelIcon: BrainCircuit,
    image: { src: '/courses/ai-mastery/Card_AIMastery.jpg', alt: 'AI Mastery course header' },
    track: false,
  },
  {
    n: 3 as const,
    slug: 'builder-track',
    levelIcon: Rocket,
    image: { src: '/courses/builder-track/Card_BuilderTrack.jpg', alt: 'Builder Track course header' },
    track: true,
  },
] as const;
```

The translation reads (`title`, `level`, `duration`, `lang`, `body`, `cta`) stay identical to today — merge them into each config entry inside the render loop.

### 2. Card markup

Each card becomes:

```tsx
<Card interactive className="relative flex flex-col overflow-hidden p-0">
  {/* Image header with optional TRACK ribbon */}
  <div className="relative aspect-[16/10] overflow-hidden bg-[var(--m-sand)]">
    <Image
      src={course.image.src}
      alt={course.image.alt}
      fill
      sizes="(min-width: 768px) 33vw, 100vw"
      className="object-cover"
    />
    {course.track && (
      <span className="absolute right-3 top-3 rounded-full bg-[var(--m-accent-coral)] px-3 py-1 text-[10.5px] font-bold tracking-[0.05em] text-white shadow-sm">
        {t('track_ribbon')}
      </span>
    )}
  </div>

  {/* Body */}
  <div className="flex flex-1 flex-col p-6">
    <div className="mb-5 flex flex-wrap gap-2">
      <BadgePill variant="teal" size="sm">
        <course.levelIcon size={13} strokeWidth={2} aria-hidden />
        {course.level}
      </BadgePill>
      <BadgePill variant="gray" size="sm">
        <Calendar size={13} strokeWidth={2} aria-hidden />
        {course.duration}
      </BadgePill>
      <BadgePill variant="gray" size="sm">
        <Globe size={13} strokeWidth={2} aria-hidden />
        {course.lang}
      </BadgePill>
    </div>

    <h3 className="mb-3 font-serif text-[28px] font-normal leading-[1.15] tracking-[-0.01em] text-[var(--m-ink-primary)]">
      {course.title}
    </h3>

    <p className="mb-6 flex-1 text-[14.5px] leading-[1.65] text-[var(--m-ink-secondary)]">
      {course.body}
    </p>

    <Link
      href="/learn"
      className="inline-flex w-full items-center justify-center gap-2 rounded-xl bg-[var(--m-ink-primary)] px-5 py-3.5 text-[15px] font-semibold text-white transition-opacity hover:opacity-90 focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-[var(--m-accent-teal)]"
    >
      {course.cta}
      <ArrowRight size={16} strokeWidth={2} />
    </Link>
  </div>
</Card>
```

Notes:
- `font-serif` resolves to DM Serif Display via the existing Tailwind config — confirm by grepping `tailwind.config` for `serif:` while implementing; if not registered, fall back to `style={{ fontFamily: 'var(--font-display)' }}` (the same approach `SectionHeading` uses).
- Title moves from `font-bold` 22px sans → `font-normal` 28px serif to match the reference and CLAUDE.md's "Headlines: DM Serif Display, weight 400 only — never bold" rule.
- The CTA uses `--m-ink-primary` (deep navy/teal) which matches the reference's dark button color closely. If during implementation it reads more navy than teal compared to the mockup, swap to a custom dark-teal token; do NOT use `--m-accent-teal` (that's the bright link teal).
- The `Button` UI primitive could replace the inline link, but its `primary` variant is the bright accent teal — using a styled `<Link>` is cleaner here than overriding Button's variant styles.
- Image uses `aspect-[16/10]` instead of fixed `h-40` for better proportion at all card widths.

### 3. Top-of-section header

No changes — keep the existing `SectionHeading` + "See all courses" right-aligned link.

## Verification

1. **Visual** — `npm run dev`, open `http://localhost:3000`, scroll to Featured Courses. Confirm:
   - All three cards render image headers (sand-colored placeholder is fine until images land).
   - Pills show correct icons: Sprout/BrainCircuit/Rocket on level, Calendar on duration, Globe on language. Level pill is teal-tinted; the other two are gray.
   - Titles use DM Serif Display at ~28px.
   - CTA button is full-width, dark, with white text and an arrow.
   - TRACK ribbon floats top-right on the Builder Track card image only.
   - Hover lifts the card (existing `Card interactive` behavior).
2. **JP locale** — visit `/ja`, confirm titles/pills/CTAs switch to Japanese without layout breakage. Watch for line-height on serif title with JP characters; if titles overflow on narrow screens, drop title size to `clamp(22px, 4vw, 28px)`.
3. **Tests** — update `__tests__/marketing/home/home-sections.test.tsx` Featured Courses test:
   - Keep heading-name assertions and TRACK assertion.
   - Add `expect(screen.getAllByAltText(/course header/i)).toHaveLength(3)` once images are present (before images land, the alt is still on the `<Image>` even if the file 404s).
   - Run `npm test -- home-sections`.
4. **Lint/typecheck** — `npm run lint` and `npx tsc --noEmit`.
5. **Lighthouse spot-check** — once real images land, verify the home-page LCP stays under 2.5 s and total page weight under 800 KB initial (CLAUDE.md perf budget). Use `<Image priority>` only on whichever image becomes the LCP element (likely none here — the section is below the fold).

## Out of scope

- Wiring the home cards to Supabase course rows — keep the static translation-driven data model.
- Per-card detail page routing (`/learn/<slug>`) — confirmed staying on `/learn`.
- Changes to the catalog `CourseCard` (`components/learn/CourseCard.tsx`) — that component is for the authenticated catalog and has its own design.
- Generating the three header images — user is producing those separately.
