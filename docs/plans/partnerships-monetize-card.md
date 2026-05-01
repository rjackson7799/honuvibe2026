# Partnerships — Replace "Bilingual Delivery" card with "A New Revenue Stream"

## Context

The `/partnerships` page's "What You Get" grid currently sells **Bilingual Delivery** as the second of four value props. Bilingual delivery is already implied across HonuVibe's brand (and called out elsewhere) — it's not a primary reason a partner chooses us. The stronger pitch is **monetization**: partners can turn AI training into a paid program/new revenue line, and their members come out with AI skills they can monetize themselves (client work, products, income). Swapping this card sharpens the partner-facing value prop and aligns with the page's core conversion goal.

Decisions confirmed with the user:
- Angle: cover **both** partner-level revenue and member-level upside.
- Card title: **"A New Revenue Stream"**.
- JSON key: **rename `bilingual` → `monetize`** (key matches content).

## Scope

A targeted content swap in the existing `PartnershipsWhatYouGet` section. No structural/component/layout changes. Both EN and JP translation files updated. No other pages affected.

## Files to modify

1. `components/marketing/partnerships/what-you-get.tsx`
   - Change `CardKey` union: `'bilingual'` → `'monetize'`.
   - Update `CARDS` array entry: replace `{ key: 'bilingual', Icon: Globe }` with `{ key: 'monetize', Icon: TrendingUp }`.
   - Update `lucide-react` import: drop `Globe`, add `TrendingUp`.

2. `messages/en.json` (under `partnerships.what_you_get.cards`)
   - Remove: `bilingual_title`, `bilingual_body`.
   - Add:
     - `monetize_title`: `"A New Revenue Stream"`
     - `monetize_body`: `"Turn AI training into a paid program under your brand — and give members skills they can monetize too. New revenue for you, real outcomes for them."`

3. `messages/ja.json` (under `partnerships.what_you_get.cards`)
   - Remove: `bilingual_title`, `bilingual_body`.
   - Add (matching keys, EN copy as placeholder until JP translation lands — consistent with the rest of the `partnerships.*` JP namespace which currently mirrors EN strings):
     - `monetize_title`: `"A New Revenue Stream"`
     - `monetize_body`: `"Turn AI training into a paid program under your brand — and give members skills they can monetize too. New revenue for you, real outcomes for them."`

## Card order (unchanged grid, monetize replaces slot 2)

1. Custom Curriculum  *(unchanged)*
2. **A New Revenue Stream** *(new — replaces Bilingual Delivery)*
3. Co-Branded Experience  *(unchanged)*
4. Live + On-Demand  *(unchanged)*

## Icon choice

`TrendingUp` from `lucide-react` — already in the icon library and reads as growth/revenue. No new dependencies.

## Verification

1. `npm run dev` → load `/partnerships` (EN) and `/ja/partnerships`.
2. Confirm the second card in the "What You Get" grid renders:
   - `TrendingUp` icon in the teal-soft tile.
   - Title: "A New Revenue Stream".
   - Body copy as specified.
3. Confirm the other three cards (Curriculum, Co-Branded, Live + On-Demand) are unchanged.
4. Confirm no `next-intl` "MISSING_MESSAGE" warnings for `partnerships.what_you_get.cards.*` in the dev console.
5. `npm run build` to confirm TypeScript still compiles (the `CardKey` union rename is the only type-touching change).

## Out of scope

- Re-translating the rest of the `partnerships.*` JP namespace (already mirrors EN; separate task).
- Reordering or restyling the grid.
- Updating the Partnerships hero / metrics / who-is-it-for / form sections.
