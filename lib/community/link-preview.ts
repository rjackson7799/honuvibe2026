import crypto from 'node:crypto';
import * as cheerio from 'cheerio';
import { createAdminClient } from '@/lib/supabase/server';
import { fetchHtmlWithCaps } from '@/lib/http/safe-fetch';
import type { LinkPreview } from './types';

const CACHE_TTL_MS = 7 * 24 * 60 * 60 * 1000;

// The SSRF-guarded fetch + capped streaming reader now live in
// lib/http/safe-fetch.ts (shared with the Studio audit crawler). Calling
// fetchHtmlWithCaps() with no caps reproduces the exact behavior this module
// used before the extraction — 2 MB / 5 s / 3 redirects — except the IP
// classifier is now the strictly-stricter ipaddr.js range check.

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
