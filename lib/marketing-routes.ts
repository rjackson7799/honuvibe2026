/**
 * Marketing routes — the public marketing surface that uses the new
 * <MarketingShell> design (light-only, Inter, --m-* tokens).
 *
 * The site has two pathname conventions:
 *  - next-intl's usePathname() from @/i18n/navigation: locale-stripped (e.g. "/learn")
 *  - next/navigation's usePathname(): includes locale (e.g. "/ja/learn")
 *
 * Use the matching helper for the source you have.
 *
 * Two kinds of entries:
 *  - MARKETING_PATHS: exact-match only. Children of /learn (e.g. /learn/dashboard,
 *    /learn/vault, /learn/auth, /learn/[slug]) keep the dark-themed app shell.
 *  - MARKETING_PATH_PREFIXES: the path itself AND any nested children are marketing
 *    (e.g. /glossary AND /glossary/<slug>).
 */

const MARKETING_PATHS = ['/', '/learn', '/explore', '/partnerships', '/about', '/contact'] as const;
const MARKETING_PATH_PREFIXES = ['/glossary', '/blog'] as const;

/**
 * For pathnames produced by next-intl's usePathname() (locale already stripped).
 */
export function isMarketingPath(pathname: string): boolean {
  // Trim trailing slash (except for root "/")
  const normalized = pathname.length > 1 ? pathname.replace(/\/$/, '') : pathname;
  if ((MARKETING_PATHS as readonly string[]).includes(normalized)) return true;
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
