# Hide Library & Study Paths in Admin Sidebar

## Context

Library and Study Paths were hidden on the student side ([StudentNav.tsx](components/learn/StudentNav.tsx) — `baseNavItems` no longer contains them) because those products are paused. The admin sidebar still exposes them, creating an inconsistency: admins see two nav items whose student-facing counterparts no longer exist, and the surfaces now lead to features that aren't being maintained.

Goal: hide those two links in [AdminNav.tsx](components/admin/AdminNav.tsx) so the admin IA matches the student IA, while keeping the underlying routes and data (migration 032, RLS, pages) intact so nothing is lost and we can restore them with a one-line revert when the products come back.

## Approach

Mirror the student-side pattern: simply remove the two entries from the `navItems` array. Leave the pages under [app/[locale]/admin/library/](app/[locale]/admin/library/) and [app/[locale]/admin/paths/](app/[locale]/admin/paths/) in place — they remain reachable by direct URL for any admin who needs them, and we avoid churn in routes/tests/migrations.

### Files to modify

- [components/admin/AdminNav.tsx:18](components/admin/AdminNav.tsx#L18) — remove `{ href: '/admin/library', label: 'Library', icon: Library }`
- [components/admin/AdminNav.tsx:20](components/admin/AdminNav.tsx#L20) — remove `{ href: '/admin/paths', label: 'Study Paths', icon: Route }`
- Remove the now-unused `Library` and `Route` imports from the `lucide-react` import at [components/admin/AdminNav.tsx:7](components/admin/AdminNav.tsx#L7).

### Out of scope (explicitly leaving alone)

- `app/[locale]/admin/library/**` and `app/[locale]/admin/paths/**` pages — keep; direct URL access still works.
- [components/admin/AdminLibraryList.tsx](components/admin/AdminLibraryList.tsx), [AdminLibraryDetail.tsx](components/admin/AdminLibraryDetail.tsx), [LibraryThumbnailUploader.tsx](components/admin/LibraryThumbnailUploader.tsx), [PathStatsWidget.tsx](components/admin/PathStatsWidget.tsx) — keep.
- Their tests under [__tests__/components/admin/](__tests__/components/admin/) — keep.
- DB tables, RLS, and migration 032 — no change.

## Verification

1. `npm run dev`, visit `/admin` as an admin — confirm sidebar shows Dashboard, Courses, Proposals, Instructors, Instructor Apps, Vault, Students, Partners, Applications, Surveys, Revenue (no Library, no Study Paths).
2. Check mobile bottom nav (narrow viewport) — same list.
3. Navigate directly to `/admin/library` and `/admin/paths` — pages still render (routes preserved).
4. `npm run lint` — no unused-import warning from the removed lucide icons.
5. `npm run build` — clean build, no type errors.
