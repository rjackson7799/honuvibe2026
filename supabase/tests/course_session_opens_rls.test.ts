import { beforeAll, beforeEach, describe, expect, test } from 'vitest';
import { anonClient, serviceClient, userClient } from './helpers/clients';
import { FIXTURES, seedFixtures } from './helpers/fixtures';

const USERS = FIXTURES.users;

// Throwaway course/week/sessions. Unlike course_item_completions, session_id here
// has a real FK, so a genuine course_sessions row must exist to insert against.
const COURSE_ID = 'cccccccc-cccc-cccc-cccc-ccccccccccc2';
const WEEK_ID = 'ffffffff-ffff-ffff-ffff-fffffffffff2';
const SESSION_A = 'dddddddd-dddd-dddd-dddd-ddddddddddd2';
const SESSION_B = 'eeeeeeee-eeee-eeee-eeee-eeeeeeeeeee2';

async function seedCourse(): Promise<void> {
  const admin = serviceClient();

  const { error: courseError } = await admin.from('courses').upsert(
    { id: COURSE_ID, slug: 'cso-rls-test-course', title_en: 'CSO RLS Test', is_published: false },
    { onConflict: 'id' },
  );
  if (courseError) throw courseError;

  const { error: weekError } = await admin.from('course_weeks').upsert(
    { id: WEEK_ID, course_id: COURSE_ID, week_number: 1, title_en: 'CSO RLS Week' },
    { onConflict: 'id' },
  );
  if (weekError) throw weekError;

  // course_id is NOT NULL since 016; chk_bonus_week requires week_id when
  // is_bonus is false; format and title_en are NOT NULL.
  const { error: sessionError } = await admin.from('course_sessions').upsert(
    [SESSION_A, SESSION_B].map((id, i) => ({
      id,
      course_id: COURSE_ID,
      week_id: WEEK_ID,
      session_number: i + 1,
      title_en: `CSO RLS Session ${i + 1}`,
      format: 'recorded',
      is_bonus: false,
    })),
    { onConflict: 'id' },
  );
  if (sessionError) throw sessionError;
}

async function seedOpen(userId: string, sessionId: string): Promise<void> {
  const admin = serviceClient();
  const { error } = await admin
    .from('course_session_opens')
    .insert({ user_id: userId, course_id: COURSE_ID, session_id: sessionId });
  if (error) throw error;
}

beforeAll(async () => {
  await seedFixtures();
  await seedCourse();
});

beforeEach(async () => {
  await serviceClient().from('course_session_opens').delete().eq('course_id', COURSE_ID);
});

describe('course_session_opens RLS', () => {
  test('1. anonymous cannot read', async () => {
    await seedOpen(USERS.honuvibe_free, SESSION_A);
    const { data } = await anonClient()
      .from('course_session_opens')
      .select('session_id')
      .eq('course_id', COURSE_ID);
    expect(data).toEqual([]);
  });

  test('2. anonymous cannot insert', async () => {
    const { error } = await anonClient().from('course_session_opens').insert({
      user_id: USERS.honuvibe_free,
      course_id: COURSE_ID,
      session_id: SESSION_A,
    });
    expect(error).not.toBeNull();
  });

  test('3. a user can insert their own open', async () => {
    const client = await userClient(USERS.honuvibe_free);
    const { error } = await client.from('course_session_opens').insert({
      user_id: USERS.honuvibe_free,
      course_id: COURSE_ID,
      session_id: SESSION_A,
    });
    expect(error).toBeNull();
  });

  test('4. a user reads only their own rows', async () => {
    await seedOpen(USERS.honuvibe_free, SESSION_A);
    await seedOpen(USERS.honuvibe_paid, SESSION_B);
    const client = await userClient(USERS.honuvibe_free);
    const { data } = await client
      .from('course_session_opens')
      .select('user_id, session_id')
      .eq('course_id', COURSE_ID);
    expect(data).toHaveLength(1);
    expect(data?.[0]?.user_id).toBe(USERS.honuvibe_free);
  });

  test('5. a user CANNOT insert a row for another user_id', async () => {
    const client = await userClient(USERS.honuvibe_free);
    const { error } = await client.from('course_session_opens').insert({
      user_id: USERS.honuvibe_paid, // spoofed
      course_id: COURSE_ID,
      session_id: SESSION_A,
    });
    expect(error).not.toBeNull();
  });

  test('6. a user CANNOT overwrite another user’s open via upsert', async () => {
    await seedOpen(USERS.honuvibe_paid, SESSION_B);
    const client = await userClient(USERS.honuvibe_free);
    // The composite PK is (user_id, session_id), so this is the shape
    // recordSessionOpen sends — it must not be able to touch another user's row.
    const { error } = await client.from('course_session_opens').upsert(
      {
        user_id: USERS.honuvibe_paid,
        course_id: COURSE_ID,
        session_id: SESSION_B,
        opened_at: new Date().toISOString(),
      },
      { onConflict: 'user_id,session_id' },
    );
    expect(error).not.toBeNull();
  });

  test('7. a user CANNOT delete another user’s row', async () => {
    await seedOpen(USERS.honuvibe_paid, SESSION_B);
    const client = await userClient(USERS.honuvibe_free);
    await client
      .from('course_session_opens')
      .delete()
      .eq('user_id', USERS.honuvibe_paid)
      .eq('session_id', SESSION_B);
    // Row survives — RLS filtered the delete to zero matching rows.
    const { data } = await serviceClient()
      .from('course_session_opens')
      .select('session_id')
      .eq('user_id', USERS.honuvibe_paid)
      .eq('session_id', SESSION_B);
    expect(data).toHaveLength(1);
  });

  test('8. a user can delete their own row', async () => {
    await seedOpen(USERS.honuvibe_free, SESSION_A);
    const client = await userClient(USERS.honuvibe_free);
    const { error } = await client
      .from('course_session_opens')
      .delete()
      .eq('user_id', USERS.honuvibe_free)
      .eq('session_id', SESSION_A);
    expect(error).toBeNull();
    const { data } = await serviceClient()
      .from('course_session_opens')
      .select('session_id')
      .eq('user_id', USERS.honuvibe_free)
      .eq('session_id', SESSION_A);
    expect(data).toEqual([]);
  });

  test('9. re-opening updates opened_at instead of duplicating', async () => {
    const client = await userClient(USERS.honuvibe_free);
    const row = {
      user_id: USERS.honuvibe_free,
      course_id: COURSE_ID,
      session_id: SESSION_A,
    };
    await client.from('course_session_opens').upsert(
      { ...row, opened_at: '2026-07-01T00:00:00.000Z' },
      { onConflict: 'user_id,session_id' },
    );
    const { error } = await client.from('course_session_opens').upsert(
      { ...row, opened_at: '2026-07-02T00:00:00.000Z' },
      { onConflict: 'user_id,session_id' },
    );
    expect(error).toBeNull();

    const { data } = await serviceClient()
      .from('course_session_opens')
      .select('opened_at')
      .eq('user_id', USERS.honuvibe_free)
      .eq('session_id', SESSION_A);
    expect(data).toHaveLength(1);
    expect(new Date(data![0].opened_at as string).toISOString()).toBe('2026-07-02T00:00:00.000Z');
  });

  test('10. admin can read all rows', async () => {
    await seedOpen(USERS.honuvibe_free, SESSION_A);
    await seedOpen(USERS.honuvibe_paid, SESSION_B);
    const client = await userClient(USERS.honuvibe_admin);
    const { data } = await client
      .from('course_session_opens')
      .select('session_id')
      .eq('course_id', COURSE_ID);
    expect((data ?? []).length).toBeGreaterThanOrEqual(2);
  });
});
