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

  test('5. Free user (no qualifying tier) cannot SELECT any post', async () => {
    await seedMainPost();
    await seedVerticePost();
    const client = await userClient(USERS.honuvibe_free);
    const { data } = await client.from('community_posts').select('id');
    expect(data).toEqual([]);
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
