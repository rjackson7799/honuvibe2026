// GET /api/engagement/proposal/enter/[token] — the proposal magic-link entry
// (app/api/engagement/enter/[token]/route.ts, copied for the proposal
// scope). Looks the token up by sha256, timing-safe compares, sets the
// PROPOSAL-scoped httpOnly cookie (hv_engp_<id>), records the open
// (touch_engagement_proposal_open: counters, one proposal_opened event on
// the first open, NO status flip), and 303s to the locale-correct UUID-only
// page — so the secret never lands in history, analytics or a Referer.
//
// Three refusal states: 410 for a valid-but-expired token; a THIRD state for
// a superseded / withdrawn row — "a newer proposal has replaced this one"
// (403; the row was found by the exact hash, so this tells the holder of
// the OLD link nothing they did not have); 403 for everything else
// (unknown, revoked — incl. a voided row —, malformed; not distinguished).
// A token can only exist on an issued row, so draft|ready never reach here.
//
// Rate limit: 20 / 15 min per IP. lib/community/rate-limit.ts is an
// in-memory bucket per function instance — the real defense is the 256-bit
// token. The IP is a transient bucket key only, never stored or logged.

import { NextResponse, type NextRequest } from 'next/server';
import { createAdminClient } from '@/lib/supabase/server';
import { tryConsume } from '@/lib/community/rate-limit';
import { TOKEN_RE, hashToken, proposalPath } from '@/lib/studio/engagement/proposal-token';
import { evaluateSession, proposalCookieNameFor, sessionCookieOptions } from '@/lib/studio/engagement/proposal-session';
import type { EngagementProposal } from '@/lib/admin/types';

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

// JA copy ships FLAGGED FOR NATIVE REVIEW (see the ship report).
const COPY = {
  en: {
    forbiddenTitle: 'This link cannot be opened',
    forbiddenBody: 'This proposal link is not valid. Open the newest link from your email, or reply to it and Ryan will send a fresh one.',
    expiredTitle: 'This link has expired',
    expiredBody: 'Reply to the email you received and Ryan will send you a fresh link to your proposal.',
    replacedTitle: 'A newer proposal has replaced this one',
    replacedBody: 'Please open the newest link from your email. If you cannot find it, reply to the email and Ryan will send it again.',
    tooManyTitle: 'Too many attempts',
    tooManyBody: 'Please wait a few minutes and open the link from your email again.',
  },
  ja: {
    forbiddenTitle: 'このリンクは開けません',
    forbiddenBody: 'この提案書のリンクは無効です。メールに届いた最新のリンクを開くか、メールに返信していただければ新しいリンクをお送りします。',
    expiredTitle: 'このリンクは期限切れです',
    expiredBody: '届いたメールに返信していただければ、提案書への新しいリンクをお送りします。',
    replacedTitle: '新しい提案書に置き換えられました',
    replacedBody: 'メールに届いた最新のリンクを開いてください。見つからない場合は、メールに返信していただければ再送します。',
    tooManyTitle: '試行回数が多すぎます',
    tooManyBody: '数分待ってから、メールのリンクをもう一度開いてください。',
  },
} as const;

function clientIp(request: NextRequest): string {
  return request.headers.get('x-forwarded-for')?.split(',')[0]?.trim() || request.headers.get('x-real-ip') || 'unknown';
}

export async function GET(request: NextRequest, { params }: { params: Promise<{ token: string }> }) {
  // The locale is unknown until the row is found; a bad token gets the EN
  // page with the JA line appended.
  if (!tryConsume(`engp-enter:${clientIp(request)}`, ENTER_LIMIT, ENTER_WINDOW_MS)) {
    return messagePage(429, 'en', COPY.en.tooManyTitle, `${COPY.en.tooManyBody} / ${COPY.ja.tooManyBody}`);
  }

  const { token } = await params;
  if (!TOKEN_RE.test(token)) {
    return messagePage(403, 'en', COPY.en.forbiddenTitle, `${COPY.en.forbiddenBody} / ${COPY.ja.forbiddenBody}`);
  }

  if (!process.env.NEXT_PUBLIC_SUPABASE_URL || !process.env.SUPABASE_SERVICE_ROLE_KEY) {
    return messagePage(503, 'en', 'Temporarily unavailable', 'Please try the link again in a few minutes. / 数分後にもう一度リンクを開いてください。');
  }

  const admin = createAdminClient();
  const { data, error } = await admin
    .from('engagement_proposals')
    .select('*')
    .eq('access_token_hash', hashToken(token))
    .maybeSingle();
  if (error) {
    console.error('[engagement/proposal/enter] lookup failed:', error.message);
    return messagePage(503, 'en', 'Temporarily unavailable', 'Please try the link again in a few minutes. / 数分後にもう一度リンクを開いてください。');
  }
  const row = (data ?? null) as EngagementProposal | null;
  if (!row) {
    return messagePage(403, 'en', COPY.en.forbiddenTitle, `${COPY.en.forbiddenBody} / ${COPY.ja.forbiddenBody}`);
  }

  const lang = row.locale === 'ja' ? 'ja' : 'en';
  // Superseded / withdrawn: the token was revoked with the status change, so
  // the verdict below would be a plain 403 — say why instead. The exact-hash
  // lookup already proved this is the holder of that (old) link.
  if (row.status === 'superseded' || row.status === 'withdrawn') {
    return messagePage(403, lang, COPY[lang].replacedTitle, COPY[lang].replacedBody);
  }
  const verdict = evaluateSession(row, token);
  if (!verdict.ok) {
    return verdict.status === 410
      ? messagePage(410, lang, COPY[lang].expiredTitle, COPY[lang].expiredBody)
      : messagePage(403, lang, COPY[lang].forbiddenTitle, COPY[lang].forbiddenBody);
  }
  // A token only exists on an issued row; anything else is not openable.
  if (row.status !== 'sent' && row.status !== 'accepted') {
    return messagePage(403, lang, COPY[lang].forbiddenTitle, COPY[lang].forbiddenBody);
  }

  const { error: touchErr } = await admin.rpc('touch_engagement_proposal_open', { p_proposal_id: row.id });
  if (touchErr) console.error('[engagement/proposal/enter] touch failed:', touchErr.message); // counters only — never block entry

  const dest = new URL(proposalPath(row.locale, row.id), request.nextUrl.origin);
  const res = NextResponse.redirect(dest, 303);
  res.cookies.set(proposalCookieNameFor(row.id), token, sessionCookieOptions(row.token_expires_at!));
  // No NEXT_LOCALE pin — the redirect target carries the proposal's locale
  // prefix; the page renders an EN proposal under /ja in place (see the page).
  for (const [k, v] of Object.entries(NO_STORE_HEADERS)) res.headers.set(k, v);
  return res;
}
