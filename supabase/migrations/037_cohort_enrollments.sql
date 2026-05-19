-- Migration 037: cohort_enrollments table
--
-- Cohort purchases are one-time payments that grant time-boxed access to
-- Vault + Community for the cohort duration + 90 days. Tracked separately from
-- subscriptions because they don't fit the recurring billing model.

BEGIN;

CREATE TABLE cohort_enrollments (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id uuid NOT NULL REFERENCES users(id) ON DELETE CASCADE,
  cohort_id text NOT NULL,
  stripe_session_id text NOT NULL UNIQUE,
  stripe_payment_intent_id text,
  amount_paid integer NOT NULL,
  currency text NOT NULL,
  partner_slug text,
  bundle_access_starts_at timestamptz NOT NULL,
  bundle_access_ends_at timestamptz NOT NULL,
  created_at timestamptz NOT NULL DEFAULT now(),

  CONSTRAINT cohort_enrollments_user_cohort_unique UNIQUE (user_id, cohort_id)
);

CREATE INDEX idx_cohort_enrollments_user ON cohort_enrollments(user_id);
CREATE INDEX idx_cohort_enrollments_cohort ON cohort_enrollments(cohort_id);
CREATE INDEX idx_cohort_enrollments_active_window
  ON cohort_enrollments(user_id, bundle_access_ends_at)
  WHERE bundle_access_ends_at > now();

-- RLS: users see their own rows; service role writes (webhook only).
ALTER TABLE cohort_enrollments ENABLE ROW LEVEL SECURITY;

CREATE POLICY cohort_enrollments_select_own
  ON cohort_enrollments FOR SELECT
  USING (auth.uid() = user_id);

COMMIT;
