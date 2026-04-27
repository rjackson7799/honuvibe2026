# DESIGN.md — HonuVibe.AI Marketing Design System

Canonical reference for the **public marketing surface** of HonuVibe.AI.
Visual prototypes live in [docs/designs/](./designs/) (Homepage, Learn, Explore, Partnerships, About, Contact).

This document covers ONLY the marketing pages — Home, Learn (catalog), Explore, Partnerships, About, Contact, and the public legal/blog/glossary pages.
The auth-gated app surface (course player, dashboard, vault, instructor portal, partner portal, admin) keeps its existing dark-themed design and is governed by the tokens in [styles/globals.css](../styles/globals.css) under `:root` / `[data-theme="light"]`.

---

## Principles

1. **Light marketing, dark app.** The marketing surface is sales-driven, calm, and high-trust — light cream canvas, navy ink, restrained color. The app surface is dark, dense, and tool-like. The two coexist; neither tries to be the other.
2. **Hawaii-grounded.** Teal as primary, coral as warm secondary, sand as breathing-room neutral. No fluorescent gradients or AI-clichéd "futuristic" visuals.
3. **Editorial restraint.** One idea per section. Generous whitespace (96px section padding). One headline per section, one CTA per section unless the section explicitly compares paths.
4. **Sales-driven, not playful.** The marketing site exists to convert visitors into students or partners. Every section earns its place toward that goal.
5. **Bilingual by design.** All copy ships in EN and JP from day one. Layout never assumes English line-length.

---

## Tokens

All marketing tokens are defined in [styles/globals.css](../styles/globals.css) under the `[data-shell="marketing"]` selector and prefixed `--m-*` so they don't collide with the app's existing dark-mode tokens. Tailwind utility access via `--color-m-*` aliases inside `@theme inline`.

### Color

| Token | Hex | Use |
|---|---|---|
| `--m-canvas` | `#FDFBF7` | Default page background |
| `--m-sand` | `#F5F0E8` | Alternating section background, subtle card surface |
| `--m-white` | `#FFFFFF` | Card surfaces, form fields |
| `--m-ink-primary` | `#1A2B33` | Headings, primary text, footer background |
| `--m-ink-secondary` | `#5A6B73` | Body text, link rest state |
| `--m-ink-tertiary` | `#8B9499` | Captions, meta labels, placeholder text |
| `--m-accent-teal` | `#0FA9A0` | Primary brand, primary buttons, links |
| `--m-accent-teal-dark` | `#0B7F78` | Primary button hover |
| `--m-accent-teal-soft` | `rgba(15,169,160,0.08)` | Active state tint, subtle CTA backgrounds |
| `--m-accent-coral` | `#E8765A` | Partnerships accent, "By Application" tag, secondary CTAs |
| `--m-accent-coral-dark` | `#CC5A3E` | Coral button hover |
| `--m-accent-coral-soft` | `#FCEDE6` | Course/info badge background, subtle warmth |

### Borders

`--m-border-soft` (0.07), `--m-border-default` (0.12), `--m-border-strong` (0.15), `--m-border-teal` (0.22 teal), `--m-border-coral` (0.22 coral). Always against ink-primary at the named alpha.

### Shadows

`--m-shadow-xs / sm / md / lg / xl` — neutral lift. `--m-shadow-teal-sm / md` — for CTAs in teal. `--m-shadow-coral-sm / md` — for CTAs in coral.

### Radius

`--m-radius-sm 8` / `md 10` / `lg 14` / `xl 16` / `2xl 20`. Buttons use 10. Cards default to 16. Hero callouts and "spotlight" cards use 20.

### Container & spacing

| Token | Value |
|---|---|
| `--m-container` | 1200px max-width |
| `--m-section` | 96px (desktop section padding) |
| `--m-section-mobile` | 64px |
| `--m-hero` | 88px (hero top padding) |
| `--m-nav-h` | 68px |

### Color usage rule

**Teal vs. coral, never both at full strength in the same section.**
- Teal carries the brand: navigation active state, default buttons, primary CTAs, "in progress" / "in session" / "completed" status.
- Coral carries warmth: "For Organizations" eyebrow, Partnerships nav active, Builder Track ribbon, "Apply" actions, by-application badges.
- A section may contain a coral overline + teal CTA, or a teal overline + coral CTA, but **not** both as primary CTAs.

---

## Typography

- **Sans (display + body):** Inter, weights 400 / 500 / 600 / 700 — loaded via `next/font/google` in [app/fonts.ts](../app/fonts.ts) as `--font-inter`.
- **JP body:** Noto Sans JP, weights 400 / 500 / 700 — same font stack as EN, browser falls through automatically for JP characters.
- All marketing pages are inside `[data-shell="marketing"]` so `font-family: var(--font-inter), 'Noto Sans JP', system-ui, sans-serif` is automatic.

### Type scale

| Token | clamp | Use |
|---|---|---|
| `--m-text-display-xl` | `clamp(52px, 6vw, 80px)` | About hero only |
| `--m-text-display` | `clamp(40px, 5.5vw, 66px)` | Home hero |
| `--m-text-h1` | `clamp(40px, 5vw, 62px)` | Other page heroes (Learn, Explore, Contact, Partnerships) |
| `--m-text-h2` | `clamp(28px, 3.5vw, 42px)` | Section headings |
| `--m-text-h3` | `clamp(22px, 2.5vw, 30px)` | Sub-section headings, card titles |

- Heading weight: **always 700**. Headlines use letter-spacing `-0.02em` to `-0.035em` (tighter the larger).
- Body: 16px / 18px (hero subhead) at line-height 1.65–1.78. Body color: `--m-ink-secondary`.
- Caption / meta: 11px–13.5px at `--m-ink-tertiary`.
- **Overline:** 11.5px / weight 700 / `tracking-[0.09em]` / uppercase. Three tones: caption (default), teal, coral.

### JP rules

- JP body line-height 1.7–1.8 (vs 1.65 for EN).
- Letter-spacing 0.02–0.04em for JP body.
- Never `text-justify` on JP text.
- `word-break: break-all` acceptable for JP body in narrow columns.

---

## Spacing

Default section padding: **96px desktop / 64px mobile**.
Hero top padding: **88px**.
Container horizontal gutter: **20px mobile / 32px desktop**.
Standard rhythm scale: 4 / 8 / 12 / 16 / 20 / 24 / 32 / 48 / 64 / 96.
Container max-width: **1200px**.

---

## Primitives

Located under [components/marketing/primitives/](../components/marketing/primitives/). Always import via the barrel: `import { Button, Card, Section } from '@/components/marketing/primitives'`.

### `<Container>`
Max-width 1200, gutter padding. Wrap all section content.

### `<Section variant="..." spacing="...">`
- `variant`: `canvas` (default cream), `sand`, `navy` (footer-style spotlight), `gradient` (newsletter band).
- `spacing`: `default` (96/64), `hero` (88 top, 64 bottom), `tight`, `flush`.

### `<Overline tone="...">`
Eyebrow text. Tones: `caption` (default), `teal`, `coral`.

### `<DisplayHeading size="default | xl">`
Hero `<h1>`. `xl` for the About editorial hero.

### `<SectionHeading size="h2 | h3">`
Section `<h2>` / sub-section `<h3>`. Default `h2`.

### `<Button variant="..." size="..." href? withArrow?>`
- Variants: `primary-teal` (default), `outline-teal`, `primary-coral`, `outline-coral`, `ghost`.
- Sizes: `sm`, `md` (default), `lg`.
- `href` makes it render as an `<a>`. `withArrow` appends an `ArrowRight` lucide icon.

### `<Card variant="..." interactive? radius="...">`
- Variants: `default` (white), `sand`, `navy` (highlighted pricing tier).
- `interactive` adds the standard hover lift + tinted border + shadow upgrade.
- `radius`: `lg` (14) / `xl` (16, default) / `2xl` (20).

### `<Badge tone="...">`
- `info` (coral-soft + teal text — the metadata/level badge on course cards)
- `status` (solid teal — "IN SESSION", "COMPLETED")
- `active` (tinted teal — current state)
- `by-application` (solid navy — exclusive)
- `coming-soon` (solid coral — upcoming partner)

### `<BrowserFrame url="..." secure?>`
macOS chrome window. Used for product mockups (Vault, Kwame, HCI Medical) on Home, Learn, Explore.

### `<PhotoPlaceholder variant="gradient | dashed">`
Sand-gradient image placeholder with a centered icon + label. Use until real photos arrive.

### `<NumberedStep index={...} title body layout="horizontal | inline">`
- `horizontal`: number on top, content below — for Partnerships 4-step process row.
- `inline`: number left, content right — for Explore 3-step process column.

---

## Section grammar

Every section follows this composition:

```
[Overline]            ← optional eyebrow (caption / teal / coral)
[SectionHeading]      ← single h2
[Sub-copy paragraph]  ← optional, 15-18px ink-secondary, max-width ~540
[Content]             ← cards, table, mockup, form, etc.
[Optional CTA]        ← single primary, occasionally with secondary outline
```

Backgrounds **alternate** canvas ↔ sand. Never two same-color sections adjacent.
Newsletter is always the last section before the footer; it uses the gradient variant and a navy footer follows.

---

## Buttons & links

- Primary CTA: `primary-teal` button, 14px 28px, radius 10, weight 700.
- Secondary CTA: `outline-teal` or `outline-coral`, same dimensions.
- Hover: translateY(-1px) + shadow upgrade for filled buttons; soft tint background for outline.
- Inline links: teal underline (1px on rest, can omit on hover) — never plain blue.
- Focus ring: 2px teal with 2px offset against canvas. Apply via `focus-visible:ring-2 focus-visible:ring-[var(--m-accent-teal)] focus-visible:ring-offset-2 focus-visible:ring-offset-[var(--m-canvas)]`.
- Disabled: 60% opacity + `cursor-not-allowed`.

---

## Forms

- Inputs: white background, `1.5px` border at `--m-border-strong`, radius 9–10, padding `13px 16px`, font 15px.
- Focus: border swaps to `--m-accent-teal` plus a 2px tinted ring.
- Helper text / error: 13–14px at `--m-ink-tertiary` (helper) or `--m-accent-coral` (error).
- Labels: 12.5px / weight 600 / `tracking-[0.02em]` / above input with 7px gap.
- Min input font size: 16px on mobile (prevents iOS zoom).
- Selects use a custom inline-SVG chevron (matches the stroke color of `--m-ink-secondary`).

---

## Icons

- Library: `lucide-react`. Sizes 14 / 16 / 20 / 24 with stroke 1.5 (default) or 2 (primary CTAs).
- Brand mark: [`<HonuIcon />`](../components/marketing/icons/honu.tsx) — the anatomical turtle from the prototypes. Color via parent `text-*`.
- Inline arrows: `ArrowRight` from lucide. Apply through `<Button withArrow />` or directly.

---

## Imagery

- Hero / featured photos: 4:3 or 5:4 ratios, organic gradients OK as fallback (`PhotoPlaceholder gradient`).
- Project mockups: render inside `<BrowserFrame>` at content height 380. Mockup body is whatever component captures the project's UI (Kwame, HCI Medical, Vault).
- Real photos when available go in `public/images/marketing/{home,about,explore,partnerships}/...`.

---

## Motion

- Transitions only — fades, color shifts, translateY hover lifts. No parallax, no continuous loops on marketing.
- Duration: 200ms (interactive states) / 250ms (cards) / 300ms (nav scroll-state).
- Easing: matches existing `--ease-out` (cubic-bezier(0.23, 1, 0.32, 1)).
- Section reveal-on-scroll: optional fade-up via IntersectionObserver, threshold 0.08. **Respect `prefers-reduced-motion: reduce` — disable all animations.**

---

## Accessibility

- WCAG 2.1 AA contrast verified for all text/background pairs:
  - `--m-ink-primary` on `--m-canvas` → ≥ 12:1
  - `--m-ink-secondary` on `--m-canvas` → ≥ 4.6:1
  - White on `--m-accent-teal` → ≥ 3.1:1 (for ≥ 18px text or ≥ 14px bold)
  - White on `--m-accent-coral` → ≥ 3.0:1 (for large/bold text only)
- Focus states (see Buttons & links).
- Touch targets ≥ 44×44px.
- All form fields labeled (visible label, not just placeholder).
- All images have `alt`. Decorative images use `alt=""` and `aria-hidden`.

---

## Anti-patterns (do not use on marketing)

- Glass-morphism / `backdrop-blur` on cards.
- Neon glow lines or particle effects (those live in the dark app shell).
- Gradient text on headlines.
- Gold accents (those are app-only — `--accent-gold`).
- Multiple competing CTAs in a single section.
- Theme toggles or any UI suggesting dark mode is available on marketing routes.
- DM Serif Display headings (only Inter on marketing).
- Auto-playing video or audio.

---

## Locale notes

- Logged-out marketing nav top-right: `[JP/EN button] [Sign In pill]`.
- Logged-in marketing nav top-right: `[JP/EN button] [Avatar dropdown]`. Dropdown items: name/email summary → Dashboard → Admin (if admin) → Sign Out.
- Footer always carries an EN/日本語 button (mirrors locale in URL — handled by next-intl).
- `<MarketingMobileMenu>` shows the language toggle and user menu in a footer row inside the drawer.

---

## Where to put new pages

`app/[locale]/<route>/page.tsx`:

```tsx
import { MarketingShell } from '@/components/marketing/shell';
import { MarketingNav } from '@/components/marketing/nav/marketing-nav';
import { MarketingFooter } from '@/components/marketing/footer/marketing-footer';
import { MarketingNewsletter } from '@/components/marketing/newsletter/marketing-newsletter';
// ...page sections

export default async function ExamplePage() {
  return (
    <MarketingShell>
      <MarketingNav />
      <main>
        {/* sections */}
      </main>
      <MarketingNewsletter />
      <MarketingFooter />
    </MarketingShell>
  );
}
```

The locale layout's existing `<Nav />` and `<ConditionalFooter />` automatically yield (return null) on routes detected by [`isMarketingPath`](../lib/marketing-routes.ts). Add new routes there to opt them into the marketing shell.
