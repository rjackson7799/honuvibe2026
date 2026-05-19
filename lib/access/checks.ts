/**
 * Access checks — pure functions, easy to unit-test.
 *
 * These determine what a user can see based on subscription state +
 * cohort enrollments. They do NOT fetch from the DB. Callers pass in
 * pre-fetched rows.
 *
 * Stacked ladder:
 *   - 'community' tier → community access
 *   - 'vault' tier → vault + community access
 *   - active cohort enrollment → vault + community access for the bundle window
 */

export interface SubscriptionCheckUser {
  role?: string | null;
  subscription_tier: string | null;
  subscription_status: string | null;
  subscription_expires_at: string | null;
}

export interface CohortEnrollmentRow {
  bundle_access_starts_at: string;
  bundle_access_ends_at: string;
}

/**
 * Returns true if the user's subscription is in a state that grants access.
 * Includes cancelled-grace: cancelled subs retain access until
 * subscription_expires_at.
 */
export function hasActiveSubscription(
  user: SubscriptionCheckUser,
  now: Date = new Date(),
): boolean {
  const status = user.subscription_status;

  if (status === 'active' || status === 'trialing') return true;

  if (status === 'cancelled' && user.subscription_expires_at) {
    return now < new Date(user.subscription_expires_at);
  }

  return false;
}

/**
 * Returns true if `now` falls within any of the user's cohort enrollment
 * bundle windows.
 */
export function hasActiveCohortAccess(
  enrollments: readonly CohortEnrollmentRow[],
  now: Date = new Date(),
): boolean {
  return enrollments.some(
    (e) =>
      now >= new Date(e.bundle_access_starts_at) &&
      now <= new Date(e.bundle_access_ends_at),
  );
}

/**
 * Returns true if the user can see Community-tier content/features.
 * Granted by: active community sub, active vault sub, OR active cohort.
 * Admins bypass.
 */
export function hasCommunityAccess(
  user: SubscriptionCheckUser,
  enrollments: readonly CohortEnrollmentRow[] = [],
  now: Date = new Date(),
): boolean {
  if (user.role === 'admin') return true;

  if (
    hasActiveSubscription(user, now) &&
    (user.subscription_tier === 'community' || user.subscription_tier === 'vault')
  ) {
    return true;
  }

  return hasActiveCohortAccess(enrollments, now);
}

/**
 * Returns true if the user can see Vault-tier content/features.
 * Granted by: active vault sub OR active cohort.
 * Admins bypass.
 * Community subscribers do NOT get Vault access.
 */
export function hasVaultAccess(
  user: SubscriptionCheckUser,
  enrollments: readonly CohortEnrollmentRow[] = [],
  now: Date = new Date(),
): boolean {
  if (user.role === 'admin') return true;

  if (hasActiveSubscription(user, now) && user.subscription_tier === 'vault') {
    return true;
  }

  return hasActiveCohortAccess(enrollments, now);
}
