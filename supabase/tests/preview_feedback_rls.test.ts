import { beforeAll, beforeEach, describe, expect, test, vi } from 'vitest';
import { anonClient, serviceClient, userClient } from './helpers/clients';
import { FIXTURES, seedFixtures } from './helpers/fixtures';

const USERS = FIXTURES.users;
const ZERO_UUID = '00000000-0000-0000-0000-000000000000';
const PREVIEW_SLUG = 'feedback-rls-01';

// Every call is a network round trip against the hosted test project; raise
// the per-test/hook budget only when the target is remote.
const REMOTE = !/127\.0\.0\.1|localhost/.test(process.env.TEST_SUPABASE_URL ?? '');
vi.setConfig({
  testTimeout: REMOTE ? 120_000 : 20_000,
  hookTimeout: REMOTE ? 120_000 : 20_000,
});

const svc = serviceClient();

let previewId: string;
let rowIds: string[];

function feedbackRow(overrides: Record<string, unknown> = {}) {
  return {
    preview_id: previewId,
    page: '/index.html',
    reviewer_name: 'Reviewer',
    kind: 'bug',
    message: 'Something looks off',
    ...overrides,
  };
}

async function seedPreview(): Promise<string> {
  const { data, error } = await svc
    .from('client_previews')
    .insert({
      slug: PREVIEW_SLUG,
      title: 'Feedback fixture',
      mode: 'gated',
      password: 'secret-pass',
      storage_prefix: PREVIEW_SLUG,
      entry_file: 'index.html',
    })
    .select('id')
    .single();
  if (error) throw error;
  return data!.id as string;
}

async function seedFeedback(): Promise<string[]> {
  const { data, error } = await svc
    .from('preview_feedback')
    .insert([feedbackRow({ message: 'first' }), feedbackRow({ kind: 'improvement', message: 'second' })])
    .select('id');
  if (error) throw error;
  return (data ?? []).map((r) => r.id as string);
}

beforeAll(async () => {
  await seedFixtures();
});

beforeEach(async () => {
  // preview_feedback cascades from client_previews.
  const { error: delErr } = await svc.from('client_previews').delete().neq('id', ZERO_UUID);
  if (delErr) throw delErr;
  previewId = await seedPreview();
  rowIds = await seedFeedback();
});

async function serviceRows() {
  const { data, error } = await svc
    .from('preview_feedback')
    .select('id, status')
    .eq('preview_id', previewId)
    .order('message');
  expect(error).toBeNull();
  return data!;
}

describe('preview_feedback RLS', () => {
  test('1. anon cannot SELECT (grant revoked)', async () => {
    const { error } = await anonClient().from('preview_feedback').select('id');
    expect(error).not.toBeNull();
    expect(error!.code).toBe('42501');
  });

  test('2. anon cannot INSERT (grant revoked)', async () => {
    const { error } = await anonClient().from('preview_feedback').insert(feedbackRow());
    expect(error).not.toBeNull();
    expect(error!.code).toBe('42501');
  });

  test('3. a member SELECT succeeds but sees nothing', async () => {
    const member = await userClient(USERS.honuvibe_free);
    const { data, error } = await member.from('preview_feedback').select('id');
    expect(error).toBeNull();
    expect(data).toEqual([]);
  });

  test('4. a member cannot INSERT', async () => {
    const member = await userClient(USERS.honuvibe_free);
    const { error } = await member.from('preview_feedback').insert(feedbackRow());
    expect(error).not.toBeNull();
  });

  test('5. a member UPDATE / DELETE affects zero rows', async () => {
    const member = await userClient(USERS.honuvibe_free);

    const upd = await member
      .from('preview_feedback')
      .update({ status: 'done' })
      .eq('preview_id', previewId)
      .select('id');
    expect(upd.error).toBeNull();
    expect(upd.data).toEqual([]);

    const del = await member
      .from('preview_feedback')
      .delete()
      .eq('preview_id', previewId)
      .select('id');
    expect(del.error).toBeNull();
    expect(del.data).toEqual([]);

    const rows = await serviceRows();
    expect(rows).toHaveLength(2);
    expect(rows.every((r) => r.status === 'new')).toBe(true);
  });

  test('6. an admin can SELECT, UPDATE status and DELETE', async () => {
    const admin = await userClient(USERS.honuvibe_admin);

    const sel = await admin.from('preview_feedback').select('id').eq('preview_id', previewId);
    expect(sel.error).toBeNull();
    expect(sel.data).toHaveLength(2);

    const upd = await admin
      .from('preview_feedback')
      .update({ status: 'planned' })
      .eq('id', rowIds[0])
      .select('id');
    expect(upd.error).toBeNull();
    expect(upd.data).toHaveLength(1);
    const { data: after, error: afterErr } = await svc
      .from('preview_feedback')
      .select('status')
      .eq('id', rowIds[0])
      .single();
    expect(afterErr).toBeNull();
    expect(after!.status).toBe('planned');

    const del = await admin.from('preview_feedback').delete().eq('id', rowIds[0]).select('id');
    expect(del.error).toBeNull();
    expect(del.data).toHaveLength(1);
    const { data: gone, error: goneErr } = await svc
      .from('preview_feedback')
      .select('id')
      .eq('id', rowIds[0]);
    expect(goneErr).toBeNull();
    expect(gone).toEqual([]);
  });

  test('7. CHECK constraints reject bad kind, bad status and blank message', async () => {
    const badKind = await svc.from('preview_feedback').insert(feedbackRow({ kind: 'praise' }));
    expect(badKind.error?.code).toBe('23514');

    const badStatus = await svc.from('preview_feedback').insert(feedbackRow({ status: 'closed' }));
    expect(badStatus.error?.code).toBe('23514');

    const blank = await svc.from('preview_feedback').insert(feedbackRow({ message: '   \n\t ' }));
    expect(blank.error?.code).toBe('23514');
  });

  test('8. deleting the parent preview cascades', async () => {
    const before = await svc
      .from('preview_feedback')
      .select('id', { count: 'exact', head: true })
      .eq('preview_id', previewId);
    expect(before.error).toBeNull();
    expect(before.count).toBe(2);

    const del = await svc.from('client_previews').delete().eq('id', previewId);
    expect(del.error).toBeNull();

    const after = await svc
      .from('preview_feedback')
      .select('id', { count: 'exact', head: true })
      .eq('preview_id', previewId);
    expect(after.error).toBeNull();
    expect(after.count).toBe(0);
  });

  test('9. feedback_enabled defaults to false', async () => {
    const { data, error } = await svc
      .from('client_previews')
      .select('feedback_enabled')
      .eq('id', previewId)
      .single();
    expect(error).toBeNull();
    expect(data!.feedback_enabled).toBe(false);
  });
});
