import { afterAll, beforeAll, beforeEach, describe, expect, test } from 'vitest';
import { anonClient, serviceClient, userClient } from './helpers/clients';
import { FIXTURES, resetCommunityData, seedFixtures } from './helpers/fixtures';

const PARTNERS = FIXTURES.partners;
const USERS = FIXTURES.users;

/**
 * The read path behind the branded member home (Unit 2), plus a
 * FORWARD-COMPATIBILITY TRIPWIRE for Unit 5.
 *
 * WHY EVERY SCOPE ASSERTION USES `vertice_member`:
 * `cp_admin_all` (042_community_feed.sql:323) is
 *   USING (public.is_admin() OR public.is_partner_for(partner_id))
 * and RLS policies are OR'd, so BOTH a HonuVibe admin and a partner admin read
 * straight past `cp_scope_read`. Asserting scope behaviour from either account
 * would pass regardless of whether scoping works. `vertice_member` is
 * role='student' and absent from `partner_admins` — do NOT "simplify" these
 * tests onto an admin client.
 */

// smashhaus is flipped unlisted for the tripwire and restored afterwards.
async function setPartnerPublic(partnerId: string, isPublic: boolean): Promise<void> {
  const { error } = await serviceClient()
    .from('partners')
    .update({ is_public: isPublic })
    .eq('id', partnerId);
  if (error) throw error;
}

async function setPartnerActive(partnerId: string, isActive: boolean): Promise<void> {
  const { error } = await serviceClient()
    .from('partners')
    .update({ is_active: isActive })
    .eq('id', partnerId);
  if (error) throw error;
}

async function setMemberStatus(
  partnerId: string,
  userId: string,
  status: 'active' | 'removed',
): Promise<void> {
  const { error } = await serviceClient()
    .from('partner_members')
    .update({ status })
    .eq('partner_id', partnerId)
    .eq('user_id', userId);
  if (error) throw error;
}

beforeAll(async () => {
  await seedFixtures();
  await setPartnerPublic(PARTNERS.smashhaus, false);
});

afterAll(async () => {
  await setPartnerPublic(PARTNERS.smashhaus, true);
  await setPartnerActive(PARTNERS.smashhaus, true);
  await setMemberStatus(PARTNERS.smashhaus, USERS.smashhaus_member, 'active');
});

describe('partner branding read path', () => {
  test('1. TODAY even anon reads an unlisted partner row (documents the gap)', async () => {
    // `partners_public_read` is USING (is_active = true) with no role
    // restriction, so anon reads every ACTIVE partner regardless of is_public —
    // which 029_partners.sql:84-86 states outright: "is_public controls SEO
    // indexability, NOT read access."
    //
    // Recorded as current behaviour, not as an endorsement. It is the reason
    // Unit 5 wants to tighten the policy, and the reason test 2 below cannot be
    // read as proof that member-scoped access exists.
    const { data } = await anonClient()
      .from('partners')
      .select('id, is_active')
      .eq('id', PARTNERS.smashhaus)
      .maybeSingle();

    expect(data?.id).toBe(PARTNERS.smashhaus);
  });

  test('1b. anon cannot read an INACTIVE partner', async () => {
    // The one thing the policy does gate. Confirms the branding query's
    // is_active filter is backed by RLS, not only by the app.
    await setPartnerActive(PARTNERS.smashhaus, false);
    try {
      const { data } = await anonClient()
        .from('partners')
        .select('id')
        .eq('id', PARTNERS.smashhaus);
      expect(data ?? []).toEqual([]);
    } finally {
      await setPartnerActive(PARTNERS.smashhaus, true);
    }
  });

  test('2. an active member reads their own unlisted partner (Unit 5 TRIPWIRE)', async () => {
    const client = await userClient(USERS.smashhaus_member);
    const { data } = await client
      .from('partners')
      .select('id, slug, name_en, name_jp, logo_url, primary_color, secondary_color, is_active')
      .eq('id', PARTNERS.smashhaus)
      .maybeSingle();

    expect(data?.id).toBe(PARTNERS.smashhaus);
    expect(data?.is_active).toBe(true);
  });

  test('3. today that read comes from partners_public_read, NOT a member policy', async () => {
    // An unrelated authenticated user with no membership reads the same unlisted
    // row, because partners_public_read is USING (is_active = true) and ignores
    // is_public. Test 2 therefore proves the branding query works TODAY — it is
    // not evidence that member-scoped access exists.
    //
    // Unit 5 plans to tighten this to USING (is_active AND is_public). When it
    // does, THIS test flips to expecting [] and test 2 goes red unless Unit 5
    // adds a member-read policy in the same migration. That is the tripwire.
    const client = await userClient(USERS.honuvibe_paid);
    const { data } = await client
      .from('partners')
      .select('id')
      .eq('id', PARTNERS.smashhaus)
      .maybeSingle();

    expect(data?.id).toBe(PARTNERS.smashhaus);
  });

  test('4. the membership query returns the row for its own user only', async () => {
    const client = await userClient(USERS.vertice_member);
    const { data } = await client
      .from('partner_members')
      .select('partner_id, user_id, status')
      .eq('user_id', USERS.vertice_member)
      .eq('status', 'active');

    expect(data ?? []).toHaveLength(1);
    expect(data?.[0].partner_id).toBe(PARTNERS.vertice);
  });

  test("5. a member cannot read another user's partner_members row", async () => {
    const client = await userClient(USERS.vertice_member);
    const { data } = await client
      .from('partner_members')
      .select('partner_id, user_id')
      .eq('user_id', USERS.smashhaus_member);

    expect(data ?? []).toEqual([]);
  });

  test('6. a removed member has no active row, so branding resolves to nothing', async () => {
    await setMemberStatus(PARTNERS.smashhaus, USERS.smashhaus_member, 'removed');
    try {
      const client = await userClient(USERS.smashhaus_member);
      const { data } = await client
        .from('partner_members')
        .select('partner_id')
        .eq('user_id', USERS.smashhaus_member)
        .eq('status', 'active');

      expect(data ?? []).toEqual([]);
    } finally {
      await setMemberStatus(PARTNERS.smashhaus, USERS.smashhaus_member, 'active');
    }
  });
});

describe('community scope — plain member', () => {
  beforeEach(async () => {
    await resetCommunityData();
  });

  async function seedPost(partnerId: string | null, authorId: string, body: string) {
    const { data, error } = await serviceClient()
      .from('community_posts')
      .insert({ partner_id: partnerId, author_id: authorId, category: 'general', body_md: body })
      .select('id')
      .single();
    if (error) throw error;
    return data.id as string;
  }

  test('7. community_scope_for returns the partner id for an active member', async () => {
    const client = await userClient(USERS.vertice_member);
    const { data } = await client.rpc('community_scope_for', {
      p_user_id: USERS.vertice_member,
    });
    expect(data).toBe(PARTNERS.vertice);
  });

  test('8. community_scope_for returns null for a non-member', async () => {
    const client = await userClient(USERS.honuvibe_paid);
    const { data } = await client.rpc('community_scope_for', {
      p_user_id: USERS.honuvibe_paid,
    });
    expect(data).toBeNull();
  });

  test('9. a plain member reads their partner feed and NOT the global feed', async () => {
    await seedPost(null, USERS.honuvibe_paid, 'global post');
    await seedPost(PARTNERS.vertice, USERS.vertice_member, 'vertice post');

    const client = await userClient(USERS.vertice_member);
    const { data } = await client.from('community_posts').select('partner_id, body_md');

    const bodies = (data ?? []).map((r) => r.body_md);
    expect(bodies).toContain('vertice post');
    expect(bodies).not.toContain('global post');
  });

  test('10. a non-member reads the global feed and NOT a partner feed', async () => {
    await seedPost(null, USERS.honuvibe_paid, 'global post');
    await seedPost(PARTNERS.vertice, USERS.vertice_member, 'vertice post');

    const client = await userClient(USERS.honuvibe_paid);
    const { data } = await client.from('community_posts').select('partner_id, body_md');

    const bodies = (data ?? []).map((r) => r.body_md);
    expect(bodies).toContain('global post');
    expect(bodies).not.toContain('vertice post');
  });

  test('11. an ADMIN bypasses scope entirely — why tests 9/10 use a plain member', async () => {
    // Documents cp_admin_all. If a future edit points the scope assertions at an
    // admin client, they pass vacuously; this test is the record of why.
    await seedPost(null, USERS.honuvibe_paid, 'global post');
    await seedPost(PARTNERS.vertice, USERS.vertice_member, 'vertice post');

    const client = await userClient(USERS.honuvibe_admin);
    const { data } = await client.from('community_posts').select('body_md');

    const bodies = (data ?? []).map((r) => r.body_md);
    expect(bodies).toContain('global post');
    expect(bodies).toContain('vertice post');
  });
});
