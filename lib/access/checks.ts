/**
 * Access checks — pure functions, easy to unit-test.
 *
 * These determine what a user can see based on subscription state +
 * cohort enrollments. They do NOT fetch from the DB. Callers pass in
 * pre-fetched rows.
 *
 * Stacked ladder:
 *   - any signed-in account → community access (Community is free, 078)
 *   - 'vault' tier → vault access
 *   - active cohort enrollment → vault access for the bundle window
 *   - sponsored partner seat → vault access for the block window
 *   Partner membership no longer changes community *access*, only the feed
 *   scope (community_scope_for); seats are Vault-only.
 *
 * These mirror the SQL helpers has_vault_access() / has_community_access()
 * (migrations 041, 042, 064, 078). The parity test suite walks a shared case matrix
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
 *
 * Honu Community is free for every signed-in account (locked decision #2,
 * migration 078), so any user object qualifies. Being handed a user row means
 * the caller already resolved a session; signed-out visitors never reach here.
 *
 * The signature is kept so existing callers and the parity matrix don't churn;
 * enrollments, membership and `now` no longer affect the answer.
 */
export function hasCommunityAccess(
  _user: SubscriptionCheckUser,
  _enrollments: readonly CohortEnrollmentRow[] = [],
  _hasActiveMembership: boolean = false,
  _now: Date = new Date(),
): boolean {
  return true;
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
