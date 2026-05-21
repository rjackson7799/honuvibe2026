# Admin Nav Density Reduction

## Context

The admin left sidebar at `/admin/*` currently feels crowded and hard to scan compared
to the learner sidebar at `/learn/*`. Three issues are stacking:

1. **13 flat nav items** with no visual hierarchy. The eye has to scan a
   uniform list to find anything — no grouping by domain (learning, members,
   community, finance).
2. **A redundant bottom block.** [`components/admin/AdminNav.tsx:88`](components/admin/AdminNav.tsx#L88) renders the shared `<UserMenu />` in
   its default `variant='row'` mode, which adds three more flat list items:
   - "Dashboard" → `/learn/dashboard` (collides visually with the top "Dashboard"
     that points at `/admin`)
   - "Admin" → `/admin` (redundant — user is already in `/admin`)
   - "Sign Out"
   The screenshot Ryan flagged shows exactly this: a second "Dashboard" and
   "Admin" appearing below "Sign Out". It looks like duplication, but it's the
   UserMenu being rendered inline.
3. **Community moderation is invisible.** `/admin/community` exists with a full
   `ModerationDashboard` (built in the community-feed MVP), but `AdminNav` has
   no link to it. Mods/admins can only reach it by typing the URL.

The fix is structural, not cosmetic: group the nav into sections with overlines,
collapse the bottom block into an avatar dropdown, and add the missing
Community link.

## Recommended approach

### 1. Group the nav items under section overlines

Replace the flat `navItems` array in [`components/admin/AdminNav.tsx`](components/admin/AdminNav.tsx) with a grouped
structure rendered under small uppercase section headers. Use a muted variant
of the existing [`Overline`](components/ui/overline.tsx) component (override `text-accent-teal` →
`text-fg-tertiary`) so the headers act as quiet dividers, not visual peers of
the active link.

Proposed grouping (left column = section overline, right column = items):

```
OVERVIEW
  Dashboard           /admin
  Revenue             /admin/revenue

LEARNING
  Courses             /admin/courses
  Proposals           /admin/courses/proposals
  Instructors         /admin/instructors
  Instructor Apps     /admin/instructor-applications

MEMBERS
  Students            /admin/students
  Partners            /admin/partners
  Applications        /admin/applications
  Partnership Inquiries   /admin/partnership-inquiries

COMMUNITY
  Moderation          /admin/community   ← NEW LINK
  Surveys             /admin/surveys

CONTENT
  Vault               /admin/vault

FINANCE
  Payouts             /admin/payouts/instructors
```

Notes on the grouping:
- "Moderation" reads more clearly than "Community" inside an admin context
  (admins moderate; members participate). The route stays `/admin/community`.
- Surveys sits under COMMUNITY because in practice it's a member-feedback tool.
  If Ryan thinks of surveys as content authoring, it can move to CONTENT — flag
  during review, not blocking.
- The ordering inside each group preserves the current visual order so muscle
  memory survives.

### 2. Restructure the nav data and render loop

Change the `navItems` constant to a `navGroups` constant:

```ts
type NavItem = { href: string; label: string; icon: LucideIcon; exact?: boolean };
type NavGroup = { label: string; items: NavItem[] };

const navGroups: NavGroup[] = [
  { label: 'Overview',  items: [ ... ] },
  { label: 'Learning',  items: [ ... ] },
  { label: 'Members',   items: [ ... ] },
  { label: 'Community', items: [ ... ] },
  { label: 'Content',   items: [ ... ] },
  { label: 'Finance',   items: [ ... ] },
];
```

The render loop becomes:

```tsx
{navGroups.map((group) => (
  <div key={group.label} className="flex flex-col gap-0.5 pb-3">
    <span className="px-3 pt-2 pb-1.5 text-[10px] font-semibold uppercase tracking-[0.16em] text-fg-tertiary">
      {group.label}
    </span>
    {group.items.map((item) => { /* existing link render */ })}
  </div>
))}
```

Active-state logic (lines 60–65) is preserved verbatim — just moved inside the
inner map.

### 3. Mobile bottom nav — flatten back for tablet/phone

The current mobile bottom nav (lines 96–119) renders all 13 items in a single
flex row. With section headers it would break visually. Two options:

- **Keep flat on mobile.** Use a single `flatItems = navGroups.flatMap(g => g.items)`
  and render the existing row. Adds Moderation but keeps the same visual model.
- **Switch mobile to an overflow scroll** with grouped chips. More work, more
  polish, but probably unnecessary at the admin layer where most work is desk-bound.

**Recommendation:** Flatten on mobile (option 1). Admin-on-phone is rare; the
desktop sidebar is the user surface this plan is fixing.

### 4. Replace the bottom UserMenu row with an avatar dropdown

Switch line 88 in `AdminNav.tsx`:

```tsx
// before
<UserMenu labels={userMenuLabels} />
// after
<UserMenu labels={userMenuLabels} variant="dropdown" />
```

The dropdown variant is already implemented at [`user-menu.tsx:168`](components/layout/user-menu.tsx#L168) (`DropdownMenu`) and renders as a circular avatar
button that opens a floating menu with user name, email, Dashboard link, Admin
link (when admin), and Sign Out. It's already used elsewhere in the marketing
nav — no new component needed.

Two small polish items inside the dropdown's existing behavior (still in
[`user-menu.tsx`](components/layout/user-menu.tsx)):

- **Rename "Dashboard" → "Student View"** in the dropdown when the user is
  currently in `/admin/*`. Eliminates the "two Dashboards" confusion. Plumb a
  `currentPath` prop or use `usePathname()` inside `DropdownMenu`.
- **Hide the "Admin" link when already in `/admin/*`.** It's a no-op from
  inside the admin shell.

Both changes are scoped to the dropdown variant. The row variant used by
`/learn/*` is untouched.

### 5. Wire the missing Community item label

Add a `nav.moderation` translation key to [`messages/en.json`](messages/en.json) and
[`messages/ja.json`](messages/ja.json), value `"Moderation"` / `"モデレーション"`.
Use it via the existing `useTranslations('nav')` hook so the label survives
locale switches. Today the labels in `navItems` are hardcoded English strings;
keep that pattern for the others to avoid scope creep, but introduce the
translated key for the new entry — or, if Ryan prefers full consistency,
translate all 13 labels in a follow-up.

**Recommendation:** Translate Moderation now; defer the other 12 to a separate
i18n sweep. They've been hardcoded since launch and aren't blocking this fix.

## Files to modify

- [`components/admin/AdminNav.tsx`](components/admin/AdminNav.tsx) — convert
  `navItems` → `navGroups`, render grouped sections, render flat on mobile,
  switch UserMenu to `variant="dropdown"`. Single file, ~30 lines of structural
  change.
- [`components/layout/user-menu.tsx`](components/layout/user-menu.tsx) — inside
  `DropdownMenu` (line 168+), read `usePathname()`, rename the Dashboard label
  to "Student View" when path starts with `/admin`, and hide the Admin link in
  the same case.
- [`messages/en.json`](messages/en.json), [`messages/ja.json`](messages/ja.json)
  — add `nav.moderation` + `nav.student_view`.

## Files to read for reference (no changes)

- [`components/learn/LearnNav.tsx`](components/learn/LearnNav.tsx) — for parity check; the learner nav stays as-is.
- [`components/admin/community/ModerationDashboard.tsx`](components/admin/community/ModerationDashboard.tsx) — confirm the route the
  new sidebar item should link to.
- [`components/ui/overline.tsx`](components/ui/overline.tsx) — pattern for section labels (we render
  inline rather than importing because the nav needs a muted variant).

## Verification

After the change, manually verify in dev (`pnpm dev`):

1. Navigate to `/admin` — sidebar shows 6 section headers (OVERVIEW / LEARNING /
   MEMBERS / COMMUNITY / CONTENT / FINANCE), each visually quieter than the
   active link.
2. Click each nav item, confirm active state highlights only the intended row
   and the "Courses vs Proposals" disambiguation still works.
3. Click the avatar at the bottom-left — dropdown opens with name/email,
   "Student View" (not "Dashboard"), no "Admin" link, and "Sign Out". Click
   outside / press Escape — dropdown closes.
4. Click "Student View" — lands on `/learn/dashboard`. Sign out — lands on
   marketing home.
5. Click Moderation in the COMMUNITY section — lands on `/admin/community` and
   shows the existing `ModerationDashboard`.
6. Resize to mobile (<768px) — bottom nav still renders all items as a flat row
   (now 14 with Moderation). Confirm horizontal overflow behaves; if items get
   too cramped, this is the moment to revisit option 2 from §3.
7. Toggle JP locale — `nav.moderation` label flips to Japanese.
8. Theme toggle (light/dark) — section headers stay legible against both
   `--bg-secondary` backgrounds.

## Out of scope (intentionally)

- Translating the other 12 hardcoded admin nav labels.
- Collapsible sections (chevron toggles). Section headers alone should buy
  enough scannability; collapsing can be added later if the nav grows past ~18
  items.
- Restyling the partner-portal or instructor-portal sidebars. They're small
  enough (4 and 2 items) not to need this treatment.
- Two-tier nesting (Courses → Proposals as a sub-item). The grouping pass
  already separates them visually; nesting adds active-state complexity that
  isn't worth it for two items.
