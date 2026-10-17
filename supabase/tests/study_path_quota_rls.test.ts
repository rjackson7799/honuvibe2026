import { randomUUID } from 'node:crypto';
import { afterAll, beforeAll, expect, test } from 'vitest';
import { anonClient, serviceClient, userClient } from './helpers/clients';

const USER = randomUUID();
beforeAll(async () => {
  const { error } = await serviceClient().auth.admin.createUser({
    id: USER, email: `${USER}@fixture.local`, password: `fixture-pass-${USER}`, email_confirm: true,
  });
  if (error) throw error;
});
afterAll(async () => {
  const { error } = await serviceClient().auth.admin.deleteUser(USER);
  if (error) throw error;
});

test('ten concurrent attempts reserve exactly three slots', async () => {
  const service = serviceClient();
  const results = await Promise.all(Array.from({ length: 10 }, () => service.rpc('reserve_study_path_generation', { p_user_id: USER })));
  expect(results.every((r) => r.error === null)).toBe(true);
  expect(results.filter((r) => r.data === true)).toHaveLength(3);
  expect(results.filter((r) => r.data === false)).toHaveLength(7);
  const { data, error } = await service.from('study_path_generation_usage').select('attempts').eq('user_id', USER).single();
  expect(error).toBeNull();
  expect(data?.attempts).toBe(3);
});

test('ordinary callers cannot reserve or reset quota', async () => {
  for (const client of [anonClient(), await userClient(USER)]) {
    expect((await client.rpc('reserve_study_path_generation', { p_user_id: USER })).error).not.toBeNull();
    expect((await client.from('study_path_generation_usage').delete().eq('user_id', USER)).error).not.toBeNull();
  }
});
