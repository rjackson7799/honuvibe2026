# Plan: Revert Vertice partnership card to single-column

## Context

The `/partnerships` page's "Programs in Motion" section was recently restructured: the Vertice Society card was split into a 2-column inner grid (`md:grid-cols-[1fr_220px]`) with a `PhotoPlaceholder` reserving space for an upcoming session photo. The placeholder renders as a tall, narrow tan/khaki gradient column with the hardcoded label `vertice session`.

Because the Vertice card is itself the **left** cell of an outer 2-column grid (the right cell is the coral "We're Building" callout), the placeholder produces a visually broken three-column band on desktop: text → tan column → coral callout. The card looks worse than it did before the change.

The asset spec ([HonuVibe_VisualAssetSpec_Partnerships.md:89-103](../HonuVibe_VisualAssetSpec_Partnerships.md#L89-L103)) calls for `partner-vertice-photo.jpg` + `partner-vertice-slide.png` to live in this slot, but those assets are not yet shot/delivered. Until they exist, the card should revert to a single-column text layout.

## Change

Single file: [components/marketing/partnerships/current-partners.tsx](../../components/marketing/partnerships/current-partners.tsx)

1. **Remove the inner 2-column grid wrapper** ([current-partners.tsx:45](../../components/marketing/partnerships/current-partners.tsx#L45)). Drop `<div className="grid gap-0 md:grid-cols-[1fr_220px]">` so the text content sits directly inside the `<article>`.
2. **Remove the `PhotoPlaceholder` slot** ([current-partners.tsx:98-104](../../components/marketing/partnerships/current-partners.tsx#L98-L104)) — the entire `<div className="hidden p-5 pl-0 md:block">…</div>` block.
3. **Remove the `PhotoPlaceholder` import** ([current-partners.tsx:14](../../components/marketing/partnerships/current-partners.tsx#L14)) from the `@/components/marketing/primitives` import group. Leave the other primitives (`Badge`, `Container`, `Overline`, `Section`, `SectionHeading`) untouched.
4. **Keep `VerticeLogoMark`** ([current-partners.tsx:139-152](../../components/marketing/partnerships/current-partners.tsx#L139-L152)) — that's a separate stand-in for the partner logo, unrelated to the photo slot, and the spec still calls for it to be swapped later.

No other files change. `PhotoPlaceholder` itself stays in the codebase — it's still used elsewhere and will be reintroduced here when real photography ships.

## Why not the dashed variant or a real photo

- **Dashed variant**: still occupies a 220px column inside an already-narrow card sitting next to another card, so the visual collision with the coral callout remains.
- **Real photo**: no Vertice session asset exists in `public/images/partnerships/` yet. Re-add the slot in a follow-up when the photo lands.

## Follow-up (not part of this change)

When `partner-vertice-photo.jpg` is delivered, restore the `1fr_220px` (or wider) grid, replace the placeholder with `next/image`, and consider following the spec's "stacked photo + slide screenshot" treatment.

## Verification

1. `pnpm dev` (or whichever the project uses — repo runs Next.js).
2. Open `http://localhost:3000/partnerships` at desktop width (≥768px).
3. Confirm the Vertice card renders as a single text column with the coral "We're Building" callout cleanly to its right — no tan placeholder band between them.
4. Resize to mobile (<768px) and confirm the card still stacks correctly above the coral callout (mobile already hid the placeholder, so behavior should be unchanged).
5. Check `/ja/partnerships` to confirm JP locale renders identically.
6. `pnpm typecheck` to confirm the removed import doesn't leave a dangling reference.
