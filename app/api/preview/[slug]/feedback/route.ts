import { NextRequest, NextResponse } from 'next/server';
import { createAdminClient } from '@/lib/supabase/server';
import { tryConsume } from '@/lib/community/rate-limit';
import { cookieNameFor, verifyGate } from '@/lib/previews/gate';
import {
  parseFeedbackInput,
  feedbackImagePaths,
  FEEDBACK_LIMITS,
  PREVIEW_FEEDBACK_IMAGE_BUCKET,
} from '@/lib/previews/feedback';
import { readBodyCappedBytes } from '@/lib/previews/read-body';
import { parseMultipart } from '@/lib/previews/multipart';
import { processScreenshot } from '@/lib/previews/image-process';
import { isSameOriginRequest } from '@/lib/http/same-origin';

// Reviewer feedback for a gated client preview. The widget injected into the
// served HTML POSTs here with the gate cookie (path /api/preview/<slug>, so the
// browser sends it to this sibling of the catch-all). Lives under /api so the
// middleware matcher skips it. nodejs runtime for the node:crypto in gate.ts
// and sharp.
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

type BodyKind = 'json' | 'multipart';

// Media type only: parameters (charset, boundary) are ignored, case-insensitive.
function bodyKindOf(value: string | null): BodyKind | null {
  if (!value) return null;
  const media = value.split(';')[0].trim().toLowerCase();
  if (media === 'application/json') return 'json';
  if (media === 'multipart/form-data') return 'multipart';
  return null;
}

type Admin = ReturnType<typeof createAdminClient>;

type StoredNote = {
  preview_id: string;
  page: string;
  reviewer_name: string;
  kind: string;
  message: string;
  image_path: string | null;
};

/** What the incoming request would store: the parsed (trimmed) note plus image presence. */
type IncomingNote = { previewId: string; page: string; name: string; kind: string; message: string; hasImage: boolean };

// absent: no row with this id. same: the stored row IS this note (a retry whose
// response was lost) -> 201. conflict: the id is taken by another preview or by
// a DIFFERENT note (duplicated tab, or the note was edited after an ambiguous
// failure) -> 409, so the widget rotates its id and resends instead of being
// told a note it never stored was sent. error: lookup failed.
type Owner = { state: 'absent' } | { state: 'same' } | { state: 'conflict' } | { state: 'error' };

function sameNote(r: StoredNote, n: IncomingNote): boolean {
  return (
    r.preview_id === n.previewId &&
    r.page === n.page &&
    r.reviewer_name === n.name &&
    r.kind === n.kind &&
    r.message === n.message &&
    (r.image_path !== null) === n.hasImage
  );
}

// Classifies the row (if any) with this id against the incoming note. Never throws.
async function lookupOwner(admin: Admin, id: string, note: IncomingNote): Promise<Owner> {
  try {
    const { data, error } = await admin
      .from('preview_feedback')
      .select('preview_id, page, reviewer_name, kind, message, image_path')
      .eq('id', id)
      .maybeSingle<StoredNote>();
    if (error) return { state: 'error' };
    if (!data) return { state: 'absent' };
    return sameNote(data, note) ? { state: 'same' } : { state: 'conflict' };
  } catch {
    return { state: 'error' };
  }
}

// R5: objects are removed only after a PERMANENT insert error: SQLSTATE class
// 22 (data), 23 (integrity; 23505 is the replay path), 42 (syntax/access) or 0A,
// or a PostgREST request error PGRST1xx/2xx. WHY: a permanent error recurs for a
// concurrent retry with the same payload, so that retry cannot commit a row
// pointing at the objects we remove. Transient errors (57014 statement timeout,
// 40001/40P01, 53xxx, 08xxx, PGRST000-003), thrown errors and empty/other codes
// may succeed for a racing retry, so the objects are kept (reconciliation).
function isPermanentError(code: string): boolean {
  return /^(22|23|42|0A)[0-9A-Z]{3}$/.test(code) || /^PGRST[12]\d\d$/.test(code);
}

// Best effort: a failed removal is logged per path and the request still ends in 500.
async function removeObjects(admin: Admin, paths: string[]): Promise<void> {
  let failed = false;
  try {
    const { error } = await admin.storage.from(PREVIEW_FEEDBACK_IMAGE_BUCKET).remove(paths);
    failed = Boolean(error);
  } catch {
    failed = true;
  }
  if (failed) {
    for (const p of paths) console.error(`[preview-feedback] cleanup_failed ${p}`);
  }
}

async function uploadJpeg(admin: Admin, path: string, buf: Buffer): Promise<boolean> {
  try {
    const { error } = await admin.storage
      .from(PREVIEW_FEEDBACK_IMAGE_BUCKET)
      .upload(path, buf, { contentType: 'image/jpeg', upsert: true });
    return !error;
  } catch {
    return false;
  }
}

export async function POST(request: NextRequest, ctx: RouteContext): Promise<Response> {
  const { slug } = await ctx.params;

  // 1. slug shape
  if (!SLUG_RE.test(slug)) return fail(404, 'Not found');

  // 2. Supabase env (createAdminClient throws a raw 500 without it)
  if (!hasSupabaseEnv()) return fail(503, 'Feedback unavailable');

  // 3. CSRF belt: Origin vs the Host header (Sec-Fetch-Site when Origin is
  // absent). Host, not nextUrl.host — under next dev the latter is the bind host.
  if (!isSameOriginRequest(request)) return fail(403, 'Forbidden');

  // 4. JSON or multipart only
  const contentType = request.headers.get('content-type') ?? '';
  const bodyKind = bodyKindOf(contentType);
  if (!bodyKind) return fail(415, 'Content-Type must be application/json or multipart/form-data');
  const bodyCap = bodyKind === 'multipart' ? FEEDBACK_LIMITS.multipartBodyBytes : FEEDBACK_LIMITS.bodyBytes;

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
    if (Number.isFinite(n) && n > bodyCap) return fail(413, 'Request too large');
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

  // 11. only now buffer the body, with a running byte cap for its type
  const read = await readBodyCappedBytes(request.body, bodyCap);
  if (!read.ok) {
    return read.reason === 'too_large' ? fail(413, 'Request too large') : fail(400, 'Could not read request body');
  }

  // 12. parse + validate. Multipart carries the JSON note in `payload` plus an
  // optional `image`.
  let payloadText: string;
  let imageBytes: Uint8Array | null = null;
  if (bodyKind === 'multipart') {
    const mp = await parseMultipart(read.bytes, contentType);
    if (!mp.ok) return fail(400, mp.error);
    payloadText = mp.payload;
    imageBytes = mp.image ? mp.image.bytes : null;
  } else {
    payloadText = new TextDecoder('utf-8').decode(read.bytes);
  }
  let raw: unknown;
  try {
    raw = JSON.parse(payloadText);
  } catch {
    return fail(400, 'Invalid JSON');
  }
  const parsed = parseFeedbackInput(raw);
  if (!parsed.ok) return fail(400, parsed.error);
  const submissionId = parsed.value.submissionId;
  if (bodyKind === 'multipart' && !submissionId) return fail(400, 'submissionId is required');
  const incoming: IncomingNote = {
    previewId: row.id,
    page: parsed.value.page,
    name: parsed.value.name,
    kind: parsed.value.kind,
    message: parsed.value.message,
    hasImage: imageBytes !== null,
  };

  // 13. post-auth throttles (valid-cookie holders only; an image note is one
  // note). Before decoding so a throttled client cannot spend sharp CPU.
  if (!tryConsume(`preview-fb:${slug}:${ip}`, IP_LIMIT, IP_WINDOW_S * 1000)) {
    return tooMany(IP_WINDOW_S);
  }
  if (!tryConsume(`preview-fb:slug:${slug}`, SLUG_LIMIT, SLUG_WINDOW_S * 1000)) {
    return tooMany(SLUG_WINDOW_S);
  }

  // 14r. replay check, BEFORE decoding (it needs only image presence, not the
  // bytes): a retry of an already-stored identical note is a success and never
  // re-uploads or decodes; an id held by another preview or by a different note
  // is a conflict, and nothing is written.
  if (submissionId) {
    const owner = await lookupOwner(admin, submissionId, incoming);
    if (owner.state === 'error') return fail(500, 'Could not save feedback');
    if (owner.state === 'same') return json(201, { ok: true });
    if (owner.state === 'conflict') return fail(409, 'Conflict');
  }

  // 12i. the screenshot is decoded and re-encoded before anything is stored
  let processed: { full: Buffer; thumb: Buffer } | null = null;
  if (imageBytes) {
    const result = await processScreenshot(imageBytes);
    if (!result.ok) return fail(400, result.error);
    processed = { full: result.full, thumb: result.thumb };
  }

  // 14u. upload full, then thumb (upsert: a retry overwrites the same paths)
  let paths: { full: string; thumb: string } | null = null;
  if (processed && submissionId) {
    paths = feedbackImagePaths(row.id, submissionId);
    const fullOk = await uploadJpeg(admin, paths.full, processed.full);
    const thumbOk = fullOk && (await uploadJpeg(admin, paths.thumb, processed.thumb));
    if (!thumbOk) return fail(500, 'Could not save feedback');
  }

  // 14i. insert via service role (id = submissionId when the client sent one)
  const userAgent = request.headers.get('user-agent');
  const record: {
    id?: string;
    preview_id: string;
    page: string;
    reviewer_name: string;
    kind: string;
    message: string;
    viewport_w: number | null;
    viewport_h: number | null;
    user_agent: string | null;
    image_path?: string;
  } = {
    ...(submissionId ? { id: submissionId } : {}),
    preview_id: row.id,
    page: parsed.value.page,
    reviewer_name: parsed.value.name,
    kind: parsed.value.kind,
    message: parsed.value.message,
    viewport_w: parsed.value.viewportW,
    viewport_h: parsed.value.viewportH,
    user_agent: userAgent ? userAgent.slice(0, FEEDBACK_LIMITS.userAgent) : null,
    ...(paths ? { image_path: paths.full } : {}),
  };

  let insertCode: string | null = null;
  try {
    const result = await admin.from('preview_feedback').insert(record);
    if (result.error) insertCode = typeof result.error.code === 'string' ? result.error.code : '';
  } catch {
    // Thrown = ambiguous (the row may have committed): 500, objects kept for reconciliation.
    return fail(500, 'Could not save feedback');
  }

  // No-delete invariant: objects live at <preview_id>/<submissionId>.jpg, so the
  // only row that can reference them is the one whose id is this submissionId.
  // We therefore remove them ONLY when the re-check confirms that row ABSENT.
  // Whenever a row with this id exists - the same note (201) or a different one
  // (409, e.g. a concurrent request from a duplicated tab won the race) - the
  // objects are kept: if that row has an image, these are exactly the objects
  // it points at; if it has none, they are orphans that reconcile removes
  // (it counts an object live only when a row's image_path names it).
  // Residual (M2, deferred): a concurrent same-id request carrying DIFFERENT
  // content could commit after our confirmed-absent re-check; R5 limits removal
  // to permanent errors, which zod's mirror of the DB checks makes practically
  // unreachable.
  if (insertCode !== null) {
    if (submissionId && insertCode === '23505') {
      // Unique violation: the row exists. The same note (a concurrent retry) ->
      // success; a different note -> conflict. Objects stay either way.
      const owner = await lookupOwner(admin, submissionId, incoming);
      if (owner.state === 'same') return json(201, { ok: true });
      if (owner.state === 'conflict') return fail(409, 'Conflict');
      return fail(500, 'Could not save feedback');
    }
    if (paths && submissionId && isPermanentError(insertCode)) {
      // Remove objects only when the row is CONFIRMED absent. If the re-check
      // finds this note, it did commit: report success. A different note is a
      // conflict. A re-check error, or any existing row, keeps the objects.
      const owner = await lookupOwner(admin, submissionId, incoming);
      if (owner.state === 'absent') await removeObjects(admin, [paths.full, paths.thumb]);
      else if (owner.state === 'same') return json(201, { ok: true });
      else if (owner.state === 'conflict') return fail(409, 'Conflict');
    }
    return fail(500, 'Could not save feedback');
  }

  // 15.
  return json(201, { ok: true });
}
