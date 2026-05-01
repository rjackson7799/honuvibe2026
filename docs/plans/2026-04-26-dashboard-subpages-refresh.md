# Dashboard Sub-Pages Design Refresh — My Courses, Billing, Profile

## Context

The first round ([2026-04-26 plan](./2026-04-26-learn-area-design-refresh.md)) shipped the new design for `/learn/dashboard`, `/learn/vault`, and `/learn/[slug]`. Three other dashboard sub-pages — **My Courses**, **Billing**, and **Profile** (settings) — already inherit the new sidebar, sand background, and color tokens via the `learn-zone` wrapper on `StudentDashboardLayout`, but their page-level chrome (headings, cards, filter chips, table, form sections) is still using the prior dark-era treatment (`text-2xl font-serif`, `bg-bg-secondary border border-border-default rounded-lg`, raw chip styles, etc.). This round upgrades each page's content shell to match the established learn-zone primitives without changing data flow or routes.

## Reused primitives (from the first round)

- `Card` `variant="learn"` ([components/ui/card.tsx](../../components/ui/card.tsx)) — 14px white card, scaled shadow, teal-tint hover border
- `BadgePill` ([components/ui/badge-pill.tsx](../../components/ui/badge-pill.tsx)) — teal/coral/purple/gray/live/navy/translucent variants
- `SectionHeading` ([components/learn/SectionHeading.tsx](../../components/learn/SectionHeading.tsx)) — bold navy title + optional right-side "View all" link
- `Button` ([components/ui/button.tsx](../../components/ui/button.tsx)) — `primary` (teal) for save/manage, `coral` only for the public Enroll flow
- Page-header pattern from [app/[locale]/learn/dashboard/page.tsx](../../app/[locale]/learn/dashboard/page.tsx) — overline date + title (clamp font-size, navy, tracking-tight) + right-side action cluster
- Filter-chip pattern from [components/vault/VaultFilters.tsx](../../components/vault/VaultFilters.tsx) — pill chips (white inactive, teal-fill active)
- Empty-state pattern: dashed border, `bg-bg-tertiary` (canvas), centered text

No new primitives required.

## Files to Modify

### 1. My Courses — [app/[locale]/learn/dashboard/courses/page.tsx](../../app/[locale]/learn/dashboard/courses/page.tsx)

- Replace `<h1 className="text-2xl font-serif text-fg-primary">` with the dashboard's bold/clamp navy heading. Optionally add a count BadgePill ("3 courses").
- Replace the `text-fg-tertiary import { SectionHeading } from '@/components/ui/section-heading'` with the new learn `SectionHeading`.
- Filter tabs (`all` / `in_progress` / `completed`): replace inline `bg-accent-teal/10 text-accent-teal` chips with the vault chip pattern (teal-fill active, white-bordered inactive, rounded-full).
- Empty-state block: switch from inline `bg-bg-secondary border ...` to dashed-border + canvas pattern.
- Loading skeleton: keep structure, swap rounded-lg → rounded-[14px] for visual consistency. (Tokens already update colors.)
- Course grid uses `DashboardCourseCard` — handled separately below.

### 2. DashboardCourseCard — [components/learn/DashboardCourseCard.tsx](../../components/learn/DashboardCourseCard.tsx)

Used only on My Courses now (the dashboard's inline progress rows replaced its earlier usage on `/learn/dashboard`). Restyle:
- Container: `rounded-[14px]`, white bg, `shadow-[var(--shadow-md)]`, hover lifts + teal-tint border (mirror Card learn variant).
- Title: switch `font-serif` → `font-bold tracking-[-0.015em]` (consistent with new card titles).
- Status pill: replace inline pill with `<BadgePill variant="teal" size="xs">{t('in_progress')}</BadgePill>`.
- Progress bar: 5px height (was 1.5), use coral when `progressPercent === 100`, matches dashboard widget.
- CTA: keep teal `primary` Button (this is "Continue", not "Enroll" — coral is reserved for Enroll).

### 3. Billing — [app/[locale]/learn/dashboard/billing/page.tsx](../../app/[locale]/learn/dashboard/billing/page.tsx)

- Replace `text-2xl font-serif` heading with the bold/clamp pattern.
- Wrap the page content in narrower max-width (already 880px — fine).
- The two existing children (`VaultStatusCard`, `PaymentHistoryTable`) are restyled inside their own files below.
- The wrapper `<div className="bg-bg-secondary border ...">` around `PaymentHistoryTable` should become `<Card variant="learn">` with a `<SectionHeading>` for "Payment history".

### 4. VaultStatusCard — [components/billing/VaultStatusCard.tsx](../../components/billing/VaultStatusCard.tsx)

- Replace `<div className="bg-bg-secondary border ...">` with `<Card variant="learn">`.
- Replace `<h2 className="text-lg font-serif">` with the learn `SectionHeading`.
- Replace inline status pills with `<BadgePill variant="teal">` (active subscription) and `<BadgePill variant="coral">` (vault-included-with-course); these communicate the same status with our tokens.
- Keep `Button` calls — they already use the design system; `primary` (teal) is correct for "Manage subscription". The `SubscribeButton` is already a Button wrapper.

### 5. PaymentHistoryTable — [components/billing/PaymentHistoryTable.tsx](../../components/billing/PaymentHistoryTable.tsx)

- Header row classes: keep, but bump weight (`font-semibold`, smaller letter-spacing-tight tracking).
- Body row dividers: lighten (`border-border-secondary`).
- Receipt link: switch to `text-[color:var(--accent-teal)] hover:text-[color:var(--accent-teal-hover)]` for explicit token usage.
- No structural change. Acts on the page wrapped by a learn Card.

### 6. Profile (Settings) — [app/[locale]/learn/dashboard/settings/page.tsx](../../app/[locale]/learn/dashboard/settings/page.tsx)

- Replace `<h1 className="text-2xl font-serif">` with the bold/clamp page heading.
- Each of the two `<div className="bg-bg-secondary border border-border-default rounded-lg p-6 space-y-5">` blocks → `<Card variant="learn" padding="lg">`.
- Section sub-headings (`text-sm font-semibold uppercase tracking-wider`) → keep as overlines; the existing classes already work in learn-zone.
- Inputs: bump radius to `rounded-[10px]`, switch background from `bg-bg-primary` (sand in learn-zone) to `bg-bg-tertiary` (canvas) for cleaner contrast on white cards. Keep focus ring.
- Disabled email input: `bg-[rgba(26,43,51,0.04)]` for a clearer "read-only" look.
- Avatar circle: keep size; swap border to `border-border-default` and ensure initials use navy (`text-fg-primary`).
- Avatar "Change photo" button: switch to `<Button variant="ghost" size="sm">` for design system consistency.
- Save button: `<Button variant="primary" size="md">`.
- "Saved!" inline confirmation: keep, but use `text-[color:var(--accent-teal)]`.
- Bottom Sign-out button: keep but switch to `<Button variant="ghost" size="md">` and consider noting it duplicates the sidebar's sign-out (out of scope to remove this round).
- Loading skeleton: rounded-[14px], otherwise unchanged.

## Build Sequence

1. **Restyle DashboardCourseCard** — touched first since `/learn/dashboard/courses` depends on it visually.
2. **Restyle My Courses page** — header, filters, empty-state, SectionHeading import.
3. **Restyle VaultStatusCard + PaymentHistoryTable**.
4. **Restyle Billing page** wrapper around `PaymentHistoryTable`.
5. **Restyle Settings (Profile) page** — biggest patch; cards, inputs, buttons, avatar block.
6. **Build** (`npm run build`) — confirm no TS / import errors. Live-smoke each route.

## Per-step verification

After each step, recursive checks (same protocol as round 1):
- `npm run build` — clean.
- Console errors during dev — none new.
- Smoke routes:
  - `/learn/dashboard/courses` — heading, filter chips toggle, course cards render, empty-state shows when no enrollments, "Explore more" grid below.
  - `/learn/dashboard/billing` — heading, vault-status card displays correct state (active / enrollment-only / no-access), payment history table renders, receipt links open new tab.
  - `/learn/dashboard/settings` — heading, profile + preferences cards, avatar upload, name save shows confirmation, language select saves, sign-out works.
- Sanity checks:
  - `/learn/dashboard` — unchanged.
  - `/learn/vault` — unchanged.
  - `/` — still dark marketing nav, unchanged.

## Out of scope (this pass)

- Other dashboard sub-pages: `community`, `schedule`, `my-library`, `my-classes` (instructor), `[course-slug]` per-course detail, `resources`. They inherit the sidebar + tokens but get no per-page restyle.
- The duplicate "Sign out" button at the bottom of the Settings page (sidebar already has one). Note for follow-up.
- Adding a count badge to the My Courses heading (mentioned as optional) — leave for follow-up if user wants it.
- Promoting the page-header pattern (overline + title + actions) to a shared `<DashboardPageHeader>` component — not enough usage variations yet to justify the abstraction.

## Progress log

| Step | Status |
|------|--------|
| 1. DashboardCourseCard restyle | not started |
| 2. My Courses page | not started |
| 3. VaultStatusCard + PaymentHistoryTable | not started |
| 4. Billing page wrapper | not started |
| 5. Settings (Profile) page | not started |
| 6. Build + live smoke | not started |

### Resume notes

- **Currently working on:** —
- **Next action:** Step 1 — restyle [DashboardCourseCard.tsx](../../components/learn/DashboardCourseCard.tsx).
- **Known pitfalls:** `DashboardCourseCard` was previously imported by `/learn/dashboard/page.tsx` but is no longer used there after round 1; only `/learn/dashboard/courses` uses it now. Confirm with a grep before assuming the change is isolated.
