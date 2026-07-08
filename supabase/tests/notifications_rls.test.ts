import { randomUUID } from 'node:crypto';
import { beforeAll, beforeEach, describe, expect, test } from 'vitest';
import { anonClient, serviceClient, userClient } from './helpers/clients';
import { FIXTURES, seedFixtures } from './helpers/fixtures';

const USERS = FIXTURES.users;
const ZERO_UUID = '00000000-0000-0000-0000-000000000000';

async function seedNotification(
  userId: string,
  overrides: Record<string, unknown> = {},
): Promise<string> {
  const admin = serviceClient();
  const { data, error } = await admin
    .from('notifications')
    .insert({
      user_id: userId,
      type: 'community_reply',
      entity_id: randomUUID(),
      data: {},
      href: '/learn/dashboard/community/x',
      ...overrides,
    })
    .select('id')
    .single();
  if (error) throw error;
  return data.id as string;
}

beforeAll(async () => {
  await seedFixtures();
});

beforeEach(async () => {
  await serviceClient().from('notifications').delete().neq('id', ZERO_UUID);
});

describe('notifications RLS', () => {
  test('1. anonymous cannot read', async () => {
    await seedNotification(USERS.honuvibe_free);
    const { data } = await anonClient().from('notifications').select('id');
    expect(data ?? []).toEqual([]);
  });

  test('2. a user cannot read another user’s notifications', async () => {
    await seedNotification(USERS.honuvibe_free);
    const client = await userClient(USERS.honuvibe_paid);
    const { data } = await client
      .from('notifications')
      .select('id')
      .eq('user_id', USERS.honuvibe_free);
    expect(data ?? []).toEqual([]);
  });

  test('3. a user can read their own notifications', async () => {
    await seedNotification(USERS.honuvibe_free);
    const client = await userClient(USERS.honuvibe_free);
    const { data } = await client.from('notifications').select('id');
    expect(data).toHaveLength(1);
  });

  test('4. a user cannot INSERT (no owner insert policy — service role only)', async () => {
    const client = await userClient(USERS.honuvibe_free);
    const { error } = await client.from('notifications').insert({
      user_id: USERS.honuvibe_free,
      type: 'community_reply',
      entity_id: randomUUID(),
    });
    expect(error).not.toBeNull();
  });

  test('5. a user can mark their own read, but not another user’s', async () => {
    const ownId = await seedNotification(USERS.honuvibe_free);
    const otherId = await seedNotification(USERS.honuvibe_paid);
    const client = await userClient(USERS.honuvibe_free);

    await client
      .from('notifications')
      .update({ read_at: new Date().toISOString() })
      .eq('id', ownId);
    const { data: own } = await serviceClient()
      .from('notifications')
      .select('read_at')
      .eq('id', ownId)
      .single();
    expect(own?.read_at).not.toBeNull();

    // Another user's row is filtered out by RLS — the update matches nothing.
    await client
      .from('notifications')
      .update({ read_at: new Date().toISOString() })
      .eq('id', otherId);
    const { data: other } = await serviceClient()
      .from('notifications')
      .select('read_at')
      .eq('id', otherId)
      .single();
    expect(other?.read_at).toBeNull();
  });

  test('6. admin can read all', async () => {
    await seedNotification(USERS.honuvibe_free);
    const client = await userClient(USERS.honuvibe_admin);
    const { data } = await client.from('notifications').select('id');
    expect((data ?? []).length).toBeGreaterThanOrEqual(1);
  });
});
