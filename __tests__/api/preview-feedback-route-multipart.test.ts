// @vitest-environment node
import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest';
import { NextRequest } from 'next/server';
import { readFileSync } from 'node:fs';
import { join } from 'node:path';

const { fromMock, maybeSingleMock, insertMock, replayMock, uploadMock, removeMock, storageFromMock } = vi.hoisted(
  () => {
    const maybeSingleMock = vi.fn();
    const insertMock = vi.fn();
    const replayMock = vi.fn();
    const uploadMock = vi.fn();
    const removeMock = vi.fn();
    const storageFromMock = vi.fn(() => ({ upload: uploadMock, remove: removeMock }));
    const fromMock = vi.fn((table: string) => {
      if (table === 'preview_feedback') {
        return {
          insert: insertMock,
          select: vi.fn(() => ({ eq: vi.fn(() => ({ maybeSingle: replayMock })) })),
        };
      }
      return {
        select: vi.fn(() => ({
          eq: vi.fn(() => ({ maybeSingle: maybeSingleMock })),
        })),
      };
    });
    return { fromMock, maybeSingleMock, insertMock, replayMock, uploadMock, removeMock, storageFromMock };
  },
);

vi.mock('@/lib/supabase/server', () => ({
  createAdminClient: () => ({ from: fromMock, storage: { from: storageFromMock } }),
}));

import { POST } from '@/app/api/preview/[slug]/feedback/route';
import { signGate } from '@/lib/previews/gate';

const SECRET = 'test-secret-0123456789abcdef0123456789abcdef';
const PASSWORD = 'hunter2';
const FIXTURES = join(process.cwd(), '__tests__', 'fixtures', 'screenshots');
const fixture = (name: string) => new Uint8Array(readFileSync(join(FIXTURES, name)));

let counter = 0;
function fresh() {
  counter += 1;
  const n = String(counter).padStart(4, '0');
  const sid = `00000000-0000-4000-8000-${String(counter).padStart(12, '0')}`;
  return { slug: `fbmp-slug-${n}`, ip: `10.9.${Math.floor(counter / 250)}.${counter % 250}`, sid };
}

function previewRow(slug: string) {
  return { id: `preview-id-${slug}`, mode: 'gated', password: PASSWORD, expires_at: null, feedback_enabled: true };
}

const NOTE = {
  name: 'Keoni',
  kind: 'bug',
  message: 'The logo overlaps the nav',
  page: '/index.html',
  viewportW: 1280,
  viewportH: 720,
};

async function multipartBody(payload: unknown, image?: { bytes: Uint8Array; type: string; name?: string }) {
  const fd = new FormData();
  fd.append('payload', typeof payload === 'string' ? payload : JSON.stringify(payload));
  if (image) fd.append('image', new File([image.bytes as BlobPart], image.name ?? 'shot', { type: image.type }));
  const r = new Request('http://localhost/x', { method: 'POST', body: fd });
  return { bytes: new Uint8Array(await r.arrayBuffer()), contentType: r.headers.get('content-type') as string };
}

type Opts = {
  ip: string;
  cookie?: string | null;
  body?: Uint8Array | string;
  stream?: ReadableStream<Uint8Array>;
  contentType?: string;
  headers?: Record<string, string>;
};

function req(slug: string, o: Opts) {
  const headers: Record<string, string> = {
    host: 'localhost',
    'x-forwarded-for': o.ip,
    'content-type': o.contentType ?? 'application/json',
    ...(o.headers ?? {}),
  };
  if (o.cookie) headers.cookie = `hv_pv_${slug}=${o.cookie}`;
  const init: NonNullable<ConstructorParameters<typeof NextRequest>[1]> & { duplex?: 'half' } = {
    method: 'POST',
    headers,
  };
  if (o.stream) {
    init.body = o.stream;
    init.duplex = 'half';
  } else {
    init.body = (o.body ?? JSON.stringify(NOTE)) as BodyInit;
  }
  return { request: new NextRequest(`http://localhost/api/preview/${slug}/feedback`, init), ctx: { params: Promise.resolve({ slug }) } };
}

async function sendMp(
  f: { slug: string; ip: string },
  payload: unknown,
  image?: { bytes: Uint8Array; type: string },
  extra: Partial<Opts> = {},
) {
  const { bytes, contentType } = await multipartBody(payload, image);
  const { request, ctx } = req(f.slug, {
    ip: f.ip,
    cookie: signGate(f.slug, PASSWORD),
    body: bytes,
    contentType,
    ...extra,
  });
  return POST(request, ctx);
}

const PNG = () => ({ bytes: fixture('normal.png'), type: 'image/png' });
const errorOf = async (res: Response) => ((await res.json()) as { error: string }).error;

describe('preview feedback route: multipart + idempotency', () => {
  beforeEach(() => {
    vi.clearAllMocks();
    process.env.NEXT_PUBLIC_SUPABASE_URL = 'http://localhost';
    process.env.SUPABASE_SERVICE_ROLE_KEY = 'service-role-test-key';
    process.env.PREVIEW_GATE_SECRET = SECRET;
    insertMock.mockResolvedValue({ error: null });
    replayMock.mockResolvedValue({ data: null, error: null });
    uploadMock.mockResolvedValue({ data: {}, error: null });
    removeMock.mockResolvedValue({ data: [], error: null });
  });
  afterEach(() => vi.restoreAllMocks());

  // Step 4 / 6
  it('still 415s other content types and accepts multipart with a boundary, case-insensitively', async () => {
    const a = fresh();
    maybeSingleMock.mockResolvedValue({ data: previewRow(a.slug), error: null });
    const bad = req(a.slug, { ip: a.ip, cookie: signGate(a.slug, PASSWORD), contentType: 'text/plain' });
    expect((await POST(bad.request, bad.ctx)).status).toBe(415);

    const b = fresh();
    maybeSingleMock.mockResolvedValue({ data: previewRow(b.slug), error: null });
    const { bytes, contentType } = await multipartBody({ ...NOTE, submissionId: b.sid });
    const ok = req(b.slug, {
      ip: b.ip,
      cookie: signGate(b.slug, PASSWORD),
      body: bytes,
      contentType: contentType.replace('multipart/form-data', 'Multipart/Form-Data'),
    });
    expect((await POST(ok.request, ok.ctx)).status).toBe(201);
  });

  it('early-rejects a declared multipart length over 2 MB, but allows 100 KB declared (JSON cap is 16 KB)', async () => {
    const a = fresh();
    maybeSingleMock.mockResolvedValue({ data: previewRow(a.slug), error: null });
    const { bytes, contentType } = await multipartBody({ ...NOTE, submissionId: a.sid });
    const big = req(a.slug, {
      ip: a.ip,
      cookie: signGate(a.slug, PASSWORD),
      body: bytes,
      contentType,
      headers: { 'content-length': '2097153' },
    });
    const res = await POST(big.request, big.ctx);
    expect(res.status).toBe(413);
    expect(fromMock).not.toHaveBeenCalled();

    const b = fresh();
    maybeSingleMock.mockResolvedValue({ data: previewRow(b.slug), error: null });
    const m = await multipartBody({ ...NOTE, submissionId: b.sid });
    const mid = req(b.slug, {
      ip: b.ip,
      cookie: signGate(b.slug, PASSWORD),
      body: m.bytes,
      contentType: m.contentType,
      headers: { 'content-length': '100000' },
    });
    // Declared length is only an early reject; the real body is small and parses.
    expect((await POST(mid.request, mid.ctx)).status).not.toBe(413);
  });

  // Auth / body
  it('does not read a multipart body before the cookie is verified', async () => {
    const f = fresh();
    maybeSingleMock.mockResolvedValue({ data: previewRow(f.slug), error: null });
    const stream = new ReadableStream<Uint8Array>({
      pull() {
        throw new Error('body must not be read');
      },
    });
    const { request, ctx } = req(f.slug, {
      ip: f.ip,
      cookie: 'deadbeef',
      stream,
      contentType: 'multipart/form-data; boundary=xyz',
    });
    expect((await POST(request, ctx)).status).toBe(401);
  });

  // 11m
  it('413s a multipart body over 2 MB sent without Content-Length', async () => {
    const f = fresh();
    maybeSingleMock.mockResolvedValue({ data: previewRow(f.slug), error: null });
    const chunk = new Uint8Array(1_048_576).fill(97);
    let sent = 0;
    const stream = new ReadableStream<Uint8Array>({
      pull(c) {
        if (sent >= 3) return c.close();
        sent += 1;
        c.enqueue(chunk);
      },
    });
    const { request, ctx } = req(f.slug, {
      ip: f.ip,
      cookie: signGate(f.slug, PASSWORD),
      stream,
      contentType: 'multipart/form-data; boundary=xyz',
    });
    expect((await POST(request, ctx)).status).toBe(413);
    expect(insertMock).not.toHaveBeenCalled();
    expect(uploadMock).not.toHaveBeenCalled();
  });

  it('400s when reading the multipart body throws', async () => {
    const f = fresh();
    maybeSingleMock.mockResolvedValue({ data: previewRow(f.slug), error: null });
    const stream = new ReadableStream<Uint8Array>({
      pull() {
        throw new Error('boom');
      },
    });
    const { request, ctx } = req(f.slug, {
      ip: f.ip,
      cookie: signGate(f.slug, PASSWORD),
      stream,
      contentType: 'multipart/form-data; boundary=xyz',
    });
    expect((await POST(request, ctx)).status).toBe(400);
  });

  // 12m
  it('400s malformed multipart, an unknown field, and a non-JSON payload', async () => {
    const a = fresh();
    maybeSingleMock.mockResolvedValue({ data: previewRow(a.slug), error: null });
    const garbage = req(a.slug, {
      ip: a.ip,
      cookie: signGate(a.slug, PASSWORD),
      body: 'not multipart at all',
      contentType: 'multipart/form-data; boundary=xyz',
    });
    expect((await POST(garbage.request, garbage.ctx)).status).toBe(400);

    const b = fresh();
    maybeSingleMock.mockResolvedValue({ data: previewRow(b.slug), error: null });
    expect((await sendMp(b, '{not json')).status).toBe(400);

    const c = fresh();
    maybeSingleMock.mockResolvedValue({ data: previewRow(c.slug), error: null });
    const fd = new FormData();
    fd.append('payload', JSON.stringify({ ...NOTE, submissionId: c.sid }));
    fd.append('extra', 'x');
    const r = new Request('http://localhost/x', { method: 'POST', body: fd });
    const built = req(c.slug, {
      ip: c.ip,
      cookie: signGate(c.slug, PASSWORD),
      body: new Uint8Array(await r.arrayBuffer()),
      contentType: r.headers.get('content-type') as string,
    });
    expect((await POST(built.request, built.ctx)).status).toBe(400);
    expect(insertMock).not.toHaveBeenCalled();
  });

  it('400s a multipart note without a submissionId', async () => {
    const f = fresh();
    maybeSingleMock.mockResolvedValue({ data: previewRow(f.slug), error: null });
    const res = await sendMp(f, NOTE, PNG());
    expect(res.status).toBe(400);
    expect(await errorOf(res)).toMatch(/submissionId/i);
    expect(uploadMock).not.toHaveBeenCalled();
    expect(insertMock).not.toHaveBeenCalled();
  });

  // 12i
  it('400s Unsupported image for a non-image file, with no upload and no insert', async () => {
    const f = fresh();
    maybeSingleMock.mockResolvedValue({ data: previewRow(f.slug), error: null });
    const res = await sendMp(f, { ...NOTE, submissionId: f.sid }, { bytes: fixture('not-image.jpg'), type: 'image/jpeg' });
    expect(res.status).toBe(400);
    expect(await errorOf(res)).toBe('Unsupported image');
    expect(uploadMock).not.toHaveBeenCalled();
    expect(insertMock).not.toHaveBeenCalled();
  });

  it('400s a valid signature followed by garbage, with no upload', async () => {
    const f = fresh();
    maybeSingleMock.mockResolvedValue({ data: previewRow(f.slug), error: null });
    const res = await sendMp(f, { ...NOTE, submissionId: f.sid }, { bytes: fixture('jpeg-sig-random.jpg'), type: 'image/jpeg' });
    expect(res.status).toBe(400);
    expect(await errorOf(res)).toBe('Unsupported image');
    expect(uploadMock).not.toHaveBeenCalled();
  });

  // 13
  it('counts an image note as one note against the rate buckets (21st is 429)', async () => {
    const f = fresh();
    maybeSingleMock.mockResolvedValue({ data: previewRow(f.slug), error: null });
    for (let i = 0; i < 20; i++) {
      const sid = `00000000-0000-4000-9000-${String(counter * 100 + i).padStart(12, '0')}`;
      expect((await sendMp(f, { ...NOTE, submissionId: sid }, PNG())).status).toBe(201);
    }
    const res = await sendMp(f, { ...NOTE, submissionId: f.sid }, PNG());
    expect(res.status).toBe(429);
    expect(res.headers.get('Retry-After')).toBe('600');
  });

  // 14u / 14i / 15
  it('uploads full then thumb (upsert, image/jpeg), inserts id + image_path, 201', async () => {
    const f = fresh();
    maybeSingleMock.mockResolvedValue({ data: previewRow(f.slug), error: null });
    const res = await sendMp(f, { ...NOTE, submissionId: f.sid.toUpperCase() }, PNG());
    expect(res.status).toBe(201);
    expect(await res.json()).toEqual({ ok: true });
    expect(res.headers.get('Cache-Control')).toBe('private, no-store');
    expect(res.headers.get('X-Robots-Tag')).toBe('noindex, nofollow');
    const pid = `preview-id-${f.slug}`;
    expect(storageFromMock).toHaveBeenCalledWith('preview-feedback-images');
    expect(uploadMock).toHaveBeenCalledTimes(2);
    expect(uploadMock.mock.calls[0][0]).toBe(`${pid}/${f.sid}.jpg`);
    expect(uploadMock.mock.calls[1][0]).toBe(`${pid}/${f.sid}.thumb.jpg`);
    for (const c of uploadMock.mock.calls) {
      expect(Buffer.isBuffer(c[1])).toBe(true);
      expect(c[2]).toEqual({ contentType: 'image/jpeg', upsert: true });
    }
    expect(insertMock).toHaveBeenCalledTimes(1);
    const row = insertMock.mock.calls[0][0] as Record<string, unknown>;
    expect(row).toMatchObject({
      id: f.sid,
      preview_id: pid,
      image_path: `${pid}/${f.sid}.jpg`,
      page: '/index.html',
      reviewer_name: 'Keoni',
    });
    expect(removeMock).not.toHaveBeenCalled();
  });

  it('a payload-only multipart note inserts with id, uploads nothing, sets no image_path', async () => {
    const f = fresh();
    maybeSingleMock.mockResolvedValue({ data: previewRow(f.slug), error: null });
    const res = await sendMp(f, { ...NOTE, submissionId: f.sid });
    expect(res.status).toBe(201);
    expect(uploadMock).not.toHaveBeenCalled();
    const row = insertMock.mock.calls[0][0] as Record<string, unknown>;
    expect(row.id).toBe(f.sid);
    expect(row).not.toHaveProperty('image_path');
  });

  it('500s and inserts nothing when the full upload fails; thumb upload failure also 500s', async () => {
    const a = fresh();
    maybeSingleMock.mockResolvedValue({ data: previewRow(a.slug), error: null });
    uploadMock.mockResolvedValueOnce({ data: null, error: { message: 'boom' } });
    const res = await sendMp(a, { ...NOTE, submissionId: a.sid }, PNG());
    expect(res.status).toBe(500);
    expect(await errorOf(res)).toBe('Could not save feedback');
    expect(insertMock).not.toHaveBeenCalled();

    const b = fresh();
    maybeSingleMock.mockResolvedValue({ data: previewRow(b.slug), error: null });
    uploadMock.mockResolvedValueOnce({ data: {}, error: null }).mockResolvedValueOnce({ data: null, error: { message: 'x' } });
    expect((await sendMp(b, { ...NOTE, submissionId: b.sid }, PNG())).status).toBe(500);
    expect(insertMock).not.toHaveBeenCalled();
  });

  it('500s when an upload throws', async () => {
    const f = fresh();
    maybeSingleMock.mockResolvedValue({ data: previewRow(f.slug), error: null });
    uploadMock.mockRejectedValueOnce(new Error('network'));
    expect((await sendMp(f, { ...NOTE, submissionId: f.sid }, PNG())).status).toBe(500);
    expect(insertMock).not.toHaveBeenCalled();
  });

  it('retry after a 500 at the upload step overwrites the same paths and inserts once', async () => {
    const f = fresh();
    maybeSingleMock.mockResolvedValue({ data: previewRow(f.slug), error: null });
    uploadMock.mockResolvedValueOnce({ data: null, error: { message: 'boom' } });
    expect((await sendMp(f, { ...NOTE, submissionId: f.sid }, PNG())).status).toBe(500);
    const firstPath = uploadMock.mock.calls[0][0];
    uploadMock.mockClear();
    expect((await sendMp(f, { ...NOTE, submissionId: f.sid }, PNG())).status).toBe(201);
    expect(uploadMock.mock.calls.map((c) => c[0])).toEqual([firstPath, firstPath.replace(/\.jpg$/, '.thumb.jpg')]);
    expect(uploadMock.mock.calls.every((c) => (c[2] as { upsert: boolean }).upsert === true)).toBe(true);
    expect(insertMock).toHaveBeenCalledTimes(1);
  });

  // 14r
  it('replay of a stored submissionId for this preview is 201 with no upload and no insert', async () => {
    const f = fresh();
    maybeSingleMock.mockResolvedValue({ data: previewRow(f.slug), error: null });
    replayMock.mockResolvedValue({ data: { preview_id: `preview-id-${f.slug}` }, error: null });
    const res = await sendMp(f, { ...NOTE, submissionId: f.sid }, PNG());
    expect(res.status).toBe(201);
    expect(await res.json()).toEqual({ ok: true });
    expect(uploadMock).not.toHaveBeenCalled();
    expect(insertMock).not.toHaveBeenCalled();
  });

  it('replay with a submissionId that belongs to another preview is 409, nothing written', async () => {
    const f = fresh();
    maybeSingleMock.mockResolvedValue({ data: previewRow(f.slug), error: null });
    replayMock.mockResolvedValue({ data: { preview_id: 'some-other-preview' }, error: null });
    const res = await sendMp(f, { ...NOTE, submissionId: f.sid }, PNG());
    expect(res.status).toBe(409);
    expect(uploadMock).not.toHaveBeenCalled();
    expect(insertMock).not.toHaveBeenCalled();
    expect(removeMock).not.toHaveBeenCalled();
  });

  it('500s when the replay lookup itself errors', async () => {
    const f = fresh();
    maybeSingleMock.mockResolvedValue({ data: previewRow(f.slug), error: null });
    replayMock.mockResolvedValue({ data: null, error: { message: 'db down', code: '' } });
    expect((await sendMp(f, { ...NOTE, submissionId: f.sid }, PNG())).status).toBe(500);
    expect(uploadMock).not.toHaveBeenCalled();
  });

  it('JSON with a submissionId gets replay semantics and id = submissionId', async () => {
    const a = fresh();
    maybeSingleMock.mockResolvedValue({ data: previewRow(a.slug), error: null });
    const ok = req(a.slug, { ip: a.ip, cookie: signGate(a.slug, PASSWORD), body: JSON.stringify({ ...NOTE, submissionId: a.sid }) });
    expect((await POST(ok.request, ok.ctx)).status).toBe(201);
    expect((insertMock.mock.calls[0][0] as Record<string, unknown>).id).toBe(a.sid);

    const b = fresh();
    maybeSingleMock.mockResolvedValue({ data: previewRow(b.slug), error: null });
    replayMock.mockResolvedValue({ data: { preview_id: `preview-id-${b.slug}` }, error: null });
    insertMock.mockClear();
    const replay = req(b.slug, { ip: b.ip, cookie: signGate(b.slug, PASSWORD), body: JSON.stringify({ ...NOTE, submissionId: b.sid }) });
    expect((await POST(replay.request, replay.ctx)).status).toBe(201);
    expect(insertMock).not.toHaveBeenCalled();

    const c = fresh();
    maybeSingleMock.mockResolvedValue({ data: previewRow(c.slug), error: null });
    replayMock.mockResolvedValue({ data: { preview_id: 'other' }, error: null });
    const other = req(c.slug, { ip: c.ip, cookie: signGate(c.slug, PASSWORD), body: JSON.stringify({ ...NOTE, submissionId: c.sid }) });
    expect((await POST(other.request, other.ctx)).status).toBe(409);
  });

  it('JSON without a submissionId does not look up a replay or touch storage', async () => {
    const f = fresh();
    maybeSingleMock.mockResolvedValue({ data: previewRow(f.slug), error: null });
    const r = req(f.slug, { ip: f.ip, cookie: signGate(f.slug, PASSWORD) });
    expect((await POST(r.request, r.ctx)).status).toBe(201);
    expect(replayMock).not.toHaveBeenCalled();
    expect(storageFromMock).not.toHaveBeenCalled();
    expect(insertMock.mock.calls[0][0]).not.toHaveProperty('id');
  });

  // 14i error handling (R5)
  it('unique violation re-selects: same preview is 201 and objects are kept', async () => {
    const f = fresh();
    const pid = `preview-id-${f.slug}`;
    maybeSingleMock.mockResolvedValue({ data: previewRow(f.slug), error: null });
    replayMock
      .mockResolvedValueOnce({ data: null, error: null })
      .mockResolvedValueOnce({ data: { preview_id: pid }, error: null });
    insertMock.mockResolvedValue({ error: { code: '23505', message: 'dup' } });
    const res = await sendMp(f, { ...NOTE, submissionId: f.sid }, PNG());
    expect(res.status).toBe(201);
    expect(removeMock).not.toHaveBeenCalled();
  });

  it('unique violation where the row belongs to another preview is 409, objects kept', async () => {
    const f = fresh();
    maybeSingleMock.mockResolvedValue({ data: previewRow(f.slug), error: null });
    replayMock
      .mockResolvedValueOnce({ data: null, error: null })
      .mockResolvedValueOnce({ data: { preview_id: 'other' }, error: null });
    insertMock.mockResolvedValue({ error: { code: '23505', message: 'dup' } });
    const res = await sendMp(f, { ...NOTE, submissionId: f.sid }, PNG());
    expect(res.status).toBe(409);
    expect(removeMock).not.toHaveBeenCalled();
  });

  it('definite insert error with the row confirmed absent removes both objects, then 500', async () => {
    const f = fresh();
    const pid = `preview-id-${f.slug}`;
    maybeSingleMock.mockResolvedValue({ data: previewRow(f.slug), error: null });
    insertMock.mockResolvedValue({ error: { code: '23514', message: 'check' } });
    const res = await sendMp(f, { ...NOTE, submissionId: f.sid }, PNG());
    expect(res.status).toBe(500);
    expect(removeMock).toHaveBeenCalledTimes(1);
    expect(removeMock).toHaveBeenCalledWith([`${pid}/${f.sid}.jpg`, `${pid}/${f.sid}.thumb.jpg`]);
  });

  it('a PGRST code is definite too', async () => {
    const f = fresh();
    maybeSingleMock.mockResolvedValue({ data: previewRow(f.slug), error: null });
    insertMock.mockResolvedValue({ error: { code: 'PGRST301', message: 'jwt' } });
    expect((await sendMp(f, { ...NOTE, submissionId: f.sid }, PNG())).status).toBe(500);
    expect(removeMock).toHaveBeenCalledTimes(1);
  });

  it('definite error but the row is present for this preview: 201, objects kept', async () => {
    const f = fresh();
    maybeSingleMock.mockResolvedValue({ data: previewRow(f.slug), error: null });
    replayMock
      .mockResolvedValueOnce({ data: null, error: null })
      .mockResolvedValueOnce({ data: { preview_id: `preview-id-${f.slug}` }, error: null });
    insertMock.mockResolvedValue({ error: { code: '23514', message: 'x' } });
    expect((await sendMp(f, { ...NOTE, submissionId: f.sid }, PNG())).status).toBe(201);
    expect(removeMock).not.toHaveBeenCalled();
  });

  it('definite error and the absence re-check errors: 500, objects kept', async () => {
    const f = fresh();
    maybeSingleMock.mockResolvedValue({ data: previewRow(f.slug), error: null });
    replayMock
      .mockResolvedValueOnce({ data: null, error: null })
      .mockResolvedValueOnce({ data: null, error: { code: '', message: 'timeout' } });
    insertMock.mockResolvedValue({ error: { code: '23514', message: 'x' } });
    expect((await sendMp(f, { ...NOTE, submissionId: f.sid }, PNG())).status).toBe(500);
    expect(removeMock).not.toHaveBeenCalled();
  });

  it('definite error and re-check throws: 500, objects kept, no throw', async () => {
    const f = fresh();
    maybeSingleMock.mockResolvedValue({ data: previewRow(f.slug), error: null });
    replayMock.mockResolvedValueOnce({ data: null, error: null }).mockRejectedValueOnce(new Error('net'));
    insertMock.mockResolvedValue({ error: { code: '23514', message: 'x' } });
    expect((await sendMp(f, { ...NOTE, submissionId: f.sid }, PNG())).status).toBe(500);
    expect(removeMock).not.toHaveBeenCalled();
  });

  it('cleanup failure: remove rejects, cleanup_failed logged per path, still 500, no throw', async () => {
    const f = fresh();
    const pid = `preview-id-${f.slug}`;
    maybeSingleMock.mockResolvedValue({ data: previewRow(f.slug), error: null });
    insertMock.mockResolvedValue({ error: { code: '23514', message: 'x' } });
    removeMock.mockRejectedValue(new Error('storage down'));
    const spy = vi.spyOn(console, 'error').mockImplementation(() => {});
    const res = await sendMp(f, { ...NOTE, submissionId: f.sid }, PNG());
    expect(res.status).toBe(500);
    const logs = spy.mock.calls.map((c) => String(c[0]));
    expect(logs).toContain(`[preview-feedback] cleanup_failed ${pid}/${f.sid}.jpg`);
    expect(logs).toContain(`[preview-feedback] cleanup_failed ${pid}/${f.sid}.thumb.jpg`);
    expect(logs.filter((l) => l.includes('cleanup_failed'))).toHaveLength(2);
  });

  it('cleanup failure via a returned remove error is logged the same way', async () => {
    const f = fresh();
    maybeSingleMock.mockResolvedValue({ data: previewRow(f.slug), error: null });
    insertMock.mockResolvedValue({ error: { code: '22P02', message: 'x' } });
    removeMock.mockResolvedValue({ data: null, error: { message: 'nope' } });
    const spy = vi.spyOn(console, 'error').mockImplementation(() => {});
    expect((await sendMp(f, { ...NOTE, submissionId: f.sid }, PNG())).status).toBe(500);
    expect(spy.mock.calls.filter((c) => String(c[0]).includes('cleanup_failed'))).toHaveLength(2);
  });

  it('ambiguous insert error (timeout, empty code): 500, remove not called', async () => {
    const f = fresh();
    maybeSingleMock.mockResolvedValue({ data: previewRow(f.slug), error: null });
    insertMock.mockResolvedValue({ error: { code: '', message: 'fetch failed: timeout' } });
    expect((await sendMp(f, { ...NOTE, submissionId: f.sid }, PNG())).status).toBe(500);
    expect(removeMock).not.toHaveBeenCalled();
  });

  it('a thrown insert is ambiguous: 500, remove not called, nothing escapes', async () => {
    const f = fresh();
    maybeSingleMock.mockResolvedValue({ data: previewRow(f.slug), error: null });
    insertMock.mockRejectedValue(new Error('socket hang up'));
    const res = await sendMp(f, { ...NOTE, submissionId: f.sid }, PNG());
    expect(res.status).toBe(500);
    expect(removeMock).not.toHaveBeenCalled();
  });

  it('insert committed, response lost: a replay with the same submissionId ends 201, remove never called', async () => {
    const f = fresh();
    const pid = `preview-id-${f.slug}`;
    maybeSingleMock.mockResolvedValue({ data: previewRow(f.slug), error: null });

    let committed = false;
    let release!: (v: { error: null }) => void;
    const deferred = new Promise<{ error: null }>((r) => (release = r));
    insertMock.mockImplementation(() => {
      if (committed) return Promise.resolve({ error: { code: '23505', message: 'dup' } });
      committed = true; // the DB has the row; only the response is late
      return deferred;
    });
    replayMock.mockImplementation(async () => ({
      data: committed ? { preview_id: pid } : null,
      error: null,
    }));

    const first = sendMp(f, { ...NOTE, submissionId: f.sid }, PNG());
    await vi.waitFor(() => expect(insertMock).toHaveBeenCalledTimes(1));
    const second = await sendMp(f, { ...NOTE, submissionId: f.sid }, PNG());
    expect(second.status).toBe(201);

    release({ error: null });
    expect((await first).status).toBe(201);
    expect(removeMock).not.toHaveBeenCalled();
  });
});
