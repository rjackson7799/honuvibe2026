// GET /api/engagement/enter/[token] — the magic-link entry. Looks the token up
// by sha256, timing-safe compares, sets the questionnaire-scoped httpOnly
// cookie, records the open (touch_engagement_questionnaire_open: counters,
// sent -> in_progress, one questionnaire_opened event), and 303s to the
// locale-correct UUID-only page — so the secret never lands in history,
// analytics or a Referer. 410 for a valid-but-expired token, 403 for
// everything else (unknown, revoked, malformed — deliberately not
// distinguished). Node runtime, never cached.
//
// Rate limit: 20 / 15 min per IP. lib/community/rate-limit.ts is an
// in-memory bucket per function instance — the real defense is the 256-bit
// token; this only blunts a scripted enumeration on one instance. The IP is
// used as a transient bucket key only and is never stored or logged.

import { NextResponse, type NextRequest } from 'next/server';
import { createAdminClient } from '@/lib/supabase/server';
import { tryConsume } from '@/lib/community/rate-limit';
import { TOKEN_RE, discoveryPath, hashToken } from '@/lib/studio/engagement/questionnaire-token';
import { cookieNameFor, evaluateSession, sessionCookieOptions } from '@/lib/studio/engagement/session';
import type { EngagementQuestionnaire } from '@/lib/admin/types';

export const runtime = 'nodejs';
export const dynamic = 'force-dynamic';

const ENTER_LIMIT = 20;
const ENTER_WINDOW_MS = 15 * 60_000;

const NO_STORE_HEADERS = {
  'Cache-Control': 'no-store, max-age=0',
  'Referrer-Policy': 'no-referrer',
  'X-Robots-Tag': 'noindex, nofollow',
};

function escapeHtml(value: string): string {
  return value.replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;').replace(/"/g, '&quot;').replace(/'/g, '&#39;');
}

/** A tiny self-contained message page (browser navigation, not an API caller). */
function messagePage(status: number, lang: 'en' | 'ja', title: string, body: string): NextResponse {
  const html = `<!doctype html>
<html lang="${lang}">
<head>
<meta charset="utf-8">
<meta name="viewport" content="width=device-width, initial-scale=1">
<meta name="robots" content="noindex,nofollow">
<title>${escapeHtml(title)}</title>
<style>
  body{margin:0;min-height:100vh;display:flex;align-items:center;justify-content:center;padding:24px;background:#f0ebe3;color:#1a2b33;font-family:${lang === 'ja' ? "'Noto Sans JP','Hiragino Sans','Yu Gothic',sans-serif" : "'DM Sans',-apple-system,Segoe UI,Helvetica,Arial,sans-serif"};line-height:${lang === 'ja' ? '1.75' : '1.6'};${lang === 'ja' ? 'letter-spacing:0.03em;' : ''}}
  main{max-width:420px;background:#fff;border:1px solid rgba(26,43,51,.07);border-radius:16px;padding:32px 28px;box-shadow:0 8px 28px rgba(26,43,51,.07)}
  h1{margin:0 0 10px;font-size:20px;font-weight:700}p{margin:0;color:#5a6b73;font-size:15px}
</style>
</head>
<body><main><h1>${escapeHtml(title)}</h1><p>${escapeHtml(body)}</p></main></body></html>`;
  return new NextResponse(html, {
    status,
    headers: { ...NO_STORE_HEADERS, 'Content-Type': 'text/html; charset=utf-8' },
  });
}

const COPY = {
  en: {
    forbiddenTitle: 'This link cannot be opened',
    forbiddenBody: 'This questionnaire link is not valid. Open the newest link from your email, or reply to it and Ryan will send a fresh one.',
    expiredTitle: 'This link has expired',
    expiredBody: 'Reply to the email you received and Ryan will send you a new link.',
    tooManyTitle: 'Too many attempts',
    tooManyBody: 'Please wait a few minutes and open the link from your email again.',
  },
  ja: {
    forbiddenTitle: 'このリンクは開けません',
    forbiddenBody: 'このアンケートのリンクは無効です。メールに届いた最新のリンクを開くか、メールに返信していただければ新しいリンクをお送りします。',
    expiredTitle: 'このリンクは期限切れです',
    expiredBody: '届いたメールに返信していただければ、新しいリンクをお送りします。',
    tooManyTitle: '試行回数が多すぎます',
    tooManyBody: '数分待ってから、メールのリンクをもう一度開いてください。',
  },
} as const;

function clientIp(request: NextRequest): string {
  return request.headers.get('x-forwarded-for')?.split(',')[0]?.trim() || request.headers.get('x-real-ip') || 'unknown';
}

export async function GET(request: NextRequest, { params }: { params: Promise<{ token: string }> }) {
  // The locale is unknown until the row is found; a bad token gets the EN
  // page with a JA line appended below (see forbiddenBody rendering).
  if (!tryConsume(`engq-enter:${clientIp(request)}`, ENTER_LIMIT, ENTER_WINDOW_MS)) {
    return messagePage(429, 'en', COPY.en.tooManyTitle, `${COPY.en.tooManyBody} / ${COPY.ja.tooManyBody}`);
  }

  const { token } = await params;
  if (!TOKEN_RE.test(token)) {
    return messagePage(403, 'en', COPY.en.forbiddenTitle, `${COPY.en.forbiddenBody} / ${COPY.ja.forbiddenBody}`);
  }

  if (!process.env.NEXT_PUBLIC_SUPABASE_URL || !process.env.SUPABASE_SERVICE_ROLE_KEY) {
    return messagePage(503, 'en', 'Temporarily unavailable', 'Please try the link again in a few minutes.');
  }

  const admin = createAdminClient();
  const { data, error } = await admin
    .from('engagement_questionnaires')
    .select('*')
    .eq('access_token_hash', hashToken(token))
    .maybeSingle();
  if (error) {
    console.error('[engagement/enter] lookup failed:', error.message);
    return messagePage(503, 'en', 'Temporarily unavailable', 'Please try the link again in a few minutes.');
  }
  const row = (data ?? null) as EngagementQuestionnaire | null;
  if (!row) {
    return messagePage(403, 'en', COPY.en.forbiddenTitle, `${COPY.en.forbiddenBody} / ${COPY.ja.forbiddenBody}`);
  }

  const lang = row.locale === 'ja' ? 'ja' : 'en';
  const verdict = evaluateSession(row, token);
  if (!verdict.ok) {
    return verdict.status === 410
      ? messagePage(410, lang, COPY[lang].expiredTitle, COPY[lang].expiredBody)
      : messagePage(403, lang, COPY[lang].forbiddenTitle, COPY[lang].forbiddenBody);
  }
  // A token can only exist on a sent/in_progress/submitted row; anything else
  // (a start-over that raced the email) is not openable.
  if (row.status === 'draft' || row.status === 'ready') {
    return messagePage(403, lang, COPY[lang].forbiddenTitle, COPY[lang].forbiddenBody);
  }

  const { error: touchErr } = await admin.rpc('touch_engagement_questionnaire_open', { p_questionnaire_id: row.id });
  if (touchErr) console.error('[engagement/enter] touch failed:', touchErr.message); // counters only — never block entry

  const dest = new URL(discoveryPath(row.locale, row.id), request.nextUrl.origin);
  const res = NextResponse.redirect(dest, 303);
  res.cookies.set(cookieNameFor(row.id), token, sessionCookieOptions(row.token_expires_at!));
  // Locale: the redirect target carries the questionnaire's locale prefix. No
  // NEXT_LOCALE pin — it would overwrite the visitor's site-wide language
  // preference for a year. If next-intl's detection routes an EN
  // questionnaire under /ja, the page renders it in place with its own lang.
  for (const [k, v] of Object.entries(NO_STORE_HEADERS)) res.headers.set(k, v);
  return res;
}
