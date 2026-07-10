import { beforeAll, beforeEach, describe, expect, test } from 'vitest';
import { anonClient, serviceClient, userClient } from './helpers/clients';
import { FIXTURES, seedFixtures } from './helpers/fixtures';

const USERS = FIXTURES.users;

// A private 1v1 course to host the reports (mirrors session_reports_rls.test.ts's
// course shape). is_published = true, as real 1v1 engagements are created
// (lib/tutoring/actions.ts) — courses_public_read is what lets the
// enrollments/users instructor policies' courses subqueries resolve.
const COURSE_ID = 'ffffffff-ffff-ffff-ffff-fffffffffb01';

const INSTRUCTOR_1_PROFILE = 'ffffffff-ffff-ffff-ffff-fffffffffb21';
const INSTRUCTOR_2_PROFILE = 'ffffffff-ffff-ffff-ffff-fffffffffb22';

const STUDENT = USERS.honuvibe_free;

// Fixed report IDs so the private/pattern children can reference them.
const REPORT_GENERATING = 'ffffffff-ffff-ffff-ffff-fffffffffb10';
const REPORT_REVIEW = 'ffffffff-ffff-ffff-ffff-fffffffffb11';
const REPORT_PUBLISHED = 'ffffffff-ffff-ffff-ffff-fffffffffb12';

async function seedCourseAndAssignment(): Promise<void> {
  const admin = serviceClient();

  const { error: courseErr } = await admin.from('courses').upsert(
    {
      id: COURSE_ID,
      slug: 'tutoring-instructor-rls-course',
      title_en: '1v1 Instructor RLS Test',
      course_type: '1v1',
      is_private: true,
      is_published: true,
      max_enrollment: 1,
    },
    { onConflict: 'id' },
  );
  if (courseErr) throw courseErr;

  // Two instructor_profiles rows — only instructor_1 gets assigned below.
  const { error: profErr } = await admin.from('instructor_profiles').upsert(
    [
      {
        id: INSTRUCTOR_1_PROFILE,
        user_id: USERS.instructor_1,
        display_name: 'Instructor One (fixture)',
      },
      {
        id: INSTRUCTOR_2_PROFILE,
        user_id: USERS.instructor_2,
        display_name: 'Instructor Two (fixture)',
      },
    ],
    { onConflict: 'id' },
  );
  if (profErr) throw profErr;

  // Assign ONLY instructor_1 to this engagement.
  const { error: ciErr } = await admin.from('course_instructors').upsert(
    {
      course_id: COURSE_ID,
      instructor_id: INSTRUCTOR_1_PROFILE,
      role: 'lead',
    },
    { onConflict: 'course_id,instructor_id' },
  );
  if (ciErr) throw ciErr;

  // Active enrollment for the student in this 1v1 engagement.
  const { error: enrollErr } = await admin.from('enrollments').upsert(
    {
      user_id: STUDENT,
      course_id: COURSE_ID,
      status: 'active',
    },
    { onConflict: 'user_id,course_id' },
  );
  if (enrollErr) throw enrollErr;
}

async function seedReports(): Promise<void> {
  const admin = serviceClient();

  const { error: rErr } = await admin.from('session_reports').insert([
    {
      id: REPORT_GENERATING,
      course_id: COURSE_ID,
      student_id: STUDENT,
      session_date: '2026-06-01',
      topic: 'Generating',
      status: 'generating',
      created_by: USERS.honuvibe_admin,
    },
    {
      id: REPORT_REVIEW,
      course_id: COURSE_ID,
      student_id: STUDENT,
      session_date: '2026-06-02',
      topic: 'Review',
      status: 'review',
      student_json: { snapshot: { summary_en: 'draft', summary_jp: 'draft' } },
      created_by: USERS.honuvibe_admin,
    },
    {
      id: REPORT_PUBLISHED,
      course_id: COURSE_ID,
      student_id: STUDENT,
      session_date: '2026-06-03',
      topic: 'Published',
      status: 'published',
      student_json: { snapshot: { summary_en: 'ok', summary_jp: 'ok' } },
      published_at: '2026-06-03T00:00:00Z',
      created_by: USERS.honuvibe_admin,
    },
  ]);
  if (rErr) throw rErr;

  const { error: pErr } = await admin.from('session_report_private').insert([
    {
      report_id: REPORT_PUBLISHED,
      transcript_ref: `${COURSE_ID}/${REPORT_PUBLISHED}/transcript.txt`,
      instructor_json: { instructor_analysis: 'candid notes', homework: [{ answer_key_en: 'secret' }] },
      model_id: 'claude-opus-4-8',
    },
  ]);
  if (pErr) throw pErr;

  const { error: spErr } = await admin.from('student_patterns').insert([
    {
      course_id: COURSE_ID,
      student_id: STUDENT,
      category: 'articles',
      label_en: 'Articles',
      label_jp: '冠詞',
      occurrence_count: 2,
      last_seen_on: '2026-06-02',
      examples: [{ quote: 'I go store', correction: 'I go to the store', session_date: '2026-06-02' }],
    },
  ]);
  if (spErr) throw spErr;
}

beforeAll(async () => {
  await seedFixtures();
  await seedCourseAndAssignment();
});

beforeEach(async () => {
  const admin = serviceClient();
  // Children cascade from session_reports, but clear patterns explicitly.
  await admin.from('student_patterns').delete().eq('course_id', COURSE_ID);
  await admin.from('session_reports').delete().eq('course_id', COURSE_ID);
  await seedReports();
});

describe('tutoring instructor RLS (migration 058)', () => {
  test('1. assigned instructor reads all session_reports statuses for their course', async () => {
    const client = await userClient(USERS.instructor_1);
    const { data, error } = await client
      .from('session_reports')
      .select('id, status')
      .eq('course_id', COURSE_ID)
      .order('session_date', { ascending: true });
    expect(error).toBeNull();
    expect((data ?? []).map((r) => r.id)).toEqual([REPORT_GENERATING, REPORT_REVIEW, REPORT_PUBLISHED]);
  });

  test('2. assigned instructor reads the session_report_private row', async () => {
    const client = await userClient(USERS.instructor_1);
    const { data, error } = await client
      .from('session_report_private')
      .select('report_id, instructor_json')
      .eq('report_id', REPORT_PUBLISHED);
    expect(error).toBeNull();
    expect(data).toHaveLength(1);
    expect(data?.[0]?.instructor_json).toMatchObject({ instructor_analysis: 'candid notes' });
  });

  test('3. assigned instructor reads the student_patterns row', async () => {
    const client = await userClient(USERS.instructor_1);
    const { data, error } = await client
      .from('student_patterns')
      .select('id, category')
      .eq('course_id', COURSE_ID);
    expect(error).toBeNull();
    expect(data).toHaveLength(1);
    expect(data?.[0]?.category).toBe('articles');
  });

  test('4. assigned instructor reads the enrollment row', async () => {
    const client = await userClient(USERS.instructor_1);
    const { data, error } = await client
      .from('enrollments')
      .select('user_id, course_id, status')
      .eq('course_id', COURSE_ID);
    expect(error).toBeNull();
    expect(data).toHaveLength(1);
    expect(data?.[0]?.user_id).toBe(STUDENT);
  });

  test("5. assigned instructor reads the student's users row", async () => {
    const client = await userClient(USERS.instructor_1);
    const { data, error } = await client.from('users').select('id').eq('id', STUDENT);
    expect(error).toBeNull();
    expect(data).toHaveLength(1);
    expect(data?.[0]?.id).toBe(STUDENT);
  });

  test('6. unassigned instructor sees no session_reports for the course', async () => {
    const client = await userClient(USERS.instructor_2);
    const { data } = await client.from('session_reports').select('id').eq('course_id', COURSE_ID);
    expect(data ?? []).toEqual([]);
  });

  test('7. unassigned instructor sees no session_report_private row', async () => {
    const client = await userClient(USERS.instructor_2);
    const { data } = await client
      .from('session_report_private')
      .select('report_id')
      .eq('report_id', REPORT_PUBLISHED);
    expect(data ?? []).toEqual([]);
  });

  test('8. unassigned instructor sees no student_patterns row', async () => {
    const client = await userClient(USERS.instructor_2);
    const { data } = await client.from('student_patterns').select('id').eq('course_id', COURSE_ID);
    expect(data ?? []).toEqual([]);
  });

  test('9. unassigned instructor sees no enrollment row', async () => {
    const client = await userClient(USERS.instructor_2);
    const { data } = await client.from('enrollments').select('user_id').eq('course_id', COURSE_ID);
    expect(data ?? []).toEqual([]);
  });

  test("10. unassigned instructor cannot read the student's users row via this path", async () => {
    const client = await userClient(USERS.instructor_2);
    const { data } = await client.from('users').select('id').eq('id', STUDENT);
    expect(data ?? []).toEqual([]);
  });

  test('11. assigned instructor cannot INSERT a session_report', async () => {
    const client = await userClient(USERS.instructor_1);
    const { error } = await client.from('session_reports').insert({
      course_id: COURSE_ID,
      student_id: STUDENT,
      session_date: '2026-06-10',
      status: 'published',
    });
    expect(error).not.toBeNull();
  });

  test('12. assigned instructor cannot UPDATE a session_report', async () => {
    const client = await userClient(USERS.instructor_1);
    const { data, error } = await client
      .from('session_reports')
      .update({ topic: 'hacked-by-instructor' })
      .eq('id', REPORT_PUBLISHED)
      .select();
    // No instructor UPDATE policy exists: PostgREST either denies outright or
    // (since only a SELECT policy applies) silently affects zero rows.
    expect((data ?? []).length === 0 || error !== null).toBe(true);

    const admin = serviceClient();
    const { data: check } = await admin
      .from('session_reports')
      .select('topic')
      .eq('id', REPORT_PUBLISHED)
      .single();
    expect(check?.topic).toBe('Published');
  });

  test('13. existing behavior unchanged: student reads only their own published report', async () => {
    const client = await userClient(STUDENT);
    const { data } = await client
      .from('session_reports')
      .select('id, status')
      .eq('course_id', COURSE_ID);
    expect(data).toHaveLength(1);
    expect(data?.[0]?.id).toBe(REPORT_PUBLISHED);
    expect(data?.[0]?.status).toBe('published');
  });

  test('14. existing behavior unchanged: anonymous reads nothing', async () => {
    const anon = anonClient();
    const reports = await anon.from('session_reports').select('id').eq('course_id', COURSE_ID);
    const priv = await anon.from('session_report_private').select('report_id');
    const pat = await anon.from('student_patterns').select('id').eq('course_id', COURSE_ID);
    const enroll = await anon.from('enrollments').select('user_id').eq('course_id', COURSE_ID);
    expect(reports.data ?? []).toEqual([]);
    expect(priv.data ?? []).toEqual([]);
    expect(pat.data ?? []).toEqual([]);
    expect(enroll.data ?? []).toEqual([]);
  });

  test('15. existing behavior unchanged: admin still reads everything', async () => {
    const client = await userClient(USERS.honuvibe_admin);
    const { data } = await client.from('session_reports').select('id').eq('course_id', COURSE_ID);
    expect((data ?? []).length).toBe(3);
  });
});
