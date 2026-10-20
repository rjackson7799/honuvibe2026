/**
 * Marketing routes — the public marketing surface that uses <MarketingShell>
 * (legacy --m-* look or the 2026 green [data-shell="hv"] look).
 *
 * The site has two pathname conventions:
 *  - next-intl's usePathname() from @/i18n/navigation: locale-stripped (e.g. "/learn")
 *  - next/navigation's usePathname(): includes locale (e.g. "/ja/learn")
 *
 * Use the matching helper for the source you have.
 *
 * Two kinds of entries:
 *  - MARKETING_PATHS: exact-match only. Children of /learn (e.g. /learn/dashboard,
 *    /learn/vault, /learn/auth) keep the dark-themed app shell, except the
 *    course detail page /learn/<slug> (isCourseDetailPath).
 *  - MARKETING_PATH_PREFIXES: the path itself AND any nested children are marketing
 *    (e.g. /glossary AND /glossary/<slug>).
 */

// /partner is the public Partner page (the partner portal moved to /portal,
// which keeps the dark app shell). /signin and /signup are full-viewport
// split layouts: marketing for padding/companion purposes, and also listed in
// isAuthShellRoute so the dark global Nav stays off them.
const MARKETING_PATHS = [
  '/',
  '/learn',
  '/build',
  '/partner',
  '/organizations',
  '/about',
  '/contact',
  '/signin',
  '/signup',
] as const;
const MARKETING_PATH_PREFIXES = ['/glossary', '/blog', '/partners', '/events'] as const;

/**
 * Static children of app/[locale]/learn. They keep the dark app shell; every
 * other single segment under /learn is a course slug (the green course detail
 * page, Unit 2b). A new /learn/<x> route must be added here, or it would lose
 * the member nav (__tests__/marketing/marketing-routes.test.ts reads the
 * directory and fails until it is).
 */
export const LEARN_RESERVED_SEGMENTS = ['dashboard', 'vault', 'auth', 'paths', 'plans', 'library'] as const;

/** `/learn/<slug>` exactly (locale-stripped, trailing slash tolerated); not `/learn/<slug>/checkout`. */
export function isCourseDetailPath(pathname: string): boolean {
  const match = /^\/learn\/([^/]+)\/?$/.exec(pathname);
  return match !== null && !(LEARN_RESERVED_SEGMENTS as readonly string[]).includes(match[1]);
}

/**
 * For pathnames produced by next-intl's usePathname() (locale already stripped).
 */
export function isMarketingPath(pathname: string): boolean {
  // Trim trailing slash (except for root "/")
  const normalized = pathname.length > 1 ? pathname.replace(/\/$/, '') : pathname;
  if ((MARKETING_PATHS as readonly string[]).includes(normalized)) return true;
  if (isCourseDetailPath(normalized)) return true;
  return MARKETING_PATH_PREFIXES.some(
    (prefix) => normalized === prefix || normalized.startsWith(`${prefix}/`),
  );
}

/**
 * For pathnames produced by next/navigation's usePathname() (may include /ja prefix).
 */
export function isMarketingPathWithLocale(pathname: string): boolean {
  // Strip optional locale prefix (currently only /ja exists; en is unprefixed)
  const stripped = pathname.replace(/^\/ja(?=\/|$)/, '') || '/';
  return isMarketingPath(stripped);
}
