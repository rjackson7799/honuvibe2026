# Partnerships Page — Focused Visual Upgrade (Phase 1)

## Context

The current [/partnerships page](app/[locale]/partnerships/page.tsx) is solid structurally but visually under-leveraged: text-heavy hero, no case-study imagery, no social-proof rhythm, and no visual differentiator on the recommended pricing tier. We've evaluated `docs/plans/HonuVibe_VisualAssetSpec_Partnerships.md` and decided to ship a **focused subset** that delivers ~70% of the conversion impact for ~30% of the spec's surface area. Form-backdrop, photo-strip break, full logo wall, and most custom SVG work are deferred until a HonuHub photo session and additional partner permissions are secured.

**Scope of this plan:**
1. Hero gets a right-side screenshot composite
2. Vertice case study expanded with logo + session photo + attributed testimonial
3. Social-proof metrics strip between sections
4. "Most Popular" badge on the middle pricing tier

Everything else from the spec is explicitly out of scope for this phase.

---

## Asset Prerequisites (procure before / during dev)

Code can be scaffolded with `PhotoPlaceholder` / `BrowserFrame` primitives, but the page should not go to production with placeholders visible. These need to land before we ship to prod:

- **Hero composite (3 screenshots)** — captured by Ryan, no external dependency:
  - `hero-lms-dashboard.png` — screenshot of `learn.honuvibe.ai` student dashboard or course detail
  - `hero-gamma-slide.png` — screenshot of a bilingual slide from an existing AI Essentials/Mastery deck
  - `hero-session.png` — screenshot of a Zoom session (Japanese participants visible, faces obscured/consented)
- **Vertice case study** — Vertice has given written permission already:
  - `vertice-logo.png` — transparent PNG, ~120px display width
  - `vertice-session.jpg` — real photo from a Vertice × HonuVibe session
  - `vertice-testimonial-avatar.jpg` — headshot of the participant being quoted (square, 96×96px display)
- **Pricing badge** — no external assets required
- **Metrics strip** — published numbers (estimates OK per Ryan); copywriting needed:
  - Participants trained, bilingual hours delivered, courses launched, % bilingual delivery (or substitute equivalents)

All assets live under `public/images/partnerships/`. Logos under `public/images/logos/`.

---

## Files To Modify

| File | Change |
|---|---|
| [components/marketing/partnerships/hero.tsx](components/marketing/partnerships/hero.tsx) | Convert to 2-column grid; add right-side composite; mobile single-column fallback |
| [components/marketing/partnerships/current-partners.tsx](components/marketing/partnerships/current-partners.tsx) | Add logo header to Vertice card; add photo/slide column; replace text-only quote with avatar + name + title block |
| [components/marketing/partnerships/pricing.tsx](components/marketing/partnerships/pricing.tsx) | Add "Most Popular" pill badge overlapping the top of the middle (`full`) tier card |
| [app/[locale]/partnerships/page.tsx](app/[locale]/partnerships/page.tsx) | Insert new `<PartnershipsMetrics />` between `PartnershipsCurrentPartners` and `PartnershipsWhoIsItFor` |
| [components/marketing/partnerships/index.ts](components/marketing/partnerships/index.ts) | Export new `PartnershipsMetrics` component |
| `components/marketing/partnerships/metrics.tsx` (new) | New component — 4-stat strip in DM Serif Display |
| [messages/en.json](messages/en.json) | New keys under `partnerships`: `metrics.*`, `pricing.popular_badge`, `hero.composite_alt`, `current_partners.vertice_*` additions |
| [messages/ja.json](messages/ja.json) | Mirror EN keys with Japanese copy |
| `public/images/partnerships/` (new dir) | Hero + Vertice asset files |
| `public/images/logos/` (new dir) | `vertice-society.png` |

---

## Reused Primitives (no new infra)

- [`Section`, `Container`, `Overline`, `SectionHeading`, `Card`, `Badge`](components/marketing/primitives/) — already power every other partnerships section
- `BrowserFrame` for LMS screenshot in hero composite (provides browser chrome consistency)
- `PhotoPlaceholder` as dev-time stand-in for any asset not yet captured
- `next/image` with explicit dimensions for all new images per CLAUDE.md performance budgets
- Existing `@keyframes float` in [styles/globals.css](styles/globals.css) for the hero composite top card

---

## Implementation Steps

### Step 1 — i18n strings
Add new keys to both `messages/en.json` and `messages/ja.json` under the `partnerships` namespace:
- `partnerships.hero.composite_alt` — descriptive alt text covering all three screenshots
- `partnerships.pricing.popular_badge` — "Most Popular" / "おすすめ"
- `partnerships.metrics.overline` / `headline` (optional) / `participants_label` / `hours_label` / `courses_label` / `bilingual_label`
- `partnerships.metrics.participants_value` / `hours_value` / `courses_value` / `bilingual_value` (estimates, easy to update later)
- `partnerships.current_partners.vertice_quote_attribution_role` (new — participant role/title)
- `partnerships.current_partners.vertice_logo_alt`

### Step 2 — Hero composite ([hero.tsx](components/marketing/partnerships/hero.tsx))
- Wrap existing content in a `grid grid-cols-1 lg:grid-cols-[minmax(0,1fr)_minmax(0,520px)] gap-12 items-center` layout.
- Drop max-width constraint on the text column (let grid handle width).
- Right column renders a stacked composite using absolute positioning:
  - Bottom card: Gamma slide (`<Image>`, `rounded-xl`, `shadow-lg`, rotated `-3deg`).
  - Middle card: Zoom session screenshot (`rounded-xl`, `shadow-lg`, rotated `2deg`, offset right).
  - Top card: LMS dashboard wrapped in `BrowserFrame` (`rounded-xl`, `shadow-xl`, rotated `-1deg`, slight forward offset, applies the existing `animate-float` class from globals.css).
- Mobile (< lg): hide the rotation transforms, stack composite below the text at reduced scale (`max-w-[420px] mx-auto`).
- Respect `prefers-reduced-motion` — disable float animation when set.
- Accessibility: single descriptive `alt` on the LMS shot, `role="presentation"` on the decorative bottom/middle cards.

### Step 3 — Vertice case study expansion ([current-partners.tsx](components/marketing/partnerships/current-partners.tsx))
- Restructure the Vertice `<article>` from single column to 2 columns on `md+` (`md:grid md:grid-cols-[1fr_240px]`):
  - Left column: existing text content (program, audience, details, quote).
  - Right column: `vertice-session.jpg` photo, `aspect-[4/5] rounded-xl object-cover` for natural session feel.
- Add Vertice logo above the program title (`<Image>` ~120px wide, transparent PNG).
- Replace the quote attribution text with a small flex row:
  - Avatar: `vertice-testimonial-avatar.jpg`, 36×36 `rounded-full object-cover`.
  - Name + role/title in two stacked lines (`vertice_attribution` + new `vertice_attribution_role`).
- Keep existing teal top accent stripe.
- The "More partnerships launching soon" sibling card stays unchanged in this phase (logo wall deferred).

### Step 4 — Metrics strip (new `components/marketing/partnerships/metrics.tsx`)
- New `PartnershipsMetrics` component, `Section variant="canvas"` with reduced spacing (`spacing="flush"`), full-width.
- 4-column grid on desktop, 2×2 on mobile:
  - Each cell: large number in DM Serif Display 400, fluid `clamp(40px, 6vw, 64px)`, color `--m-accent-teal`.
  - Label below in DM Sans 500, 13px, uppercase, letter-spacing `0.08em`, color `--m-ink-tertiary`.
- Dividers: subtle vertical lines between cells on desktop (`border-l rgba(26,43,51,0.07)`), removed on mobile.
- No interactive elements; purely informational.
- Apply `.reveal` class for scroll-in animation if it's already in use elsewhere.
- Export from [components/marketing/partnerships/index.ts](components/marketing/partnerships/index.ts).
- Insert in [page.tsx](app/[locale]/partnerships/page.tsx) between `PartnershipsCurrentPartners` and `PartnershipsWhoIsItFor`.

### Step 5 — "Most Popular" badge ([pricing.tsx](components/marketing/partnerships/pricing.tsx))
- Inside the `PricingCard` component, when `isHighlight === true`, render a `<span>` absolutely positioned at `top-0 left-1/2 -translate-x-1/2 -translate-y-1/2`:
  - Pill style: `rounded-full bg-[var(--m-accent-coral)] text-white text-[11px] font-bold uppercase tracking-[0.1em] px-4 py-1.5 shadow-md`.
  - Text from `t('popular_badge')`.
- Ensure parent card has `overflow-visible` (the existing `relative` is already in place).
- Verify the badge doesn't visually clash with the existing teal top accent stripe — coral on dark ink-primary should pop appropriately.

### Step 6 — Asset placement
- Create `public/images/partnerships/` and `public/images/logos/` directories (Next.js will pick them up automatically).
- Drop in real assets as Ryan captures them. Until each is in place, use `PhotoPlaceholder` with a clear "REPLACE: …" label visible only in dev (or branded teal placeholder card).
- Use `next/image` with explicit `width`, `height`, `sizes`, and lazy loading per CLAUDE.md.

---

## Verification

End-to-end check after implementation:

1. **Build & typecheck**
   - `pnpm typecheck` — no errors (project enforces TS strict mode per CLAUDE.md).
   - `pnpm lint` — clean.
   - `pnpm build` — builds successfully.

2. **Local dev** (`pnpm dev`)
   - `/partnerships` (English): hero composite renders, scrolls smoothly, float animation fires, all four upgrades visible.
   - `/ja/partnerships`: same checks; verify Japanese copy fits without overflow on metrics strip and badge.
   - Toggle `prefers-reduced-motion` in DevTools → confirm float animation disabled.

3. **Responsive sweep** (Chrome DevTools)
   - 360px (mobile S): composite stacks below hero text; metrics strip becomes 2×2; pricing badge doesn't overflow narrow card.
   - 768px (tablet): composite still stacks; metrics in row of 4 or 2×2 depending on breakpoint chosen.
   - 1280px (desktop): composite floats right with rotations; everything renders as designed.

4. **Lighthouse mobile** — confirm Performance ≥ 90 and total page weight stays under the 800 KB initial budget. New images must be WebP/AVIF and properly sized.

5. **Accessibility**
   - `axe` DevTools or Lighthouse a11y audit ≥ 95.
   - Hero composite: descriptive alt text reads correctly with screen reader.
   - Pricing badge: announced by screen readers via the inner text content.
   - Color contrast on coral badge against dark card background passes WCAG AA.

6. **Bilingual content** — eyeball both locales; confirm no English fallthrough on `/ja`.

---

## Out of Scope (explicit Phase 2 list)

To keep this build focused, the following are deferred until the HonuHub photo session and remaining partner permissions are secured:

- Inquiry form background photo / pattern
- Full-width photo-strip divider between sections
- Partner logo wall under "More partnerships launching soon"
- Custom SVG icon set (process steps, audience fit, pricing tiers, etc.) — current lucide-react icons stay
- Animated process flow connector
- Honu Scroll Companion activation
- Testimonial carousel (single attributed quote on Vertice card is sufficient for this phase)
- Section background re-alternation (current canvas/sand pattern is already doing the job)

---

## Notes for the executor

- **Memory:** the saved memory says plans live under `docs/plans/`, not `.claude/plans/`. Plan mode restricts edits to the prescribed `.claude/plans/` file, so once approved I'll move this file to `docs/plans/2026-04-29-partnerships-visual-upgrade.md`.
- **Memory:** SmashHaus must not appear on the public site until the deal closes — irrelevant to this phase (no logo wall) but flagged in case it comes up.
- **Memory:** commit directly to `main`; no feature branches or PRs.
