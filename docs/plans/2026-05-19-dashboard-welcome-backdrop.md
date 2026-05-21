# Dashboard Welcome Backdrop

## Context

The current student dashboard (both the first-run WelcomeScreen and the post-onboarding overview) sits on the bare sand background defined by `.learn-zone`. It works but reads as sterile — three identical cards on a flat surface. Reference mockup adds a warm, low-contract decorative layer: a plant-pot illustration anchored top-right and two soft gradient orbs (warm peach upper-left, teal-tinted lower-left).

Scope is intentionally tiny: **decorative background only**. No streak counter, no weekly-goal bar, no fake online-member count, no NEW badge — every one of those needs a real data contract and we ship them later when the LMS state exists. The backdrop is pure CSS + one PNG, zero data dependencies, safe to ship today.

Surfaces: WelcomeScreen (`components/learn/WelcomeScreen.tsx`) and the post-onboarding dashboard ([app/[locale]/learn/dashboard/page.tsx](app/[locale]/learn/dashboard/page.tsx)). Explicitly NOT applied to dashboard sub-pages (courses, billing, schedule, etc.) — those have their own content density and the plant would clutter them.

## Approach

Extract a single reusable `<DashboardBackdrop />` component that renders the decorative layer as a `pointer-events-none` absolutely-positioned sibling, and mount it inside the two target pages (not in the shared layout, so sub-pages stay unaffected).

The base sand color (`#f0ebe3` from `.learn-zone`) is already correct — no globals.css changes needed.

## Files

### Create

- **[public/images/dashboard/welcome-plant.png](public/images/dashboard/welcome-plant.png)** — Ryan provides
  - Transparent PNG of the plant-pot illustration
  - Recommend ~720px wide @ 2x density (renders ~360px on screen)
  - Crop tight to the subject with no built-in shadow (we control shadow via CSS if needed)

- **[components/learn/DashboardBackdrop.tsx](components/learn/DashboardBackdrop.tsx)** — new client-safe presentational component
  - Single absolutely-positioned `<div>` with `pointer-events-none select-none` covering its positioned ancestor
  - Renders three layers, all `aria-hidden`:
    1. Warm peach orb — `radial-gradient` using `var(--accent-coral-subtle)` blended with transparent, ~420px diameter, anchored upper-left of content area, blur ~80px
    2. Teal orb — `radial-gradient` using `var(--accent-teal-subtle)`, ~520px diameter, anchored lower-left, blur ~100px
    3. Plant — `next/image` of `/images/dashboard/welcome-plant.png` anchored top-right, fixed width ~320–360px (responsive: hidden below `sm` breakpoint to keep mobile clean), `priority={false}`, explicit `width`/`height` per CLAUDE.md image rules
  - Accept optional `className` for per-page offset tuning
  - Hidden when `prefers-reduced-motion: reduce`? No — backdrop is static, no motion. Keep visible.

### Modify

- **[components/learn/WelcomeScreen.tsx](components/learn/WelcomeScreen.tsx)**
  - Wrap the existing outer `<div className="min-h-[80vh] flex flex-col items-center justify-center py-16 px-4">` in a `relative` container (or add `relative` to that div directly — it's already the outermost)
  - Insert `<DashboardBackdrop />` as the first child, before the heading block
  - Apply to both `step === 'password'` and `step === 'chooser'` branches so the backdrop persists across the onboarding micro-flow
  - Ensure existing centered content sits above the backdrop via `relative z-10` on the content wrapper (or rely on default stacking — backdrop is absolute, content is in-flow, so content naturally paints on top)

- **[app/[locale]/learn/dashboard/page.tsx](app/[locale]/learn/dashboard/page.tsx)**
  - The current root is `<div className="space-y-7 max-w-[1100px]">` — add `relative` to it
  - Insert `<DashboardBackdrop />` as the first child, before `<DashboardWelcomeHeader />`
  - One subtlety: this page has a `max-w-[1100px]` wrapper, so the backdrop is constrained to that width. That's fine — matches the mockup's behavior of the plant sitting roughly above the right edge of the content column, not bleeding into the sidebar gutter.

## Reuse notes

- Colors: pull from existing CSS variables (`--accent-coral-subtle`, `--accent-teal-subtle`) — never hardcode. Both already defined in [styles/globals.css](styles/globals.css) and override correctly inside `.learn-zone`.
- Image: use `next/image` per CLAUDE.md ("All images served via Next.js `<Image>` with explicit dimensions"). No new utility needed.
- No new translation keys — the backdrop has no text.

## Verification

1. **Asset in place:** confirm `public/images/dashboard/welcome-plant.png` exists and has transparent background (open in browser tab; bg should show through).
2. **WelcomeScreen path:**
   - Run `pnpm dev`
   - Sign in as a user with `onboarded = false` (or hit `/learn/dashboard?welcome=true` while signed in)
   - Confirm plant sits top-right, orbs visible upper-left + lower-left, content reads cleanly above
   - Resize to mobile width — plant should disappear (`sm:` breakpoint), orbs may shrink or hide for performance
3. **Main dashboard path:** sign in as an onboarded user with at least one enrollment, hit `/learn/dashboard`, confirm the same backdrop renders behind the stat-card row and section grid without overlapping any text or stealing pointer events from cards.
4. **JP locale:** repeat both paths at `/ja/learn/dashboard` — backdrop should look identical (it's text-free).
5. **Sub-pages unaffected:** hit `/learn/dashboard/courses`, `/learn/dashboard/billing`, `/learn/dashboard/schedule` — confirm flat sand background, no plant, no orbs.
6. **Accessibility:**
   - DevTools → Accessibility tree: backdrop nodes should not appear (all `aria-hidden`)
   - Tab through the page — focus order untouched
   - Lighthouse a11y on `/learn/dashboard` stays at its current score
7. **Performance:** Lighthouse mobile run on `/learn/dashboard` — LCP must stay under 2.5s, total page weight must not jump by more than the plant PNG's size. Confirm the plant PNG is < 120KB compressed.

## Out of scope (explicitly deferred)

- Streak indicator ("7日連続学習中") — needs real streak tracking
- Weekly goal progress bar — needs goal model in DB
- Online member count + avatars — needs presence system
- NEW badge on Vault content — needs content-freshness signal
- Notification bell, help bubble — separate features
- Plant on dashboard sub-pages — revisit if Ryan wants it

These all stay parked until backing data is real, per the conversation that produced this plan.
