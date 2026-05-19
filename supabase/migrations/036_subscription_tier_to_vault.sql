-- Migration 036: subscription_tier 'premium' → 'vault' + widen enum to include 'community'
--
-- Context: We're moving from a single 'premium' tier (HonuVibe Vault) to a stacked
-- ladder of 'community' and 'vault' tiers. 'premium' is a subscription-vocabulary
-- term that becomes 'vault' (existing Vault subscribers keep their access).
--
-- Note: vault_content.access_tier / library_videos.access_tier ALSO use 'premium'
-- but that's a content-rating vocabulary, not a subscription level. Those columns
-- are NOT touched here.

BEGIN;

-- 1. Migrate existing data: 'premium' subscribers become 'vault' subscribers.
UPDATE users
SET subscription_tier = 'vault'
WHERE subscription_tier = 'premium';

-- 2. Widen the CHECK constraint.
ALTER TABLE users
  DROP CONSTRAINT IF EXISTS users_subscription_tier_check;

ALTER TABLE users
  ADD CONSTRAINT users_subscription_tier_check
  CHECK (subscription_tier IN ('free', 'community', 'vault'));

COMMIT;
