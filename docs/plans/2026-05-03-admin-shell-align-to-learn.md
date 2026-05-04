# Admin Shell — Align to Learn Shell

> On approval, this plan should be saved as `docs/plans/2026-05-03-admin-shell-align-to-learn.md` (per user feedback re: plan file location).

## Context

The admin **content** redesign shipped Apr 30 in commit `09ac4c5` (StatCard `learn` variant, BadgePill, SectionHeading, two-column Recent Enrollments + Upcoming Sessions, etc.). What did **not** ship is an alignment of the admin **shell** (sidebar + page header) to match the student-facing Learn shell that the user considers the new look.

Side-by-side:

| | Learn (`/learn/dashboard`) — looks correct | Admin (`/admin`) — looks outdated |
|---|---|---|
| Sidebar top | `HonuVibe.AI` wordmark | plain `ADMIN` text |
| Sidebar lang toggle | EN / 日本語 pills near the top | `LangToggle` only at the bottom |
| Sidebar height | full-height, sticky `top-0` | offset, sticky `top-14/16` (leaves a gap above the sidebar) |
| Page header | date overline + `Welcome back, {name} 👋` + bell + avatar | bare `Dashboard` h1 |

The fix is: bring the admin shell into visual parity with Learn while reusing existing primitives where possible.

## Scope & non-goals

**In scope**
- Update `AdminNav` (sidebar): add wordmark, move lang toggle to the top, remove top offset.
- Update `app/[locale]/admin/page.tsx` (page header): add date overline + "Welcome back, {name}" + bell button + avatar chip — same shape as Learn.

**Out of scope**
- No changes to Learn (it already looks right).
- No content/cards changes to the admin dashboard (those already shipped in `09ac4c5`).
- Not touching `StudentNav`'s inline `LangPills` (don't refactor what isn't broken — see CLAUDE.md "no abstractions beyond what the task requires").
- No new translation keys beyond reusing `dashboard.welcome_back`.

## Approach

Extract two small shared pieces only where they're genuinely reused; otherwise inline.

### 1. New shared primitive — `components/ui/honuvibe-wordmark.tsx`

Tiny presentational component with the exact markup currently inlined in [components/learn/StudentNav.tsx:150-152](components/learn/StudentNav.tsx#L150-L152):

```tsx
export function HonuVibeWordmark() {
  return (
    <span className="text-[18px] font-bold text-fg-primary tracking-[-0.01em]">
      HonuVibe<span className="text-[color:var(--accent-teal)]">.AI</span>
    </span>
  );
}
```

Use in both `StudentNav` and `AdminNav` so the brand can't drift between surfaces.

### 2. New shared primitive — `components/learn/DashboardWelcomeHeader.tsx`

Wraps the date-overline + welcome + bell + avatar block currently inlined in [app/[locale]/learn/dashboard/page.tsx:89-118](app/%5Blocale%5D/learn/dashboard/page.tsx#L89-L118).

```tsx
type Props = {
  displayName: string;
  initial: string;
  locale: string;
  settingsHref: string;        // /learn/dashboard/settings or /admin/...
  notificationsHref?: string;  // optional, default '#'
  showNotificationDot?: boolean;
  welcomeLabel: string;        // pre-translated string from caller
};
```

Caller computes `overlineDate` and the translated `welcomeLabel` (so the component stays free of `next-intl` server hooks and can be used from any page). Markup is a 1:1 lift of the existing JSX.

Refactor [app/[locale]/learn/dashboard/page.tsx:89-118](app/%5Blocale%5D/learn/dashboard/page.tsx#L89-L118) to use it (zero visual change), then use it in admin.

### 3. AdminNav restructure — [components/admin/AdminNav.tsx](components/admin/AdminNav.tsx)

Match Learn's section structure:

```
┌─ wordmark (border-b)
├─ LangToggle (border-b)         ← lifted from bottom
├─ nav items (flex-1, scrollable)
└─ bottom controls (border-t):
    UserMenu
    ThemeToggle  (lang toggle removed here — it moved up)
```

Concrete changes to AdminNav:
- Replace the `<h2>Admin</h2>` block (lines 44-46) with a `<HonuVibeWordmark />` block styled like StudentNav's logo section (`px-5 pt-5 pb-4 border-b`).
- Add a new `px-4 py-3 border-b` block right under the wordmark containing `<LangToggle />`.
- Remove the `<LangToggle />` from the bottom controls row (line 77); leave `<UserMenu>` and `<ThemeToggle>`.
- Change the outer `<nav>` className from `sticky top-14 md:top-16 h-[calc(100vh-3.5rem)] md:h-[calc(100vh-4rem)] p-4 gap-1` to `h-screen sticky top-0 ... ` matching StudentNav's outer shape (full height, no offset). Keep `w-56` width (Admin has more nav items than Learn, so 224px stays — Learn is 220px).
- Wrap the nav-item list in its own `flex-1 min-h-0 overflow-y-auto px-2.5 py-3` container so it scrolls without pushing the bottom controls off-screen.

### 4. Admin dashboard page — [app/[locale]/admin/page.tsx](app/%5Blocale%5D/admin/page.tsx)

Add the welcome header above the StatCards.

- Read user via `createClient()` server client → fetch `users.full_name`. (The `AdminGuard` already ensures `user` exists, but the page currently doesn't call supabase — we'll need to add it. Use `getTranslations({ locale, namespace: 'dashboard' })` for `welcome_back`.)
- Compute `displayName`, `initial`, `overlineDate` exactly the same way Learn's page does ([app/[locale]/learn/dashboard/page.tsx:72-87](app/%5Blocale%5D/learn/dashboard/page.tsx#L72-L87)).
- Render `<DashboardWelcomeHeader …/>` where the current bare `<h1>Dashboard</h1>` lives (line 28-30).
- Keep the StatCards grid below unchanged.
- For `settingsHref` on admin, point at `/learn/dashboard/settings` (admin users don't have a separate settings page) — same destination Learn uses.

## Files

**New**
- [components/ui/honuvibe-wordmark.tsx](components/ui/honuvibe-wordmark.tsx)
- [components/learn/DashboardWelcomeHeader.tsx](components/learn/DashboardWelcomeHeader.tsx)

**Modified**
- [components/admin/AdminNav.tsx](components/admin/AdminNav.tsx) — wordmark + lang toggle relocation + full-height sidebar
- [app/[locale]/admin/page.tsx](app/%5Blocale%5D/admin/page.tsx) — add welcome header
- [components/learn/StudentNav.tsx](components/learn/StudentNav.tsx) — swap inlined wordmark for `<HonuVibeWordmark />` (1-line replace)
- [app/[locale]/learn/dashboard/page.tsx](app/%5Blocale%5D/learn/dashboard/page.tsx) — refactor to use `<DashboardWelcomeHeader />` (no visual change)

**Reused (no changes)**
- [components/layout/lang-toggle.tsx](components/layout/lang-toggle.tsx)
- [components/layout/theme-toggle.tsx](components/layout/theme-toggle.tsx)
- [components/layout/user-menu.tsx](components/layout/user-menu.tsx)
- `dashboard.welcome_back` translation key (already exists in `messages/en.json` and `messages/ja.json`)

## Verification

1. `pnpm dev` and visit `http://localhost:3000/admin` — confirm:
   - Sidebar shows `HonuVibe.AI` at the top, lang toggle below it, no gap above the sidebar.
   - Page shows `MONDAY, MAY 4, 2026` overline → `Welcome back, Ryan Jackson 👋` → bell + R chip aligned right.
2. Visit `/ja/admin` — overline should read in `ja-JP` locale (e.g. `2026年5月4日月曜日` uppercased) and the welcome string should come from `messages/ja.json`.
3. Visit `/learn/dashboard` — should look **identical** to before (wordmark and welcome header refactors are visual no-ops).
4. Click language toggle in admin sidebar → switches to `/ja/admin` and persists across nav.
5. `pnpm lint && pnpm tsc --noEmit` — no new errors.
6. Open the existing admin tests (if any under `__tests__/admin/`) and run `pnpm test` — confirm green.

## Risks

- Sidebar height change (`top-14/16` → `top-0`) might collide with a global top bar if one exists for admin. Verified: `AdminLayout` does not render a top bar — it's just `<AdminNav />` + `<main>`. Safe.
- `app/[locale]/admin/page.tsx` becoming async-aware of the user adds one Supabase round trip. Negligible — this page already calls `getDashboardStats()`.
