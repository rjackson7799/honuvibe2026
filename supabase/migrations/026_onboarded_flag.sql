-- 026: Add onboarded flag to track first-login welcome screen state.
-- Default false — set to true after new student completes the welcome screen.
ALTER TABLE users ADD COLUMN IF NOT EXISTS onboarded boolean NOT NULL DEFAULT false;
