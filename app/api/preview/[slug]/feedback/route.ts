import { NextRequest, NextResponse } from 'next/server';
import { createAdminClient } from '@/lib/supabase/server';
import { tryConsume } from '@/lib/community/rate-limit';
import { cookieNameFor, verifyGate } from '@/lib/previews/gate';
import { parseFeedbackInput, FEEDBACK_LIMITS } from '@/lib/previews/feedback';
import { readBodyCapped } from '@/lib/previews/read-body';

// Reviewer feedback for a gated client preview. The widget injected into the
// served HTML POSTs here with the gate cookie (path /api/preview/<slug>, so the
// browser sends it to this sibling of the catch-all). Lives under /api so the
// middleware matcher skips it. nodejs runtime for the node:crypto in gate.ts.
export const runtime = 'nodejs';

const SLUG_RE = /^[a-z0-9-]{8,80}$/;
const NOINDEX = 'noindex, nofollow';

const PRE_AUTH_LIMIT = 60;
const PRE_AUTH_WINDOW_S = 600;
const IP_LIMIT = 20;
const IP_WINDOW_S = 600;
const SLUG_LIMIT = 100;
const SLUG_WINDOW_S = 3600;

type RouteContext = { params: Promise<{ slug: string }> };

type FeedbackPreviewRow = {
  id: string;
  mode: 'public' | 'gated';
  password: string | null;
  expires_at: string | null;
  feedback_enabled: boolean;
};

function json(status: number, body: Record<string, unknown>, extra: Record<string, string> = {}): NextResponse {
  return new NextResponse(JSON.stringify(body), {
    status,
    headers: {
      'Content-Type': 'application/json',
      'Cache-Control': 'private, no-store',
      'X-Robots-Tag': NOINDEX,
      ...extra,
    },
  });
}

function fail(status: number, error: string, extra?: Record<string, string>): NextResponse {
  return json(status, { error }, extra);
}

function tooMany(retryAfterSeconds: number): NextResponse {
  return fail(429, 'Too many requests', { 'Retry-After': String(retryAfterSeconds) });
}

function hasSupabaseEnv(): boolean {
  return Boolean(process.env.NEXT_PUBLIC_SUPABASE_URL && process.env.SUPABASE_SERVICE_ROLE_KEY);
}

// x-forwarded-for is client-controllable (same caveat as the gate route); the
// per-slug backstops bound total volume regardless of the claimed source.
function clientIp(request: NextRequest): string {
  return (request.headers.get('x-forwarded-for') ?? 'unknown').split(',')[0].trim() || 'unknown';
}

/** True only for a parseable Origin whose host equals the request host. */
function originAllowed(request: NextRequest): boolean {
  const origin = request.headers.get('origin');
  if (origin === null) return true; // non-browser / same-origin GET-style callers send none
  try {
    return new URL(origin).host === request.nextUrl.host;
  } catch {
    return false;
  }
}

function isJsonContentType(value: string | null): boolean {
  if (!value) return false;
  return value.split(';')[0].trim().toLowerCase() === 'application/json';
}

export async function POST(request: NextRequest, ctx: RouteContext): Promise<Response> {
  const { slug } = await ctx.params;

  // 1. slug shape
  if (!SLUG_RE.test(slug)) return fail(404, 'Not found');

  // 2. Supabase env (createAdminClient throws a raw 500 without it)
  if (!hasSupabaseEnv()) return fail(503, 'Feedback unavailable');

  // 3. CSRF belt: a browser always sends Origin on a cross-origin POST.
  if (!originAllowed(request)) return fail(403, 'Forbidden');

  // 4. JSON only
  if (!isJsonContentType(request.headers.get('content-type'))) {
    return fail(415, 'Content-Type must be application/json');
  }

  // 5. pre-auth per-IP throttle: bounds DB reads from anonymous traffic. Bad
  // cookies burn only this bucket, never the reviewer's post-auth allowance.
  const ip = clientIp(request);
  if (!tryConsume(`preview-fb-pre:${ip}`, PRE_AUTH_LIMIT, PRE_AUTH_WINDOW_S * 1000)) {
    return tooMany(PRE_AUTH_WINDOW_S);
  }

  // 6. early reject on a declared length (step 11 is what actually enforces it)
  const declared = request.headers.get('content-length');
  if (declared !== null) {
    const n = Number(declared);
    if (Number.isFinite(n) && n > FEEDBACK_LIMITS.bodyBytes) return fail(413, 'Request too large');
  }

  // 7. row
  const admin = createAdminClient();
  const { data: row, error: rowError } = await admin
    .from('client_previews')
    .select('id, mode, password, expires_at, feedback_enabled')
    .eq('slug', slug)
    .maybeSingle<FeedbackPreviewRow>();
  if (rowError || !row || row.mode !== 'gated' || !row.feedback_enabled) {
    return fail(404, 'Not found');
  }

  // 8. expiry
  if (row.expires_at && new Date(row.expires_at).getTime() < Date.now()) {
    return fail(410, 'Preview expired');
  }

  // 9. secret
  if (!process.env.PREVIEW_GATE_SECRET) return fail(503, 'Feedback unavailable');

  // 10. gate cookie
  const cookie = request.cookies.get(cookieNameFor(slug))?.value;
  if (!cookie || !verifyGate(slug, row.password, cookie)) return fail(401, 'Unauthorized');

  // 11. only now buffer the body, with a running byte cap
  const read = await readBodyCapped(request.body, FEEDBACK_LIMITS.bodyBytes);
  if (!read.ok) {
    return read.reason === 'too_large' ? fail(413, 'Request too large') : fail(400, 'Could not read request body');
  }

  // 12. parse + validate
  let raw: unknown;
  try {
    raw = JSON.parse(read.text);
  } catch {
    return fail(400, 'Invalid JSON');
  }
  const parsed = parseFeedbackInput(raw);
  if (!parsed.ok) return fail(400, parsed.error);

  // 13. post-auth throttles (valid-cookie holders only)
  if (!tryConsume(`preview-fb:${slug}:${ip}`, IP_LIMIT, IP_WINDOW_S * 1000)) {
    return tooMany(IP_WINDOW_S);
  }
  if (!tryConsume(`preview-fb:slug:${slug}`, SLUG_LIMIT, SLUG_WINDOW_S * 1000)) {
    return tooMany(SLUG_WINDOW_S);
  }

  // 14. insert via service role
  const userAgent = request.headers.get('user-agent');
  const { error: insertError } = await admin.from('preview_feedback').insert({
    preview_id: row.id,
    page: parsed.value.page,
    reviewer_name: parsed.value.name,
    kind: parsed.value.kind,
    message: parsed.value.message,
    viewport_w: parsed.value.viewportW,
    viewport_h: parsed.value.viewportH,
    user_agent: userAgent ? userAgent.slice(0, FEEDBACK_LIMITS.userAgent) : null,
  });
  if (insertError) return fail(500, 'Could not save feedback');

  // 15.
  return json(201, { ok: true });
}
