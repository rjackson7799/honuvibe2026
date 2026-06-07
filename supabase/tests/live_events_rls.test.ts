import { beforeAll, beforeEach, describe, expect, test } from 'vitest';
import { anonClient, serviceClient, userClient } from './helpers/clients';
import { FIXTURES, resetEventData, restoreUserEmail, seedFixtures } from './helpers/fixtures';

const USERS = FIXTURES.users;
const emailOf = (id: string) => `${id}@fixture.local`;

let slugCounter = 0;

async function seedEvent(overrides: Record<string, unknown> = {}): Promise<string> {
  const admin = serviceClient();
  slugCounter += 1;
  const { data, error } = await admin
    .from('live_events')
    .insert({
      slug: `evt-${slugCounter}`,
      title_en: 'Live Training',
      starts_at: '2026-07-01T18:00:00Z',
      timezone: 'Pacific/Honolulu',
      status: 'scheduled',
      is_published: true,
      recap_published: false,
      ...overrides,
    })
    .select('id')
    .single();
  if (error) throw error;
  return data.id as string;
}

async function seedInvitation(
  eventId: string,
  opts: { email: string; userId?: string | null },
): Promise<void> {
  const admin = serviceClient();
  const { error } = await admin.from('event_invitations').insert({
    event_id: eventId,
    email: opts.email,
    user_id: opts.userId ?? null,
  });
  if (error) throw error;
}

async function seedRecap(eventId: string): Promise<void> {
  const admin = serviceClient();
  const { error } = await admin.from('live_event_recap_assets').insert({
    event_id: eventId,
    recording_url: 'https://example.com/recording',
  });
  if (error) throw error;
}

beforeAll(async () => {
  await seedFixtures();
});

beforeEach(async () => {
  await resetEventData();
});

describe('live_events RLS', () => {
  test('1. invitee matched by user_id can read a published event', async () => {
    const eventId = await seedEvent();
    await seedInvitation(eventId, { email: emailOf(USERS.honuvibe_free), userId: USERS.honuvibe_free });
    const client = await userClient(USERS.honuvibe_free);
    const { data, error } = await client.from('live_events').select('id').eq('id', eventId);
    expect(error).toBeNull();
    expect(data).toHaveLength(1);
  });

  test('2. invitee matched by email only (no user_id) can read a published event', async () => {
    const eventId = await seedEvent();
    await seedInvitation(eventId, { email: emailOf(USERS.honuvibe_paid), userId: null });
    const client = await userClient(USERS.honuvibe_paid);
    const { data } = await client.from('live_events').select('id').eq('id', eventId);
    expect(data).toHaveLength(1);
  });

  test('3. uninvited authenticated user cannot read the event', async () => {
    const eventId = await seedEvent();
    await seedInvitation(eventId, { email: emailOf(USERS.honuvibe_free), userId: USERS.honuvibe_free });
    const client = await userClient(USERS.vertice_member);
    const { data } = await client.from('live_events').select('id').eq('id', eventId);
    expect(data).toEqual([]);
  });

  test('4. anonymous client cannot read the event', async () => {
    const eventId = await seedEvent();
    await seedInvitation(eventId, { email: emailOf(USERS.honuvibe_free), userId: USERS.honuvibe_free });
    const client = anonClient();
    const { data } = await client.from('live_events').select('id').eq('id', eventId);
    expect(data).toEqual([]);
  });

  test('5. an invitee cannot read an UNPUBLISHED event', async () => {
    const eventId = await seedEvent({ is_published: false });
    await seedInvitation(eventId, { email: emailOf(USERS.honuvibe_free), userId: USERS.honuvibe_free });
    const client = await userClient(USERS.honuvibe_free);
    const { data } = await client.from('live_events').select('id').eq('id', eventId);
    expect(data).toEqual([]);
  });

  test('6. recap assets are hidden from an invitee before recap_published', async () => {
    const eventId = await seedEvent({ recap_published: false });
    await seedInvitation(eventId, { email: emailOf(USERS.honuvibe_free), userId: USERS.honuvibe_free });
    await seedRecap(eventId);
    const client = await userClient(USERS.honuvibe_free);
    const { data } = await client
      .from('live_event_recap_assets')
      .select('event_id')
      .eq('event_id', eventId);
    expect(data).toEqual([]);
  });

  test('7. recap assets become readable to an invitee once recap_published', async () => {
    const eventId = await seedEvent({ recap_published: true });
    await seedInvitation(eventId, { email: emailOf(USERS.honuvibe_free), userId: USERS.honuvibe_free });
    await seedRecap(eventId);
    const client = await userClient(USERS.honuvibe_free);
    const { data } = await client
      .from('live_event_recap_assets')
      .select('event_id')
      .eq('event_id', eventId);
    expect(data).toHaveLength(1);
  });

  test('8. recap assets stay hidden from a non-invitee even after recap_published', async () => {
    const eventId = await seedEvent({ recap_published: true });
    await seedInvitation(eventId, { email: emailOf(USERS.honuvibe_free), userId: USERS.honuvibe_free });
    await seedRecap(eventId);
    const client = await userClient(USERS.vertice_member);
    const { data } = await client
      .from('live_event_recap_assets')
      .select('event_id')
      .eq('event_id', eventId);
    expect(data).toEqual([]);
  });

  test('9. an invitee cannot directly write their own invitation (RSVP is server-mediated)', async () => {
    const eventId = await seedEvent();
    await seedInvitation(eventId, { email: emailOf(USERS.honuvibe_free), userId: USERS.honuvibe_free });
    const client = await userClient(USERS.honuvibe_free);
    // No user-write RLS policy exists, so this update must affect zero rows.
    await client.from('event_invitations').update({ status: 'going' }).eq('event_id', eventId);
    const admin = serviceClient();
    const { data } = await admin
      .from('event_invitations')
      .select('status')
      .eq('event_id', eventId)
      .single();
    expect(data?.status).toBe('invited');
  });

  test('10. an uninvited user cannot INSERT a self-invitation', async () => {
    const eventId = await seedEvent();
    const client = await userClient(USERS.vertice_member);
    const { error } = await client.from('event_invitations').insert({
      event_id: eventId,
      email: emailOf(USERS.vertice_member),
      user_id: USERS.vertice_member,
    });
    expect(error).not.toBeNull();
  });

  test('11. an invitee sees only their own invitation row', async () => {
    const eventId = await seedEvent();
    await seedInvitation(eventId, { email: emailOf(USERS.honuvibe_free), userId: USERS.honuvibe_free });
    await seedInvitation(eventId, { email: emailOf(USERS.honuvibe_paid), userId: USERS.honuvibe_paid });
    const client = await userClient(USERS.honuvibe_free);
    const { data } = await client.from('event_invitations').select('email').eq('event_id', eventId);
    expect(data).toHaveLength(1);
    expect(data?.[0]?.email).toBe(emailOf(USERS.honuvibe_free));
  });

  test('12. rewriting profile email to an invited address does NOT grant access', async () => {
    const ghost = 'ghost-invitee@fixture.local';
    const eventId = await seedEvent();
    await seedInvitation(eventId, { email: ghost, userId: null });

    // users_own_update lacks WITH CHECK, so a user can rewrite their profile
    // email. Access must still be denied because matching uses the JWT email.
    const admin = serviceClient();
    await admin.from('users').update({ email: ghost }).eq('id', USERS.vertice_member);

    try {
      const client = await userClient(USERS.vertice_member);
      const { data } = await client.from('live_events').select('id').eq('id', eventId);
      expect(data).toEqual([]);
    } finally {
      await restoreUserEmail(USERS.vertice_member);
    }
  });

  test('13. admin can read an unpublished event', async () => {
    const eventId = await seedEvent({ is_published: false });
    const client = await userClient(USERS.honuvibe_admin);
    const { data } = await client.from('live_events').select('id').eq('id', eventId);
    expect(data).toHaveLength(1);
  });
});
