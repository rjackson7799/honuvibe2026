import { describe, it, expect, vi, beforeEach } from 'vitest';
import { NextRequest } from 'next/server';

const { fromMock, maybeSingleMock, storageFromMock, downloadMock, rpcMock } = vi.hoisted(() => {
  const maybeSingleMock = vi.fn();
  const downloadMock = vi.fn();
  const rpcMock = vi.fn();
  const storageFromMock = vi.fn(() => ({ download: downloadMock }));
  const fromMock = vi.fn(() => ({
    select: vi.fn(() => ({
      eq: vi.fn(() => ({ maybeSingle: maybeSingleMock })),
    })),
  }));
  return { fromMock, maybeSingleMock, storageFromMock, downloadMock, rpcMock };
});

vi.mock('@/lib/supabase/server', () => ({
  createAdminClient: () => ({
    from: fromMock,
    storage: { from: storageFromMock },
    rpc: rpcMock,
  }),
}));

import { GET, HEAD, POST } from '@/app/api/preview/[slug]/[[...path]]/route';
import { signGate } from '@/lib/previews/gate';

const SECRET = 'test-secret-0123456789abcdef0123456789abcdef';

function setRow(row: Record<string, unknown> | null) {
  maybeSingleMock.mockResolvedValue({ data: row, error: null });
}

function fakeBlob(text = '<html>ok</html>') {
  return {
    stream: () =>
      new ReadableStream({
        start(controller) {
          controller.enqueue(new TextEncoder().encode(text));
          controller.close();
        },
      }),
  };
}

function gatedRow(slug: string, overrides: Record<string, unknown> = {}) {
  return {
    slug,
    title: 'Acme Preview',
    mode: 'gated',
    password: 'hunter2',
    storage_prefix: slug,
    entry_file: 'index.html',
    expires_at: null,
    ...overrides,
  };
}

function getReq(slug: string, path: string[] = [], opts: { cookie?: string } = {}) {
  const suffix = path.length ? `/${path.join('/')}` : '';
  const headers: Record<string, string> = {};
  if (opts.cookie) headers.cookie = opts.cookie;
  const request = new NextRequest(`http://localhost/api/preview/${slug}${suffix}`, { headers });
  const ctx = { params: Promise.resolve({ slug, path: path.length ? path : undefined }) };
  return { request, ctx };
}

function postReq(slug: string, password?: string) {
  const body = new URLSearchParams();
  if (password !== undefined) body.set('password', password);
  const request = new NextRequest(`http://localhost/api/preview/${slug}`, {
    method: 'POST',
    headers: { 'content-type': 'application/x-www-form-urlencoded' },
    body: body.toString(),
  });
  const ctx = { params: Promise.resolve({ slug, path: undefined as string[] | undefined }) };
  return { request, ctx };
}

describe('preview gate route', () => {
  beforeEach(() => {
    vi.clearAllMocks();
    process.env.NEXT_PUBLIC_SUPABASE_URL = 'http://localhost';
    process.env.SUPABASE_SERVICE_ROLE_KEY = 'service-role-test-key';
    process.env.PREVIEW_GATE_SECRET = SECRET;
    rpcMock.mockResolvedValue({ error: null });
    downloadMock.mockResolvedValue({ data: fakeBlob(), error: null });
  });

  it('503s (JSON) when Supabase env is unset', async () => {
    delete process.env.NEXT_PUBLIC_SUPABASE_URL;
    const { request, ctx } = getReq('acme-envunset', ['index.html']);
    const res = await GET(request, ctx);
    expect(res.status).toBe(503);
    expect(res.headers.get('Content-Type')).toContain('application/json');
    const json = (await res.json()) as { error: string };
    expect(json.error).toBe('Preview gate unavailable');
  });

  it('404s a malformed slug without touching the DB', async () => {
    const { request, ctx } = getReq('BAD', ['index.html']);
    const res = await GET(request, ctx);
    expect(res.status).toBe(404);
    expect(fromMock).not.toHaveBeenCalled();
  });

  it('404s an unknown slug', async () => {
    setRow(null);
    const { request, ctx } = getReq('acme-unknown1', ['index.html']);
    const res = await GET(request, ctx);
    expect(res.status).toBe(404);
    expect(res.headers.get('Content-Type')).toContain('text/html');
  });

  it('410s an expired preview', async () => {
    setRow(gatedRow('acme-expired1', { expires_at: '2000-01-01T00:00:00Z' }));
    const { request, ctx } = getReq('acme-expired1', ['index.html'], {
      cookie: `hv_pv_acme-expired1=${signGate('acme-expired1', 'hunter2')}`,
    });
    const res = await GET(request, ctx);
    expect(res.status).toBe(410);
  });

  it('303-redirects a bare-slug GET to the entry file', async () => {
    setRow(gatedRow('acme-bareslug'));
    const { request, ctx } = getReq('acme-bareslug', []);
    const res = await GET(request, ctx);
    expect(res.status).toBe(303);
    expect(res.headers.get('location')).toContain('/api/preview/acme-bareslug/index.html');
    expect(res.headers.get('X-Robots-Tag')).toBe('noindex, nofollow');
    expect(downloadMock).not.toHaveBeenCalled();
  });

  it('401s a gated GET with no cookie and returns the password form', async () => {
    setRow(gatedRow('acme-nocookie'));
    const { request, ctx } = getReq('acme-nocookie', ['index.html']);
    const res = await GET(request, ctx);
    expect(res.status).toBe(401);
    const html = await res.text();
    expect(html).toContain('name="password"');
    expect(html).toContain('action="/api/preview/acme-nocookie"');
    expect(html).toContain('noindex,nofollow');
    expect(downloadMock).not.toHaveBeenCalled();
  });

  it('streams a gated GET with a valid cookie (no-store + noindex)', async () => {
    setRow(gatedRow('acme-goodcook'));
    const { request, ctx } = getReq('acme-goodcook', ['index.html'], {
      cookie: `hv_pv_acme-goodcook=${signGate('acme-goodcook', 'hunter2')}`,
    });
    const res = await GET(request, ctx);
    expect(res.status).toBe(200);
    expect(res.headers.get('Content-Type')).toBe('text/html; charset=utf-8');
    expect(res.headers.get('Cache-Control')).toBe('private, no-store');
    expect(res.headers.get('X-Robots-Tag')).toBe('noindex, nofollow');
    expect(downloadMock).toHaveBeenCalledWith('acme-goodcook/index.html');
  });

  it('serves a public row even with PREVIEW_GATE_SECRET unset', async () => {
    delete process.env.PREVIEW_GATE_SECRET;
    setRow(gatedRow('acme-publicrw', { mode: 'public', password: null }));
    const { request, ctx } = getReq('acme-publicrw', ['index.html']);
    const res = await GET(request, ctx);
    expect(res.status).toBe(200);
    expect(res.headers.get('Cache-Control')).toBe('private, no-store');
  });

  it('503s a gated GET when PREVIEW_GATE_SECRET is unset', async () => {
    delete process.env.PREVIEW_GATE_SECRET;
    setRow(gatedRow('acme-nosecret'));
    const { request, ctx } = getReq('acme-nosecret', ['index.html']);
    const res = await GET(request, ctx);
    expect(res.status).toBe(503);
    expect(downloadMock).not.toHaveBeenCalled();
  });

  it('503s a POST when PREVIEW_GATE_SECRET is unset', async () => {
    delete process.env.PREVIEW_GATE_SECRET;
    setRow(gatedRow('acme-nosecpost'));
    const { request, ctx } = postReq('acme-nosecpost', 'hunter2');
    const res = await POST(request, ctx);
    expect(res.status).toBe(503);
  });

  it('404s a path-traversal attempt without a storage read', async () => {
    setRow(gatedRow('acme-travers1'));
    const { request, ctx } = getReq('acme-travers1', ['..', 'secrets.txt'], {
      cookie: `hv_pv_acme-travers1=${signGate('acme-travers1', 'hunter2')}`,
    });
    const res = await GET(request, ctx);
    expect(res.status).toBe(404);
    expect(downloadMock).not.toHaveBeenCalled();
  });

  it('404s a storage download miss', async () => {
    setRow(gatedRow('acme-dlmiss1'));
    downloadMock.mockResolvedValue({ data: null, error: { message: 'not found' } });
    const { request, ctx } = getReq('acme-dlmiss1', ['index.html'], {
      cookie: `hv_pv_acme-dlmiss1=${signGate('acme-dlmiss1', 'hunter2')}`,
    });
    const res = await GET(request, ctx);
    expect(res.status).toBe(404);
    expect(rpcMock).not.toHaveBeenCalled();
  });

  it('bumps access_count on an entry GET', async () => {
    setRow(gatedRow('acme-entrybmp', { mode: 'public', password: null }));
    const { request, ctx } = getReq('acme-entrybmp', ['index.html']);
    const res = await GET(request, ctx);
    expect(res.status).toBe(200);
    expect(rpcMock).toHaveBeenCalledWith('bump_preview_access', { p_slug: 'acme-entrybmp' });
  });

  it('does NOT bump access_count on an asset GET', async () => {
    setRow(gatedRow('acme-assetbmp', { mode: 'public', password: null }));
    const { request, ctx } = getReq('acme-assetbmp', ['assets', 'style.css']);
    const res = await GET(request, ctx);
    expect(res.status).toBe(200);
    expect(downloadMock).toHaveBeenCalledWith('acme-assetbmp/assets/style.css');
    expect(rpcMock).not.toHaveBeenCalled();
  });

  it('HEAD on the entry returns headers with no storage read and no bump', async () => {
    setRow(gatedRow('acme-headtest', { mode: 'public', password: null }));
    const { request, ctx } = getReq('acme-headtest', ['index.html']);
    const res = await HEAD(request, ctx);
    expect(res.status).toBe(200);
    expect(res.headers.get('X-Robots-Tag')).toBe('noindex, nofollow');
    expect(res.headers.get('Content-Type')).toBe('text/html; charset=utf-8');
    expect(downloadMock).not.toHaveBeenCalled();
    expect(rpcMock).not.toHaveBeenCalled();
  });

  it('POST with a wrong password returns 401', async () => {
    setRow(gatedRow('acme-wrongpw1'));
    const { request, ctx } = postReq('acme-wrongpw1', 'nope');
    const res = await POST(request, ctx);
    expect(res.status).toBe(401);
    const html = await res.text();
    expect(html).toContain('Incorrect password.');
  });

  it('POST rate-limits after 10 attempts in a window (11th → 429)', async () => {
    setRow(gatedRow('acme-ratelim1'));
    for (let i = 0; i < 10; i += 1) {
      const { request, ctx } = postReq('acme-ratelim1', 'nope');
      const res = await POST(request, ctx);
      expect(res.status).toBe(401);
    }
    const { request, ctx } = postReq('acme-ratelim1', 'nope');
    const res = await POST(request, ctx);
    expect(res.status).toBe(429);
    const html = await res.text();
    expect(html).toContain('Too many attempts');
  });

  it('POST with the right password 303-redirects and sets a scoped cookie', async () => {
    setRow(gatedRow('acme-goodpw01'));
    const { request, ctx } = postReq('acme-goodpw01', 'hunter2');
    const res = await POST(request, ctx);
    expect(res.status).toBe(303);
    expect(res.headers.get('location')).toContain('/api/preview/acme-goodpw01/index.html');
    const setCookie = res.headers.get('set-cookie') ?? '';
    expect(setCookie).toContain('hv_pv_acme-goodpw01=');
    expect(setCookie).toMatch(/httponly/i);
    expect(setCookie).toMatch(/samesite=lax/i);
    expect(setCookie).toContain('Path=/api/preview/acme-goodpw01');
  });

  it('POST to a public row 404s (no form is ever shown for it)', async () => {
    setRow(gatedRow('acme-postpub1', { mode: 'public', password: null }));
    const { request, ctx } = postReq('acme-postpub1', 'whatever');
    const res = await POST(request, ctx);
    expect(res.status).toBe(404);
  });
});
