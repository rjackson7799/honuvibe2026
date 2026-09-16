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
 *
 * `img-src data:` (and ONLY data:) exists for the optional client logo on the
 * password page. The logo is inlined as a data URI rather than linked, because
 * the viewer has no gate cookie yet and so cannot fetch anything through the
 * route — and allowing a remote img-src would let a preview page phone home.
 */
export function htmlPageHeaders(): HeadersInit {
  return {
    'Content-Type': 'text/html; charset=utf-8',
    'Cache-Control': 'no-store',
    'X-Robots-Tag': 'noindex, nofollow',
    'Referrer-Policy': 'no-referrer',
    'Content-Security-Policy':
      "default-src 'none'; img-src data:; style-src 'unsafe-inline'; form-action 'self'; base-uri 'none'",
  };
}

/**
 * Accept a branding image (logo or background) only as a base64 data URI in a
 * raster type we chose. SVG is deliberately excluded: it can carry script, and
 * while an <img> context neutralizes that today, there is no reason to take the
 * risk for a decoration. Anything else (a remote URL, a javascript: URI, a
 * malformed string) yields null and the page simply renders without it.
 *
 * The anchored character class is also what makes it safe to drop the value
 * unescaped into an HTML attribute AND a CSS url("…") — no quotes, parens,
 * angle brackets or whitespace can survive it.
 */
export function safeImageDataUri(value: string | null | undefined): string | null {
  if (!value) return null;
  return /^data:image\/(png|jpeg|webp);base64,[A-Za-z0-9+/]+={0,2}$/.test(value) ? value : null;
}

// One neutral surface that works with or without a client photo behind it.
// Deliberately no brand accent here: the client's identity arrives through the
// logo and background files, so the chrome stays quiet and lets them carry it.
const PAGE_STYLE = `
  :root { color-scheme: dark; }
  * { box-sizing: border-box; }
  html { background: #0a0a0c; }
  body {
    margin: 0;
    min-height: 100vh;
    min-height: 100dvh;
    display: flex;
    align-items: center;
    justify-content: center;
    padding: 24px 20px;
    background: radial-gradient(120% 80% at 50% 0%, #17171c 0%, #0a0a0c 65%);
    color: #f2efe8;
    font-family: -apple-system, BlinkMacSystemFont, "Segoe UI", "Hiragino Sans", "Yu Gothic", Roboto, Helvetica, Arial, sans-serif;
    line-height: 1.5;
    -webkit-font-smoothing: antialiased;
  }
  .backdrop {
    position: fixed;
    inset: 0;
    z-index: 0;
    background-size: cover;
    background-position: center;
    background-repeat: no-repeat;
  }
  .backdrop::after {
    content: "";
    position: absolute;
    inset: 0;
    background:
      linear-gradient(180deg, rgba(6,6,9,0.42) 0%, rgba(6,6,9,0.66) 55%, rgba(6,6,9,0.86) 100%);
  }
  .card {
    position: relative;
    z-index: 1;
    width: 100%;
    max-width: 400px;
    padding: 36px 30px 30px;
    background: rgba(12,12,16,0.72);
    border: 1px solid rgba(255,255,255,0.10);
    border-radius: 14px;
    box-shadow: 0 30px 80px rgba(0,0,0,0.55);
    backdrop-filter: blur(18px) saturate(120%);
    -webkit-backdrop-filter: blur(18px) saturate(120%);
  }
  .logo {
    display: block;
    width: auto;
    max-width: 100%;
    max-height: 150px;
    margin: 0 auto 26px;
  }
  h1 { margin: 0 0 6px; font-size: 19px; font-weight: 600; letter-spacing: -0.01em; }
  p { margin: 0 0 22px; color: rgba(242,239,232,0.62); font-size: 14px; }
  label { display: block; margin: 0 0 8px; font-size: 13px; color: rgba(242,239,232,0.62); }
  input[type="password"] {
    width: 100%;
    padding: 13px 14px;
    font-size: 16px;
    color: #f2efe8;
    background: rgba(255,255,255,0.05);
    border: 1px solid rgba(255,255,255,0.14);
    border-radius: 9px;
    outline: none;
    transition: border-color 150ms ease, background 150ms ease;
  }
  input[type="password"]::placeholder { color: rgba(242,239,232,0.3); }
  input[type="password"]:focus {
    border-color: rgba(255,255,255,0.55);
    background: rgba(255,255,255,0.08);
  }
  button {
    width: 100%;
    min-height: 46px;
    margin-top: 16px;
    padding: 12px 14px;
    font-size: 15px;
    font-weight: 600;
    color: #0a0a0c;
    background: #f2efe8;
    border: 0;
    border-radius: 9px;
    cursor: pointer;
    transition: background 150ms ease;
  }
  button:hover { background: #ffffff; }
  button:focus-visible, input[type="password"]:focus-visible {
    outline: 2px solid #f2efe8;
    outline-offset: 2px;
  }
  .error {
    margin: 0 0 16px;
    padding: 10px 12px;
    font-size: 13px;
    color: #ffb4ab;
    background: rgba(120,30,24,0.35);
    border: 1px solid rgba(255,120,110,0.35);
    border-radius: 9px;
  }
  @media (prefers-reduced-motion: reduce) {
    input[type="password"], button { transition: none; }
  }
`.trim();

/** Self-contained password prompt. Posts `password` to /api/preview/<slug>. */
export function renderPasswordPage(opts: {
  slug: string;
  title?: string | null;
  error?: string;
  /** Optional client logo, already a data URI (see safeImageDataUri). */
  logoDataUri?: string | null;
  /** Optional full-bleed background photo, already a data URI (see safeImageDataUri). */
  bgDataUri?: string | null;
}): string {
  const heading = opts.title ? escapeHtml(opts.title) : 'Protected preview';
  const action = `/api/preview/${escapeHtml(opts.slug)}`;
  const errorBlock = opts.error ? `<div class="error">${escapeHtml(opts.error)}</div>` : '';
  // alt="" — the heading right below already names the client, so the logo is
  // decorative and a screen reader should skip it rather than say it twice.
  const logo = safeImageDataUri(opts.logoDataUri);
  const logoBlock = logo ? `<img class="logo" src="${logo}" alt="">\n` : '';
  // The photo paints a fixed layer behind the card (not <body>) so the darkening
  // overlay in .backdrop::after can sit between it and the card. It goes in a
  // second <style> block rather than a style attribute so the data URI needs no
  // attribute escaping; style-src 'unsafe-inline' and img-src data: in
  // htmlPageHeaders() are exactly what this needs.
  const bg = safeImageDataUri(opts.bgDataUri);
  const backdropStyle = bg ? `<style>.backdrop { background-image: url("${bg}"); }</style>\n` : '';
  const backdrop = bg ? `<div class="backdrop" aria-hidden="true"></div>\n` : '';
  return `<!doctype html>
<html lang="en">
<head>
<meta charset="utf-8">
<meta name="viewport" content="width=device-width, initial-scale=1">
<meta name="robots" content="noindex,nofollow">
<title>${heading}</title>
<style>${PAGE_STYLE}</style>
${backdropStyle}</head>
<body>
${backdrop}<main class="card">
${logoBlock}<h1>${heading}</h1>
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
