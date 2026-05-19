-- Migration 039: users.password_set boolean
--
-- Tracks whether a user has a password set in auth.users. Avoids per-page-load
-- admin queries against auth.users.encrypted_password.
--
-- Users created via the standard signup flow (AuthForm sign-up) DO set a
-- password — backfill them to true. Users created via auth.admin.createUser
-- (the partner-checkout webhook path) do NOT have a password until they go
-- through SetPasswordCard or ResetPasswordForm — they stay false until then.

BEGIN;

ALTER TABLE users
  ADD COLUMN IF NOT EXISTS password_set boolean NOT NULL DEFAULT false;

-- Backfill: existing users predate the partner-checkout webhook path, so all
-- of them came through password signup. Mark them as having a password set.
-- Going forward, the default 'false' applies only to webhook-created accounts.
UPDATE users SET password_set = true WHERE password_set = false;

COMMIT;
