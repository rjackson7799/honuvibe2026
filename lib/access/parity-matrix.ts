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
 */

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
    description: 'Free account with no membership, cohort or seat',
    user: student('free', null),
    membership: 'none',
    cohort: null,
    seat: null,
    expectVault: false,
    expectCommunity: false,
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
    expectCommunity: false,
  },
  {
    id: 'community_sub',
    description: 'Community subscribers do NOT get Vault',
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
    expectCommunity: false,
  },
  {
    id: 'membership_active_only',
    description: 'Active membership alone grants Community, never Vault',
    user: student('free', null),
    membership: 'active',
    cohort: null,
    seat: null,
    expectVault: false,
    expectCommunity: true,
  },
  {
    id: 'membership_removed_only',
    description: 'A removed membership grants nothing',
    user: student('free', null),
    membership: 'removed',
    cohort: null,
    seat: null,
    expectVault: false,
    expectCommunity: false,
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
      'A seat grants Vault on its own. Community still needs membership or a sub. ' +
      'Only reachable by direct DB writes — remove_partner_member revokes grants.',
    user: student('free', null),
    membership: 'none',
    cohort: null,
    seat: { startDays: -1, endDays: 30, revoked: false, blockActive: true },
    expectVault: true,
    expectCommunity: false,
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
