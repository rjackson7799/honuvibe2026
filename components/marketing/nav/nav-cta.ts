/**
 * Page-specific amber CTA in the marketing header (README "Header"): "Get
 * started free" on Home and Learn, "Join the Vault" on Course, "Start a
 * project" on Build, "Talk to us" on Partner. Keys double as i18n keys
 * (`nav.cta_<key>`).
 */
export type NavCta = 'get_started_free' | 'join_vault' | 'start_project' | 'talk_to_us';

export const NAV_CTA_HREF: Record<NavCta, string> = {
  get_started_free: '/signup',
  // API route, not a page: signed-out visitors bounce through /signin and
  // come back here; signed-in visitors go straight to Stripe Checkout.
  join_vault: '/api/stripe/subscribe?tier=vault',
  start_project: '/build#brief',
  // The interim /partner page carries the enquiry form at #apply (Unit 4
  // replaces it with the new enquiry form).
  talk_to_us: '/partner#apply',
};

/** Primary nav (README: Learn · Build · Partner). Keys are `nav.*` i18n keys. */
export const PRIMARY_NAV_LINKS = [
  { href: '/learn', key: 'learn' },
  { href: '/build', key: 'build' },
  { href: '/partner', key: 'partner' },
] as const;

/**
 * Locale-aware href for an API route (next-intl's Link would prefix /ja onto
 * /api/…, which does not exist). The subscribe route reads `locale` to send
 * signed-out JA visitors to /ja/signin.
 */
export function apiHrefForLocale(href: string, locale: string): string {
  if (locale !== 'ja') return href;
  return `${href}${href.includes('?') ? '&' : '?'}locale=ja`;
}

/** Is `href` the current section? Exact match or a child path (/learn → /learn/ai-essentials). */
export function isActiveNavHref(pathname: string, href: string): boolean {
  const normalized = pathname.length > 1 ? pathname.replace(/\/$/, '') : pathname;
  return normalized === href || normalized.startsWith(`${href}/`);
}
