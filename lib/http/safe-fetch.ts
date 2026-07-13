// SSRF-hardened HTML fetcher, shared by the community link-preview and the Studio
// website-audit crawler. Both fetch URLs that are ultimately attacker-controlled
// (a pasted community link; a lead's `existing_url`), so every outbound hop is
// gated on "the resolved IP is a globally routable unicast address" — an
// ALLOW-list, not a deny-list. Extracted from lib/community/link-preview.ts and
// hardened: the old string-prefix IP checks are replaced with an ipaddr.js range
// classifier that also blocks CGNAT, benchmark, TEST-NET, 6to4, NAT64, and
// hex-form IPv4-mapped IPv6 — ranges the prefix checks let through.
//
// Residual risk (carried forward, NOT closed here): assertPublicHostname resolves
// DNS and then fetch() resolves again — a TOCTOU window that standard fetch can't
// close without breaking TLS SNI. Mitigate at the infra layer (outbound-egress
// block) if available. See docs/plans/2026-07-12-phase3-lead-audit-engine.md §1.

import dns from 'node:dns/promises';
import * as net from 'node:net';
import ipaddr from 'ipaddr.js';

export interface FetchCaps {
  maxBytes?: number; // default 2 * 1024 * 1024
  timeoutMs?: number; // default 5_000
  maxRedirects?: number; // default 3
  userAgent?: string; // default 'HonuVibeBot/1.0 (+https://honuvibe.ai)'
}

export interface FetchedHtml {
  html: string;
  finalUrl: string;
}

const DEFAULT_MAX_BYTES = 2 * 1024 * 1024;
const DEFAULT_TIMEOUT_MS = 5_000;
const DEFAULT_MAX_REDIRECTS = 3;
const DEFAULT_USER_AGENT = 'HonuVibeBot/1.0 (+https://honuvibe.ai)';

/**
 * "Globally routable unicast only." Returns true only for public unicast
 * addresses; every special/reserved range (private, loopback, link-local,
 * CGNAT, benchmark, TEST-NET, 6to4, NAT64, unique-local, multicast, …) is
 * blocked. IPv4-mapped IPv6 (both `::ffff:127.0.0.1` and the hex
 * `::ffff:7f00:1`) is unwrapped to its embedded IPv4 before classifying, so a
 * mapped private address can't sneak past. Unparseable input ⇒ false (reject).
 * Exported for unit tests.
 */
export function isPubliclyRoutable(ip: string): boolean {
  let addr: ipaddr.IPv4 | ipaddr.IPv6;
  try {
    addr = ipaddr.parse(ip);
  } catch {
    return false; // unparseable ⇒ treat as non-routable
  }
  if (addr.kind() === 'ipv6' && (addr as ipaddr.IPv6).isIPv4MappedAddress()) {
    addr = (addr as ipaddr.IPv6).toIPv4Address();
  }
  return addr.range() === 'unicast';
}

/**
 * Reject a hostname that resolves to any non-public address. Literal IPs (v4/v6,
 * bracketed or not) take a DNS-free fast path; hostnames are resolved with
 * dns.lookup({all:true}) and rejected if ANY answer is non-routable.
 */
export async function assertPublicHostname(hostname: string): Promise<void> {
  const host = hostname.replace(/^\[/, '').replace(/\]$/, '');
  if (net.isIP(host)) {
    if (!isPubliclyRoutable(host)) throw new Error('blocked_ip');
    return;
  }
  const records = await dns.lookup(host, { all: true });
  if (records.length === 0) throw new Error('no_dns');
  for (const r of records) {
    if (!isPubliclyRoutable(r.address)) throw new Error('blocked_ip');
  }
}

/**
 * Fetch an HTML document with hard safety caps: protocol allow-list (http/https),
 * per-hop SSRF check, manual redirect following up to `maxRedirects`, a
 * `text/html` content-type gate, an overall timeout, and a streamed byte cap.
 * Returns `{ html, finalUrl }` on success or `null` on any cap breach / non-HTML
 * / redirect-without-location. Throws only if a hop's hostname fails SSRF
 * validation with an unexpected DNS error — callers wrap this in try/catch.
 */
export async function fetchHtmlWithCaps(
  initialUrl: string,
  caps: FetchCaps = {},
): Promise<FetchedHtml | null> {
  const maxBytes = caps.maxBytes ?? DEFAULT_MAX_BYTES;
  const timeoutMs = caps.timeoutMs ?? DEFAULT_TIMEOUT_MS;
  const maxRedirects = caps.maxRedirects ?? DEFAULT_MAX_REDIRECTS;
  const userAgent = caps.userAgent ?? DEFAULT_USER_AGENT;

  const ctrl = new AbortController();
  const timer = setTimeout(() => ctrl.abort(), timeoutMs);

  let current = initialUrl;
  try {
    for (let hop = 0; hop <= maxRedirects; hop++) {
      const u = new URL(current);
      if (u.protocol !== 'http:' && u.protocol !== 'https:') return null;
      await assertPublicHostname(u.hostname);

      const res = await fetch(current, {
        redirect: 'manual',
        signal: ctrl.signal,
        headers: { 'User-Agent': userAgent },
      });

      if (res.status >= 300 && res.status < 400) {
        const next = res.headers.get('location');
        if (!next) return null;
        current = new URL(next, current).toString();
        continue;
      }

      if (!res.ok) return null;
      const ct = res.headers.get('content-type') ?? '';
      if (!ct.toLowerCase().includes('text/html')) return null;

      const reader = res.body?.getReader();
      if (!reader) return null;
      let received = 0;
      const chunks: Uint8Array[] = [];
      while (true) {
        const { done, value } = await reader.read();
        if (done) break;
        received += value.byteLength;
        if (received > maxBytes) {
          try {
            await reader.cancel();
          } catch {
            // ignore
          }
          return null;
        }
        chunks.push(value);
      }
      const html = new TextDecoder().decode(Buffer.concat(chunks));
      return { html, finalUrl: current };
    }
    return null;
  } catch {
    // Any failure — a blocked hop (assertPublicHostname throw), a DNS error, a
    // network error, a timeout AbortError, or a malformed redirect Location —
    // resolves to null. The fetcher's contract is "a usable HTML doc or null";
    // callers (link-preview cache, audit crawl) treat null as "unfetchable".
    // (The exported assertPublicHostname still throws when called directly.)
    return null;
  } finally {
    clearTimeout(timer);
  }
}
