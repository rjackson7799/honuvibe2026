/**
 * Same-origin guard for cookie-authenticated mutations.
 *
 * Supabase sessions live in cookies, so any state-changing POST reachable from
 * a browser needs a CSRF backstop. Browsers always send `Origin` on a
 * cross-origin POST and `Sec-Fetch-Site` on every fetch, so:
 *
 *   - `Origin` present  → its host must equal the request host.
 *   - No `Origin` but `Sec-Fetch-Site` present → must be `same-origin`.
 *   - Neither present   → not a browser request; CSRF does not apply.
 */
export function isSameOriginRequest(request: Request): boolean {
  const host = request.headers.get('host');
  const origin = request.headers.get('origin');

  if (origin) {
    if (!host) return false;
    try {
      return new URL(origin).host === host;
    } catch {
      return false;
    }
  }

  const fetchSite = request.headers.get('sec-fetch-site');
  if (fetchSite) return fetchSite === 'same-origin';

  return true;
}

/** First client IP from the proxy chain, or 'unknown' for rate-limit keying. */
export function clientIp(request: Request): string {
  return (
    request.headers.get('x-forwarded-for')?.split(',')[0]?.trim() ??
    request.headers.get('x-real-ip') ??
    'unknown'
  );
}
