/**
 * Strict redirect validation for auth + checkout flows.
 *
 * Rejects everything that isn't an allowlisted internal path. Specifically:
 *   - protocol-relative URLs (`//host` — browsers treat these as external)
 *   - backslash variants (Windows path quirks parsed as `//` by some browsers)
 *   - absolute URLs (`http://`, `https://`, `javascript:`, `data:`)
 *   - paths not in the allowlist below
 *
 * Allowlist is intentionally small — anything new must be added explicitly.
 */
const ALLOWLIST_PREFIXES = [
  '/api/stripe/subscribe',
  '/learn',
  '/ja/learn',
  // Partner entry pages: the magic-link round trip has to land back on the
  // join/invite page so the code or token is still in hand after sign-in.
  '/join',
  '/ja/join',
] as const;

export function isSafeInternalRedirect(
  value: string | null | undefined,
): boolean {
  if (!value || typeof value !== 'string') return false;
  if (!value.startsWith('/')) return false;
  if (value.startsWith('//')) return false;
  if (value.includes('\\')) return false;
  return ALLOWLIST_PREFIXES.some((p) => {
    if (value === p) return true;
    const next = value.charAt(p.length);
    return value.startsWith(p) && (next === '/' || next === '?');
  });
}

export function sanitizeRedirect(
  value: string | null | undefined,
  fallback: string,
): string {
  return isSafeInternalRedirect(value) ? value! : fallback;
}
