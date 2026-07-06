import { beforeAll, beforeEach, describe, expect, test } from 'vitest';
import { anonClient, serviceClient, userClient } from './helpers/clients';
import { FIXTURES, seedFixtures } from './helpers/fixtures';

const USERS = FIXTURES.users;

// A private 1v1 course to host the reports. Publish state is irrelevant to the
// report RLS (which keys on session_reports.status + student_id), but we model
// it faithfully to the real engagement shape.
const COURSE_ID = 'ffffffff-ffff-ffff-ffff-ffffffffff01';

// Fixed report IDs so private/pattern children can reference them.
const PUBLISHED_OWN = 'ffffffff-ffff-ffff-ffff-ffffffffff10';
const REVIEW_OWN = 'ffffffff-ffff-ffff-ffff-ffffffffff11';
const FAILED_OWN = 'ffffffff-ffff-ffff-ffff-ffffffffff12';
const PUBLISHED_OTHER = 'ffffffff-ffff-ffff-ffff-ffffffffff13';

async function seedCourse(): Promise<void> {
  const admin = serviceClient();
  const { error } = await admin.from('courses').upsert(
    {
      id: COURSE_ID,
      slug: 'session-reports-rls-course',
      title_en: '1v1 RLS Test',
      course_type: '1v1',
      is_private: true,
      is_published: true,
      max_enrollment: 1,
    },
    { onConflict: 'id' },
  );
  if (error) throw error;
}

async function seedReports(): Promise<void> {
  const admin = serviceClient();

  const { error: rErr } = await admin.from('session_reports').insert([
    {
      id: PUBLISHED_OWN,
      course_id: COURSE_ID,
      student_id: USERS.honuvibe_free,
      session_date: '2026-06-01',
      topic: 'Published own',
      status: 'published',
      student_json: { snapshot: { summary_en: 'ok', summary_jp: 'ok' } },
      published_at: '2026-06-01T00:00:00Z',
      created_by: USERS.honuvibe_admin,
    },
    {
      id: REVIEW_OWN,
      course_id: COURSE_ID,
      student_id: USERS.honuvibe_free,
      session_date: '2026-06-02',
      topic: 'Review own',
      status: 'review',
      student_json: { snapshot: { summary_en: 'draft', summary_jp: 'draft' } },
      created_by: USERS.honuvibe_admin,
    },
    {
      id: FAILED_OWN,
      course_id: COURSE_ID,
      student_id: USERS.honuvibe_free,
      session_date: '2026-06-03',
      topic: 'Failed own',
      status: 'failed',
      created_by: USERS.honuvibe_admin,
    },
    {
      id: PUBLISHED_OTHER,
      course_id: COURSE_ID,
      student_id: USERS.honuvibe_paid,
      session_date: '2026-06-04',
      topic: 'Published other',
      status: 'published',
      student_json: { snapshot: { summary_en: 'ok', summary_jp: 'ok' } },
      published_at: '2026-06-04T00:00:00Z',
      created_by: USERS.honuvibe_admin,
    },
  ]);
  if (rErr) throw rErr;

  const { error: pErr } = await admin.from('session_report_private').insert([
    {
      report_id: PUBLISHED_OWN,
      transcript_ref: `${COURSE_ID}/${PUBLISHED_OWN}/transcript.txt`,
      instructor_json: { instructor_analysis: 'candid notes', homework: [{ answer_key_en: 'secret' }] },
      model_id: 'claude-opus-4-8',
    },
  ]);
  if (pErr) throw pErr;

  const { error: spErr } = await admin.from('student_patterns').insert([
    {
      course_id: COURSE_ID,
      student_id: USERS.honuvibe_free,
      category: 'articles',
      label_en: 'Articles',
      label_jp: '冠詞',
      occurrence_count: 3,
      last_seen_on: '2026-06-01',
      examples: [{ quote: 'I went to store', correction: 'I went to the store', session_date: '2026-06-01' }],
    },
  ]);
  if (spErr) throw spErr;
}

beforeAll(async () => {
  await seedFixtures();
  await seedCourse();
});

beforeEach(async () => {
  const admin = serviceClient();
  // Children cascade from session_reports, but clear patterns explicitly.
  await admin.from('student_patterns').delete().eq('course_id', COURSE_ID);
  await admin.from('session_reports').delete().eq('course_id', COURSE_ID);
  await seedReports();
});

describe('session_reports RLS', () => {
  test('1. anonymous cannot read any report', async () => {
    const { data } = await anonClient()
      .from('session_reports')
      .select('id')
      .eq('course_id', COURSE_ID);
    expect(data ?? []).toEqual([]);
  });

  test('2. student reads only their own PUBLISHED report', async () => {
    const client = await userClient(USERS.honuvibe_free);
    const { data } = await client
      .from('session_reports')
      .select('id, status, student_id')
      .eq('course_id', COURSE_ID);
    expect(data).toHaveLength(1);
    expect(data?.[0]?.id).toBe(PUBLISHED_OWN);
    expect(data?.[0]?.status).toBe('published');
  });

  test('3. student cannot read their own REVIEW report', async () => {
    const client = await userClient(USERS.honuvibe_free);
    const { data } = await client
      .from('session_reports')
      .select('id')
      .eq('id', REVIEW_OWN);
    expect(data ?? []).toEqual([]);
  });

  test('4. student cannot read their own FAILED report', async () => {
    const client = await userClient(USERS.honuvibe_free);
    const { data } = await client
      .from('session_reports')
      .select('id')
      .eq('id', FAILED_OWN);
    expect(data ?? []).toEqual([]);
  });

  test("5. student cannot read another student's published report", async () => {
    const client = await userClient(USERS.honuvibe_free);
    const { data } = await client
      .from('session_reports')
      .select('id')
      .eq('id', PUBLISHED_OTHER);
    expect(data ?? []).toEqual([]);
  });

  test('6. student cannot insert a report', async () => {
    const client = await userClient(USERS.honuvibe_free);
    const { error } = await client.from('session_reports').insert({
      course_id: COURSE_ID,
      student_id: USERS.honuvibe_free,
      session_date: '2026-06-10',
      status: 'published',
    });
    expect(error).not.toBeNull();
  });

  test('7. student cannot read session_report_private (instructor content)', async () => {
    const client = await userClient(USERS.honuvibe_free);
    const { data } = await client
      .from('session_report_private')
      .select('report_id, instructor_json')
      .eq('report_id', PUBLISHED_OWN);
    expect(data ?? []).toEqual([]);
  });

  test('8. student cannot read student_patterns', async () => {
    const client = await userClient(USERS.honuvibe_free);
    const { data } = await client
      .from('student_patterns')
      .select('id')
      .eq('course_id', COURSE_ID);
    expect(data ?? []).toEqual([]);
  });

  test('9. anonymous cannot read private tables', async () => {
    const anon = anonClient();
    const priv = await anon.from('session_report_private').select('report_id');
    const pat = await anon.from('student_patterns').select('id');
    expect(priv.data ?? []).toEqual([]);
    expect(pat.data ?? []).toEqual([]);
  });

  test('10. admin reads all reports, private rows, and patterns', async () => {
    const client = await userClient(USERS.honuvibe_admin);
    const reports = await client
      .from('session_reports')
      .select('id')
      .eq('course_id', COURSE_ID);
    expect((reports.data ?? []).length).toBe(4);

    const priv = await client
      .from('session_report_private')
      .select('report_id')
      .eq('report_id', PUBLISHED_OWN);
    expect((priv.data ?? []).length).toBe(1);

    const pat = await client
      .from('student_patterns')
      .select('id')
      .eq('course_id', COURSE_ID);
    expect((pat.data ?? []).length).toBe(1);
  });
});
