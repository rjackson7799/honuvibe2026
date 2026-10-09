import { beforeAll, beforeEach, describe, expect, test } from 'vitest';
import { anonClient, serviceClient, userClient } from './helpers/clients';
import { FIXTURES, resetCommunityData, seedFixtures } from './helpers/fixtures';

const PARTNERS = FIXTURES.partners;
const USERS = FIXTURES.users;

beforeAll(async () => {
  await seedFixtures();
});

beforeEach(async () => {
  await resetCommunityData();
});

// --- Seed helpers (use service role to bypass RLS) -------------------------

async function seedMainPost(): Promise<string> {
  const admin = serviceClient();
  const { data, error } = await admin
    .from('community_posts')
    .insert({
      partner_id: null,
      author_id: USERS.honuvibe_paid,
      category: 'general',
      body_md: 'main feed post',
    })
    .select('id')
    .single();
  if (error) throw error;
  return data.id as string;
}

async function seedVerticePost(): Promise<string> {
  const admin = serviceClient();
  const { data, error } = await admin
    .from('community_posts')
    .insert({
      partner_id: PARTNERS.vertice,
      author_id: USERS.vertice_member,
      category: 'general',
      body_md: 'vertice feed post',
    })
    .select('id')
    .single();
  if (error) throw error;
  return data.id as string;
}

async function seedComment(postId: string, authorId: string): Promise<string> {
  const admin = serviceClient();
  const { data, error } = await admin
    .from('community_comments')
    .insert({
      post_id: postId,
      author_id: authorId,
      body_md: 'a comment',
    })
    .select('id')
    .single();
  if (error) throw error;
  return data.id as string;
}

// --- 9 leak tests ----------------------------------------------------------

describe('community RLS leak tests', () => {
  test('1. Vertice member cannot SELECT HonuVibe-main posts', async () => {
    await seedMainPost();
    const client = await userClient(USERS.vertice_member);
    const { data, error } = await client
      .from('community_posts')
      .select('id')
      .is('partner_id', null);
    expect(error).toBeNull();
    expect(data).toEqual([]);
  });

  test('2. Vertice member cannot INSERT a post with partner_id=NULL', async () => {
    const client = await userClient(USERS.vertice_member);
    const { error } = await client.from('community_posts').insert({
      partner_id: null,
      author_id: USERS.vertice_member,
      category: 'general',
      body_md: 'sneaky',
    });
    expect(error).not.toBeNull();
  });

  test('3. HonuVibe-main member cannot SELECT Vertice posts', async () => {
    await seedVerticePost();
    const client = await userClient(USERS.honuvibe_paid);
    const { data } = await client
      .from('community_posts')
      .select('id')
      .eq('partner_id', PARTNERS.vertice);
    expect(data).toEqual([]);
  });

  test('4. SmashHaus member cannot SELECT Vertice posts (cross-partner)', async () => {
    await seedVerticePost();
    const client = await userClient(USERS.smashhaus_member);
    const { data } = await client
      .from('community_posts')
      .select('id')
      .eq('partner_id', PARTNERS.vertice);
    expect(data).toEqual([]);
  });

  test('5. Free account reads the main feed (Community is free, 078) — never a partner feed', async () => {
    const mainId = await seedMainPost();
    await seedVerticePost();
    const client = await userClient(USERS.honuvibe_free);
    const { data, error } = await client.from('community_posts').select('id');
    expect(error).toBeNull();
    expect(data).toEqual([{ id: mainId }]);
  });

  test('5b. Free account can post and comment in the main feed', async () => {
    const client = await userClient(USERS.honuvibe_free);
    const { data: post, error } = await client
      .from('community_posts')
      .insert({
        partner_id: null,
        author_id: USERS.honuvibe_free,
        category: 'general',
        body_md: 'free member post',
      })
      .select('id')
      .single();
    expect(error).toBeNull();

    const { error: commentErr } = await client.from('community_comments').insert({
      post_id: post!.id,
      author_id: USERS.honuvibe_free,
      body_md: 'free member comment',
    });
    expect(commentErr).toBeNull();
  });

  test('5c. Anonymous client reads nothing and cannot post', async () => {
    await seedMainPost();
    const client = anonClient();
    const { data } = await client.from('community_posts').select('id');
    expect(data ?? []).toEqual([]);

    const { error } = await client.from('community_posts').insert({
      partner_id: null,
      author_id: USERS.honuvibe_free,
      category: 'general',
      body_md: 'anon spoof',
    });
    expect(error).not.toBeNull();
  });

  // D3 has no DB-level gate: a confirmed session is what stands between an
  // unconfirmed sign-up and auth.uid(). This pins that GoTrue precondition (it
  // needs "Confirm email" ON in the test project); 5c covers the no-session post.
  test('5d. GoTrue issues no session to an unconfirmed email account (D3 precondition)', async () => {
    const admin = serviceClient();
    const email = `unconfirmed-${Date.now()}@fixture.local`;
    const password = 'fixture-pass-unconfirmed';
    const { data: created, error: createErr } = await admin.auth.admin.createUser({
      email,
      password,
      email_confirm: false,
    });
    expect(createErr).toBeNull();
    try {
      const client = anonClient();
      const { data, error } = await client.auth.signInWithPassword({ email, password });
      expect(error).not.toBeNull();
      expect(data.session).toBeNull();
    } finally {
      await admin.auth.admin.deleteUser(created.user!.id);
    }
  });

  test('6. Banned-from-Vertice user cannot INSERT in Vertice scope', async () => {
    const client = await userClient(USERS.banned_vertice);
    const { error } = await client.from('community_posts').insert({
      partner_id: PARTNERS.vertice,
      author_id: USERS.banned_vertice,
      category: 'general',
      body_md: 'banned but trying',
    });
    expect(error).not.toBeNull();
  });

  test('7. Vertice member cannot SELECT comments on a HonuVibe-main post', async () => {
    const postId = await seedMainPost();
    await seedComment(postId, USERS.honuvibe_paid);
    const client = await userClient(USERS.vertice_member);
    const { data } = await client
      .from('community_comments')
      .select('id')
      .eq('post_id', postId);
    expect(data).toEqual([]);
  });

  test('8. Anonymous client cannot SELECT link_previews directly', async () => {
    const admin = serviceClient();
    await admin.from('link_previews').insert({
      url_hash: 'deadbeef',
      url: 'https://example.com',
      preview: { title: 'leak attempt' },
    });
    const client = anonClient();
    const { data } = await client.from('link_previews').select('url_hash');
    expect(data).toEqual([]);
  });

  test('9. Banned-from-Vertice user CAN still INSERT in HonuVibe-main if they qualify', async () => {
    // Upgrade banned_vertice to active community subscription
    const admin = serviceClient();
    await admin
      .from('users')
      .update({ subscription_tier: 'community', subscription_status: 'active' })
      .eq('id', USERS.banned_vertice);
    // Remove their partner_members row so community_scope_for() returns NULL (main)
    await admin
      .from('partner_members')
      .delete()
      .eq('user_id', USERS.banned_vertice);

    const client = await userClient(USERS.banned_vertice);
    const { error } = await client.from('community_posts').insert({
      partner_id: null,
      author_id: USERS.banned_vertice,
      category: 'general',
      body_md: 'main feed, banned from vertice only',
    });
    expect(error).toBeNull();

    // Restore fixture state for subsequent tests
    await admin
      .from('users')
      .update({ subscription_tier: 'free', subscription_status: null })
      .eq('id', USERS.banned_vertice);
    await admin
      .from('partner_members')
      .insert({ partner_id: PARTNERS.vertice, user_id: USERS.banned_vertice });
  });
});

// --- D2 posting throttle (078) ---------------------------------------------

async function postAs(userId: string, n: number) {
  const client = await userClient(userId);
  const errors = [];
  for (let i = 0; i < n; i++) {
    const { error } = await client.from('community_posts').insert({
      partner_id: null,
      author_id: userId,
      category: 'general',
      body_md: `throttle probe ${i}`,
    });
    errors.push(error);
  }
  return errors;
}

describe('community posting throttle (078, D2)', () => {
  test('a member can post 10 times in an hour; the 11th is rate limited', async () => {
    const errors = await postAs(USERS.honuvibe_free, 11);
    expect(errors.slice(0, 10)).toEqual(Array(10).fill(null));
    expect(errors[10]?.code).toBe('PT429');
    expect(errors[10]?.message).toBe('community_rate_limited');
  });

  test('admins are exempt', async () => {
    const errors = await postAs(USERS.honuvibe_admin, 11);
    expect(errors).toEqual(Array(11).fill(null));
  });

  test('service-role writes are not throttled', async () => {
    const admin = serviceClient();
    const rows = Array.from({ length: 11 }, (_, i) => ({
      partner_id: null,
      author_id: USERS.honuvibe_free,
      category: 'general',
      body_md: `seed ${i}`,
    }));
    const { error } = await admin.from('community_posts').insert(rows);
    expect(error).toBeNull();
  });
});
