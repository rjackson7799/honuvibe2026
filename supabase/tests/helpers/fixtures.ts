import { serviceClient } from './clients';

export const FIXTURES = {
  partners: {
    vertice: '11111111-1111-1111-1111-111111111111',
    smashhaus: '22222222-2222-2222-2222-222222222222',
  },
  users: {
    honuvibe_paid: 'aaaaaaaa-aaaa-aaaa-aaaa-aaaaaaaaaaa1',
    honuvibe_free: 'aaaaaaaa-aaaa-aaaa-aaaa-aaaaaaaaaaa2',
    vertice_member: 'aaaaaaaa-aaaa-aaaa-aaaa-aaaaaaaaaaa3',
    smashhaus_member: 'aaaaaaaa-aaaa-aaaa-aaaa-aaaaaaaaaaa4',
    banned_vertice: 'aaaaaaaa-aaaa-aaaa-aaaa-aaaaaaaaaaa5',
    honuvibe_admin: 'aaaaaaaa-aaaa-aaaa-aaaa-aaaaaaaaaaa6',
    vertice_partner_admin: 'aaaaaaaa-aaaa-aaaa-aaaa-aaaaaaaaaaa7',
  },
} as const;

type UserKey = keyof typeof FIXTURES.users;

/**
 * Idempotent: creates auth.users + public.users + memberships/bans
 * for every fixture user. Safe to call before each test suite.
 */
export async function seedFixtures(): Promise<void> {
  const admin = serviceClient();

  // 0. partner rows (must exist before partner_members FK can be satisfied)
  const { error: partnersErr } = await admin.from('partners').upsert(
    [
      {
        id: FIXTURES.partners.vertice,
        slug: 'vertice-society',
        name_en: 'Vertice Society (fixture)',
        is_active: true,
      },
      {
        id: FIXTURES.partners.smashhaus,
        slug: 'smashhaus',
        name_en: 'SmashHaus (fixture)',
        is_active: true,
      },
    ],
    { onConflict: 'slug' },
  );
  if (partnersErr) throw partnersErr;

  // 1. auth.users entries
  for (const [, id] of Object.entries(FIXTURES.users) as [UserKey, string][]) {
    const email = `${id}@fixture.local`;
    const password = `fixture-pass-${id}`;
    const { error: createErr } = await admin.auth.admin.createUser({
      id,
      email,
      password,
      email_confirm: true,
    });
    if (createErr && !/already been registered|already exists/i.test(createErr.message)) {
      throw createErr;
    }
  }

  // 2. public.users rows
  const userRows = [
    {
      id: FIXTURES.users.honuvibe_paid,
      role: 'student',
      subscription_tier: 'community',
      subscription_status: 'active',
    },
    {
      id: FIXTURES.users.honuvibe_free,
      role: 'student',
      subscription_tier: 'free',
      subscription_status: null,
    },
    {
      id: FIXTURES.users.vertice_member,
      role: 'student',
      subscription_tier: 'free',
      subscription_status: null,
    },
    {
      id: FIXTURES.users.smashhaus_member,
      role: 'student',
      subscription_tier: 'free',
      subscription_status: null,
    },
    {
      id: FIXTURES.users.banned_vertice,
      role: 'student',
      subscription_tier: 'free',
      subscription_status: null,
    },
    {
      id: FIXTURES.users.honuvibe_admin,
      role: 'admin',
      subscription_tier: 'free',
      subscription_status: null,
    },
    {
      id: FIXTURES.users.vertice_partner_admin,
      role: 'student',
      subscription_tier: 'free',
      subscription_status: null,
    },
  ];
  const { error: upsertErr } = await admin.from('users').upsert(userRows, { onConflict: 'id' });
  if (upsertErr) throw upsertErr;

  // 3. partner_members
  const { error: pmErr } = await admin.from('partner_members').upsert(
    [
      { partner_id: FIXTURES.partners.vertice, user_id: FIXTURES.users.vertice_member },
      { partner_id: FIXTURES.partners.vertice, user_id: FIXTURES.users.banned_vertice },
      { partner_id: FIXTURES.partners.vertice, user_id: FIXTURES.users.vertice_partner_admin },
      { partner_id: FIXTURES.partners.smashhaus, user_id: FIXTURES.users.smashhaus_member },
    ],
    { onConflict: 'partner_id,user_id' },
  );
  if (pmErr) throw pmErr;

  // 4. partner_admins (vertice_partner_admin moderates Vertice)
  const { error: paErr } = await admin.from('partner_admins').upsert(
    [{ partner_id: FIXTURES.partners.vertice, user_id: FIXTURES.users.vertice_partner_admin }],
    { onConflict: 'partner_id,user_id' },
  );
  if (paErr) throw paErr;

  // 5. community_bans (banned_vertice is banned from Vertice scope)
  const { error: banErr } = await admin.from('community_bans').upsert(
    [
      {
        partner_id: FIXTURES.partners.vertice,
        user_id: FIXTURES.users.banned_vertice,
        banned_by: FIXTURES.users.honuvibe_admin,
        reason: 'fixture',
      },
    ],
    { onConflict: 'partner_id,user_id' },
  );
  if (banErr) throw banErr;
}

/** Wipes community-scoped data between tests, keeps users + memberships. */
export async function resetCommunityData(): Promise<void> {
  const admin = serviceClient();
  const wildcard = '00000000-0000-0000-0000-000000000000';
  await admin.from('community_post_likes').delete().neq('post_id', wildcard);
  await admin.from('community_comments').delete().neq('id', wildcard);
  await admin.from('community_reports').delete().neq('id', wildcard);
  await admin.from('community_mod_actions').delete().neq('id', wildcard);
  await admin.from('community_posts').delete().neq('id', wildcard);
  await admin.from('link_previews').delete().neq('url_hash', '');
}

/** Wipes live-event data between tests, keeps users + memberships. */
export async function resetEventData(): Promise<void> {
  const admin = serviceClient();
  const wildcard = '00000000-0000-0000-0000-000000000000';
  // recap_assets + invitations cascade from live_events, but delete explicitly
  // so the order is clear and a partial seed never leaks across tests.
  await admin.from('live_event_recap_assets').delete().neq('event_id', wildcard);
  await admin.from('event_invitations').delete().neq('id', wildcard);
  await admin.from('live_events').delete().neq('id', wildcard);
}

/** Restores a fixture user's profile email after an email-mutation test. */
export async function restoreUserEmail(userId: string): Promise<void> {
  const admin = serviceClient();
  await admin.from('users').update({ email: `${userId}@fixture.local` }).eq('id', userId);
}
