import { randomUUID } from 'node:crypto';
import { afterAll, beforeAll, describe, expect, test, vi } from 'vitest';
import type { SupabaseClient } from '@supabase/supabase-js';
import { anonClient, serviceClient, userClient } from './helpers/clients';
import { SPINE, resetSpineData, seedSpinePartners, seedUser } from './helpers/partner-spine';
import { COURSE_ACCESS_CASES, vaultStateFixture } from '../../lib/access/parity-matrix';
const serverContext = vi.hoisted(() => ({ client: null as SupabaseClient | null }));
vi.mock('@/lib/supabase/server', () => ({ createClient: async () => serverContext.client }));
import { getCourseWithCurriculum } from '@/lib/courses/queries';

const users = Object.fromEntries(['visitor','buyer','completed','refunded','teacher','unrelated','admin'].map(k => [k, randomUUID()]));
const clients: Record<string, SupabaseClient> = {};
const course = randomUUID(), privateCourse = randomUUID(), draft = randomUUID(), week = randomUUID(), otherWeek = randomUUID();
const preview = randomUUID(), paid = randomUUID(), bonus = randomUUID();
const resource = randomUUID(), publicResource = randomUUID(), crossed = randomUUID(), assignment = randomUUID();
const lesson = randomUUID(), audio = randomUUID(), teacherProfile = randomUUID(), otherProfile = randomUUID();
const path = `${course}/${week}/audit-${audio}.mp3`;
const victimPath = `${privateCourse}/${otherWeek}/audit-victim-${audio}.mp3`;
const service = serviceClient();
async function ok(result: PromiseLike<{ error: unknown }>) { expect((await result).error).toBeNull(); }

beforeAll(async () => {
  if (!/^https?:\/\/(localhost|127\.0\.0\.1)(:|\/)/.test(process.env.TEST_SUPABASE_URL ?? '')) throw new Error('Local test DB required');
  for (const [role, id] of Object.entries(users)) {
    await ok(service.auth.admin.createUser({ id, email: `${id}@fixture.local`, password: `fixture-pass-${id}`, email_confirm: true }));
    await ok(service.from('users').update({ role: role === 'admin' ? 'admin' : ['teacher','unrelated'].includes(role) ? 'instructor' : 'student' }).eq('id', id));
    clients[role] = await userClient(id);
  }
  await ok(service.from('courses').insert([
    { id: course, slug: `access-${course}`, title_en: 'Paid course', is_published: true, price_usd: 1000, price_jpy: 1500, free_preview_count: 1, zoom_link: 'https://secret.test/course', community_link: 'https://secret.test/community', proposal_review_notes: 'staff-only', esl_enabled: true, esl_included: true },
    { id: privateCourse, slug: `unlisted-${privateCourse}`, title_en: 'Unlisted', is_published: true, is_private: true, price_usd: 1000, price_jpy: 1500 },
    { id: draft, slug: `draft-${draft}`, title_en: 'Draft', is_published: false },
  ].map(row => ({ is_private: false, free_preview_count: 0, esl_enabled: false, esl_included: false, ...row }))));
  await ok(service.from('course_weeks').insert([{ id: week, course_id: course, week_number: 1, title_en: 'Week 1' }, { id: otherWeek, course_id: privateCourse, week_number: 1, title_en: 'Other' }]));
  await ok(service.from('course_sessions').insert([
    { id: preview, week_id: week, course_id: course, session_number: 1, title_en: 'Preview', format: 'recorded', replay_url: 'https://secret.test/preview', materials_en: ['https://secret.test/preview-material'] },
    { id: paid, week_id: week, course_id: course, session_number: 2, title_en: 'Paid', format: 'recorded', replay_url: 'https://secret.test/paid', transcript_url: 'https://secret.test/transcript', materials_en: ['https://secret.test/material'] },
    { id: bonus, week_id: null, course_id: course, session_number: null, title_en: 'Bonus', format: 'recorded', is_bonus: true, replay_url: 'https://secret.test/bonus' },
  ].map(row => ({ is_bonus: false, ...row }))));
  await ok(service.from('course_assignments').insert({ id: assignment, week_id: week, title_en: 'Assignment', description_en: 'Paid exercise' }));
  await ok(service.from('course_resources').insert([
    { id: resource, session_id: paid, title_en: 'Session-only material', url: 'https://secret.test/resource', is_public: false },
    { id: publicResource, week_id: week, title_en: 'Public resource', url: 'https://public.test/resource', is_public: true },
    { id: crossed, week_id: otherWeek, session_id: paid, title_en: 'Inconsistent links', url: 'https://secret.test/cross', is_public: true },
  ]));
  await ok(service.from('instructor_profiles').insert([{ id: teacherProfile, user_id: users.teacher, display_name: 'Assigned', is_active: true }, { id: otherProfile, user_id: users.unrelated, display_name: 'Unrelated', is_active: true }]));
  await ok(service.from('course_instructors').insert({ course_id: course, instructor_id: teacherProfile, role: 'lead' }));
  await ok(service.from('enrollments').insert(['buyer','completed','refunded'].map(role => ({ user_id: users[role], course_id: course, status: role === 'buyer' ? 'active' : role, amount_paid: 1000, currency: 'usd' }))));
  await ok(service.from('esl_lessons').insert({ id: lesson, course_id: course, week_id: week, status: 'published', vocabulary_json: [{ term: 'paid ESL' }] }));
  await ok(service.from('esl_audio').insert({ id: audio, esl_lesson_id: lesson, reference_key: 'audit', storage_path: path, public_url: 'https://obsolete.test/audio' }));
  const { data: buckets } = await service.storage.listBuckets();
  if (!buckets?.some(b => b.id === 'esl-audio')) await ok(service.storage.createBucket('esl-audio', { public: false }));
  await ok(service.storage.from('esl-audio').upload(path, new Uint8Array([1,2,3]), { contentType: 'audio/mpeg' }));
  await ok(service.storage.from('esl-audio').upload(victimPath, new Uint8Array([4,5,6]), { contentType: 'audio/mpeg' }));
}, 60_000);
afterAll(async () => {
  await service.storage.from('esl-audio').remove([path, victimPath]);
  await service.from('courses').delete().in('id', [course, privateCourse, draft]);
  await service.from('instructor_profiles').delete().in('id', [teacherProfile, otherProfile]);
  for (const id of Object.values(users)) await service.auth.admin.deleteUser(id);
}, 60_000);

describe('paid course database boundary', () => {
  test('the server curriculum response preserves titles and session-only resources without leaking paid data', async () => {
    serverContext.client = anonClient();
    const publicCourse = await getCourseWithCurriculum(`access-${course}`);
    expect(publicCourse?.weeks[0].sessions).toHaveLength(2);
    expect(publicCourse?.weeks[0].resources.find(r => r.id === resource)?.url).toBeNull();
    expect(JSON.stringify(publicCourse)).not.toContain('secret.test');
    expect(JSON.stringify(publicCourse)).not.toContain('staff-only');
    serverContext.client = clients.buyer;
    const ownedCourse = await getCourseWithCurriculum(`access-${course}`);
    expect(ownedCourse?.weeks[0].resources.find(r => r.id === resource)?.url).toBe('https://secret.test/resource');
    expect(ownedCourse?.community_link).toBe('https://secret.test/community');
    expect(ownedCourse?.proposal_review_notes).toBeNull();
  });
  test.each(['anonymous','visitor','refunded','unrelated'])('%s cannot read paid raw sessions or private resources', async role => {
    const client = role === 'anonymous' ? anonClient() : clients[role];
    for (const [table, id] of [['course_sessions', paid], ['course_resources', resource], ['course_assignments', assignment]]) {
      const result = await client.from(table).select('*').eq('id', id);
      expect(result.error).toBeNull(); expect(result.data).toEqual([]);
    }
    const catalog = await client.from('course_catalog').select('*').eq('id', course).single();
    expect(catalog.error).toBeNull(); expect(catalog.data.zoom_link).toBeNull();
    expect(catalog.data.community_link).toBeNull(); expect(catalog.data.proposal_review_notes).toBeNull();
  });
  test.each(['buyer','completed','teacher','admin'])('%s retains paid material and bonus access', async role => {
    for (const id of [paid, bonus]) {
      const result = await clients[role].from('course_sessions').select('replay_url').eq('id', id).single();
      expect(result.error).toBeNull(); expect(result.data?.replay_url).toContain('secret.test');
    }
    const result = await clients[role].from('course_resources').select('url').eq('id', resource).single();
    expect(result.error).toBeNull(); expect(result.data?.url).toBe('https://secret.test/resource');
  });
  test('public session metadata never serializes paid URLs, while login enables only the preview', async () => {
    const anonymous = await anonClient().from('course_session_catalog').select('*').in('id', [preview, paid, bonus]);
    expect(anonymous.error).toBeNull(); expect(anonymous.data).toHaveLength(3);
    expect(JSON.stringify(anonymous.data)).not.toContain('secret.test');
    const result = await clients.visitor.from('course_sessions').select('id,replay_url').in('id', [preview, paid, bonus]);
    expect(result.data).toEqual([{ id: preview, replay_url: 'https://secret.test/preview' }]);
  });
  test('unlisted URLs and pricing work, but unlisted courses stay out of filtered listings', async () => {
    const result = await anonClient().from('course_catalog').select('slug,price_usd').eq('slug', `unlisted-${privateCourse}`).single();
    expect(result.error).toBeNull(); expect(result.data?.price_usd).toBe(1000);
    expect((await anonClient().from('course_catalog').select('id').eq('id', privateCourse).eq('is_private', false)).data).toEqual([]);
    expect((await anonClient().from('course_catalog').select('id').eq('id', draft)).data).toEqual([]);
  });
  test('explicit public resources work and inconsistent cross-course links fail closed', async () => {
    expect((await anonClient().from('course_resources').select('url').eq('id', publicResource).single()).data?.url).toBe('https://public.test/resource');
    expect((await clients.buyer.from('course_resources').select('*').eq('id', crossed)).data).toEqual([]);
    expect((await clients.buyer.from('course_resource_catalog').select('*').eq('id', crossed)).data).toEqual([]);
  });
  test('course catalog preserves nested enrollment and partner relations without internal notes', async () => {
    const result = await clients.buyer.from('enrollments').select('course:course_catalog(id,zoom_link,proposal_review_notes)').eq('course_id', course);
    expect(result.error).toBeNull(); expect(JSON.stringify(result.data)).toContain('https://secret.test/course');
    expect(JSON.stringify(result.data)).not.toContain('staff-only');
    const partner = await anonClient().from('course_catalog').select('id,partners!courses_partner_id_fkey(slug)').eq('id', course);
    expect(partner.error).toBeNull();
  });
  test('course catalog exposes the 079 track and vault_included columns', async () => {
    const result = await anonClient().from('course_catalog').select('id,track,vault_included').eq('id', course).single();
    expect(result.error).toBeNull();
    expect(result.data).toHaveProperty('track');
    expect(result.data).toHaveProperty('vault_included');
  });
  // Three of the views are single-table and auto-updatable: a write through an
  // owner-privileged view would bypass the base table's RLS, so only SELECT is granted.
  test.each(['anonymous','visitor'])('%s cannot write through any catalog view', async role => {
    const client = role === 'anonymous' ? anonClient() : clients[role];
    const targets: [string, string][] = [['course_catalog', course], ['course_session_catalog', paid], ['course_assignment_catalog', assignment], ['course_resource_catalog', resource]];
    for (const [view, id] of targets) {
      // 42501 = privilege denied; 55000 = view not updatable (the join view).
      // Either blocks the write; an incidental constraint error would not prove it.
      const denied = ['42501', '55000'];
      expect(denied, `${view} insert`).toContain((await client.from(view).insert({ id: randomUUID(), title_en: 'forged' })).error?.code);
      expect(denied, `${view} update`).toContain((await client.from(view).update({ title_en: 'tampered' }).eq('id', id)).error?.code);
      expect(denied, `${view} delete`).toContain((await client.from(view).delete().eq('id', id)).error?.code);
    }
    expect((await service.from('courses').select('title_en').eq('id', course).single()).data?.title_en).toBe('Paid course');
    expect((await service.from('course_sessions').select('title_en').eq('id', paid).single()).data?.title_en).toBe('Paid');
  });
  test('unlisted free enrollment remains available by course ID', async () => {
    await ok(service.from('courses').update({ price_usd: 0, price_jpy: 0 }).eq('id', privateCourse));
    const result = await clients.visitor.rpc('enroll_in_free_course', { p_course_id: privateCourse, p_locale: 'ja' });
    expect(result.error).toBeNull(); expect(result.data.success).toBe(true);
  });
});

describe('paid ESL boundary', () => {
  test('staff cannot forge audio metadata to sign another course storage object', async () => {
    const inserted = await clients.teacher.from('esl_audio').insert({ esl_lesson_id: lesson, reference_key: 'forged-path', storage_path: victimPath, public_url: 'https://obsolete.test/victim' });
    const signed = await clients.teacher.storage.from('esl-audio').createSignedUrl(victimPath, 60);
    expect(signed.error).not.toBeNull();
    expect(inserted.error).not.toBeNull();
    // Historical forged metadata must not act as a storage capability either.
    await ok(service.from('esl_audio').insert({ esl_lesson_id: lesson, reference_key: 'legacy-forged-path', storage_path: victimPath, public_url: 'https://obsolete.test/victim' }));
    expect((await clients.teacher.storage.from('esl-audio').createSignedUrl(victimPath, 60)).error).not.toBeNull();
  });
  test.each(['anonymous','visitor','refunded','unrelated'])('%s cannot read ESL or sign audio', async role => {
    const client = role === 'anonymous' ? anonClient() : clients[role];
    expect((await client.from('esl_lessons').select('*').eq('id', lesson)).data).toEqual([]);
    expect((await client.from('esl_audio').select('*').eq('id', audio)).data).toEqual([]);
    expect((await client.storage.from('esl-audio').createSignedUrl(path, 60)).error).not.toBeNull();
  });
  test.each(['buyer','completed','teacher','admin'])('%s retains ESL and signed audio', async role => {
    const result = await clients[role].from('esl_lessons').select('id').eq('id', lesson).single();
    expect(result.error).toBeNull(); expect(result.data?.id).toBe(lesson);
    const signed = await clients[role].storage.from('esl-audio').createSignedUrl(path, 60);
    expect(signed.error).toBeNull(); expect(signed.data?.signedUrl).toContain('token=');
  });
  test('ordinary users cannot forge purchases, mutate lessons or replace audio', async () => {
    expect((await clients.visitor.from('esl_purchases').insert({ user_id: users.visitor, course_id: course, amount_paid: 0, currency: 'usd' })).error).not.toBeNull();
    await clients.visitor.from('esl_lessons').update({ vocabulary_json: ['tampered'] }).eq('id', lesson);
    expect((await service.from('esl_lessons').select('vocabulary_json').eq('id', lesson).single()).data?.vocabulary_json).toEqual([{ term: 'paid ESL' }]);
    expect((await clients.buyer.storage.from('esl-audio').upload(path, new Uint8Array([4]), { upsert: true })).error).not.toBeNull();
  });
  test('public audio URL is disabled and add-on purchases grant only the intended course', async () => {
    const { data } = anonClient().storage.from('esl-audio').getPublicUrl(path);
    expect((await fetch(data.publicUrl)).ok).toBe(false);
    await ok(service.from('courses').update({ esl_included: false }).eq('id', course));
    expect((await clients.buyer.from('esl_lessons').select('id').eq('id', lesson)).data).toEqual([]);
    await ok(service.from('esl_purchases').insert({ user_id: users.buyer, course_id: course, amount_paid: 100, currency: 'usd' }));
    expect((await clients.buyer.from('esl_lessons').select('id').eq('id', lesson).single()).data?.id).toBe(lesson);
  });
});

// ---------------------------------------------------------------------------
// B3 / migration 087: Vault members read Vault-included courses.
// Own seeds: the ESL block above flips `course.esl_included`, so nothing here
// leans on the shared course's ESL state.
// ---------------------------------------------------------------------------
describe('Vault course access (087)', () => {
  const included = randomUUID(), includedDraft = randomUUID(), notIncluded = randomUUID(), proposal = randomUUID(), selfStudy = randomUUID();
  const incWeek = randomUUID(), incPaid = randomUUID(), incResource = randomUUID(), incLesson = randomUUID(), incAudio = randomUUID();
  const draftWeek = randomUUID(), draftSession = randomUUID();
  const incPath = `${included}/${incWeek}/audit-${incAudio}.mp3`;
  type Case = (typeof COURSE_ACCESS_CASES)[number];
  const targetOf = (c: Case) =>
    !c.course.published ? includedDraft : c.course.vaultIncluded ? included : notIncluded;
  // One user per distinct (Vault state, enrollment) pair, not per case: GoTrue
  // rate-limits password sign-ins (local config: 30 per 5 min per IP), and the
  // file's top-level setup already signs in 7.
  const userKey = (c: Pick<Case, 'vault' | 'enrollment' | 'enrollmentOnOtherCourse'>) =>
    `${c.vault}|${c.enrollment ?? ''}|${c.enrollmentOnOtherCourse ? 'other' : ''}`;
  const keyUsers = new Map<string, { id: string; c: Case }>();
  for (const c of COURSE_ACCESS_CASES) {
    if (c.vault !== 'anon' && !keyUsers.has(userKey(c))) keyUsers.set(userKey(c), { id: randomUUID(), c });
  }
  const caseUsers = [...keyUsers.values()].map((u) => u.id);
  const keyClients = new Map<string, SupabaseClient>();
  const clientFor = (c: Case) => (c.vault === 'anon' ? anonClient() : keyClients.get(userKey(c))!);
  const b3Clients = {
    get vaultMember() { return keyClients.get(userKey({ vault: 'vault_active', enrollment: null }))!; },
    get lapsed() { return keyClients.get(userKey({ vault: 'vault_cancelled_expired', enrollment: null }))!; },
  };

  beforeAll(async () => {
    await seedSpinePartners();

    const base = { is_private: false, free_preview_count: 0, price_usd: 4900, price_jpy: 7000 };
    await ok(service.from('courses').insert([
      { ...base, id: included, slug: `vault-inc-${included}`, title_en: 'Included', course_type: 'self-study', is_published: true, vault_included: true, esl_enabled: true, esl_included: true, community_link: 'https://secret.test/inc-community' },
      { ...base, id: includedDraft, slug: `vault-draft-${includedDraft}`, title_en: 'Included draft', course_type: 'self-study', is_published: false, vault_included: true, esl_enabled: true, esl_included: true },
      { ...base, id: notIncluded, slug: `vault-not-${notIncluded}`, title_en: 'Not included', course_type: 'self-study', is_published: true, vault_included: false, esl_enabled: true, esl_included: true },
    ]));
    await ok(service.from('course_weeks').insert([
      { id: incWeek, course_id: included, week_number: 1, title_en: 'Week 1' },
      { id: draftWeek, course_id: includedDraft, week_number: 1, title_en: 'Week 1' },
    ]));
    await ok(service.from('course_sessions').insert([
      { id: incPaid, week_id: incWeek, course_id: included, session_number: 1, title_en: 'Paid', format: 'recorded', is_bonus: false, replay_url: 'https://secret.test/inc-replay' },
      { id: draftSession, week_id: draftWeek, course_id: includedDraft, session_number: 1, title_en: 'Draft paid', format: 'recorded', is_bonus: false, replay_url: 'https://secret.test/draft-replay' },
    ]));
    await ok(service.from('course_resources').insert({ id: incResource, session_id: incPaid, title_en: 'Session-only', url: 'https://secret.test/inc-resource', is_public: false }));
    await ok(service.from('esl_lessons').insert({ id: incLesson, course_id: included, week_id: incWeek, status: 'published', vocabulary_json: [{ term: 'vault ESL' }] }));
    await ok(service.from('esl_audio').insert({ id: incAudio, esl_lesson_id: incLesson, reference_key: 'vault', storage_path: incPath, public_url: 'https://obsolete.test/vault' }));
    await ok(service.storage.from('esl-audio').upload(incPath, new Uint8Array([7, 8, 9]), { contentType: 'audio/mpeg' }));

    // Users seeded from the same fixture the TS side reads.
    await resetSpineData(caseUsers);
    const now = new Date();
    for (const [key, { id, c }] of keyUsers) {
      const fixture = vaultStateFixture(c.vault, now)!;
      await seedUser(id, {
        subscription_tier: fixture.user.subscription_tier,
        subscription_status: fixture.user.subscription_status,
        subscription_expires_at: fixture.user.subscription_expires_at,
      });
      for (const [n, w] of fixture.cohort.entries()) {
        await ok(service.from('cohort_enrollments').insert({ user_id: id, cohort_id: `b3-${c.id}-${n}`, stripe_session_id: `cs_b3_${c.id}_${n}`, amount_paid: 0, currency: 'usd', ...w }));
      }
      for (const s of fixture.seats) {
        const { data: block, error } = await service.from('partner_seat_blocks').insert({
          partner_id: SPINE.partners.alpha, label: `b3 ${c.id}`, seats_total: 1, granted_tier: 'vault',
          access_starts_at: s.access_starts_at, access_ends_at: s.access_ends_at, source: 'sponsored', is_active: s.block_is_active,
        }).select('id').single();
        expect(error).toBeNull();
        await ok(service.from('partner_seat_grants').insert({ seat_block_id: block!.id, user_id: id, revoked_at: s.revoked_at }));
      }
      if (c.enrollment) {
        const courseId = c.enrollmentOnOtherCourse ? notIncluded : targetOf(c);
        await ok(service.from('enrollments').insert({ user_id: id, course_id: courseId, status: c.enrollment, amount_paid: 0, currency: 'usd' }));
      }
      keyClients.set(key, await userClient(id));
    }
  }, 120_000);

  afterAll(async () => {
    const all = caseUsers;
    await service.storage.from('esl-audio').remove([incPath]);
    await service.from('enrollments').delete().in('user_id', all);
    await service.from('courses').delete().in('id', [included, includedDraft, notIncluded, proposal, selfStudy]);
    await resetSpineData(all);
    for (const id of all) await service.auth.admin.deleteUser(id);
  }, 120_000);

  test('vault member reads paid material on an included course', async () => {
    const client = b3Clients.vaultMember;
    const session = await client.from('course_sessions').select('replay_url').eq('id', incPaid).single();
    expect(session.error).toBeNull(); expect(session.data?.replay_url).toBe('https://secret.test/inc-replay');
    const resourceRow = await client.from('course_resources').select('url').eq('id', incResource).single();
    expect(resourceRow.error).toBeNull(); expect(resourceRow.data?.url).toBe('https://secret.test/inc-resource');
    const catalog = await client.from('course_catalog').select('community_link').eq('id', included).single();
    expect(catalog.error).toBeNull(); expect(catalog.data?.community_link).toBe('https://secret.test/inc-community');
    const lessonRow = await client.from('esl_lessons').select('id').eq('id', incLesson).single();
    expect(lessonRow.error).toBeNull(); expect(lessonRow.data?.id).toBe(incLesson);
    const signed = await client.storage.from('esl-audio').createSignedUrl(incPath, 60);
    expect(signed.error).toBeNull(); expect(signed.data?.signedUrl).toContain('token=');
  });

  test('vault member gets nothing paid on a non-included course', async () => {
    const client = b3Clients.vaultMember;
    for (const [table, id] of [['course_sessions', paid], ['course_resources', resource], ['course_assignments', assignment]]) {
      const result = await client.from(table).select('*').eq('id', id);
      expect(result.error).toBeNull(); expect(result.data).toEqual([]);
    }
    const catalog = await client.from('course_catalog').select('*').eq('id', course).single();
    expect(catalog.error).toBeNull();
    expect(catalog.data.zoom_link).toBeNull(); expect(catalog.data.community_link).toBeNull();
    expect((await client.from('esl_lessons').select('id').eq('id', lesson)).data).toEqual([]);
    expect((await client.storage.from('esl-audio').createSignedUrl(path, 60)).error).not.toBeNull();
  });

  test.each(['lapsed', 'anonymous'])('%s subscriber gets nothing on the included course', async role => {
    const client = role === 'anonymous' ? anonClient() : b3Clients.lapsed;
    for (const [table, id] of [['course_sessions', incPaid], ['course_resources', incResource], ['esl_lessons', incLesson]]) {
      const result = await client.from(table).select('*').eq('id', id);
      expect(result.error).toBeNull(); expect(result.data).toEqual([]);
    }
    const catalog = await client.from('course_catalog').select('community_link').eq('id', included).single();
    expect(catalog.error).toBeNull(); expect(catalog.data?.community_link).toBeNull();
    expect((await client.storage.from('esl-audio').createSignedUrl(incPath, 60)).error).not.toBeNull();
  });

  test('vault member cannot read an included draft', async () => {
    const client = b3Clients.vaultMember;
    expect((await client.from('course_catalog').select('id').eq('id', includedDraft)).data).toEqual([]);
    expect((await client.from('course_sessions').select('id').eq('id', draftSession)).data).toEqual([]);
    expect((await client.rpc('can_read_course_materials', { p_course: includedDraft })).data).toBe(false);
  });

  test('COURSE_ACCESS_CASES match can_read_course_materials and can_access_course_esl', async () => {
    const mismatches: string[] = [];
    for (const c of COURSE_ACCESS_CASES) {
      const client = clientFor(c);
      const p_course = targetOf(c);
      const read = await client.rpc('can_read_course_materials', { p_course });
      const esl = await client.rpc('can_access_course_esl', { p_course });
      expect(read.error, c.id).toBeNull(); expect(esl.error, c.id).toBeNull();
      if (read.data !== c.expectCourse) mismatches.push(`${c.id}: course ${read.data} (expected ${c.expectCourse})`);
      if (esl.data !== c.expectEsl) mismatches.push(`${c.id}: esl ${esl.data} (expected ${c.expectEsl})`);
    }
    expect(mismatches).toEqual([]);
  });

  test('instructor cannot write a proposal row directly', async () => {
    const inserted = await clients.teacher.from('courses').insert({ id: randomUUID(), slug: `forged-${randomUUID()}`, title_en: 'Forged', status: 'proposal', proposed_by_instructor_id: teacherProfile, course_type: 'self-study', vault_included: true, is_published: true });
    expect(inserted.error?.code).toBe('42501');
    await ok(service.from('courses').insert({ id: proposal, slug: `proposal-${proposal}`, title_en: 'Proposal', status: 'proposal', proposed_by_instructor_id: teacherProfile, course_type: 'self-study', is_published: false, is_private: false }));
    // The proposal is still readable by its author (courses_own_proposals_read)...
    expect((await clients.teacher.from('courses').select('id').eq('id', proposal)).data).toEqual([{ id: proposal }]);
    // ...but no longer writable: the UPDATE matches no row.
    const updated = await clients.teacher.from('courses').update({ vault_included: true, is_published: true }).eq('id', proposal).select('id');
    expect(updated.error).toBeNull(); expect(updated.data).toEqual([]);
    const row = await service.from('courses').select('vault_included, is_published').eq('id', proposal).single();
    expect(row.data).toEqual({ vault_included: false, is_published: false });
    // Admins keep courses_admin_all: they can still edit the proposal.
    const reviewed = await clients.admin.from('courses').update({ title_en: 'Reviewed' }).eq('id', proposal).select('title_en');
    expect(reviewed.error).toBeNull(); expect(reviewed.data).toEqual([{ title_en: 'Reviewed' }]);
  });

  test('only self-study courses can be vault_included', async () => {
    for (const course_type of ['cohort', '1v1']) {
      const id = randomUUID();
      const result = await service.from('courses').insert({ id, slug: `vault-${course_type}-${id}`, title_en: course_type, course_type, vault_included: true });
      expect(result.error?.code, course_type).toBe('23514');
    }
    await ok(service.from('courses').insert({ id: selfStudy, slug: `vault-self-${selfStudy}`, title_en: 'self-study', course_type: 'self-study', vault_included: true }));
    // Flipping an existing cohort is refused too.
    expect((await service.from('courses').update({ vault_included: true }).eq('id', course)).error?.code).toBe('23514');
  });
});
