import { describe, it, expect, vi, beforeEach } from 'vitest';
import { NextRequest } from 'next/server';

const { fromMock, maybeSingleMock, insertMock } = vi.hoisted(() => {
  const maybeSingleMock = vi.fn();
  const insertMock = vi.fn();
  const fromMock = vi.fn((table: string) => {
    if (table === 'preview_feedback') return { insert: insertMock };
    return {
      select: vi.fn(() => ({
        eq: vi.fn(() => ({ maybeSingle: maybeSingleMock })),
      })),
    };
  });
  return { fromMock, maybeSingleMock, insertMock };
});

vi.mock('@/lib/supabase/server', () => ({
  createAdminClient: () => ({ from: fromMock }),
}));

import { POST } from '@/app/api/preview/[slug]/feedback/route';
import { signGate } from '@/lib/previews/gate';

const SECRET = 'test-secret-0123456789abcdef0123456789abcdef';
const PASSWORD = 'hunter2';

// The in-memory limiter is a module-level Map shared across tests, so every test
// takes a fresh slug AND a fresh x-forwarded-for.
let counter = 0;
function fresh() {
  counter += 1;
  const n = String(counter).padStart(4, '0');
  return { slug: `fbtest-slug-${n}`, ip: `10.0.${Math.floor(counter / 250)}.${counter % 250}` };
}

function feedbackRow(slug: string, overrides: Record<string, unknown> = {}) {
  return {
    id: `preview-id-${slug}`,
    mode: 'gated',
    password: PASSWORD,
    expires_at: null,
    feedback_enabled: true,
    ...overrides,
  };
}

function setRow(row: Record<string, unknown> | null) {
  maybeSingleMock.mockResolvedValue({ data: row, error: null });
}

const VALID_BODY = {
  name: 'Keoni',
  kind: 'bug',
  message: 'The logo overlaps the nav',
  page: '/index.html',
  viewportW: 1280,
  viewportH: 720,
};

type ReqOpts = {
  ip?: string;
  cookie?: string | null; // null = no cookie
  body?: unknown; // object => JSON.stringify; string => raw
  stream?: ReadableStream<Uint8Array>;
  headers?: Record<string, string>;
  contentType?: string | null;
  origin?: string; // request URL origin; default http://localhost
};

function postReq(slug: string, opts: ReqOpts = {}) {
  // Real requests always carry Host; undici's Request does not add one.
  const headers: Record<string, string> = { host: 'localhost', ...(opts.headers ?? {}) };
  if (opts.contentType !== null) headers['content-type'] = opts.contentType ?? 'application/json';
  if (opts.ip) headers['x-forwarded-for'] = opts.ip;
  if (opts.cookie) headers.cookie = `hv_pv_${slug}=${opts.cookie}`;
  const init: NonNullable<ConstructorParameters<typeof NextRequest>[1]> & { duplex?: 'half' } = {
    method: 'POST',
    headers,
  };
  if (opts.stream) {
    init.body = opts.stream;
    init.duplex = 'half';
  } else {
    init.body = typeof opts.body === 'string' ? opts.body : JSON.stringify(opts.body ?? VALID_BODY);
  }
  const request = new NextRequest(`${opts.origin ?? 'http://localhost'}/api/preview/${slug}/feedback`, init);
  return { request, ctx: { params: Promise.resolve({ slug }) } };
}

function validCookie(slug: string, password: string | null = PASSWORD) {
  return signGate(slug, password);
}

async function send(slug: string, opts: ReqOpts = {}) {
  const { request, ctx } = postReq(slug, opts);
  return POST(request, ctx);
}

async function errorOf(res: Response): Promise<string> {
  return ((await res.json()) as { error: string }).error;
}

describe('preview feedback route', () => {
  beforeEach(() => {
    vi.clearAllMocks();
    process.env.NEXT_PUBLIC_SUPABASE_URL = 'http://localhost';
    process.env.SUPABASE_SERVICE_ROLE_KEY = 'service-role-test-key';
    process.env.PREVIEW_GATE_SECRET = SECRET;
    insertMock.mockResolvedValue({ error: null });
  });

  // Step 1
  it('404s a malformed slug without touching the DB', async () => {
    const res = await send('BAD', { ip: fresh().ip });
    expect(res.status).toBe(404);
    expect(fromMock).not.toHaveBeenCalled();
  });

  // Step 2
  it('503s when Supabase env is unset', async () => {
    delete process.env.NEXT_PUBLIC_SUPABASE_URL;
    const { slug, ip } = fresh();
    const res = await send(slug, { ip, cookie: validCookie(slug) });
    expect(res.status).toBe(503);
    expect(fromMock).not.toHaveBeenCalled();
  });

  // Step 3
  it('403s a cross-origin Origin', async () => {
    const { slug, ip } = fresh();
    setRow(feedbackRow(slug));
    const res = await send(slug, {
      ip,
      cookie: validCookie(slug),
      headers: { origin: 'https://evil.example' },
    });
    expect(res.status).toBe(403);
    expect(fromMock).not.toHaveBeenCalled();
  });

  it('403s an unparseable Origin (including the string "null")', async () => {
    const a = fresh();
    setRow(feedbackRow(a.slug));
    expect((await send(a.slug, { ip: a.ip, cookie: validCookie(a.slug), headers: { origin: 'null' } })).status).toBe(
      403,
    );
    const b = fresh();
    setRow(feedbackRow(b.slug));
    expect((await send(b.slug, { ip: b.ip, cookie: validCookie(b.slug), headers: { origin: '::nope::' } })).status).toBe(
      403,
    );
  });

  it('allows a same-origin Origin and a missing Origin', async () => {
    const a = fresh();
    setRow(feedbackRow(a.slug));
    const same = await send(a.slug, {
      ip: a.ip,
      cookie: validCookie(a.slug),
      headers: { origin: 'http://localhost' },
    });
    expect(same.status).toBe(201);

    const b = fresh();
    setRow(feedbackRow(b.slug));
    const none = await send(b.slug, { ip: b.ip, cookie: validCookie(b.slug) });
    expect(none.status).toBe(201);
  });

  it('compares Origin to the Host header, not the request URL host (next dev on 127.0.0.1 / LAN)', async () => {
    const { slug, ip } = fresh();
    setRow(feedbackRow(slug));
    const res = await send(slug, {
      ip,
      cookie: validCookie(slug),
      origin: 'http://localhost:3000',
      headers: { host: '127.0.0.1:3000', origin: 'http://127.0.0.1:3000' },
    });
    expect(res.status).toBe(201);
  });

  it('403s Sec-Fetch-Site: cross-site when Origin is absent', async () => {
    const { slug, ip } = fresh();
    setRow(feedbackRow(slug));
    const res = await send(slug, { ip, cookie: validCookie(slug), headers: { 'sec-fetch-site': 'cross-site' } });
    expect(res.status).toBe(403);
    expect(fromMock).not.toHaveBeenCalled();
  });

  it('allows Sec-Fetch-Site: same-origin with no Origin, and no Origin + no Sec-Fetch-Site', async () => {
    const a = fresh();
    setRow(feedbackRow(a.slug));
    const same = await send(a.slug, {
      ip: a.ip,
      cookie: validCookie(a.slug),
      headers: { 'sec-fetch-site': 'same-origin' },
    });
    expect(same.status).toBe(201);

    const b = fresh();
    setRow(feedbackRow(b.slug));
    const neither = await send(b.slug, { ip: b.ip, cookie: validCookie(b.slug), headers: {} });
    expect(neither.status).toBe(201);
  });

  // Step 4
  it('415s a non-JSON content type', async () => {
    const { slug, ip } = fresh();
    setRow(feedbackRow(slug));
    const res = await send(slug, { ip, cookie: validCookie(slug), contentType: 'text/plain' });
    expect(res.status).toBe(415);
    expect(fromMock).not.toHaveBeenCalled();
  });

  it('415s a missing content type', async () => {
    const { slug, ip } = fresh();
    const res = await send(slug, { ip, cookie: validCookie(slug), contentType: null, body: '{}' });
    expect(res.status).toBe(415);
  });

  it('accepts application/json with parameters, case-insensitively', async () => {
    const { slug, ip } = fresh();
    setRow(feedbackRow(slug));
    const res = await send(slug, {
      ip,
      cookie: validCookie(slug),
      contentType: 'Application/JSON; charset=utf-8',
    });
    expect(res.status).toBe(201);
  });

  // Step 5
  it('429s pre-auth per IP after 60 requests, Retry-After 600', async () => {
    const { slug, ip } = fresh();
    setRow(null);
    for (let i = 0; i < 60; i++) {
      expect((await send(slug, { ip })).status).toBe(404);
    }
    const res = await send(slug, { ip });
    expect(res.status).toBe(429);
    expect(res.headers.get('Retry-After')).toBe('600');
  });

  it('does not read the DB when pre-auth limited', async () => {
    const { slug, ip } = fresh();
    setRow(null);
    for (let i = 0; i < 60; i++) await send(slug, { ip });
    fromMock.mockClear();
    const res = await send(slug, { ip });
    expect(res.status).toBe(429);
    expect(fromMock).not.toHaveBeenCalled();
  });

  // Step 6
  it('413s when Content-Length exceeds 16384, before the DB read', async () => {
    const { slug, ip } = fresh();
    setRow(feedbackRow(slug));
    const res = await send(slug, {
      ip,
      cookie: validCookie(slug),
      headers: { 'content-length': '16385' },
    });
    expect(res.status).toBe(413);
    expect(fromMock).not.toHaveBeenCalled();
  });

  // Step 7
  it('404s an unknown slug', async () => {
    const { slug, ip } = fresh();
    setRow(null);
    const res = await send(slug, { ip, cookie: validCookie(slug) });
    expect(res.status).toBe(404);
  });

  it('404s a public-mode preview', async () => {
    const { slug, ip } = fresh();
    setRow(feedbackRow(slug, { mode: 'public', password: null }));
    const res = await send(slug, { ip });
    expect(res.status).toBe(404);
  });

  it('404s a preview with feedback disabled', async () => {
    const { slug, ip } = fresh();
    setRow(feedbackRow(slug, { feedback_enabled: false }));
    const res = await send(slug, { ip, cookie: validCookie(slug) });
    expect(res.status).toBe(404);
  });

  it('selects exactly the columns the route needs', async () => {
    const { slug, ip } = fresh();
    const selectSpy = vi.fn(() => ({ eq: vi.fn(() => ({ maybeSingle: maybeSingleMock })) }));
    setRow(feedbackRow(slug));
    fromMock.mockImplementationOnce(() => ({ select: selectSpy }) as never);
    await send(slug, { ip, cookie: validCookie(slug) });
    expect(selectSpy).toHaveBeenCalledWith('id, mode, password, expires_at, feedback_enabled');
  });

  // Step 8
  it('410s an expired preview', async () => {
    const { slug, ip } = fresh();
    setRow(feedbackRow(slug, { expires_at: '2000-01-01T00:00:00Z' }));
    const res = await send(slug, { ip, cookie: validCookie(slug) });
    expect(res.status).toBe(410);
  });

  // Step 9
  it('503s when PREVIEW_GATE_SECRET is missing', async () => {
    const { slug, ip } = fresh();
    const cookie = validCookie(slug);
    delete process.env.PREVIEW_GATE_SECRET;
    setRow(feedbackRow(slug));
    const res = await send(slug, { ip, cookie });
    expect(res.status).toBe(503);
  });

  // Step 10
  it('401s a missing cookie and a garbage cookie', async () => {
    const a = fresh();
    setRow(feedbackRow(a.slug));
    expect((await send(a.slug, { ip: a.ip })).status).toBe(401);
    const b = fresh();
    setRow(feedbackRow(b.slug));
    expect((await send(b.slug, { ip: b.ip, cookie: 'not-hex-at-all' })).status).toBe(401);
    expect(insertMock).not.toHaveBeenCalled();
  });

  it('a cookie signed for another slug is rejected', async () => {
    const { slug, ip } = fresh();
    setRow(feedbackRow(slug));
    const res = await send(slug, { ip, cookie: validCookie('some-other-slug-9999') });
    expect(res.status).toBe(401);
  });

  it('a cookie signed with the old password is rejected after rotation', async () => {
    const { slug, ip } = fresh();
    const stale = validCookie(slug, 'old-password');
    setRow(feedbackRow(slug, { password: 'new-password' }));
    const res = await send(slug, { ip, cookie: stale });
    expect(res.status).toBe(401);
  });

  it('does not read the body before the cookie is verified', async () => {
    const { slug, ip } = fresh();
    setRow(feedbackRow(slug));
    const stream = new ReadableStream<Uint8Array>({
      pull() {
        throw new Error('body must not be read');
      },
    });
    const res = await send(slug, { ip, cookie: 'deadbeef', stream });
    expect(res.status).toBe(401);
  });

  // Step 11
  it('413s an oversized body sent without Content-Length', async () => {
    const { slug, ip } = fresh();
    setRow(feedbackRow(slug));
    const chunk = new Uint8Array(8192).fill(97);
    let sent = 0;
    const stream = new ReadableStream<Uint8Array>({
      pull(controller) {
        if (sent >= 3) {
          controller.close();
          return;
        }
        sent += 1;
        controller.enqueue(chunk);
      },
    });
    const res = await send(slug, { ip, cookie: validCookie(slug), stream });
    expect(res.status).toBe(413);
    expect(insertMock).not.toHaveBeenCalled();
  });

  it('400s when reading the body throws', async () => {
    const { slug, ip } = fresh();
    setRow(feedbackRow(slug));
    const stream = new ReadableStream<Uint8Array>({
      pull() {
        throw new Error('boom');
      },
    });
    const res = await send(slug, { ip, cookie: validCookie(slug), stream });
    expect(res.status).toBe(400);
  });

  // Step 12
  it('400s invalid JSON', async () => {
    const { slug, ip } = fresh();
    setRow(feedbackRow(slug));
    const res = await send(slug, { ip, cookie: validCookie(slug), body: '{not json' });
    expect(res.status).toBe(400);
    expect(insertMock).not.toHaveBeenCalled();
  });

  it("400s with the parser's error for invalid input", async () => {
    const { slug, ip } = fresh();
    setRow(feedbackRow(slug));
    const res = await send(slug, { ip, cookie: validCookie(slug), body: { ...VALID_BODY, message: '   ' } });
    expect(res.status).toBe(400);
    expect(await errorOf(res)).toBe('Message is required');
    expect(insertMock).not.toHaveBeenCalled();
  });

  // Step 13
  it('allows 20 authenticated posts per slug+IP per 10 minutes, 429s the 21st with Retry-After 600', async () => {
    const { slug, ip } = fresh();
    setRow(feedbackRow(slug));
    const cookie = validCookie(slug);
    for (let i = 0; i < 20; i++) {
      expect((await send(slug, { ip, cookie })).status).toBe(201);
    }
    const res = await send(slug, { ip, cookie });
    expect(res.status).toBe(429);
    expect(res.headers.get('Retry-After')).toBe('600');
    expect(insertMock).toHaveBeenCalledTimes(20);
  });

  it('caps a slug at 100 authenticated posts per hour across IPs, Retry-After 3600', async () => {
    const { slug } = fresh();
    setRow(feedbackRow(slug));
    const cookie = validCookie(slug);
    // 5 distinct reviewer IPs x 20 = 100, each within its own per-IP allowance.
    for (let ipN = 0; ipN < 5; ipN++) {
      const ip = `172.16.${counter}.${ipN + 1}`;
      for (let i = 0; i < 20; i++) {
        expect((await send(slug, { ip, cookie })).status).toBe(201);
      }
    }
    const res = await send(slug, { ip: `172.16.${counter}.99`, cookie });
    expect(res.status).toBe(429);
    expect(res.headers.get('Retry-After')).toBe('3600');
    expect(insertMock).toHaveBeenCalledTimes(100);
  });

  it('invalid-cookie floods do not consume the reviewer allowance', async () => {
    const { slug } = fresh();
    setRow(feedbackRow(slug));
    for (let i = 0; i < 150; i++) {
      const res = await send(slug, { ip: `192.168.${counter}.${i + 1}`, cookie: 'deadbeef' });
      expect(res.status).toBe(401);
    }
    const res = await send(slug, { ip: `192.168.${counter}.250`, cookie: validCookie(slug) });
    expect(res.status).toBe(201);
  });

  // Step 14
  it('inserts the trimmed values, preview_id and a truncated user agent', async () => {
    const { slug, ip } = fresh();
    setRow(feedbackRow(slug));
    const res = await send(slug, {
      ip,
      cookie: validCookie(slug),
      headers: { 'user-agent': 'U'.repeat(700) },
      body: { ...VALID_BODY, name: '  Keoni  ', message: '  needs work  ', page: ' /about.html ' },
    });
    expect(res.status).toBe(201);
    expect(fromMock).toHaveBeenCalledWith('preview_feedback');
    expect(insertMock).toHaveBeenCalledTimes(1);
    expect(insertMock).toHaveBeenCalledWith({
      preview_id: `preview-id-${slug}`,
      page: '/about.html',
      reviewer_name: 'Keoni',
      kind: 'bug',
      message: 'needs work',
      viewport_w: 1280,
      viewport_h: 720,
      user_agent: 'U'.repeat(500),
    });
  });

  it('inserts a null user agent when the header is absent', async () => {
    const { slug, ip } = fresh();
    setRow(feedbackRow(slug));
    await send(slug, { ip, cookie: validCookie(slug) });
    const arg = insertMock.mock.calls[0][0] as { user_agent: string | null };
    expect(arg.user_agent).toBeNull();
  });

  it('500s with a generic error when the insert fails', async () => {
    const { slug, ip } = fresh();
    setRow(feedbackRow(slug));
    insertMock.mockResolvedValue({ error: { message: 'secret db detail' } });
    const res = await send(slug, { ip, cookie: validCookie(slug) });
    expect(res.status).toBe(500);
    expect(await errorOf(res)).toBe('Could not save feedback');
  });

  // Step 15 + headers
  it('201s { ok: true } with no-store/noindex JSON headers', async () => {
    const { slug, ip } = fresh();
    setRow(feedbackRow(slug));
    const res = await send(slug, { ip, cookie: validCookie(slug) });
    expect(res.status).toBe(201);
    expect(await res.json()).toEqual({ ok: true });
    expect(res.headers.get('Content-Type')).toContain('application/json');
    expect(res.headers.get('Cache-Control')).toBe('private, no-store');
    expect(res.headers.get('X-Robots-Tag')).toBe('noindex, nofollow');
  });

  it('error responses carry the same headers', async () => {
    const { slug, ip } = fresh();
    setRow(feedbackRow(slug));
    const res = await send(slug, { ip });
    expect(res.status).toBe(401);
    expect(res.headers.get('Content-Type')).toContain('application/json');
    expect(res.headers.get('Cache-Control')).toBe('private, no-store');
    expect(res.headers.get('X-Robots-Tag')).toBe('noindex, nofollow');
  });
});
