import { beforeAll, beforeEach, describe, expect, test } from 'vitest';
import { anonClient, serviceClient, userClient } from './helpers/clients';
import { FIXTURES, seedFixtures } from './helpers/fixtures';

const USERS = FIXTURES.users;
const ZERO_UUID = '00000000-0000-0000-0000-000000000000';

// Valid slug per the migration CHECK (^[a-z0-9-]{8,80}$). storage_prefix = slug.
function previewRow(slug: string, overrides: Record<string, unknown> = {}) {
  return {
    slug,
    title: 'Fixture preview',
    mode: 'public',
    password: null,
    storage_prefix: slug,
    entry_file: 'index.html',
    ...overrides,
  };
}

async function seedPreview(slug: string, overrides: Record<string, unknown> = {}): Promise<void> {
  const { error } = await serviceClient().from('client_previews').insert(previewRow(slug, overrides));
  if (error) throw error;
}

beforeAll(async () => {
  await seedFixtures();
});

beforeEach(async () => {
  await serviceClient().from('client_previews').delete().neq('id', ZERO_UUID);
});

describe('client_previews RLS', () => {
  test('1. anonymous cannot read', async () => {
    await seedPreview('anon-read-01');
    const { data } = await anonClient().from('client_previews').select('id');
    expect(data ?? []).toEqual([]);
  });

  test('2. anonymous cannot insert', async () => {
    const { error } = await anonClient()
      .from('client_previews')
      .insert(previewRow('anon-insert-01'));
    expect(error).not.toBeNull();
  });

  test('3. a non-admin member cannot read', async () => {
    await seedPreview('member-read-01');
    const client = await userClient(USERS.honuvibe_free);
    const { data } = await client.from('client_previews').select('id');
    expect(data ?? []).toEqual([]);
  });

  test('4. a non-admin member cannot insert', async () => {
    const client = await userClient(USERS.honuvibe_free);
    const { error } = await client.from('client_previews').insert(previewRow('member-insert-1'));
    expect(error).not.toBeNull();
  });

  test('5. an admin can SELECT / INSERT / UPDATE / DELETE', async () => {
    const admin = await userClient(USERS.honuvibe_admin);

    // INSERT
    const { data: inserted, error: insErr } = await admin
      .from('client_previews')
      .insert(previewRow('admin-crud-001'))
      .select('id')
      .single();
    expect(insErr).toBeNull();
    expect(inserted?.id).toBeTruthy();
    const id = inserted!.id as string;

    // SELECT
    const { data: selected } = await admin.from('client_previews').select('id').eq('id', id);
    expect((selected ?? []).length).toBe(1);

    // UPDATE
    const { error: updErr } = await admin
      .from('client_previews')
      .update({ title: 'renamed' })
      .eq('id', id);
    expect(updErr).toBeNull();
    const { data: afterUpdate } = await serviceClient()
      .from('client_previews')
      .select('title')
      .eq('id', id)
      .single();
    expect(afterUpdate?.title).toBe('renamed');

    // DELETE
    const { error: delErr } = await admin.from('client_previews').delete().eq('id', id);
    expect(delErr).toBeNull();
    const { data: afterDelete } = await serviceClient()
      .from('client_previews')
      .select('id')
      .eq('id', id);
    expect(afterDelete ?? []).toEqual([]);
  });

  test('6. service role can insert (proves the gate route read path)', async () => {
    const { error } = await serviceClient()
      .from('client_previews')
      .insert(previewRow('service-ins-01'));
    expect(error).toBeNull();
  });

  test('7. anon cannot execute bump_preview_access (EXECUTE revoked)', async () => {
    await seedPreview('rpc-anon-001');
    const { error } = await anonClient().rpc('bump_preview_access', { p_slug: 'rpc-anon-001' });
    expect(error).not.toBeNull();
  });

  test('8. service role can execute bump_preview_access and it increments', async () => {
    await seedPreview('rpc-svc-0001');
    const { error } = await serviceClient().rpc('bump_preview_access', { p_slug: 'rpc-svc-0001' });
    expect(error).toBeNull();

    const { data } = await serviceClient()
      .from('client_previews')
      .select('access_count, last_accessed_at')
      .eq('slug', 'rpc-svc-0001')
      .single();
    expect(data?.access_count).toBe(1);
    expect(data?.last_accessed_at).not.toBeNull();
  });
});
