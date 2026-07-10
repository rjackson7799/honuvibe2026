import { createHmac, createHash, timingSafeEqual } from 'crypto';

// Pure, testable helpers for the client-preview gate route
// (app/api/preview/[slug]/[[...path]]/route.ts — its only importer).
//
// Crypto idioms copied from lib/discover/session.ts: hex buffers, length check
// before timingSafeEqual, sha256 both sides of any plaintext compare so no
// length is leaked. Do NOT add 'use server' / 'server-only' here — the unit
// tests import this module directly.

export const PREVIEW_COOKIE_PREFIX = 'hv_pv_';

/** Per-slug cookie name so one browser can hold several previews at once. */
export function cookieNameFor(slug: string): string {
  return `${PREVIEW_COOKIE_PREFIX}${slug}`;
}

function requireSecret(): string {
  const secret = process.env.PREVIEW_GATE_SECRET;
  if (!secret) {
    // Programming error: the route checks presence and 503s before it ever
    // reaches a signing path, so a throw here means the guard was skipped.
    throw new Error('PREVIEW_GATE_SECRET is not set');
  }
  return secret;
}

/**
 * HMAC-SHA256(`${slug}\n${password ?? ''}`) with PREVIEW_GATE_SECRET, hex.
 * Binding the password into the MAC means rotating a preview's password (or the
 * server secret) invalidates every already-issued cookie.
 */
export function signGate(slug: string, password: string | null): string {
  return createHmac('sha256', requireSecret())
    .update(`${slug}\n${password ?? ''}`)
    .digest('hex');
}

/** Timing-safe check that a cookie value is a valid gate token for slug+password. */
export function verifyGate(slug: string, password: string | null, cookieValue: string): boolean {
  const expected = Buffer.from(signGate(slug, password), 'hex');
  const got = Buffer.from(cookieValue, 'hex');
  return got.length === expected.length && timingSafeEqual(got, expected);
}

/** Constant-time password compare via sha256 (equal-length digests, no length leak). */
export function passwordMatches(input: string, stored: string): boolean {
  const a = createHash('sha256').update(input, 'utf8').digest();
  const b = createHash('sha256').update(stored, 'utf8').digest();
  return timingSafeEqual(a, b);
}

const CONTENT_TYPES: Record<string, string> = {
  html: 'text/html; charset=utf-8',
  css: 'text/css; charset=utf-8',
  js: 'text/javascript; charset=utf-8',
  mjs: 'text/javascript; charset=utf-8',
  json: 'application/json; charset=utf-8',
  map: 'application/json; charset=utf-8',
  txt: 'text/plain; charset=utf-8',
  png: 'image/png',
  jpg: 'image/jpeg',
  jpeg: 'image/jpeg',
  gif: 'image/gif',
  svg: 'image/svg+xml',
  webp: 'image/webp',
  avif: 'image/avif',
  ico: 'image/x-icon',
  woff: 'font/woff',
  woff2: 'font/woff2',
  ttf: 'font/ttf',
  otf: 'font/otf',
  mp4: 'video/mp4',
  webm: 'video/webm',
  pdf: 'application/pdf',
};

/** Map a filename's extension to a Content-Type; unknown → octet-stream. */
export function contentTypeFor(filename: string): string {
  const ext = filename.toLowerCase().split('.').pop() ?? '';
  return CONTENT_TYPES[ext] ?? 'application/octet-stream';
}

/** Escape the five HTML-significant characters. Every dynamic value in the
 *  generated pages below (title, error, message, slug) runs through this —
 *  `title` is admin-set DB data, so treat it as untrusted. */
export function escapeHtml(value: string): string {
  return value
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')
    .replace(/"/g, '&quot;')
    .replace(/'/g, '&#39;');
}

/**
 * Shared response headers for the generated (non-streamed) HTML pages ONLY.
 * Never applied to streamed exports — a CSP would break their inline
 * scripts/styles, and their Cache-Control is `private, no-store` (set in the
 * route) so a cookie revocation takes effect on the next request.
 */
export function htmlPageHeaders(): HeadersInit {
  return {
    'Content-Type': 'text/html; charset=utf-8',
    'Cache-Control': 'no-store',
    'X-Robots-Tag': 'noindex, nofollow',
    'Referrer-Policy': 'no-referrer',
    'Content-Security-Policy':
      "default-src 'none'; style-src 'unsafe-inline'; form-action 'self'; base-uri 'none'",
  };
}

const PAGE_STYLE = `
  :root { color-scheme: dark; }
  * { box-sizing: border-box; }
  body {
    margin: 0;
    min-height: 100vh;
    display: flex;
    align-items: center;
    justify-content: center;
    padding: 24px;
    background: #0d1117;
    color: #e6edf3;
    font-family: -apple-system, BlinkMacSystemFont, "Segoe UI", Roboto, Helvetica, Arial, sans-serif;
    line-height: 1.5;
  }
  .card {
    width: 100%;
    max-width: 380px;
    background: #161b22;
    border: 1px solid #30363d;
    border-radius: 12px;
    padding: 32px 28px;
  }
  h1 { margin: 0 0 8px; font-size: 20px; font-weight: 600; }
  p { margin: 0 0 20px; color: #9da7b3; font-size: 14px; }
  label { display: block; margin: 0 0 8px; font-size: 13px; color: #9da7b3; }
  input[type="password"] {
    width: 100%;
    padding: 12px 14px;
    font-size: 16px;
    color: #e6edf3;
    background: #0d1117;
    border: 1px solid #30363d;
    border-radius: 8px;
    outline: none;
  }
  input[type="password"]:focus { border-color: #2f81f7; }
  button {
    width: 100%;
    margin-top: 16px;
    padding: 12px 14px;
    font-size: 15px;
    font-weight: 600;
    color: #ffffff;
    background: #238636;
    border: 0;
    border-radius: 8px;
    cursor: pointer;
  }
  button:hover { background: #2ea043; }
  .error {
    margin: 0 0 16px;
    padding: 10px 12px;
    font-size: 13px;
    color: #ffb4ab;
    background: #3d1a17;
    border: 1px solid #6e2b25;
    border-radius: 8px;
  }
`.trim();

/** Self-contained password prompt. Posts `password` to /api/preview/<slug>. */
export function renderPasswordPage(opts: { slug: string; title?: string | null; error?: string }): string {
  const heading = opts.title ? escapeHtml(opts.title) : 'Protected preview';
  const action = `/api/preview/${escapeHtml(opts.slug)}`;
  const errorBlock = opts.error ? `<div class="error">${escapeHtml(opts.error)}</div>` : '';
  return `<!doctype html>
<html lang="en">
<head>
<meta charset="utf-8">
<meta name="viewport" content="width=device-width, initial-scale=1">
<meta name="robots" content="noindex,nofollow">
<title>${heading}</title>
<style>${PAGE_STYLE}</style>
</head>
<body>
<main class="card">
<h1>${heading}</h1>
<p>This preview is password protected. Enter the password you were sent.</p>
${errorBlock}
<form method="POST" action="${action}">
<label for="password">Password</label>
<input id="password" name="password" type="password" autocomplete="current-password" autofocus required>
<button type="submit">View preview</button>
</form>
</main>
</body>
</html>`;
}

/** Self-contained message page for 404 / 410 bodies. */
export function renderMessagePage(title: string, message: string): string {
  const safeTitle = escapeHtml(title);
  const safeMessage = escapeHtml(message);
  return `<!doctype html>
<html lang="en">
<head>
<meta charset="utf-8">
<meta name="viewport" content="width=device-width, initial-scale=1">
<meta name="robots" content="noindex,nofollow">
<title>${safeTitle}</title>
<style>${PAGE_STYLE}</style>
</head>
<body>
<main class="card">
<h1>${safeTitle}</h1>
<p>${safeMessage}</p>
</main>
</body>
</html>`;
}
