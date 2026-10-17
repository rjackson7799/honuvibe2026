import { randomUUID } from 'node:crypto';
import { afterAll, beforeAll, beforeEach, describe, expect, test } from 'vitest';
import { anonClient, serviceClient, userClient } from './helpers/clients';

// Dedicated users keep role/billing mutation tests isolated from other suites.
const STUDENT = randomUUID();
const OTHER = randomUUID();
const ADMIN = randomUUID();
const COURSE = randomUUID();
const baseline = {
  role: 'student',
  email: `${STUDENT}@fixture.local`,
  full_name: 'Profile guard student',
  subscription_tier: 'free',
  subscription_status: 'none',
  subscription_stripe_id: null,
  subscription_expires_at: null,
  stripe_customer_id: null,
  is_vertice_member: false,
  referred_by_partner_id: null,
};

beforeAll(async () => {
  const service = serviceClient();
  for (const id of [STUDENT, OTHER, ADMIN]) {
    const { error } = await service.auth.admin.createUser({
      id,
      email: `${id}@fixture.local`,
      password: `fixture-pass-${id}`,
      email_confirm: true,
    });
    if (error) throw error;
  }
  const { error: adminError } = await service.from('users')
    .update({ role: 'admin' }).eq('id', ADMIN);
  if (adminError) throw adminError;
  const { error: courseError } = await service.from('courses').insert({
    id: COURSE,
    slug: `profile-enrollment-guard-${COURSE}`,
    title_en: 'Paid enrollment guard test',
    is_published: true,
    price_usd: 10000,
    price_jpy: 15000,
  });
  if (courseError) throw courseError;
});

beforeEach(async () => {
  const service = serviceClient();
  const { error } = await service.from('users').update(baseline).eq('id', STUDENT);
  if (error) throw error;
  const { error: deleteError } = await service.from('enrollments').delete().eq('course_id', COURSE);
  if (deleteError) throw deleteError;
  const { error: courseError } = await service.from('courses').update({
    price_usd: 10000, price_jpy: 15000, is_published: true, is_private: false,
    status: 'published', current_enrollment: 0, max_enrollment: null, course_type: 'cohort',
  }).eq('id', COURSE);
  if (courseError) throw courseError;
});

afterAll(async () => {
  const service = serviceClient();
  const { error } = await service.from('courses').delete().eq('id', COURSE);
  if (error) throw error;
  for (const id of [STUDENT, OTHER, ADMIN]) {
    const { error: deleteError } = await service.auth.admin.deleteUser(id);
    if (deleteError) throw deleteError;
  }
});

describe('prelaunch profile and enrollment boundaries', () => {
  test.each([
    { price_usd: 10000, price_jpy: 0 },
    { price_usd: 0, price_jpy: 15000 },
    { price_usd: null, price_jpy: null },
    { price_usd: 0, price_jpy: 0, is_published: false },
    { price_usd: 0, price_jpy: 0, is_private: true, course_type: '1v1', max_enrollment: 1 },
  ])('free enrollment rejects ineligible course %j', async (update) => {
    const { error: updateError } = await serviceClient().from('courses').update(update).eq('id', COURSE);
    expect(updateError).toBeNull();
    const student = await userClient(STUDENT);
    const { error } = await student.rpc('enroll_in_free_course', { p_course_id: COURSE, p_locale: 'en' });
    expect(error).not.toBeNull();
    const { data } = await serviceClient().from('enrollments').select('id').eq('course_id', COURSE);
    expect(data).toEqual([]);
  });

  test('concurrent free enrollment reserves the final seat once', async () => {
    const { error: updateError } = await serviceClient().from('courses')
      .update({ price_usd: 0, price_jpy: 0, max_enrollment: 1 }).eq('id', COURSE);
    expect(updateError).toBeNull();
    const students = await Promise.all([userClient(STUDENT), userClient(OTHER)]);
    const results = await Promise.all(students.map((client) => client.rpc('enroll_in_free_course', {
      p_course_id: COURSE, p_locale: 'ja',
    })));
    expect(results.filter((r) => !r.error)).toHaveLength(1);
    expect(results.filter((r) => r.error)).toHaveLength(1);
    const winner = students[results.findIndex((r) => !r.error)];
    const repeat = await winner.rpc('enroll_in_free_course', { p_course_id: COURSE, p_locale: 'ja' });
    expect(repeat.error).toBeNull();
    expect(repeat.data.alreadyEnrolled).toBe(true);
    const { data: enrollments } = await serviceClient().from('enrollments')
      .select('amount_paid, currency').eq('course_id', COURSE);
    expect(enrollments).toEqual([{ amount_paid: 0, currency: 'jpy' }]);
    const { data: course } = await serviceClient().from('courses').select('current_enrollment').eq('id', COURSE).single();
    expect(course?.current_enrollment).toBe(1);
  });

  test('free enrollment accepts an unlisted (private) course', async () => {
    const service = serviceClient();
    const { error: updateError } = await service.from('courses')
      .update({ price_usd: 0, price_jpy: 0, is_private: true }).eq('id', COURSE);
    expect(updateError).toBeNull();
    const student = await userClient(STUDENT);
    const { data, error } = await student.rpc('enroll_in_free_course', { p_course_id: COURSE, p_locale: 'en' });
    expect(error).toBeNull();
    expect(data).toMatchObject({ success: true, alreadyEnrolled: false });
    const { data: enrollments } = await service.from('enrollments')
      .select('user_id, status').eq('course_id', COURSE);
    expect(enrollments).toEqual([{ user_id: STUDENT, status: 'active' }]);
  });

  test.each([
    ['role', 'admin'],
    ['email', 'different@example.test'],
    ['subscription_tier', 'vault'],
    ['subscription_status', 'active'],
    ['subscription_stripe_id', 'sub_test_spoofed'],
    ['subscription_expires_at', '2099-01-01T00:00:00Z'],
    ['stripe_customer_id', 'cus_test_spoofed'],
    ['is_vertice_member', true],
  ] as const)('student cannot change protected field %s', async (field, value) => {
    const student = await userClient(STUDENT);
    const { error } = await student.from('users').update({ [field]: value }).eq('id', STUDENT);
    expect(error?.code).toBe('42501');
    const { data, error: readError } = await serviceClient().from('users')
      .select('*').eq('id', STUDENT).single();
    expect(readError).toBeNull();
    expect(data?.[field]).toEqual(baseline[field as keyof typeof baseline]);
  });

  test('student can update the supported profile settings', async () => {
    const student = await userClient(STUDENT);
    const update = {
      full_name: 'Updated name',
      avatar_url: 'https://example.test/avatar.png',
      locale_preference: 'ja',
      onboarded: true,
      password_set: true,
      updated_at: '2026-09-04T00:00:00Z',
    };
    const { error } = await student.from('users').update(update).eq('id', STUDENT);
    expect(error).toBeNull();
    const { data, error: readError } = await serviceClient().from('users')
      .select('*').eq('id', STUDENT).single();
    expect(readError).toBeNull();
    expect(data).toMatchObject({ ...update, updated_at: expect.any(String) });
    expect(new Date(data!.updated_at).toISOString()).toBe('2026-09-04T00:00:00.000Z');
  });

  test('student cannot update another profile', async () => {
    const service = serviceClient();
    const { data: before, error: beforeError } = await service.from('users')
      .select('full_name').eq('id', OTHER).single();
    expect(beforeError).toBeNull();
    const student = await userClient(STUDENT);
    await student.from('users').update({ full_name: 'Unauthorized change' }).eq('id', OTHER);
    const { data: after, error } = await service.from('users')
      .select('full_name').eq('id', OTHER).single();
    expect(error).toBeNull();
    expect(after).toEqual(before);
  });

  test('admin session can still promote and demote an instructor', async () => {
    const admin = await userClient(ADMIN);
    for (const role of ['instructor', 'student']) {
      const { data, error } = await admin.from('users').update({ role })
        .eq('id', STUDENT).select('role').single();
      expect(error).toBeNull();
      expect(data?.role).toBe(role);
    }
  });

  test('service role can still fulfill billing updates', async () => {
    const update = { subscription_tier: 'vault', subscription_status: 'active', stripe_customer_id: 'cus_test_trusted' };
    const { data, error } = await serviceClient().from('users').update(update)
      .eq('id', STUDENT).select('subscription_tier, subscription_status, stripe_customer_id').single();
    expect(error).toBeNull();
    expect(data).toEqual(update);
  });

  test('student and anonymous callers cannot directly grant paid enrollment', async () => {
    for (const client of [await userClient(STUDENT), anonClient()]) {
      const { error } = await client.from('enrollments').insert({
        user_id: STUDENT, course_id: COURSE, status: 'active', amount_paid: 0,
      });
      expect(error?.code).toBe('42501');
    }
    const { data, error } = await serviceClient().from('enrollments')
      .select('id').eq('course_id', COURSE);
    expect(error).toBeNull();
    expect(data).toEqual([]);
  });

  test('admin and service enrollment creation remain available', async () => {
    const admin = await userClient(ADMIN);
    for (const [client, userId] of [[admin, STUDENT], [serviceClient(), OTHER]] as const) {
      const { data, error } = await client.from('enrollments').insert({
        user_id: userId, course_id: COURSE, status: 'active', amount_paid: 10000,
      }).select('user_id').single();
      expect(error).toBeNull();
      expect(data?.user_id).toBe(userId);
    }
  });
});
