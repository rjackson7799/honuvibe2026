# Profile rename + avatar upload

## Context

We are building community features, and the student dashboard's "Settings" page is becoming identity-centric — name, email, preferences, and soon a profile picture that will appear next to comments and member cards. Renaming the nav entry from **Settings → Profile** reframes the page as user-identity management rather than a technical config screen, and unblocks avatar display in community surfaces.

The `users.avatar_url` column already exists ([supabase/migrations/001_phase2_schema.sql:16](supabase/migrations/001_phase2_schema.sql#L16)) and is auto-populated from OAuth metadata on signup via `handle_new_user()` (same file, line 37). What's missing is (a) an `avatars/` storage bucket with user-owned RLS, and (b) an upload UI in the Profile page. Theme/language toggles stay in the sidebar — they are quick-access utilities, not identity settings.

A separate concern surfaced during scoping: the new **Smashhous** partner is English-only, and the `partners` / `courses` tables have no market/locale field. That is deliberately **out of scope here** — see "Deferred" at the bottom.

## Scope

1. Rename "Settings" → "Profile" in the student nav + page heading (EN + JP).
2. Add avatar upload to the Profile page: pick image → upload to Supabase Storage → persist `avatar_url` → show preview.

## Changes

### 1. Nav + heading rename

- [components/learn/StudentNav.tsx:40](components/learn/StudentNav.tsx#L40) — change `labelKey: 'nav_settings'` to `'nav_profile'`. Icon (`Settings` from lucide) stays; or swap to `UserCircle` if we want the label to match visually.
- [app/[locale]/learn/dashboard/settings/page.tsx:88](app/[locale]/learn/dashboard/settings/page.tsx#L88) — change `t('settings_heading')` call to point to a new `profile_heading` key ("Profile" / "プロフィール"). Keep the route path `/learn/dashboard/settings` for now — URL rename is a separate, lower-value change that breaks existing bookmarks.
- `messages/en.json` + `messages/ja.json` (`dashboard` namespace, around line 1215):
  - Add `nav_profile`: "Profile" / "プロフィール"
  - Add `profile_heading`: "Profile" / "プロフィール"
  - Add avatar-related keys (see below)
  - Leave `nav_settings` / `settings_heading` in place for now to avoid breaking any stray references; remove in a follow-up once confirmed unused.

### 2. Storage bucket + RLS

New migration: `supabase/migrations/030_avatars_storage.sql`. Mirror the pattern in [supabase/migrations/003_course_images_storage.sql](supabase/migrations/003_course_images_storage.sql), but with user-owned write policies instead of admin-only:

- Create public bucket `avatars` (public read so `<Image>` can render without signed URLs).
- Path convention: `avatars/{userId}/avatar.{ext}` — one avatar per user, overwrite on re-upload.
- RLS: `auth.uid()::text = (storage.foldername(name))[1]` for INSERT / UPDATE / DELETE. Public SELECT.
- 2 MB file size limit; allowed MIME types `image/jpeg`, `image/png`, `image/webp`.

### 3. Upload API route

New: `app/api/profile/avatar/route.ts` — POST handler.

- Uses server Supabase client ([lib/supabase/server.ts](lib/supabase/server.ts)) to auth the caller.
- Accepts `multipart/form-data` with one `file` field.
- Validates: content-type in whitelist, size ≤ 2 MB, decodable image.
- Writes to `avatars/{userId}/avatar.{ext}` with `upsert: true`.
- Updates `users.avatar_url` with the public URL (include `?v={timestamp}` cache-bust).
- Returns `{ avatar_url }`.

Why a route handler instead of direct browser-to-Storage upload: keeps validation (size, mimetype, dimensions if we add them later) server-side, and lets us atomically update `users.avatar_url` without a second client-side round trip.

### 4. Profile page UI

Edit [app/[locale]/learn/dashboard/settings/page.tsx](app/[locale]/learn/dashboard/settings/page.tsx):

- Load `avatar_url` alongside `full_name` and `locale_preference` in `loadProfile()`.
- Add a new block at the top of the **Profile** section (before Full Name):
  - Current avatar preview — circular, 96px, falls back to initials on `bg-bg-tertiary` if no avatar.
  - "Change photo" button (file input, `accept="image/jpeg,image/png,image/webp"`).
  - Optimistic preview via `URL.createObjectURL` while uploading; show spinner state.
  - On success, update local `avatarUrl` state and show "Saved" feedback using the same pattern as the existing `saved` flag.
  - Error state (oversize / wrong type / upload fail) rendered inline.
- Keep existing Full Name, Email, Language Preference, Save, Sign Out sections unchanged.

### 5. New i18n keys

Under `dashboard`:
- `profile_heading`, `nav_profile`
- `profile_avatar_label`, `profile_avatar_change`, `profile_avatar_uploading`, `profile_avatar_too_large`, `profile_avatar_wrong_type`, `profile_avatar_upload_failed`

## Verification

1. **Nav rename**: visit `/learn/dashboard` → sidebar shows "Profile"; visit `/ja/learn/dashboard` → shows "プロフィール". Page heading matches.
2. **Happy path upload**: pick a 500 KB JPEG → preview appears → after upload, refresh the page → avatar persists (reads from `users.avatar_url`).
3. **Size limit**: try a >2 MB file → inline error, no write.
4. **Mimetype**: try a `.gif` → inline error, no write.
5. **RLS**: using a curl/Postman request with User A's JWT, attempt to write to `avatars/{userB-id}/avatar.png` → 403. (Script this against the local supabase instance if available.)
6. **Cross-user isolation**: sign in as a second test user → their avatar is independent of the first.
7. **Community surface check**: no community component currently renders `avatar_url`, so nothing should regress. Grep to confirm: `avatar_url` usage should only grow, not change existing call sites.
8. **i18n parity**: `messages/en.json` and `messages/ja.json` both contain every new key (script: key-diff the two files).

## Deferred (track separately)

- **Smashhous / partner locale visibility**: no market/locale column on `partners` or `courses` today. Proper fix is a follow-up slice — likely `partners.available_locales text[]` default `{en,ja}` plus `{en}` for Smashhous, and filter partner-attributed course listings by the viewer's locale. Not blocking this slice; flagged for a dedicated plan.
- **Route rename `/settings` → `/profile`**: low value, breaks bookmarks. Skip.
- **Avatar on community pages**: add once community comment/member UI lands — this plan only makes the data available.

## Critical files

- [components/learn/StudentNav.tsx](components/learn/StudentNav.tsx)
- [app/[locale]/learn/dashboard/settings/page.tsx](app/[locale]/learn/dashboard/settings/page.tsx)
- [supabase/migrations/003_course_images_storage.sql](supabase/migrations/003_course_images_storage.sql) — pattern to mirror
- [supabase/migrations/001_phase2_schema.sql:12-26](supabase/migrations/001_phase2_schema.sql#L12-L26) — users table (avatar_url already exists)
- [lib/supabase/server.ts](lib/supabase/server.ts) — server client for the upload route
- `app/api/profile/avatar/route.ts` — new
- `supabase/migrations/030_avatars_storage.sql` — new
- `messages/en.json`, `messages/ja.json`
