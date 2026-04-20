# Remove "Join the Community" button from home hero

## Context

The home page hero currently shows two CTAs: "Find a course" (primary) and "Join the Community" (ghost button linking to skool.com/honuvibe). Ryan wants the secondary button removed so the hero focuses the visitor on the primary conversion goal — course enrollment — consistent with the project-wide primary conversion goal defined in CLAUDE.md.

## Changes

### 1. [components/sections/hero-section.tsx](components/sections/hero-section.tsx)

Delete the entire secondary `<Button>` at lines 142-150 (the ghost button with `href="https://www.skool.com/honuvibe"` rendering `t('cta_secondary')`).

The surrounding flex container (line 136) stays — it now wraps only the primary Link/Button. The `flex-col gap-3 sm:flex-row sm:gap-4` classes remain harmless with a single child and can be left untouched to minimize diff.

### 2. [messages/en.json](messages/en.json) and [messages/ja.json](messages/ja.json)

Delete the now-unused key `hero.cta_secondary` from both files (line 26 in each). Verified via grep that `hero.cta_secondary` is only referenced by [components/sections/hero-section.tsx:149](components/sections/hero-section.tsx#L149). Other `cta_secondary` occurrences in the JSON live under different namespaces (`build.hero.cta_secondary`, `exploration.hero_cta_secondary`) and are unaffected.

## Verification

1. `npm run dev` and visit `/` and `/ja` — hero shows only the "Find a course" / "コースを探す" button; no "Join the Community" button.
2. `npm run build` — confirms no missing-key errors from next-intl after the JSON deletion.
3. Spot-check `/build` and `/explore` pages still render their own secondary CTAs (they use different namespaces).
