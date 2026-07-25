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
 *   - active partner membership → community access (seats are Vault-only)
 *   - sponsored partner seat → vault access for the block window
 *
 * These mirror the SQL helpers has_vault_access() / has_community_access()
 * (migrations 041, 042, 064). The parity test suite walks a shared case matrix
 * across both — if you change a rule here, change it there in the same commit.
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
 * A sponsored partner seat, flattened across partner_seat_grants and its
 * parent partner_seat_blocks. The tier is implicitly 'vault' in v1 — the
 * `granted_tier` CHECK on partner_seat_blocks admits no other value.
 */
export interface SeatGrantRow {
  access_starts_at: string;
  access_ends_at: string;
  revoked_at: string | null;
  block_is_active: boolean;
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
 * Returns true if `now` falls inside any unrevoked seat grant on an active
 * block.
 *
 * The window is INCLUSIVE at the start and EXCLUSIVE at the end — a member
 * loses Vault the instant `access_ends_at` is reached, matching the SQL
 * `access_starts_at <= now() AND now() < access_ends_at`.
 */
export function hasActiveSeatAccess(
  seatGrants: readonly SeatGrantRow[],
  now: Date = new Date(),
): boolean {
  return seatGrants.some(
    (g) =>
      g.revoked_at === null &&
      g.block_is_active &&
      now >= new Date(g.access_starts_at) &&
      now < new Date(g.access_ends_at),
  );
}

/**
 * Returns true if the user can see Community-tier content/features.
 * Granted by: active community sub, active vault sub, active cohort, OR an
 * active partner membership. Admins bypass.
 *
 * `hasActiveMembership` closes a pre-existing TypeScript/SQL divergence: SQL
 * `has_community_access()` has granted access on membership alone since 042,
 * but this function never did. Callers that know the membership state pass it
 * in; the default (`false`) preserves the old behaviour for callers that don't.
 *
 * Note there is deliberately no seat input here: seats sponsor Vault only, and
 * every seat holder is an active member anyway (a seat can only be granted
 * alongside membership).
 */
export function hasCommunityAccess(
  user: SubscriptionCheckUser,
  enrollments: readonly CohortEnrollmentRow[] = [],
  hasActiveMembership: boolean = false,
  now: Date = new Date(),
): boolean {
  if (user.role === 'admin') return true;

  if (hasActiveMembership) return true;

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
 * Granted by: active vault sub, active cohort, OR a sponsored partner seat.
 * Admins bypass.
 * Community subscribers do NOT get Vault access.
 */
export function hasVaultAccess(
  user: SubscriptionCheckUser,
  enrollments: readonly CohortEnrollmentRow[] = [],
  seatGrants: readonly SeatGrantRow[] = [],
  now: Date = new Date(),
): boolean {
  if (user.role === 'admin') return true;

  if (hasActiveSubscription(user, now) && user.subscription_tier === 'vault') {
    return true;
  }

  if (hasActiveCohortAccess(enrollments, now)) return true;

  return hasActiveSeatAccess(seatGrants, now);
}
