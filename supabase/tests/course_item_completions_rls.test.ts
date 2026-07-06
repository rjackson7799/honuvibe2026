import { beforeAll, beforeEach, describe, expect, test } from 'vitest';
import { anonClient, serviceClient, userClient } from './helpers/clients';
import { FIXTURES, seedFixtures } from './helpers/fixtures';

const USERS = FIXTURES.users;

// A throwaway course to satisfy the course_id FK (course publish state is
// irrelevant to this table's RLS).
const COURSE_ID = 'cccccccc-cccc-cccc-cccc-cccccccccccc';
const ITEM_A = 'dddddddd-dddd-dddd-dddd-dddddddddddd';
const ITEM_B = 'eeeeeeee-eeee-eeee-eeee-eeeeeeeeeeee';

async function seedCourse(): Promise<void> {
  const admin = serviceClient();
  const { error } = await admin.from('courses').upsert(
    { id: COURSE_ID, slug: 'cic-rls-test-course', title_en: 'CIC RLS Test', is_published: false },
    { onConflict: 'id' },
  );
  if (error) throw error;
}

async function seedCompletion(
  userId: string,
  itemId: string,
  itemType: 'session' | 'assignment' = 'session',
): Promise<string> {
  const admin = serviceClient();
  const { data, error } = await admin
    .from('course_item_completions')
    .insert({ user_id: userId, course_id: COURSE_ID, item_type: itemType, item_id: itemId })
    .select('id')
    .single();
  if (error) throw error;
  return data.id as string;
}

beforeAll(async () => {
  await seedFixtures();
  await seedCourse();
});

beforeEach(async () => {
  await serviceClient().from('course_item_completions').delete().eq('course_id', COURSE_ID);
});

describe('course_item_completions RLS', () => {
  test('1. anonymous cannot read', async () => {
    await seedCompletion(USERS.honuvibe_free, ITEM_A);
    const { data } = await anonClient()
      .from('course_item_completions')
      .select('id')
      .eq('course_id', COURSE_ID);
    expect(data).toEqual([]);
  });

  test('2. anonymous cannot insert', async () => {
    const { error } = await anonClient().from('course_item_completions').insert({
      user_id: USERS.honuvibe_free,
      course_id: COURSE_ID,
      item_type: 'session',
      item_id: ITEM_A,
    });
    expect(error).not.toBeNull();
  });

  test('3. a user can insert their own completion', async () => {
    const client = await userClient(USERS.honuvibe_free);
    const { error } = await client.from('course_item_completions').insert({
      user_id: USERS.honuvibe_free,
      course_id: COURSE_ID,
      item_type: 'session',
      item_id: ITEM_A,
    });
    expect(error).toBeNull();
  });

  test('4. a user reads only their own rows', async () => {
    await seedCompletion(USERS.honuvibe_free, ITEM_A);
    await seedCompletion(USERS.honuvibe_paid, ITEM_B);
    const client = await userClient(USERS.honuvibe_free);
    const { data } = await client
      .from('course_item_completions')
      .select('user_id, item_id')
      .eq('course_id', COURSE_ID);
    expect(data).toHaveLength(1);
    expect(data?.[0]?.user_id).toBe(USERS.honuvibe_free);
  });

  test('5. a user CANNOT insert a row for another user_id', async () => {
    const client = await userClient(USERS.honuvibe_free);
    const { error } = await client.from('course_item_completions').insert({
      user_id: USERS.honuvibe_paid, // spoofed
      course_id: COURSE_ID,
      item_type: 'session',
      item_id: ITEM_A,
    });
    expect(error).not.toBeNull();
  });

  test('6. a user CANNOT delete another user’s row', async () => {
    await seedCompletion(USERS.honuvibe_paid, ITEM_B);
    const client = await userClient(USERS.honuvibe_free);
    await client
      .from('course_item_completions')
      .delete()
      .eq('user_id', USERS.honuvibe_paid)
      .eq('item_id', ITEM_B);
    // Row survives — RLS filtered the delete to zero matching rows.
    const { data } = await serviceClient()
      .from('course_item_completions')
      .select('id')
      .eq('user_id', USERS.honuvibe_paid)
      .eq('item_id', ITEM_B);
    expect(data).toHaveLength(1);
  });

  test('7. a user can delete their own row', async () => {
    const id = await seedCompletion(USERS.honuvibe_free, ITEM_A);
    const client = await userClient(USERS.honuvibe_free);
    const { error } = await client.from('course_item_completions').delete().eq('id', id);
    expect(error).toBeNull();
    const { data } = await serviceClient()
      .from('course_item_completions')
      .select('id')
      .eq('id', id);
    expect(data).toEqual([]);
  });

  test('8. admin can read all rows', async () => {
    await seedCompletion(USERS.honuvibe_free, ITEM_A);
    await seedCompletion(USERS.honuvibe_paid, ITEM_B);
    const client = await userClient(USERS.honuvibe_admin);
    const { data } = await client
      .from('course_item_completions')
      .select('id')
      .eq('course_id', COURSE_ID);
    expect((data ?? []).length).toBeGreaterThanOrEqual(2);
  });
});
