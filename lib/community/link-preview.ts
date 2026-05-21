import crypto from 'node:crypto';
import dns from 'node:dns/promises';
import * as net from 'node:net';
import * as cheerio from 'cheerio';
import { createAdminClient } from '@/lib/supabase/server';
import type { LinkPreview } from './types';

const TIMEOUT_MS = 5_000;
const MAX_BYTES = 2 * 1024 * 1024;
const CACHE_TTL_MS = 7 * 24 * 60 * 60 * 1000;
const MAX_REDIRECTS = 3;

function isPrivateIpv4(ip: string): boolean {
  const parts = ip.split('.').map(Number);
  if (parts.length !== 4 || parts.some((n) => Number.isNaN(n))) return true;
  const [a, b] = parts;
  if (a === 0) return true;
  if (a === 10) return true;
  if (a === 127) return true;
  if (a === 169 && b === 254) return true;
  if (a === 172 && b >= 16 && b <= 31) return true;
  if (a === 192 && b === 168) return true;
  if (a >= 224) return true; // multicast + reserved
  return false;
}

function isPrivateIp(ip: string): boolean {
  if (net.isIPv4(ip)) return isPrivateIpv4(ip);
  if (net.isIPv6(ip)) {
    const lower = ip.toLowerCase();
    if (lower === '::1' || lower === '::') return true;
    if (lower.startsWith('fc') || lower.startsWith('fd')) return true;
    if (lower.startsWith('fe80')) return true;
    if (lower.startsWith('::ffff:')) return isPrivateIpv4(lower.slice(7));
    return false;
  }
  return true;
}

async function assertPublicHostname(hostname: string): Promise<void> {
  if (net.isIP(hostname)) {
    if (isPrivateIp(hostname)) throw new Error('private_ip');
    return;
  }
  const records = await dns.lookup(hostname, { all: true });
  if (records.length === 0) throw new Error('no_dns');
  for (const r of records) {
    if (isPrivateIp(r.address)) throw new Error('private_ip');
  }
}

async function fetchHtmlWithCaps(
  initialUrl: string,
): Promise<{ html: string; finalUrl: string } | null> {
  const ctrl = new AbortController();
  const timer = setTimeout(() => ctrl.abort(), TIMEOUT_MS);

  let current = initialUrl;
  try {
    for (let hop = 0; hop <= MAX_REDIRECTS; hop++) {
      const u = new URL(current);
      if (u.protocol !== 'http:' && u.protocol !== 'https:') return null;
      await assertPublicHostname(u.hostname);

      const res = await fetch(current, {
        redirect: 'manual',
        signal: ctrl.signal,
        headers: { 'User-Agent': 'HonuVibeBot/1.0 (+https://honuvibe.ai)' },
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
        if (received > MAX_BYTES) {
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
  } finally {
    clearTimeout(timer);
  }
}

function parseOg(html: string, finalUrl: string): LinkPreview {
  const $ = cheerio.load(html);
  const metaAttr = (selector: string) =>
    $(`meta[${selector}]`).attr('content')?.trim() || null;

  const title =
    metaAttr('property="og:title"') || $('title').first().text().trim() || null;
  const description =
    metaAttr('property="og:description"') || metaAttr('name="description"') || null;

  let image: string | null = metaAttr('property="og:image"');
  if (image) {
    try {
      const abs = new URL(image, finalUrl);
      image = abs.protocol === 'https:' ? abs.toString() : null;
    } catch {
      image = null;
    }
  }

  const site =
    metaAttr('property="og:site_name"') || new URL(finalUrl).hostname || null;

  return { url: finalUrl, title, description, image, site };
}

export async function fetchLinkPreview(rawUrl: string): Promise<LinkPreview | null> {
  let url: URL;
  try {
    url = new URL(rawUrl);
  } catch {
    return null;
  }
  if (url.protocol !== 'http:' && url.protocol !== 'https:') return null;

  const hash = crypto.createHash('sha256').update(url.toString()).digest('hex');
  const admin = createAdminClient();

  const { data: cached } = await admin
    .from('link_previews')
    .select('preview, fetched_at')
    .eq('url_hash', hash)
    .maybeSingle();

  if (cached) {
    const age = Date.now() - new Date(cached.fetched_at as string).getTime();
    if (age < CACHE_TTL_MS) {
      const p = cached.preview as Record<string, unknown>;
      if ('error' in p) return null;
      return p as unknown as LinkPreview;
    }
  }

  try {
    const fetched = await fetchHtmlWithCaps(url.toString());
    if (!fetched) {
      await admin.from('link_previews').upsert({
        url_hash: hash,
        url: url.toString(),
        preview: { error: 'fetch_failed' },
        fetched_at: new Date().toISOString(),
      });
      return null;
    }
    const preview = parseOg(fetched.html, fetched.finalUrl);
    await admin.from('link_previews').upsert({
      url_hash: hash,
      url: url.toString(),
      preview: preview as unknown as Record<string, unknown>,
      fetched_at: new Date().toISOString(),
    });
    return preview;
  } catch {
    await admin.from('link_previews').upsert({
      url_hash: hash,
      url: url.toString(),
      preview: { error: 'exception' },
      fetched_at: new Date().toISOString(),
    });
    return null;
  }
}
