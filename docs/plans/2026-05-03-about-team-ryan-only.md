# About Page — Hide Mizuho & Chiemi, Show Only Ryan

## Context

The About page team section currently shows three instructor profiles: Ryan, Mizuho, and Chimi. Ryan asked to temporarily hide Mizuho and Chiemi so only his profile is visible. This is a simple visibility change — no copy changes, translations, images, or routes need touching. The hidden members should remain easy to restore later.

## Approach

In [components/marketing/about/team.tsx](components/marketing/about/team.tsx), filter `MEMBERS` to render only Ryan, and adjust the grid container so a single card displays nicely centered instead of stranded in a 3-column layout.

## Changes

**File:** [components/marketing/about/team.tsx](components/marketing/about/team.tsx)

1. Keep the full `MEMBERS` array intact (so Mizuho and Chimi data remains for later restore), but render only the Ryan entry. Cleanest option: derive a `VISIBLE_MEMBERS` constant.

   ```tsx
   const VISIBLE_MEMBERS = MEMBERS.filter((m) => m.key === 'ryan');
   ```

2. Update the grid wrapper at [team.tsx:65](components/marketing/about/team.tsx#L65) so a single card renders centered with a constrained width rather than sitting alone in the first column of a 3-up grid:

   ```tsx
   <div className="mx-auto grid max-w-md grid-cols-1 items-start gap-6">
     {VISIBLE_MEMBERS.map((m) => (
       <TeamCard key={m.key} member={m} />
     ))}
   </div>
   ```

   (Drops the `md:grid-cols-3` since there's only one card.)

No other files need changes — translation strings and images for Mizuho/Chimi can stay in place, unused for now.

## Verification

1. `pnpm dev` → visit `/about` and `/ja/about`
2. Confirm only Ryan's card appears in the team section, centered horizontally on desktop and full-width on mobile
3. Confirm the rest of the About page (hero, origin story, aloha standard, mission/vision, social, soft CTA) still renders unchanged
4. Confirm no console errors and no broken image references

## Restore Later

To bring Mizuho and Chimi back: revert the `VISIBLE_MEMBERS` filter to use `MEMBERS` directly and restore the grid classes to `grid-cols-1 items-start gap-6 md:grid-cols-3`.
