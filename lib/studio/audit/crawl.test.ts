import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import * as cheerio from 'cheerio';

const { fetchMock } = vi.hoisted(() => ({ fetchMock: vi.fn() }));
vi.mock('@/lib/http/safe-fetch', () => ({ fetchHtmlWithCaps: fetchMock }));

import { discoverSubpages, fetchAuditPages, normalizeAuditUrl } from './crawl';

beforeEach(() => {
  fetchMock.mockReset();
});
afterEach(() => {
  vi.restoreAllMocks();
});

describe('normalizeAuditUrl', () => {
  it('prepends https:// to a scheme-less URL', () => {
    expect(normalizeAuditUrl('example.com')).toEqual({ ok: true, url: 'https://example.com/' });
  });
  it('rejects embedded credentials', () => {
    const r = normalizeAuditUrl('https://user:pass@example.com/');
    expect(r.ok).toBe(false);
  });
  it('rejects a non-80/443 port', () => {
    expect(normalizeAuditUrl('https://example.com:8080/').ok).toBe(false);
  });
  it('allows explicit :443 and :80', () => {
    expect(normalizeAuditUrl('https://example.com:443/').ok).toBe(true);
    expect(normalizeAuditUrl('http://example.com:80/').ok).toBe(true);
  });
  it('strips the fragment', () => {
    const r = normalizeAuditUrl('https://example.com/x#section');
    expect(r.ok && r.url.includes('#')).toBe(false);
  });
  it('normalizes a trailing-dot host', () => {
    const r = normalizeAuditUrl('https://example.com./');
    expect(r.ok && r.url).toBe('https://example.com/');
  });
  it('rejects an over-length URL', () => {
    expect(normalizeAuditUrl(`https://example.com/${'a'.repeat(3000)}`).ok).toBe(false);
  });
  it('rejects empty input', () => {
    expect(normalizeAuditUrl('   ').ok).toBe(false);
    expect(normalizeAuditUrl(null).ok).toBe(false);
  });
});

describe('discoverSubpages', () => {
  const HOME = 'https://site.example/';
  it('dedups query/fragment variants and drops tracking params, cap 3', () => {
    const html = `
      <a href="/contact">c1</a>
      <a href="/contact#map">c2</a>
      <a href="/contact?utm_source=x">c3</a>
      <a href="/about">a</a>
      <a href="/services?utm_campaign=y">s</a>
      <a href="/pricing">p</a>
      <a href="/blog/post-1">b</a>
      <a href="https://other.example/x">off</a>`;
    const urls = discoverSubpages(cheerio.load(html), HOME);
    expect(urls.length).toBe(3);
    // contact collapses to a single, queryless, fragment-less entry
    expect(urls.filter((u) => u.includes('/contact')).length).toBe(1);
    expect(urls.some((u) => u.includes('utm_') || u.includes('#'))).toBe(false);
    // off-host anchor never appears
    expect(urls.some((u) => u.includes('other.example'))).toBe(false);
    // priority pages beat /blog
    expect(urls.some((u) => u.includes('/blog'))).toBe(false);
    // tracking param stripped from a kept page
    const services = urls.find((u) => u.includes('/services'));
    if (services) expect(services).toBe('https://site.example/services');
  });

  it('prefers the queryless variant of a path', () => {
    const html = `<a href="/team?ref=1">a</a><a href="/team">b</a>`;
    const urls = discoverSubpages(cheerio.load(html), HOME);
    expect(urls).toContain('https://site.example/team');
  });
});

describe('fetchAuditPages', () => {
  const HOME = 'https://site.example/';
  const homeHtml = (links: string) => `<html><head><title>home</title></head><body>${links}</body></html>`;
  const subHtml = '<html><head><title>sub</title></head><body></body></html>';

  it('returns [] when the homepage fetch fails', async () => {
    fetchMock.mockResolvedValue(null);
    expect(await fetchAuditPages(HOME)).toEqual([]);
  });

  it('caps subpage concurrency at 2', async () => {
    let active = 0;
    let maxActive = 0;
    fetchMock.mockImplementation(async (url: string) => {
      if (url === HOME) {
        return { html: homeHtml('<a href="/about">a</a><a href="/services">s</a><a href="/contact">c</a>'), finalUrl: HOME };
      }
      active += 1;
      maxActive = Math.max(maxActive, active);
      await new Promise((r) => setTimeout(r, 10));
      active -= 1;
      return { html: subHtml, finalUrl: url };
    });
    const pages = await fetchAuditPages(HOME);
    expect(maxActive).toBeLessThanOrEqual(2);
    expect(pages.length).toBe(4); // homepage + 3 subpages
  });

  it('discards a subpage that redirects off-host', async () => {
    fetchMock.mockImplementation(async (url: string) => {
      if (url === HOME) return { html: homeHtml('<a href="/gone">g</a>'), finalUrl: HOME };
      return { html: subHtml, finalUrl: 'https://evil.example/landed' };
    });
    const pages = await fetchAuditPages(HOME);
    expect(pages.length).toBe(1); // only the homepage survives
    expect(pages[0].finalUrl).toBe(HOME);
  });

  it('honors the crawl deadline (skips subpage fetches once out of budget)', async () => {
    let now = 1_000_000;
    vi.spyOn(Date, 'now').mockImplementation(() => now);
    fetchMock.mockImplementation(async (url: string) => {
      if (url === HOME) {
        now += 30_000; // blow past the 25s deadline while fetching the homepage
        return { html: homeHtml('<a href="/about">a</a><a href="/services">s</a>'), finalUrl: HOME };
      }
      return { html: subHtml, finalUrl: url };
    });
    const pages = await fetchAuditPages(HOME);
    expect(pages.length).toBe(1); // subpages skipped — deadline exceeded
    expect(fetchMock).toHaveBeenCalledTimes(1); // only the homepage was fetched
  });
});
