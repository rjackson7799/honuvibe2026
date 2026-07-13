import { beforeAll, beforeEach, describe, expect, test } from 'vitest';
import { anonClient, serviceClient, userClient } from './helpers/clients';
import { FIXTURES, seedFixtures } from './helpers/fixtures';

const USERS = FIXTURES.users;
const ZERO_UUID = '00000000-0000-0000-0000-000000000000';

// lead_audits.lead_id is NOT NULL FK to leads (unlike client_previews.lead_id,
// which is nullable) — so, unlike the client_previews mirror, we MUST seed a
// leads row and use its id in every INSERT, or the tests fail on an FK violation
// instead of the intended RLS assertion.
const LEAD_ID = '33333333-3333-3333-3333-333333333333';

async function seedLead(): Promise<void> {
  const { error } = await serviceClient()
    .from('leads')
    .upsert(
      { id: LEAD_ID, name: 'Fixture Lead', email: 'lead@fixture.local', business_name: 'Fixture Biz' },
      { onConflict: 'id' },
    );
  if (error) throw error;
}

function auditRow(overrides: Record<string, unknown> = {}) {
  return { lead_id: LEAD_ID, audited_url: 'https://fixture.example/', status: 'generating', ...overrides };
}

async function seedAudit(overrides: Record<string, unknown> = {}): Promise<string> {
  const { data, error } = await serviceClient()
    .from('lead_audits')
    .insert(auditRow(overrides))
    .select('id')
    .single();
  if (error) throw error;
  return data!.id as string;
}

beforeAll(async () => {
  await seedFixtures();
  await seedLead();
});

beforeEach(async () => {
  await serviceClient().from('lead_audits').delete().neq('id', ZERO_UUID);
});

describe('lead_audits RLS', () => {
  test('1. anonymous cannot read', async () => {
    await seedAudit();
    const { data } = await anonClient().from('lead_audits').select('id');
    expect(data ?? []).toEqual([]);
  });

  test('2. anonymous cannot insert', async () => {
    const { error } = await anonClient().from('lead_audits').insert(auditRow());
    expect(error).not.toBeNull();
  });

  test('3. a non-admin member cannot read', async () => {
    await seedAudit();
    const client = await userClient(USERS.honuvibe_free);
    const { data } = await client.from('lead_audits').select('id');
    expect(data ?? []).toEqual([]);
  });

  test('4. a non-admin member cannot insert', async () => {
    const client = await userClient(USERS.honuvibe_free);
    const { error } = await client.from('lead_audits').insert(auditRow());
    expect(error).not.toBeNull();
  });

  test('5. an admin can SELECT / INSERT / UPDATE / DELETE', async () => {
    const admin = await userClient(USERS.honuvibe_admin);

    const { data: inserted, error: insErr } = await admin
      .from('lead_audits')
      .insert(auditRow())
      .select('id')
      .single();
    expect(insErr).toBeNull();
    const id = inserted!.id as string;

    const { data: selected } = await admin.from('lead_audits').select('id').eq('id', id);
    expect((selected ?? []).length).toBe(1);

    const { error: updErr } = await admin
      .from('lead_audits')
      .update({ audited_url: 'https://renamed.example/' })
      .eq('id', id);
    expect(updErr).toBeNull();

    const { error: delErr } = await admin.from('lead_audits').delete().eq('id', id);
    expect(delErr).toBeNull();
    const { data: afterDelete } = await serviceClient().from('lead_audits').select('id').eq('id', id);
    expect(afterDelete ?? []).toEqual([]);
  });

  test('6. service role can INSERT + UPDATE (the background job write path)', async () => {
    const id = await seedAudit();
    const { error } = await serviceClient()
      .from('lead_audits')
      .update({ scores: { overall: 42 } }) // still generating — allowed shape
      .eq('id', id);
    expect(error).toBeNull();
  });

  test('7. the terminal-shape CHECK rejects completed with NULL scores', async () => {
    const id = await seedAudit();
    const { error } = await serviceClient()
      .from('lead_audits')
      .update({ status: 'completed', completed_at: new Date().toISOString() }) // scores/findings/etc. still null
      .eq('id', id);
    expect(error).not.toBeNull(); // violates lead_audits_terminal_shape_ck
  });
});
