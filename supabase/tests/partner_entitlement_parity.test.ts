/**
 * SQL half of the shared entitlement case matrix.
 *
 * The TypeScript half is __tests__/lib/access/checks.test.ts. Both walk
 * lib/access/parity-matrix.ts. If these two suites ever disagree, a member
 * either loses access the UI promised or sees content the database refuses.
 */

import { describe, it, expect, beforeAll } from 'vitest';
import { serviceClient } from './helpers/clients';
import {
  SPINE,
  seedSpinePartners,
  seedUser,
  spineUserId,
  resetSpineData,
  daysFromNow,
} from './helpers/partner-spine';
import { ACCESS_CASES } from '../../lib/access/parity-matrix';

const admin = serviceClient();

/** Deterministic, collision-free user id per matrix case. */
function caseUserId(index: number): string {
  return spineUserId(`aa${index.toString(16).padStart(4, '0')}`);
}

beforeAll(async () => {
  await seedSpinePartners();

  const userIds = ACCESS_CASES.map((_, i) => caseUserId(i));
  await resetSpineData(userIds);

  for (const [index, c] of ACCESS_CASES.entries()) {
    const userId = caseUserId(index);
    await seedUser(userId, {
      role: c.user.role,
      subscription_tier: c.user.subscription_tier,
      subscription_status: c.user.subscription_status,
      subscription_expires_at:
        c.user.subscriptionExpiresInDays === null
          ? null
          : daysFromNow(c.user.subscriptionExpiresInDays),
    });

    if (c.membership !== 'none') {
      const { error } = await admin.from('partner_members').insert({
        partner_id: SPINE.partners.alpha,
        user_id: userId,
        role: 'member',
        status: c.membership,
        joined_via: 'join_code',
        removed_at: c.membership === 'removed' ? daysFromNow(-1) : null,
      });
      if (error) throw error;
    }

    if (c.cohort) {
      const { error } = await admin.from('cohort_enrollments').insert({
        user_id: userId,
        cohort_id: `parity-${c.id}`,
        stripe_session_id: `cs_parity_${c.id}`,
        amount_paid: 0,
        currency: 'usd',
        bundle_access_starts_at: daysFromNow(c.cohort.startDays),
        bundle_access_ends_at: daysFromNow(c.cohort.endDays),
      });
      if (error) throw error;
    }

    if (c.seat) {
      const { data: block, error: blockError } = await admin
        .from('partner_seat_blocks')
        .insert({
          partner_id: SPINE.partners.alpha,
          label: `parity ${c.id}`,
          seats_total: 5,
          granted_tier: 'vault',
          access_starts_at: daysFromNow(c.seat.startDays),
          access_ends_at: daysFromNow(c.seat.endDays),
          source: 'sponsored',
          is_active: c.seat.blockActive,
        })
        .select('id')
        .single();
      if (blockError) throw blockError;

      const { error: grantError } = await admin.from('partner_seat_grants').insert({
        seat_block_id: block.id,
        user_id: userId,
        revoked_at: c.seat.revoked ? daysFromNow(-1) : null,
      });
      if (grantError) throw grantError;
    }
  }
}, 120_000);

describe('TS↔SQL entitlement parity', () => {
  for (const [index, c] of ACCESS_CASES.entries()) {
    it(`${c.id}: ${c.description}`, async () => {
      const userId = caseUserId(index);

      const { data: vault, error: vaultError } = await admin.rpc('has_vault_access', {
        uid: userId,
      });
      if (vaultError) throw vaultError;

      const { data: community, error: communityError } = await admin.rpc(
        'has_community_access',
        { p_user_id: userId },
      );
      if (communityError) throw communityError;

      expect(vault, `has_vault_access for ${c.id}`).toBe(c.expectVault);
      expect(community, `has_community_access for ${c.id}`).toBe(c.expectCommunity);
    });
  }
});

describe('community_scope_for ignores removed memberships', () => {
  it('resolves the partner for an active member', async () => {
    const activeIndex = ACCESS_CASES.findIndex((c) => c.id === 'membership_active_only');
    const { data, error } = await admin.rpc('community_scope_for', {
      p_user_id: caseUserId(activeIndex),
    });
    if (error) throw error;
    expect(data).toBe(SPINE.partners.alpha);
  });

  it('returns NULL once the membership is removed', async () => {
    const removedIndex = ACCESS_CASES.findIndex((c) => c.id === 'membership_removed_only');
    const { data, error } = await admin.rpc('community_scope_for', {
      p_user_id: caseUserId(removedIndex),
    });
    if (error) throw error;
    expect(data).toBeNull();
  });
});

describe('seat window boundary in SQL', () => {
  it('denies Vault at the exact end instant (exclusive end)', async () => {
    const userId = spineUserId('bb01');
    await seedUser(userId);

    const { data: block, error: blockError } = await admin
      .from('partner_seat_blocks')
      .insert({
        partner_id: SPINE.partners.alpha,
        label: 'boundary block',
        seats_total: 1,
        granted_tier: 'vault',
        access_starts_at: daysFromNow(-10),
        // Ends a hair in the past — "now" is already past the exclusive end.
        access_ends_at: new Date(Date.now() - 1_000).toISOString(),
        source: 'sponsored',
        is_active: true,
      })
      .select('id')
      .single();
    if (blockError) throw blockError;

    await admin
      .from('partner_seat_grants')
      .insert({ seat_block_id: block.id, user_id: userId });

    const { data } = await admin.rpc('has_vault_access', { uid: userId });
    expect(data).toBe(false);
  });
});
