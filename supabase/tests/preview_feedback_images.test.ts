import { afterAll, beforeAll, describe, expect, test, vi } from 'vitest';
import { randomUUID } from 'node:crypto';
import { anonClient, serviceClient, userClient } from './helpers/clients';
import { FIXTURES, seedFixtures } from './helpers/fixtures';

const USERS = FIXTURES.users;
const BUCKET = 'preview-feedback-images';
const PREVIEW_SLUG = 'feedback-img-01';

const REMOTE = !/127\.0\.0\.1|localhost/.test(process.env.TEST_SUPABASE_URL ?? '');
vi.setConfig({
  testTimeout: REMOTE ? 120_000 : 20_000,
  hookTimeout: REMOTE ? 120_000 : 20_000,
});

// Smallest valid 1x1 JPEG.
const TINY_JPEG = Buffer.from(
  '/9j/4AAQSkZJRgABAQEASABIAAD/2wBDAP//////////////////////////////////////////////////////////////////////////////////////wgALCAABAAEBAREA/8QAFBABAAAAAAAAAAAAAAAAAAAAAP/aAAgBAQABPxA=',
  'base64',
);

const svc = serviceClient();

let previewId = '';
let objectPath = '';
let feedbackId = '';

beforeAll(async () => {
  await seedFixtures();

  const prev = await svc
    .from('client_previews')
    .insert({
      slug: PREVIEW_SLUG,
      title: 'Feedback image fixture',
      mode: 'gated',
      password: 'secret-pass',
      storage_prefix: PREVIEW_SLUG,
      entry_file: 'index.html',
    })
    .select('id')
    .single();
  if (prev.error) throw prev.error;
  previewId = prev.data!.id as string;

  const fb = await svc
    .from('preview_feedback')
    .insert({
      preview_id: previewId,
      page: '/index.html',
      reviewer_name: 'Reviewer',
      kind: 'bug',
      message: 'image fixture',
    })
    .select('id')
    .single();
  if (fb.error) throw fb.error;
  feedbackId = fb.data!.id as string;

  objectPath = `${previewId}/${randomUUID()}.jpg`;
  const up = await svc.storage
    .from(BUCKET)
    .upload(objectPath, TINY_JPEG, { contentType: 'image/jpeg', upsert: true });
  if (up.error) throw up.error;
});

afterAll(async () => {
  // Delete only what this suite created.
  const rm = await svc.storage.from(BUCKET).remove([objectPath]);
  if (rm.error) throw rm.error;
  const del = await svc.from('client_previews').delete().eq('id', previewId);
  if (del.error) throw del.error;
});

describe('preview-feedback-images bucket', () => {
  test('1. bucket settings are exactly private / 2 MB / image/jpeg', async () => {
    const { data, error } = await svc.storage.getBucket(BUCKET);
    expect(error).toBeNull();
    expect(data!.public).toBe(false);
    expect(data!.file_size_limit).toBe(2097152);
    expect(data!.allowed_mime_types).toEqual(['image/jpeg']);
  });

  test('2. service role can download and sign', async () => {
    const dl = await svc.storage.from(BUCKET).download(objectPath);
    expect(dl.error).toBeNull();
    expect(dl.data).not.toBeNull();
    expect(dl.data!.size).toBe(TINY_JPEG.length);

    const signed = await svc.storage.from(BUCKET).createSignedUrl(objectPath, 60);
    expect(signed.error).toBeNull();
    expect(signed.data!.signedUrl).toContain('token=');
  });

  test('3. anon cannot upload, download or sign', async () => {
    const anon = anonClient();
    const up = await anon.storage
      .from(BUCKET)
      .upload(`${previewId}/${randomUUID()}.jpg`, TINY_JPEG, { contentType: 'image/jpeg' });
    expect(up.error).not.toBeNull();

    const dl = await anon.storage.from(BUCKET).download(objectPath);
    expect(dl.error).not.toBeNull();

    const signed = await anon.storage.from(BUCKET).createSignedUrl(objectPath, 60);
    expect(signed.error).not.toBeNull();
  });

  test('4. a member cannot upload, download or sign', async () => {
    const member = await userClient(USERS.honuvibe_free);
    const up = await member.storage
      .from(BUCKET)
      .upload(`${previewId}/${randomUUID()}.jpg`, TINY_JPEG, { contentType: 'image/jpeg' });
    expect(up.error).not.toBeNull();

    const dl = await member.storage.from(BUCKET).download(objectPath);
    expect(dl.error).not.toBeNull();

    const signed = await member.storage.from(BUCKET).createSignedUrl(objectPath, 60);
    expect(signed.error).not.toBeNull();
  });
});

describe('preview_feedback.image_path constraint', () => {
  test.each(['../x.jpg', 'a/b.png', 'abc'])('5. rejects bad path %s', async (bad) => {
    const { error } = await svc
      .from('preview_feedback')
      .update({ image_path: bad })
      .eq('id', feedbackId);
    expect(error).not.toBeNull();
    expect(error!.code).toBe('23514');
  });

  test('6. accepts a well-formed path and NULL', async () => {
    const good = await svc
      .from('preview_feedback')
      .update({ image_path: objectPath })
      .eq('id', feedbackId)
      .select('image_path')
      .single();
    expect(good.error).toBeNull();
    expect(good.data!.image_path).toBe(objectPath);

    const cleared = await svc
      .from('preview_feedback')
      .update({ image_path: null })
      .eq('id', feedbackId)
      .select('image_path')
      .single();
    expect(cleared.error).toBeNull();
    expect(cleared.data!.image_path).toBeNull();
  });
});
