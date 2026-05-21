# Vertice Landing — Light Marketing Shell + Light Mockup

**Date:** 2026-05-15
**Scope:** Visual continuity between the Vertice Society partner landing and the live `honuvibe.ai` marketing site.

## Context

The Vertice partner page (`/partners/vertice-society`) currently renders the **legacy dark `<Nav />`** with a partner-specific lightening tweak (see `isLightZonePage` in [components/layout/nav-client.tsx:37](components/layout/nav-client.tsx#L37)). That nav uses different fonts, tokens, and structure than the new `<MarketingNav>` mounted by the live homepage. The result is a visual jolt: a dark/half-light global header sitting above a cream Vertice hero — the page reads as "different site."

Separately, the hero's "vault.honuvibe.ai" browser mockup ([components/partners/vertice/vertice.css:451-632](components/partners/vertice/vertice.css#L451-L632)) is hard-coded dark (`background: var(--vertice-dark)`, white text throughout), which clashes with the live site's cream/dark-navy/teal mockup treatment shown on `honuvibe.ai`.

This plan brings the partner landing into the same design system used by the live site — for both the global header and the hero mockup — so the Vertice page reads as part of HonuVibe.AI rather than a one-off microsite.

Decisions captured in brainstorming:
- Apply the marketing shell to **all `/partners/*` pages** (sweeps SmashHaus when it ships).
- For the mockup, do a **light re-skin only** — keep the existing weeks-rail + video-player structure; flip colors only.

## Changes

### 1. Route the marketing shell over `/partners/*`

**File:** [lib/marketing-routes.ts:19](lib/marketing-routes.ts#L19)

Add `/partners` to `MARKETING_PATH_PREFIXES`:

```ts
const MARKETING_PATH_PREFIXES = ['/glossary', '/blog', '/partners'] as const;
```

Effect: `isMarketingPath('/partners/vertice-society')` and `isMarketingPath('/partners/smashhaus')` both return true. Downstream:
- `NavClient` returns `null` (legacy dark Nav suppressed) — [nav-client.tsx:61](components/layout/nav-client.tsx#L61).
- `ConditionalMain` skips the legacy `pt-14 md:pt-16` nav-clearance padding — [conditional-nav.tsx:29](components/layout/conditional-nav.tsx#L29).

### 2. Mount `MarketingShell` + `MarketingNav` on the Vertice page

**File:** [app/[locale]/partners/vertice-society/page.tsx:30-39](app/[locale]/partners/vertice-society/page.tsx#L30-L39)

Wrap the existing `<VerticeLanding />` in `<MarketingShell>` and render `<MarketingNav showGetStarted />` inside it — mirror the pattern from the homepage [app/[locale]/page.tsx:25-41](app/[locale]/page.tsx#L25-L41).

Skeleton:
```tsx
import { MarketingShell } from '@/components/marketing/shell';
import { MarketingNav } from '@/components/marketing/nav/marketing-nav';

return (
  <div className={`${inter.variable} ${notoJP.variable} ${instrumentSerif.variable}`}>
    <MarketingShell>
      <MarketingNav showGetStarted />
      <VerticeLanding locale={locale} />
    </MarketingShell>
  </div>
);
```

Keep `<VerticeFooter />` inside `VerticeLanding` — the partner page intentionally has its own footer; do **not** add `<MarketingFooter />`. Verify `<ConditionalFooter />` in the layout doesn't render a duplicate site footer on `/partners/*` (if it does, extend its skip-list).

### 3. Hero top padding

The Vertice hero [components/partners/vertice/vertice.css:178](components/partners/vertice/vertice.css#L178) was sized assuming the legacy Nav's `pt-14 md:pt-16`. Since `ConditionalMain` will now skip that padding, the hero must self-clear the `MarketingNav` (~64px on desktop, ~56px mobile). Audit `.vertice-hero` `padding-top` and add the small clearance if the marketing nav overlaps the badge/title.

### 4. Light re-skin of the vault mockup

**File:** [components/partners/vertice/vertice.css:451-632](components/partners/vertice/vertice.css#L451-L632)

Re-color the existing structure (no markup changes in [VerticeLanding.tsx:212-280](components/partners/vertice/VerticeLanding.tsx#L212-L280)). Match the live site's cream/dark-navy/teal palette:

| Selector | Current (dark) | Target (light) |
|---|---|---|
| `.vertice-vault` background | `var(--vertice-dark)` | `#FAF7F2` (cream) — match live mockup |
| `.vertice-vault` border | `rgba(26,43,51,0.08)` | `rgba(26,43,51,0.10)` — slightly stronger on light |
| `.vertice-vault` shadow | heavy `0 30px 70px rgba(10,6,18,0.22)` | softer `0 20px 50px rgba(26,43,51,0.10), 0 4px 12px rgba(26,43,51,0.06)` |
| `.vertice-vault-bar` border-bottom | `rgba(255,255,255,0.06)` | `rgba(26,43,51,0.06)` |
| `.vertice-vault-url` background | `rgba(255,255,255,0.06)` | `rgba(26,43,51,0.05)` |
| `.vertice-vault-url` color | `rgba(255,255,255,0.45)` | `rgba(26,43,51,0.50)` |
| `.vertice-vault-rail` border-right | `rgba(255,255,255,0.05)` | `rgba(26,43,51,0.05)` |
| `.vertice-vault-rail-eyebrow` color | `rgba(255,255,255,0.4)` | `rgba(26,43,51,0.45)` |
| `.vertice-vault-week-num` color | `rgba(255,255,255,0.45)` | `rgba(26,43,51,0.45)` |
| `.vertice-vault-week-title` color | `rgba(255,255,255,0.85)` | `rgba(26,43,51,0.88)` |
| `.vertice-vault-week-active` background | seafoam→lavender at 0.18/0.08 | keep gradient but raise opacity slightly: 0.14/0.10 — reads on cream |
| `.vertice-vault-player-title` color | `#fff` | `var(--vertice-navy)` (or `#1A2B33`) |
| `.vertice-vault-player-frame` border | `rgba(255,255,255,0.06)` | `rgba(26,43,51,0.08)` |
| `.vertice-vault-player-frame` background | seafoam/lavender on dark | same gradient but on cream — likely needs darkening of the radial highlight (`rgba(0,0,0,0.04)` instead of white at 0.08) |
| `.vertice-vault-player-play` background | `rgba(255,255,255,0.92)` | keep white, deepen shadow on light bg |
| `.vertice-vault-player-progress` track | `rgba(255,255,255,0.08)` | `rgba(26,43,51,0.08)` |
| `.vertice-vault-player-meta` color | `rgba(255,255,255,0.55)` | `rgba(26,43,51,0.55)` |
| `.vertice-vault-foot` border-top | `rgba(255,255,255,0.06)` | `rgba(26,43,51,0.06)` |
| `.vertice-vault-foot` background | `rgba(255,255,255,0.02)` | `rgba(26,43,51,0.02)` |
| `.vertice-vault-foot-eyebrow` color | `rgba(255,255,255,0.4)` | `rgba(26,43,51,0.45)` |
| `.vertice-vault-foot-amt` color | `#fff` | `var(--vertice-navy)` |
| `.vertice-vault-week-active` outline | `inset 0 0 0 1px rgba(45,191,176,0.3)` | `inset 0 0 0 1px rgba(45,191,176,0.45)` — bump to read on cream |

Notes:
- `.vertice-mockup-halo` (teal radial blur) and the floating chips (`.vertice-chip-lifetime`, `.vertice-chip-cohort`) are already light-on-light friendly — no changes needed.
- `.vertice-vault-player-eyebrow` already uses `var(--vertice-seafoam)` — works on both backgrounds.
- The `transform: rotate(-1.5deg)` on `.vertice-vault` stays.

### 5. Cleanup (low priority, can defer)

`isLightZonePage = pathname.startsWith('/partners/')` in [nav-client.tsx:37](components/layout/nav-client.tsx#L37) becomes dead code once `/partners` is in the marketing prefix list (the early `return null` at line 61 fires first). Safe to remove the `isLightZonePage` declaration and its single use at line 71. Optional in this PR; can be a follow-up cleanup.

## Critical files

- [lib/marketing-routes.ts](lib/marketing-routes.ts) — route classification
- [app/[locale]/partners/vertice-society/page.tsx](app/[locale]/partners/vertice-society/page.tsx) — wrap in MarketingShell + MarketingNav
- [components/partners/vertice/vertice.css](components/partners/vertice/vertice.css) — vault mockup re-skin (lines 451-632)
- [components/partners/vertice/VerticeLanding.tsx](components/partners/vertice/VerticeLanding.tsx) — verify hero top padding clears MarketingNav
- [components/layout/conditional-nav.tsx](components/layout/conditional-nav.tsx) — confirm `ConditionalMain` behavior on `/partners/*`
- (verify) [components/layout/conditional-footer.tsx](components/layout/conditional-footer.tsx) — make sure global footer isn't double-rendered alongside VerticeFooter

## Verification

1. `pnpm dev` and visit `http://localhost:3000/ja/partners/vertice-society` and `http://localhost:3000/partners/vertice-society`.
2. Confirm the **light cream `MarketingNav`** appears at the top (logo + nav links + EN/JP + Get Started button), matching `honuvibe.ai`. Theme toggle should not appear (MarketingNav is light-only).
3. Confirm the **vault mockup** renders cream/dark-navy/teal. The active week (第3週) should still read clearly with the seafoam highlight; the lesson title should be navy; the play button should still pop.
4. Confirm the hero badge / title clears the new nav (no overlap on desktop ≥1280, ≥960 tablet, mobile ≤760).
5. Confirm `<VerticeFooter />` still renders at the bottom and the global site footer is **not** also rendered (no duplicate footers).
6. Visit `/learn`, `/about`, `/blog/<slug>`, `/glossary` — confirm the marketing shell still works on existing routes (no regression from the routes-config change).
7. Visit `/partners/smashhaus` if locally accessible — confirm it now also gets the marketing shell (this is intentional per scope decision; SmashHaus is hidden from public discovery so the visual change is invisible until launch).
8. Visit `/learn/dashboard` and `/admin` — confirm auth shells still suppress all marketing chrome.
