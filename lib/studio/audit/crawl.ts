import * as cheerio from 'cheerio';
import { fetchHtmlWithCaps } from '@/lib/http/safe-fetch';
import type { FetchedPage } from './schemas';

// Network orchestration for the audit: URL normalization (shared with the POST
// route) + a bounded, same-host, deduped homepage-plus-≤3-subpages crawl. Every
// hop is SSRF-checked inside fetchHtmlWithCaps; this module additionally enforces
// same-host AFTER redirects (the fetcher only guarantees each hop is public, not
// on-host) and hard concurrency + wall-clock bounds so the crawl can't blow the
// after()/maxDuration budget.

const MAX_URL_LEN = 2048;
const PAGE_MAX_BYTES = 5 * 1024 * 1024;
const PAGE_TIMEOUT_MS = 10_000;
const CRAWL_DEADLINE_MS = 25_000;
const SUBPAGE_CONCURRENCY = 2;
const MAX_SUBPAGES = 3;
const TRACKING_PARAMS = ['fbclid', 'gclid', 'mc_cid', 'mc_eid', 'igshid'];
const PRIORITY_PATH = /\/(about|service|contact|pricing)/i;

export type NormalizeResult = { ok: true; url: string } | { ok: false; error: string };

/**
 * Normalize a lead-supplied website URL into a safe, auditable https(s) URL, or
 * return a 400-able reason. Trims, prepends https:// when scheme-less, rejects
 * embedded credentials and non-80/443 ports (else this is a port scanner),
 * strips the fragment, normalizes a trailing-dot host, and caps length.
 */
export function normalizeAuditUrl(raw: string | null | undefined): NormalizeResult {
  const trimmed = (raw ?? '').trim();
  if (!trimmed) return { ok: false, error: 'This lead has no current website to audit.' };
  if (trimmed.length > MAX_URL_LEN) return { ok: false, error: 'That website URL is too long.' };

  const withScheme = /^https?:\/\//i.test(trimmed) ? trimmed : `https://${trimmed}`;
  let u: URL;
  try {
    u = new URL(withScheme);
  } catch {
    return { ok: false, error: 'That website URL is not valid.' };
  }
  if (u.protocol !== 'http:' && u.protocol !== 'https:') {
    return { ok: false, error: 'Only http/https websites can be audited.' };
  }
  if (u.username || u.password) {
    return { ok: false, error: 'Remove the embedded credentials from the website URL.' };
  }
  if (u.port && u.port !== '80' && u.port !== '443') {
    return { ok: false, error: 'Only standard web ports (80/443) can be audited.' };
  }
  u.hash = '';
  if (u.hostname.endsWith('.')) u.hostname = u.hostname.replace(/\.+$/, '');
  const out = u.toString();
  if (out.length > MAX_URL_LEN) return { ok: false, error: 'That website URL is too long.' };
  return { ok: true, url: out };
}

// Canonicalize for dedup: drop fragment + tracking params (queryless preferred
// downstream). Mutates and returns the URL.
function canonicalize(u: URL): URL {
  u.hash = '';
  const kill = [...u.searchParams.keys()].filter(
    (k) => /^utm_/i.test(k) || TRACKING_PARAMS.includes(k.toLowerCase()),
  );
  for (const k of kill) u.searchParams.delete(k);
  return u;
}

function pathKey(u: URL): string {
  let p = u.pathname.toLowerCase();
  if (p.length > 1 && p.endsWith('/')) p = p.slice(0, -1);
  return p;
}

// Same-host anchors, canonicalized + deduped by path, priority pages first,
// capped at MAX_SUBPAGES. Exported for the crawl unit test.
export function discoverSubpages(home$: cheerio.CheerioAPI, homeFinalUrl: string): string[] {
  const homeUrl = new URL(homeFinalUrl);
  const homeHost = homeUrl.hostname;
  const homeKey = pathKey(homeUrl);
  const chosen = new Map<string, string>();

  home$('a[href]').each((_i, el) => {
    const href = home$(el).attr('href');
    if (!href) return;
    let u: URL;
    try {
      u = new URL(href, homeFinalUrl);
    } catch {
      return;
    }
    if (u.protocol !== 'http:' && u.protocol !== 'https:') return;
    if (u.hostname !== homeHost) return;
    canonicalize(u);
    const key = pathKey(u);
    if (key === homeKey) return; // skip the homepage itself
    const existing = chosen.get(key);
    if (existing === undefined) {
      chosen.set(key, u.toString());
    } else if (u.search === '' && new URL(existing).search !== '') {
      chosen.set(key, u.toString()); // prefer the queryless variant
    }
  });

  return [...chosen.values()]
    .sort((a, b) => {
      const pa = PRIORITY_PATH.test(new URL(a).pathname) ? 0 : 1;
      const pb = PRIORITY_PATH.test(new URL(b).pathname) ? 0 : 1;
      return pa - pb;
    })
    .slice(0, MAX_SUBPAGES);
}

// Bounded-concurrency map. Caps in-flight work at `limit`; every item runs.
async function mapPool<T, R>(
  items: T[],
  limit: number,
  fn: (item: T) => Promise<R>,
): Promise<R[]> {
  const results: R[] = new Array(items.length);
  let next = 0;
  const runner = async () => {
    while (next < items.length) {
      const idx = next++;
      results[idx] = await fn(items[idx]);
    }
  };
  await Promise.all(Array.from({ length: Math.min(limit, items.length) }, runner));
  return results;
}

/**
 * Fetch the homepage + up to 3 same-host subpages, all bounded. Returns `[]` if
 * the homepage is unreachable/non-HTML (→ the run marks the audit `failed`).
 */
export async function fetchAuditPages(inputUrl: string): Promise<FetchedPage[]> {
  const norm = normalizeAuditUrl(inputUrl);
  if (!norm.ok) return [];

  const startedAt = Date.now();
  const home = await fetchHtmlWithCaps(norm.url, {
    maxBytes: PAGE_MAX_BYTES,
    timeoutMs: PAGE_TIMEOUT_MS,
  });
  if (!home) return [];
  const homePage: FetchedPage = { url: norm.url, finalUrl: home.finalUrl, html: home.html };

  let homeHost: string;
  try {
    homeHost = new URL(home.finalUrl).hostname;
  } catch {
    return [homePage];
  }

  let subpageUrls: string[] = [];
  try {
    subpageUrls = discoverSubpages(cheerio.load(home.html), home.finalUrl);
  } catch {
    subpageUrls = [];
  }

  const deadline = startedAt + CRAWL_DEADLINE_MS;
  const fetched = await mapPool(subpageUrls, SUBPAGE_CONCURRENCY, async (u) => {
    const remaining = deadline - Date.now();
    if (remaining <= 500) return null; // out of crawl budget — skip
    const res = await fetchHtmlWithCaps(u, {
      maxBytes: PAGE_MAX_BYTES,
      timeoutMs: Math.min(PAGE_TIMEOUT_MS, remaining),
    });
    if (!res) return null;
    // Same-host re-check on the POST-redirect final URL — a tracking/migration
    // 301 could otherwise fold off-site content into scoring + the narrative.
    let host: string;
    try {
      host = new URL(res.finalUrl).hostname;
    } catch {
      return null;
    }
    if (host !== homeHost) return null;
    return { url: u, finalUrl: res.finalUrl, html: res.html } satisfies FetchedPage;
  });

  return [homePage, ...fetched.filter((p): p is FetchedPage => p !== null)];
}
