import { beforeAll, beforeEach, describe, expect, test } from 'vitest';
import { anonClient, serviceClient, userClient } from './helpers/clients';
import { FIXTURES, seedFixtures } from './helpers/fixtures';

const USERS = FIXTURES.users;

type ProofSeed = Record<string, unknown>;

async function seedProof(overrides: ProofSeed = {}): Promise<string> {
  const admin = serviceClient();
  const { data, error } = await admin
    .from('proof_artifacts')
    .insert({
      quote_en: 'HonuVibe helped me ship my first AI app.',
      person_name: 'Takeshi M.',
      org: 'Vertice Society',
      logo_url: 'https://example.com/logo.png',
      is_published: true,
      quote_permission: true,
      name_public: true,
      logo_permission: true,
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
  // No fixtures dependency — proof rows are self-contained; wipe between tests.
  await serviceClient().from('proof_artifacts').delete().neq('id', '00000000-0000-0000-0000-000000000000');
});

describe('proof_artifacts RLS + sanitized view', () => {
  test('1. anon CANNOT read the base table (admin-only)', async () => {
    const id = await seedProof();
    const { data } = await anonClient().from('proof_artifacts').select('id').eq('id', id);
    expect(data).toEqual([]);
  });

  test('2. anon CAN read a published row via the sanitized view', async () => {
    const id = await seedProof();
    const { data, error } = await anonClient()
      .from('proof_artifacts_public')
      .select('id, quote_en, person_name')
      .eq('id', id);
    expect(error).toBeNull();
    expect(data).toHaveLength(1);
    expect(data?.[0]?.quote_en).toBeTruthy();
    expect(data?.[0]?.person_name).toBe('Takeshi M.');
  });

  test('3. unpublished rows are invisible in the view', async () => {
    const id = await seedProof({ is_published: false });
    const { data } = await anonClient().from('proof_artifacts_public').select('id').eq('id', id);
    expect(data).toEqual([]);
  });

  test('4. view nulls the quote when quote_permission is false', async () => {
    const id = await seedProof({ quote_permission: false });
    const { data } = await anonClient()
      .from('proof_artifacts_public')
      .select('id, quote_en')
      .eq('id', id);
    expect(data).toHaveLength(1);
    expect(data?.[0]?.quote_en).toBeNull();
  });

  test('5. view nulls name/role/photo when name_public is false', async () => {
    const id = await seedProof({ name_public: false });
    const { data } = await anonClient()
      .from('proof_artifacts_public')
      .select('id, person_name, org')
      .eq('id', id);
    expect(data).toHaveLength(1);
    expect(data?.[0]?.person_name).toBeNull();
    expect(data?.[0]?.org).toBeNull();
  });

  test('6. view nulls logo/org-url when logo_permission is false', async () => {
    const id = await seedProof({ logo_permission: false });
    const { data } = await anonClient()
      .from('proof_artifacts_public')
      .select('id, logo_url, organization_url')
      .eq('id', id);
    expect(data).toHaveLength(1);
    expect(data?.[0]?.logo_url).toBeNull();
  });

  test('7. the view never exposes permission columns', async () => {
    await seedProof();
    const { error } = await anonClient()
      .from('proof_artifacts_public')
      .select('permission_notes');
    // permission_notes is not a column of the view → PostgREST errors.
    expect(error).not.toBeNull();
  });

  test('8. a non-admin authenticated user cannot read the base table', async () => {
    const id = await seedProof();
    const client = await userClient(USERS.honuvibe_free);
    const { data } = await client.from('proof_artifacts').select('id').eq('id', id);
    expect(data).toEqual([]);
  });

  test('9. a non-admin user cannot INSERT into the base table', async () => {
    const client = await userClient(USERS.honuvibe_free);
    const { error } = await client
      .from('proof_artifacts')
      .insert({ quote_en: 'self-authored', is_published: true });
    expect(error).not.toBeNull();
  });

  test('10. admin can read all rows including drafts', async () => {
    await seedProof({ is_published: false });
    const client = await userClient(USERS.honuvibe_admin);
    const { data } = await client.from('proof_artifacts').select('id');
    expect((data ?? []).length).toBeGreaterThanOrEqual(1);
  });
});
