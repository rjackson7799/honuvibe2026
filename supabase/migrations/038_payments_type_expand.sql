-- Migration 038: widen payments.type CHECK constraint
--
-- Current allowed values (from migration 010): course_purchase, vault_subscription,
-- vault_renewal, esl_purchase. Adding community_renewal (monthly Community sub
-- charges) and cohort_purchase (one-time cohort payments).

BEGIN;

ALTER TABLE payments
  DROP CONSTRAINT IF EXISTS payments_type_check,
  ADD CONSTRAINT payments_type_check
    CHECK (type IN (
      'course_purchase',
      'vault_subscription',
      'vault_renewal',
      'community_renewal',
      'cohort_purchase',
      'esl_purchase'
    ));

COMMIT;
