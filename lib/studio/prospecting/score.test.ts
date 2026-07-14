import { beforeEach, describe, expect, it, vi } from 'vitest';

const { fetchHtmlWithCapsMock } = vi.hoisted(() => ({
  fetchHtmlWithCapsMock: vi.fn(),
}));

vi.mock('@/lib/http/safe-fetch', () => ({
  fetchHtmlWithCaps: fetchHtmlWithCapsMock,
}));

import {
  scoreProspectWebsite,
  SCORE_NO_WEBSITE,
  SCORE_SOCIAL_AS_WEBSITE,
  SCORE_FAILED,
} from './score';

const YEAR = 2026;

// All six additive signals fire: http-only final URL, no viewport, stale
// copyright, legacy WordPress, no description/og:title, page-builder markup.
const LEGACY_HTML = `<!doctype html><html><head>
<meta name="generator" content="WordPress 4.9.8" />
<title>Legacy Biz</title>
</head><body class="elementor-page">
<footer>© 2019 Legacy Biz. All rights reserved.</footer>
</body></html>`;

const MODERN_HTML = `<!doctype html><html><head>
<meta name="viewport" content="width=device-width, initial-scale=1" />
<meta name="description" content="A modern site" />
<meta property="og:title" content="Modern Biz" />
<title>Modern Biz</title>
</head><body><footer>© ${YEAR} Modern Biz</footer></body></html>`;

function fetched(html: string, finalUrl: string) {
  return { html, finalUrl };
}

beforeEach(() => {
  vi.clearAllMocks();
});

describe('scoreProspectWebsite', () => {
  it('honors the D2 ordering contract: no_website > social > worst-legacy > score_failed > modern', async () => {
    const noWebsite = await scoreProspectWebsite(null, YEAR);
    const social = await scoreProspectWebsite('https://facebook.com/legacybiz', YEAR);
    fetchHtmlWithCapsMock.mockResolvedValueOnce(fetched(LEGACY_HTML, 'http://legacy.example/'));
    const worstLegacy = await scoreProspectWebsite('https://legacy.example/', YEAR);
    fetchHtmlWithCapsMock.mockResolvedValueOnce(null);
    const failed = await scoreProspectWebsite('https://unreachable.example/', YEAR);
    fetchHtmlWithCapsMock.mockResolvedValueOnce(fetched(MODERN_HTML, 'https://modern.example/'));
    const modern = await scoreProspectWebsite('https://modern.example/', YEAR);

    // The single assertion chain — the product requirement.
    expect(noWebsite.score).toBeGreaterThan(social.score);
    expect(social.score).toBeGreaterThan(worstLegacy.score);
    expect(worstLegacy.score).toBeGreaterThan(failed.score);
    expect(failed.score).toBeGreaterThan(modern.score);
    expect(modern.score).toBeLessThanOrEqual(10);

    expect(noWebsite).toMatchObject({ status: 'no_website', score: SCORE_NO_WEBSITE });
    expect(social).toMatchObject({ status: 'scored', score: SCORE_SOCIAL_AS_WEBSITE });
    expect(worstLegacy).toMatchObject({ status: 'scored', score: 80 });
    expect(failed).toMatchObject({ status: 'score_failed', score: SCORE_FAILED });
    expect(modern.status).toBe('scored');
  });

  it('null website → no_website 95, no fetch', async () => {
    const r = await scoreProspectWebsite(null, YEAR);
    expect(r.status).toBe('no_website');
    expect(r.score).toBe(95);
    expect(r.tech).toEqual({ cms: null, generator: null, socialAsWebsite: false });
    expect(fetchHtmlWithCapsMock).not.toHaveBeenCalled();
  });

  it.each([
    'https://facebook.com/x',
    'facebook.com/x', // scheme-less
    'https://m.facebook.com/x',
    'HTTPS://WWW.FACEBOOK.COM/x',
    'https://instagram.com/x',
    'https://linktr.ee/x',
  ])('scores %s as a social page (85) without fetching', async (url) => {
    const r = await scoreProspectWebsite(url, YEAR);
    expect(r.status).toBe('scored');
    expect(r.score).toBe(85);
    expect(r.tech.socialAsWebsite).toBe(true);
    expect(fetchHtmlWithCapsMock).not.toHaveBeenCalled();
  });

  it('does NOT treat a lookalike host as social — it proceeds to fetch', async () => {
    fetchHtmlWithCapsMock.mockResolvedValueOnce(fetched(MODERN_HTML, 'https://myfacebook.com.evil/'));
    const r = await scoreProspectWebsite('https://myfacebook.com.evil/x', YEAR);
    expect(fetchHtmlWithCapsMock).toHaveBeenCalledTimes(1);
    expect(r.tech.socialAsWebsite).toBe(false);
  });

  it('unreachable site (fetch → null) → score_failed 40', async () => {
    fetchHtmlWithCapsMock.mockResolvedValueOnce(null);
    const r = await scoreProspectWebsite('https://dead.example/', YEAR);
    expect(r).toMatchObject({ status: 'score_failed', score: 40 });
  });

  it('invalid URL (normalizeAuditUrl not-ok) → score_failed 40, no fetch', async () => {
    const r = await scoreProspectWebsite('javascript:alert(1)', YEAR);
    expect(r).toMatchObject({ status: 'score_failed', score: 40 });
    expect(fetchHtmlWithCapsMock).not.toHaveBeenCalled();
  });

  it('a full-legacy page fires every signal with its exact points', async () => {
    fetchHtmlWithCapsMock.mockResolvedValueOnce(fetched(LEGACY_HTML, 'http://legacy.example/'));
    const r = await scoreProspectWebsite('https://legacy.example/', YEAR);
    expect(r.status).toBe('scored');
    expect(r.score).toBe(80); // 18+18+12+12+12+8, clamped ≤ 100
    const byId = Object.fromEntries(r.breakdown.map((b) => [b.id, b.points]));
    expect(byId).toEqual({
      http_only: 18,
      no_viewport: 18,
      stale_copyright: 12,
      legacy_wordpress: 12,
      no_meta: 12,
      page_builder: 8,
    });
    expect(r.tech.cms).toBe('wordpress');
    expect(r.tech.generator).toBe('WordPress 4.9.8');
  });

  it('a modern page has a near-empty breakdown', async () => {
    fetchHtmlWithCapsMock.mockResolvedValueOnce(fetched(MODERN_HTML, 'https://modern.example/'));
    const r = await scoreProspectWebsite('https://modern.example/', YEAR);
    expect(r.status).toBe('scored');
    expect(r.score).toBe(0);
    expect(r.breakdown).toEqual([]);
  });

  it('a stale copyright range reads as its max year (no false positive)', async () => {
    const html = `<html><head><meta name="viewport" content="width=device-width" />
<meta name="description" content="x" /></head>
<body><footer>© 2019–${YEAR} Range Biz</footer></body></html>`;
    fetchHtmlWithCapsMock.mockResolvedValueOnce(fetched(html, 'https://range.example/'));
    const r = await scoreProspectWebsite('https://range.example/', YEAR);
    expect(r.breakdown.find((b) => b.id === 'stale_copyright')).toBeUndefined();
  });

  it('malformed HTML still resolves as scored (never throws, never score_failed when fetched)', async () => {
    fetchHtmlWithCapsMock.mockResolvedValueOnce(
      fetched('<<<%%% not even close to <html', 'https://junk.example/'),
    );
    const r = await scoreProspectWebsite('https://junk.example/', YEAR);
    expect(r.status).toBe('scored');
  });

  it('never rejects on an unexpected error (fetch throws) → score_failed', async () => {
    fetchHtmlWithCapsMock.mockRejectedValueOnce(new Error('boom'));
    const errSpy = vi.spyOn(console, 'error').mockImplementation(() => {});
    const r = await scoreProspectWebsite('https://boom.example/', YEAR);
    expect(r).toMatchObject({ status: 'score_failed', score: 40 });
    errSpy.mockRestore();
  });
});
