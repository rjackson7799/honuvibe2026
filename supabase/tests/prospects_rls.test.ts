import { beforeAll, beforeEach, describe, expect, test } from 'vitest';
import { anonClient, serviceClient, userClient } from './helpers/clients';
import { FIXTURES, seedFixtures } from './helpers/fixtures';

const USERS = FIXTURES.users;
const ZERO_UUID = '00000000-0000-0000-0000-000000000000';

// prospects.converted_lead_id is a NULLABLE FK (unlike lead_audits.lead_id), so
// basic CRUD needs no seeded leads row — the convert_prospect RPC creates its
// own lead, which each run cleans up by its fixture business name.
const FIXTURE_BIZ = 'RLS Fixture Prospect Biz';

let seq = 0;
function prospectRow(overrides: Record<string, unknown> = {}) {
  seq += 1;
  return {
    place_id: `rls-fixture-place-${Date.now()}-${seq}`,
    name: FIXTURE_BIZ,
    website: 'https://fixture.example/',
    phone: '555-0100',
    industry: 'plumber',
    location: 'Honolulu',
    search_query: 'plumber in Honolulu',
    status: 'new',
    ...overrides,
  };
}

async function seedProspect(overrides: Record<string, unknown> = {}): Promise<string> {
  const { data, error } = await serviceClient()
    .from('prospects')
    .insert(prospectRow(overrides))
    .select('id')
    .single();
  if (error) throw error;
  return data!.id as string;
}

beforeAll(async () => {
  await seedFixtures();
});

beforeEach(async () => {
  await serviceClient().from('prospects').delete().neq('id', ZERO_UUID);
  await serviceClient().from('leads').delete().eq('business_name', FIXTURE_BIZ);
});

describe('prospects RLS', () => {
  test('1. anonymous cannot read', async () => {
    await seedProspect();
    const { data } = await anonClient().from('prospects').select('id');
    expect(data ?? []).toEqual([]);
  });

  test('2. anonymous cannot insert', async () => {
    const { error } = await anonClient().from('prospects').insert(prospectRow());
    expect(error).not.toBeNull();
  });

  test('3. a non-admin member cannot read', async () => {
    await seedProspect();
    const client = await userClient(USERS.honuvibe_free);
    const { data } = await client.from('prospects').select('id');
    expect(data ?? []).toEqual([]);
  });

  test('4. a non-admin member cannot insert', async () => {
    const client = await userClient(USERS.honuvibe_free);
    const { error } = await client.from('prospects').insert(prospectRow());
    expect(error).not.toBeNull();
  });

  test('5. an admin can SELECT / INSERT / UPDATE / DELETE', async () => {
    const admin = await userClient(USERS.honuvibe_admin);

    const { data: inserted, error: insErr } = await admin
      .from('prospects')
      .insert(prospectRow())
      .select('id')
      .single();
    expect(insErr).toBeNull();
    const id = inserted!.id as string;

    const { data: selected } = await admin.from('prospects').select('id').eq('id', id);
    expect((selected ?? []).length).toBe(1);

    const { error: updErr } = await admin
      .from('prospects')
      .update({ status: 'dismissed', dismissed_from: 'new' })
      .eq('id', id);
    expect(updErr).toBeNull();

    const { error: delErr } = await admin.from('prospects').delete().eq('id', id);
    expect(delErr).toBeNull();
    const { data: afterDelete } = await serviceClient().from('prospects').select('id').eq('id', id);
    expect(afterDelete ?? []).toEqual([]);
  });

  test('6. service role can INSERT + UPDATE (the scoring job write path)', async () => {
    const id = await seedProspect();
    const { error } = await serviceClient()
      .from('prospects')
      .update({
        status: 'scored',
        score: 48,
        score_breakdown: [{ id: 'no_viewport', label: 'Not mobile-friendly', points: 18 }],
        scored_at: new Date().toISOString(),
      })
      .eq('id', id);
    expect(error).toBeNull();
  });

  test('7. the status CHECK rejects an unknown status', async () => {
    const { error } = await serviceClient()
      .from('prospects')
      .insert(prospectRow({ status: 'bogus' }));
    expect(error).not.toBeNull();
  });

  test('8. scoring with a NULL scoring_started_at violates prospects_scoring_needs_anchor_ck', async () => {
    const { error } = await serviceClient()
      .from('prospects')
      .insert(prospectRow({ status: 'scoring', scoring_started_at: null }));
    expect(error).not.toBeNull();

    const { error: withAnchor } = await serviceClient()
      .from('prospects')
      .insert(prospectRow({ status: 'scoring', scoring_started_at: new Date().toISOString() }));
    expect(withAnchor).toBeNull();
  });

  test('9. anon / authed (incl. admin) cannot execute convert_prospect — service role only', async () => {
    const id = await seedProspect();

    const { error: anonErr } = await anonClient().rpc('convert_prospect', { p_prospect_id: id });
    expect(anonErr).not.toBeNull();

    const member = await userClient(USERS.honuvibe_free);
    const { error: memberErr } = await member.rpc('convert_prospect', { p_prospect_id: id });
    expect(memberErr).not.toBeNull();

    const admin = await userClient(USERS.honuvibe_admin);
    const { error: adminErr } = await admin.rpc('convert_prospect', { p_prospect_id: id });
    expect(adminErr).not.toBeNull();

    // No lead was created by any of the rejected calls.
    const { data: leads } = await serviceClient()
      .from('leads')
      .select('id')
      .eq('business_name', FIXTURE_BIZ);
    expect(leads ?? []).toEqual([]);
  });

  test('10. service role converts: one lead with source=prospecting, prospect converted', async () => {
    const id = await seedProspect({ status: 'scored', score: 80 });

    const { data, error } = await serviceClient().rpc('convert_prospect', { p_prospect_id: id });
    expect(error).toBeNull();
    const row = (Array.isArray(data) ? data[0] : data) as {
      lead_id: string;
      already_converted: boolean;
    };
    expect(row.already_converted).toBe(false);

    const { data: lead } = await serviceClient()
      .from('leads')
      .select('id, business_name, existing_url, phone, industry, source, lifecycle, sales_stage')
      .eq('id', row.lead_id)
      .single();
    expect(lead).toMatchObject({
      business_name: FIXTURE_BIZ,
      existing_url: 'https://fixture.example/',
      phone: '555-0100',
      industry: 'plumber',
      source: 'prospecting',
      lifecycle: 'new',
      sales_stage: 'new',
    });

    const { data: prospect } = await serviceClient()
      .from('prospects')
      .select('status, converted_lead_id')
      .eq('id', id)
      .single();
    expect(prospect).toMatchObject({ status: 'converted', converted_lead_id: row.lead_id });
  });

  test('11. convert_prospect is idempotent: a replay returns the same lead and creates no second one', async () => {
    const id = await seedProspect();

    const { data: first } = await serviceClient().rpc('convert_prospect', { p_prospect_id: id });
    const firstRow = (Array.isArray(first) ? first[0] : first) as { lead_id: string };

    const { data: second, error } = await serviceClient().rpc('convert_prospect', {
      p_prospect_id: id,
    });
    expect(error).toBeNull();
    const secondRow = (Array.isArray(second) ? second[0] : second) as {
      lead_id: string;
      already_converted: boolean;
    };
    expect(secondRow.lead_id).toBe(firstRow.lead_id);
    expect(secondRow.already_converted).toBe(true);

    // Count the leads — exactly one.
    const { data: leads } = await serviceClient()
      .from('leads')
      .select('id')
      .eq('business_name', FIXTURE_BIZ);
    expect((leads ?? []).length).toBe(1);
  });

  test('12. convert_prospect raises prospect_not_found for an unknown id', async () => {
    const { error } = await serviceClient().rpc('convert_prospect', {
      p_prospect_id: ZERO_UUID,
    });
    expect(error).not.toBeNull();
    expect(error!.message).toContain('prospect_not_found');
  });
});
