import { beforeAll, beforeEach, describe, expect, test } from 'vitest';
import { anonClient, serviceClient, userClient } from './helpers/clients';
import { FIXTURES, seedFixtures } from './helpers/fixtures';

const USERS = FIXTURES.users;
const ZERO_UUID = '00000000-0000-0000-0000-000000000000';
const FUTURE = '2999-01-01T00:00:00Z';
const PAST = '2000-01-01T00:00:00Z';

let slugCounter = 0;
const nextSlug = () => `rsvp-test-${++slugCounter}`;
const randEmail = () => `t${Math.random().toString(36).slice(2)}@fixture.local`;

async function seedRsvp(
  slug: string,
  overrides: Record<string, unknown> = {},
): Promise<{ id: string; token: string }> {
  const admin = serviceClient();
  const { data, error } = await admin
    .from('event_rsvps')
    .insert({
      event_slug: slug,
      full_name: 'Test Person',
      email: randEmail(),
      status: 'pending',
      confirm_deadline: FUTURE,
      ...overrides,
    })
    .select('id, confirm_token')
    .single();
  if (error) throw error;
  return { id: data.id as string, token: data.confirm_token as string };
}

beforeAll(async () => {
  await seedFixtures();
});

beforeEach(async () => {
  await serviceClient().from('event_rsvps').delete().like('event_slug', 'rsvp-test-%');
});

describe('event_rsvps RLS', () => {
  test('1. anonymous cannot read', async () => {
    const slug = nextSlug();
    await seedRsvp(slug, { status: 'confirmed' });
    const { data } = await anonClient().from('event_rsvps').select('id').eq('event_slug', slug);
    expect(data).toEqual([]);
  });

  test('2. anonymous cannot insert', async () => {
    const { error } = await anonClient().from('event_rsvps').insert({
      event_slug: nextSlug(),
      full_name: 'x',
      email: randEmail(),
      confirm_deadline: FUTURE,
    });
    expect(error).not.toBeNull();
  });

  test('3. non-admin authenticated cannot read', async () => {
    const slug = nextSlug();
    await seedRsvp(slug);
    const client = await userClient(USERS.honuvibe_free);
    const { data } = await client.from('event_rsvps').select('id').eq('event_slug', slug);
    expect(data).toEqual([]);
  });

  test('4. non-admin authenticated cannot insert', async () => {
    const client = await userClient(USERS.honuvibe_free);
    const { error } = await client.from('event_rsvps').insert({
      event_slug: nextSlug(),
      full_name: 'x',
      email: randEmail(),
      confirm_deadline: FUTURE,
    });
    expect(error).not.toBeNull();
  });

  test('5. admin can read', async () => {
    const slug = nextSlug();
    await seedRsvp(slug);
    const client = await userClient(USERS.honuvibe_admin);
    const { data } = await client.from('event_rsvps').select('id').eq('event_slug', slug);
    expect(data).toHaveLength(1);
  });
});

describe('claim_event_seat', () => {
  test('6. not executable by anon', async () => {
    const { error } = await anonClient().rpc('claim_event_seat', {
      p_slug: 'x',
      p_token: ZERO_UUID,
      p_capacity: 10,
    });
    expect(error).not.toBeNull();
  });

  test('7. not executable by authenticated non-admin', async () => {
    const client = await userClient(USERS.honuvibe_free);
    const { error } = await client.rpc('claim_event_seat', {
      p_slug: 'x',
      p_token: ZERO_UUID,
      p_capacity: 10,
    });
    expect(error).not.toBeNull();
  });

  test('8. pending → confirmed, then idempotent → already', async () => {
    const slug = nextSlug();
    const { token } = await seedRsvp(slug);
    const admin = serviceClient();
    const r1 = await admin.rpc('claim_event_seat', { p_slug: slug, p_token: token, p_capacity: 10 });
    expect(r1.data).toBe('confirmed');
    const r2 = await admin.rpc('claim_event_seat', { p_slug: slug, p_token: token, p_capacity: 10 });
    expect(r2.data).toBe('already');
  });

  test('9. returns full at capacity (no oversubscribe)', async () => {
    const slug = nextSlug();
    await seedRsvp(slug, { status: 'confirmed' }); // consumes the only seat
    const { token } = await seedRsvp(slug);
    const { data } = await serviceClient().rpc('claim_event_seat', {
      p_slug: slug,
      p_token: token,
      p_capacity: 1,
    });
    expect(data).toBe('full');
  });

  test('10. returns expired past the confirm deadline', async () => {
    const slug = nextSlug();
    const { token } = await seedRsvp(slug, { confirm_deadline: PAST });
    const { data } = await serviceClient().rpc('claim_event_seat', {
      p_slug: slug,
      p_token: token,
      p_capacity: 10,
    });
    expect(data).toBe('expired');
  });

  test('11. token must match the route slug', async () => {
    const slug = nextSlug();
    const { token } = await seedRsvp(slug);
    const { data } = await serviceClient().rpc('claim_event_seat', {
      p_slug: 'rsvp-test-wrong',
      p_token: token,
      p_capacity: 10,
    });
    expect(data).toBe('not_found');
  });

  test('12. rejects non-positive capacity', async () => {
    const slug = nextSlug();
    const { token } = await seedRsvp(slug);
    const { error } = await serviceClient().rpc('claim_event_seat', {
      p_slug: slug,
      p_token: token,
      p_capacity: 0,
    });
    expect(error).not.toBeNull();
  });
});
