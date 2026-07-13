import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';

const { lookupMock } = vi.hoisted(() => ({ lookupMock: vi.fn() }));
vi.mock('node:dns/promises', () => ({ default: { lookup: lookupMock } }));

import { assertPublicHostname, fetchHtmlWithCaps, isPubliclyRoutable } from './safe-fetch';

// A minimal Response stand-in. `chunks` lets a test drive the streaming reader
// (byte caps, aborts); otherwise `body` is emitted as one chunk.
function makeResponse(opts: {
  status?: number;
  contentType?: string | null;
  body?: string;
  location?: string;
  chunks?: Uint8Array[];
  readImpl?: () => Promise<{ done: boolean; value?: Uint8Array }>;
  noBody?: boolean;
}) {
  const status = opts.status ?? 200;
  const headers = new Map<string, string>();
  if (opts.contentType !== null) headers.set('content-type', opts.contentType ?? 'text/html; charset=utf-8');
  if (opts.location) headers.set('location', opts.location);
  const data = opts.chunks ?? [new TextEncoder().encode(opts.body ?? '<html>ok</html>')];
  let i = 0;
  return {
    status,
    ok: status >= 200 && status < 300,
    headers: { get: (k: string) => headers.get(k.toLowerCase()) ?? null },
    body: opts.noBody
      ? null
      : {
          getReader: () => ({
            read:
              opts.readImpl ??
              (async () => (i < data.length ? { done: false, value: data[i++] } : { done: true, value: undefined })),
            cancel: async () => {},
          }),
        },
  };
}

beforeEach(() => {
  lookupMock.mockReset();
  lookupMock.mockResolvedValue([{ address: '93.184.216.34', family: 4 }]); // public by default
  vi.stubGlobal('fetch', vi.fn());
});
afterEach(() => {
  vi.unstubAllGlobals();
});

describe('isPubliclyRoutable', () => {
  const blocked = [
    '10.0.0.1',
    '127.0.0.1',
    '192.168.1.1',
    '172.16.0.1',
    '172.31.255.255',
    '169.254.169.254', // cloud metadata
    '100.64.0.1', // CGNAT
    '198.18.0.1', // benchmark
    '192.0.0.1',
    '192.0.2.1', // TEST-NET-1
    '198.51.100.1', // TEST-NET-2
    '203.0.113.1', // TEST-NET-3
    '240.0.0.1',
    '0.0.0.0',
    '255.255.255.255',
    '::1',
    'fc00::1', // ULA
    'fd00::1', // ULA
    'fe80::1', // link-local
    '::ffff:127.0.0.1', // IPv4-mapped
    '::ffff:7f00:1', // IPv4-mapped, hex form
    '2002:0a00:0001::1', // 6to4 wrapping a private v4
    '64:ff9b::808:808', // NAT64
  ];
  it.each(blocked)('blocks %s', (ip) => {
    expect(isPubliclyRoutable(ip)).toBe(false);
  });

  const allowed = ['8.8.8.8', '93.184.216.34', '2606:4700:4700::1111', '::ffff:8.8.8.8'];
  it.each(allowed)('allows %s', (ip) => {
    expect(isPubliclyRoutable(ip)).toBe(true);
  });

  it.each(['not-an-ip', '999.999.999.999', '', 'example.com'])('rejects unparseable %s', (s) => {
    expect(isPubliclyRoutable(s)).toBe(false);
  });
});

describe('assertPublicHostname', () => {
  it('resolves a literal public IP without DNS', async () => {
    await expect(assertPublicHostname('8.8.8.8')).resolves.toBeUndefined();
    expect(lookupMock).not.toHaveBeenCalled();
  });

  it('throws on a literal private IP without DNS', async () => {
    await expect(assertPublicHostname('10.0.0.1')).rejects.toThrow();
    expect(lookupMock).not.toHaveBeenCalled();
  });

  it('strips brackets on a literal IPv6 (still fast-pathed)', async () => {
    await expect(assertPublicHostname('[::1]')).rejects.toThrow();
    expect(lookupMock).not.toHaveBeenCalled();
  });

  it('resolves a hostname whose DNS answers are all public', async () => {
    lookupMock.mockResolvedValue([{ address: '8.8.8.8', family: 4 }]);
    await expect(assertPublicHostname('good.example')).resolves.toBeUndefined();
  });

  it('throws when ANY resolved address is private (mixed answers)', async () => {
    lookupMock.mockResolvedValue([
      { address: '8.8.8.8', family: 4 },
      { address: '10.0.0.5', family: 4 },
    ]);
    await expect(assertPublicHostname('evil.example')).rejects.toThrow();
  });

  it('throws when DNS returns no records', async () => {
    lookupMock.mockResolvedValue([]);
    await expect(assertPublicHostname('void.example')).rejects.toThrow();
  });
});

describe('fetchHtmlWithCaps', () => {
  it('returns html on the happy path', async () => {
    (fetch as unknown as ReturnType<typeof vi.fn>).mockResolvedValue(
      makeResponse({ body: '<html>hi</html>' }),
    );
    const r = await fetchHtmlWithCaps('https://good.example/');
    expect(r).toEqual({ html: '<html>hi</html>', finalUrl: 'https://good.example/' });
  });

  it('returns null for a non-http(s) protocol', async () => {
    const r = await fetchHtmlWithCaps('ftp://good.example/');
    expect(r).toBeNull();
    expect(fetch).not.toHaveBeenCalled();
  });

  it('returns null when a redirect points at a private host', async () => {
    (fetch as unknown as ReturnType<typeof vi.fn>).mockResolvedValueOnce(
      makeResponse({ status: 301, location: 'http://10.0.0.1/', noBody: true }),
    );
    const r = await fetchHtmlWithCaps('https://good.example/');
    expect(r).toBeNull();
  });

  it('returns null past the byte cap', async () => {
    const big = new Uint8Array(1024);
    (fetch as unknown as ReturnType<typeof vi.fn>).mockResolvedValue(
      makeResponse({ chunks: [big, big, big] }),
    );
    const r = await fetchHtmlWithCaps('https://good.example/', { maxBytes: 2048 });
    expect(r).toBeNull();
  });

  it('returns null for non-text/html content', async () => {
    (fetch as unknown as ReturnType<typeof vi.fn>).mockResolvedValue(
      makeResponse({ contentType: 'application/json', body: '{}' }),
    );
    const r = await fetchHtmlWithCaps('https://good.example/');
    expect(r).toBeNull();
  });

  it('follows exactly maxRedirects (default 3) then a 200, but fails on one more', async () => {
    const mock = fetch as unknown as ReturnType<typeof vi.fn>;
    // 3 redirects then a 200 → ok
    mock
      .mockResolvedValueOnce(makeResponse({ status: 302, location: 'https://good.example/1', noBody: true }))
      .mockResolvedValueOnce(makeResponse({ status: 302, location: 'https://good.example/2', noBody: true }))
      .mockResolvedValueOnce(makeResponse({ status: 302, location: 'https://good.example/3', noBody: true }))
      .mockResolvedValueOnce(makeResponse({ body: '<html>final</html>' }));
    const ok = await fetchHtmlWithCaps('https://good.example/');
    expect(ok).toEqual({ html: '<html>final</html>', finalUrl: 'https://good.example/3' });

    // 4 redirects (never a 200) → null (loop exhausted at the boundary)
    mock.mockReset();
    mock.mockResolvedValue(makeResponse({ status: 302, location: 'https://good.example/x', noBody: true }));
    const bad = await fetchHtmlWithCaps('https://good.example/');
    expect(bad).toBeNull();
  });

  it('honors a custom maxRedirects of 0', async () => {
    (fetch as unknown as ReturnType<typeof vi.fn>).mockResolvedValue(
      makeResponse({ status: 302, location: 'https://good.example/1', noBody: true }),
    );
    const r = await fetchHtmlWithCaps('https://good.example/', { maxRedirects: 0 });
    expect(r).toBeNull();
  });

  it('returns null (no hang) when the reader aborts mid-stream', async () => {
    (fetch as unknown as ReturnType<typeof vi.fn>).mockResolvedValue(
      makeResponse({
        readImpl: async () => {
          throw new DOMException('The operation was aborted', 'AbortError');
        },
      }),
    );
    const r = await fetchHtmlWithCaps('https://good.example/');
    expect(r).toBeNull();
  });

  it('returns null on a redirect with no Location header', async () => {
    (fetch as unknown as ReturnType<typeof vi.fn>).mockResolvedValue(
      makeResponse({ status: 302, noBody: true }),
    );
    const r = await fetchHtmlWithCaps('https://good.example/');
    expect(r).toBeNull();
  });
});

// Regression note: lib/community/link-preview.ts now delegates to
// fetchHtmlWithCaps() with NO caps, so the defaults above (2 MB / 5 s / 3 hops)
// reproduce its former behavior exactly — the "3 redirects then 200" test proves
// the default 3-hop budget; only the IP classifier got strictly stricter.
