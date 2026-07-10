import { NextRequest, NextResponse } from 'next/server';
import type { SupabaseClient } from '@supabase/supabase-js';
import { createAdminClient } from '@/lib/supabase/server';
import { tryConsume } from '@/lib/community/rate-limit';
import {
  cookieNameFor,
  verifyGate,
  passwordMatches,
  signGate,
  contentTypeFor,
  renderPasswordPage,
  renderMessagePage,
  htmlPageHeaders,
} from '@/lib/previews/gate';

// Anonymous, service-role, streaming gate for password-protected client
// previews. It lives under /api so the middleware matcher (middleware.ts:254,
// `(?!api|...)`) skips it entirely — anonymous clients reach it without the
// next-intl/auth pipeline. nodejs runtime guards the node:crypto dependency in
// lib/previews/gate.ts against an accidental edge conversion (house precedent:
// the PDF routes).
export const runtime = 'nodejs';

const BUCKET = 'client-previews';
const SLUG_RE = /^[a-z0-9-]{8,80}$/;
const NOINDEX = 'noindex, nofollow';
const COOKIE_MAX_AGE = 30 * 24 * 60 * 60; // 30 days

type RouteContext = { params: Promise<{ slug: string; path?: string[] }> };

type PreviewRow = {
  slug: string;
  title: string | null;
  mode: 'public' | 'gated';
  password: string | null;
  storage_prefix: string;
  entry_file: string;
  expires_at: string | null;
};

function hasSupabaseEnv(): boolean {
  return Boolean(process.env.NEXT_PUBLIC_SUPABASE_URL && process.env.SUPABASE_SERVICE_ROLE_KEY);
}

// createAdminClient() uses non-null assertions and throws a raw 500 if the env
// is missing — return a clean 503 before ever calling it.
function unavailableResponse(): NextResponse {
  return new NextResponse(JSON.stringify({ error: 'Preview gate unavailable' }), {
    status: 503,
    headers: {
      'Content-Type': 'application/json',
      'Cache-Control': 'private, no-store',
      'X-Robots-Tag': NOINDEX,
    },
  });
}

function messageResponse(status: number, title: string, message: string): NextResponse {
  return new NextResponse(renderMessagePage(title, message), {
    status,
    headers: htmlPageHeaders(),
  });
}

function passwordResponse(
  status: number,
  slug: string,
  title: string | null,
  error?: string,
): NextResponse {
  return new NextResponse(renderPasswordPage({ slug, title, error }), {
    status,
    headers: htmlPageHeaders(),
  });
}

function entryRedirect(request: NextRequest, slug: string, entryFile: string): NextResponse {
  // slug (SLUG_RE) and entry_file (basename CHECK in migration 057) are both
  // URL-safe, so no per-segment encoding is needed.
  const res = NextResponse.redirect(new URL(`/api/preview/${slug}/${entryFile}`, request.url), 303);
  res.headers.set('Cache-Control', 'private, no-store');
  res.headers.set('X-Robots-Tag', NOINDEX);
  return res;
}

type LoadResult =
  | { kind: 'terminal'; response: NextResponse }
  | { kind: 'ok'; admin: SupabaseClient; row: PreviewRow };

// Shared prefix for every verb: validate the slug, guard the Supabase env, load
// the row, and reject an expired preview. The secret check is deliberately NOT
// here — public rows must serve without PREVIEW_GATE_SECRET.
async function loadContext(slug: string): Promise<LoadResult> {
  if (!SLUG_RE.test(slug)) {
    return { kind: 'terminal', response: messageResponse(404, 'Not found', 'This preview does not exist.') };
  }
  if (!hasSupabaseEnv()) {
    return { kind: 'terminal', response: unavailableResponse() };
  }
  const admin = createAdminClient();
  const { data, error } = await admin
    .from('client_previews')
    .select('slug, title, mode, password, storage_prefix, entry_file, expires_at')
    .eq('slug', slug)
    .maybeSingle<PreviewRow>();
  if (error || !data) {
    return { kind: 'terminal', response: messageResponse(404, 'Not found', 'This preview does not exist.') };
  }
  if (data.expires_at && new Date(data.expires_at).getTime() < Date.now()) {
    return { kind: 'terminal', response: messageResponse(410, 'Preview expired', 'This preview has expired.') };
  }
  return { kind: 'ok', admin, row: data };
}

type Resolved =
  | { kind: 'terminal'; response: NextResponse }
  | {
      kind: 'serve';
      admin: SupabaseClient;
      objectPath: string;
      filename: string;
      isEntry: boolean;
    };

// GET/HEAD share this: after loadContext, redirect a bare-slug hit to the entry
// file, guard the path, and enforce the gated cookie. Returns either a terminal
// response or an instruction to stream one object.
async function resolve(request: NextRequest, slug: string, path?: string[]): Promise<Resolved> {
  const ctx = await loadContext(slug);
  if (ctx.kind === 'terminal') return ctx;
  const { admin, row } = ctx;

  const segments = path ?? [];

  // The document must live at a depth-1 URL so the export's *relative* asset
  // references (./style.css, images/hero.jpg) resolve back into this catch-all.
  if (segments.length === 0) {
    return { kind: 'terminal', response: entryRedirect(request, slug, row.entry_file) };
  }

  // Segments arrive percent-decoded from Next, so this also covers %2e%2e / %5c.
  // With every segment non-empty and free of '..', '\', and NUL, segments.join('/')
  // cannot escape storage_prefix — that is the invariant the download relies on.
  for (const seg of segments) {
    if (!seg || seg.includes('..') || seg.includes('\\') || seg.includes('\0')) {
      return {
        kind: 'terminal',
        response: messageResponse(404, 'Not found', 'This file was not found in the preview.'),
      };
    }
  }

  if (row.mode === 'gated') {
    if (!process.env.PREVIEW_GATE_SECRET) {
      return { kind: 'terminal', response: unavailableResponse() };
    }
    const cookie = request.cookies.get(cookieNameFor(slug))?.value;
    if (!cookie || !verifyGate(slug, row.password, cookie)) {
      return { kind: 'terminal', response: passwordResponse(401, slug, row.title) };
    }
  }

  const objectPath = `${row.storage_prefix}/${segments.join('/')}`;
  const filename = segments[segments.length - 1];
  const isEntry = segments.length === 1 && segments[0] === row.entry_file;
  return { kind: 'serve', admin, objectPath, filename, isEntry };
}

export async function GET(request: NextRequest, ctx: RouteContext): Promise<Response> {
  const { slug, path } = await ctx.params;
  const r = await resolve(request, slug, path);
  if (r.kind === 'terminal') return r.response;

  const { data: blob, error } = await r.admin.storage.from(BUCKET).download(r.objectPath);
  if (error || !blob) {
    return messageResponse(404, 'Not found', 'This file was not found in the preview.');
  }

  // Bump only on the entry file, and only after the object actually loaded, so
  // asset requests and 404s never inflate the count. Best-effort: never fail
  // the stream if the RPC errors.
  if (r.isEntry) {
    try {
      await r.admin.rpc('bump_preview_access', { p_slug: slug });
    } catch {
      /* best effort */
    }
  }

  // `private, no-store` on every served object (HTML and assets alike) so a
  // password change / secret rotation revokes access on the next request — no
  // stale cached mockup. Re-download cost is accepted for low-traffic previews.
  return new NextResponse(blob.stream(), {
    status: 200,
    headers: {
      'Content-Type': contentTypeFor(r.filename),
      'Cache-Control': 'private, no-store',
      'X-Robots-Tag': NOINDEX,
    },
  });
}

export async function HEAD(request: NextRequest, ctx: RouteContext): Promise<Response> {
  // Explicit handler: without one Next auto-serves HEAD *through GET*, which
  // would download the blob and falsely bump access_count. Run the same
  // slug/env/row/expiry/path/auth checks, then report headers only — no Storage
  // read, no bump.
  const { slug, path } = await ctx.params;
  const r = await resolve(request, slug, path);
  if (r.kind === 'terminal') {
    return new NextResponse(null, { status: r.response.status, headers: r.response.headers });
  }
  return new NextResponse(null, {
    status: 200,
    headers: {
      'Content-Type': contentTypeFor(r.filename),
      'Cache-Control': 'private, no-store',
      'X-Robots-Tag': NOINDEX,
    },
  });
}

export async function POST(request: NextRequest, ctx: RouteContext): Promise<Response> {
  // Password submit. The form always targets /api/preview/<slug> (no path), but
  // any path is accepted. POST is always a gated flow.
  const { slug } = await ctx.params;
  const base = await loadContext(slug);
  if (base.kind === 'terminal') return base.response;
  const { row } = base;

  if (row.mode !== 'gated') {
    return messageResponse(404, 'Not found', 'This preview does not exist.');
  }
  if (!process.env.PREVIEW_GATE_SECRET) {
    return unavailableResponse();
  }

  // Per-IP throttle (in-memory, per-instance — same convention as the community
  // routes). x-forwarded-for is client-controllable, so a spoofing attacker can
  // rotate it to dodge this bucket; the per-slug backstop bounds total wrong
  // attempts against one preview regardless of source IP.
  const ip = (request.headers.get('x-forwarded-for') ?? 'unknown').split(',')[0].trim() || 'unknown';
  const perIpOk = tryConsume(`preview:${slug}:${ip}`, 10, 60_000);
  const perSlugOk = perIpOk && tryConsume(`preview:slug:${slug}`, 100, 60 * 60_000);
  if (!perIpOk || !perSlugOk) {
    return passwordResponse(429, slug, row.title, 'Too many attempts — try again in a minute.');
  }

  let password: string | null = null;
  try {
    const form = await request.formData();
    const value = form.get('password');
    password = typeof value === 'string' ? value : null;
  } catch {
    password = null;
  }

  // row.password is non-null for gated rows (DB CHECK client_previews_gated_needs_password).
  if (password === null || !passwordMatches(password, row.password ?? '')) {
    return passwordResponse(401, slug, row.title, 'Incorrect password.');
  }

  const res = NextResponse.redirect(new URL(`/api/preview/${slug}/${row.entry_file}`, request.url), 303);
  res.cookies.set(cookieNameFor(slug), signGate(slug, row.password), {
    httpOnly: true,
    secure: process.env.NODE_ENV === 'production',
    sameSite: 'lax',
    path: `/api/preview/${slug}`,
    maxAge: COOKIE_MAX_AGE,
  });
  res.headers.set('Cache-Control', 'private, no-store');
  res.headers.set('X-Robots-Tag', NOINDEX);
  return res;
}
