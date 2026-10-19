/**
 * The shared entitlement case matrix.
 *
 * Two suites walk this same list:
 *   - __tests__/lib/access/checks.test.ts       → the pure TypeScript functions
 *   - supabase/tests/partner_entitlement_parity.test.ts → the SQL helpers
 *     has_vault_access() / has_community_access(), against a real database
 *
 * If the two ever disagree, one of them is wrong and a member either loses
 * access the UI promised or sees content the database would refuse. Add a case
 * here — never to only one side.
 *
 * Every window is expressed as an offset in days from "now" so both suites can
 * materialize concrete timestamps against the same instant.
 *
 * Since migration 078 Honu Community is free for any account, so every case
 * expects Community. The cases stay so a regression in either direction (SQL or
 * TypeScript re-gating Community on a sub, cohort or membership) shows up here.
 */

import type { CohortEnrollmentRow, SeatGrantRow, SubscriptionCheckUser } from './checks';

export type MembershipState = 'none' | 'active' | 'removed';

export type AccessCase = {
  id: string;
  description: string;
  user: {
    role: 'student' | 'admin';
    subscription_tier: 'free' | 'community' | 'vault' | null;
    subscription_status: 'active' | 'trialing' | 'cancelled' | null;
    /** Days from now; null means no expiry recorded. */
    subscriptionExpiresInDays: number | null;
  };
  membership: MembershipState;
  /** Cohort bundle window, in days from now. */
  cohort: { startDays: number; endDays: number } | null;
  /** Sponsored seat + its block, in days from now. */
  seat: {
    startDays: number;
    endDays: number;
    revoked: boolean;
    blockActive: boolean;
  } | null;
  expectVault: boolean;
  expectCommunity: boolean;
};

const student = (
  tier: 'free' | 'community' | 'vault' | null,
  status: 'active' | 'trialing' | 'cancelled' | null,
  expiresInDays: number | null = null,
) =>
  ({
    role: 'student' as const,
    subscription_tier: tier,
    subscription_status: status,
    subscriptionExpiresInDays: expiresInDays,
  });

export const ACCESS_CASES: readonly AccessCase[] = [
  {
    id: 'free_nothing',
    description: 'Free account with no membership, cohort or seat — Community, no Vault',
    user: student('free', null),
    membership: 'none',
    cohort: null,
    seat: null,
    expectVault: false,
    expectCommunity: true,
  },
  {
    id: 'admin',
    description: 'Admin bypasses both gates',
    user: { ...student('free', null), role: 'admin' },
    membership: 'none',
    cohort: null,
    seat: null,
    expectVault: true,
    expectCommunity: true,
  },
  {
    id: 'vault_active',
    description: 'Active Vault subscription',
    user: student('vault', 'active'),
    membership: 'none',
    cohort: null,
    seat: null,
    expectVault: true,
    expectCommunity: true,
  },
  {
    id: 'vault_trialing',
    description: 'Trialing Vault subscription',
    user: student('vault', 'trialing'),
    membership: 'none',
    cohort: null,
    seat: null,
    expectVault: true,
    expectCommunity: true,
  },
  {
    id: 'vault_cancelled_in_grace',
    description: 'Cancelled Vault sub still inside its paid period',
    user: student('vault', 'cancelled', 10),
    membership: 'none',
    cohort: null,
    seat: null,
    expectVault: true,
    expectCommunity: true,
  },
  {
    id: 'vault_cancelled_lapsed',
    description: 'Cancelled Vault sub past its expiry',
    user: student('vault', 'cancelled', -1),
    membership: 'none',
    cohort: null,
    seat: null,
    expectVault: false,
    expectCommunity: true,
  },
  {
    id: 'community_sub',
    description: 'Legacy $29 Community subscribers do NOT get Vault',
    user: student('community', 'active'),
    membership: 'none',
    cohort: null,
    seat: null,
    expectVault: false,
    expectCommunity: true,
  },
  {
    id: 'cohort_active',
    description: 'Inside a cohort bundle window',
    user: student('free', null),
    membership: 'none',
    cohort: { startDays: -5, endDays: 30 },
    seat: null,
    expectVault: true,
    expectCommunity: true,
  },
  {
    id: 'cohort_past',
    description: 'Cohort bundle window already closed',
    user: student('free', null),
    membership: 'none',
    cohort: { startDays: -60, endDays: -30 },
    seat: null,
    expectVault: false,
    expectCommunity: true,
  },
  {
    id: 'membership_active_only',
    description: 'Active membership never grants Vault',
    user: student('free', null),
    membership: 'active',
    cohort: null,
    seat: null,
    expectVault: false,
    expectCommunity: true,
  },
  {
    id: 'membership_removed_only',
    description: 'A removed membership grants no Vault',
    user: student('free', null),
    membership: 'removed',
    cohort: null,
    seat: null,
    expectVault: false,
    expectCommunity: true,
  },
  {
    id: 'seat_active',
    description: 'Active membership + in-window sponsored seat',
    user: student('free', null),
    membership: 'active',
    cohort: null,
    seat: { startDays: -1, endDays: 30, revoked: false, blockActive: true },
    expectVault: true,
    expectCommunity: true,
  },
  {
    id: 'seat_revoked',
    description: 'Revoked seat loses Vault; membership keeps Community',
    user: student('free', null),
    membership: 'active',
    cohort: null,
    seat: { startDays: -1, endDays: 30, revoked: true, blockActive: true },
    expectVault: false,
    expectCommunity: true,
  },
  {
    id: 'seat_block_expired',
    description: 'Seat on a block whose window has closed',
    user: student('free', null),
    membership: 'active',
    cohort: null,
    seat: { startDays: -60, endDays: -1, revoked: false, blockActive: true },
    expectVault: false,
    expectCommunity: true,
  },
  {
    id: 'seat_block_future',
    description: 'Seat on a block that has not started yet',
    user: student('free', null),
    membership: 'active',
    cohort: null,
    seat: { startDays: 5, endDays: 60, revoked: false, blockActive: true },
    expectVault: false,
    expectCommunity: true,
  },
  {
    id: 'seat_block_deactivated',
    description: 'Seat on a deactivated block — the kill switch works',
    user: student('free', null),
    membership: 'active',
    cohort: null,
    seat: { startDays: -1, endDays: 30, revoked: false, blockActive: false },
    expectVault: false,
    expectCommunity: true,
  },
  {
    id: 'seat_without_membership',
    description:
      'A seat grants Vault on its own; Community comes with any account. ' +
      'Only reachable by direct DB writes — remove_partner_member revokes grants.',
    user: student('free', null),
    membership: 'none',
    cohort: null,
    seat: { startDays: -1, endDays: 30, revoked: false, blockActive: true },
    expectVault: true,
    expectCommunity: true,
  },
  {
    id: 'seat_plus_community_sub',
    description: 'Stacking: seat for Vault, own Community sub underneath',
    user: student('community', 'active'),
    membership: 'active',
    cohort: null,
    seat: { startDays: -1, endDays: 30, revoked: false, blockActive: true },
    expectVault: true,
    expectCommunity: true,
  },
  {
    id: 'expired_seat_plus_cohort',
    description: 'Expired seat but a live cohort still carries Vault',
    user: student('free', null),
    membership: 'active',
    cohort: { startDays: -2, endDays: 20 },
    seat: { startDays: -60, endDays: -1, revoked: false, blockActive: true },
    expectVault: true,
    expectCommunity: true,
  },
];

export function daysFrom(now: Date, days: number): Date {
  return new Date(now.getTime() + days * 24 * 60 * 60 * 1000);
}

// ---------------------------------------------------------------------------
// Course access (B3, migration 087)
//
// Walked by:
//   - __tests__/lib/access/checks.test.ts  → canReadCourseContent()
//   - supabase/tests/course_material_access_rls.test.ts → can_read_course_materials()
//     and can_access_course_esl(), against a real database
//
// Staff are excluded on purpose (plan D5): SQL grants admins and assigned
// instructors every course via can_manage_course(); the learner-facing
// TypeScript does not (admins still read included courses through the Vault).
// ---------------------------------------------------------------------------

export type VaultState =
  | 'anon'
  | 'none'
  | 'vault_active'
  | 'vault_trialing'
  | 'vault_cancelled_grace'
  | 'vault_cancelled_expired'
  | 'vault_past_due'
  | 'community_active'
  | 'cohort_window'
  | 'seat_active';

export type CourseAccessCase = {
  id: string;
  description: string;
  vault: VaultState;
  enrollment: 'active' | 'completed' | 'refunded' | 'cancelled' | null;
  /** The enrollment row sits on a DIFFERENT course (legacy course buyer). */
  enrollmentOnOtherCourse?: boolean;
  course: { published: boolean; vaultIncluded: boolean };
  expectCourse: boolean;
  /** Evaluated on the same course with esl_enabled + esl_included. */
  expectEsl: boolean;
};

const INCLUDED = { published: true, vaultIncluded: true };
const NOT_INCLUDED = { published: true, vaultIncluded: false };

export const COURSE_ACCESS_CASES: readonly CourseAccessCase[] = [
  { id: 'anon-included', description: 'Signed-out visitor on an included course', vault: 'anon', enrollment: null, course: INCLUDED, expectCourse: false, expectEsl: false },
  { id: 'none-included', description: 'Free account, no Vault, on an included course', vault: 'none', enrollment: null, course: INCLUDED, expectCourse: false, expectEsl: false },
  { id: 'active-included', description: 'Active Vault sub reads an included course', vault: 'vault_active', enrollment: null, course: INCLUDED, expectCourse: true, expectEsl: true },
  { id: 'trialing-included', description: 'Trialing Vault sub reads an included course', vault: 'vault_trialing', enrollment: null, course: INCLUDED, expectCourse: true, expectEsl: true },
  { id: 'grace-included', description: 'Cancelled Vault sub inside its paid period still reads', vault: 'vault_cancelled_grace', enrollment: null, course: INCLUDED, expectCourse: true, expectEsl: true },
  { id: 'expired-included', description: 'Cancelled Vault sub past expiry is locked out', vault: 'vault_cancelled_expired', enrollment: null, course: INCLUDED, expectCourse: false, expectEsl: false },
  { id: 'past-due-included', description: 'Past-due Vault sub is locked out', vault: 'vault_past_due', enrollment: null, course: INCLUDED, expectCourse: false, expectEsl: false },
  { id: 'community-included', description: 'Legacy Community-tier sub is not Vault', vault: 'community_active', enrollment: null, course: INCLUDED, expectCourse: false, expectEsl: false },
  { id: 'cohort-included', description: 'Inside a cohort bundle window reads an included course', vault: 'cohort_window', enrollment: null, course: INCLUDED, expectCourse: true, expectEsl: true },
  { id: 'seat-included', description: 'Sponsored partner seat reads an included course', vault: 'seat_active', enrollment: null, course: INCLUDED, expectCourse: true, expectEsl: true },
  { id: 'active-not-included', description: 'Active Vault sub gets nothing on a non-included course', vault: 'vault_active', enrollment: null, course: NOT_INCLUDED, expectCourse: false, expectEsl: false },
  { id: 'active-included-unpublished', description: 'Active Vault sub cannot read an included draft', vault: 'vault_active', enrollment: null, course: { published: false, vaultIncluded: true }, expectCourse: false, expectEsl: false },
  { id: 'enrolled-active-not-included', description: 'Active enrollment reads its own course', vault: 'none', enrollment: 'active', course: NOT_INCLUDED, expectCourse: true, expectEsl: true },
  { id: 'enrolled-completed-not-included', description: 'Completed enrollment keeps reading', vault: 'none', enrollment: 'completed', course: NOT_INCLUDED, expectCourse: true, expectEsl: true },
  { id: 'enrolled-refunded-not-included', description: 'Refunded enrollment is locked out', vault: 'none', enrollment: 'refunded', course: NOT_INCLUDED, expectCourse: false, expectEsl: false },
  { id: 'enrolled-cancelled-not-included', description: 'Cancelled enrollment is locked out', vault: 'none', enrollment: 'cancelled', course: NOT_INCLUDED, expectCourse: false, expectEsl: false },
  { id: 'expired-plus-enrolled-active', description: 'Lapsed Vault sub with an active enrollment still reads via the enrollment', vault: 'vault_cancelled_expired', enrollment: 'active', course: INCLUDED, expectCourse: true, expectEsl: true },
  { id: 'legacy-other-course-enrollment-included', description: 'A buyer of a DIFFERENT course is not a Vault member', vault: 'none', enrollment: 'active', enrollmentOnOtherCourse: true, course: INCLUDED, expectCourse: false, expectEsl: false },
];

/**
 * Materialize a VaultState as the rows hasVaultAccess() reads (and the SQL
 * suite seeds). Returns null for 'anon' — there is no user at all.
 */
export function vaultStateFixture(
  state: VaultState,
  now: Date,
): { user: SubscriptionCheckUser; cohort: CohortEnrollmentRow[]; seats: SeatGrantRow[] } | null {
  const user = (
    tier: string | null,
    status: string | null,
    expiresInDays: number | null = null,
  ): SubscriptionCheckUser => ({
    role: 'student',
    subscription_tier: tier,
    subscription_status: status,
    subscription_expires_at: expiresInDays === null ? null : daysFrom(now, expiresInDays).toISOString(),
  });
  const plain = (u: SubscriptionCheckUser) => ({ user: u, cohort: [], seats: [] });

  switch (state) {
    case 'anon':
      return null;
    case 'none':
      return plain(user('free', null));
    case 'vault_active':
      return plain(user('vault', 'active'));
    case 'vault_trialing':
      return plain(user('vault', 'trialing'));
    case 'vault_cancelled_grace':
      return plain(user('vault', 'cancelled', 10));
    case 'vault_cancelled_expired':
      return plain(user('vault', 'cancelled', -1));
    case 'vault_past_due':
      return plain(user('vault', 'past_due'));
    case 'community_active':
      return plain(user('community', 'active'));
    case 'cohort_window':
      return {
        user: user('free', null),
        cohort: [
          {
            bundle_access_starts_at: daysFrom(now, -5).toISOString(),
            bundle_access_ends_at: daysFrom(now, 30).toISOString(),
          },
        ],
        seats: [],
      };
    case 'seat_active':
      return {
        user: user('free', null),
        cohort: [],
        seats: [
          {
            access_starts_at: daysFrom(now, -1).toISOString(),
            access_ends_at: daysFrom(now, 30).toISOString(),
            revoked_at: null,
            block_is_active: true,
          },
        ],
      };
  }
}
