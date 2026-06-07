import type { EventLocale } from './types';

/** The locale-aware invitee event page path (under the protected dashboard). */
export function buildEventPath(slug: string, locale: EventLocale): string {
  const prefix = locale === 'ja' ? '/ja' : '';
  return `${prefix}/learn/dashboard/events/${slug}`;
}

/** The absolute event-page URL — used as the `.ics` destination and recap CTA. */
export function buildEventUrl(origin: string, slug: string, locale: EventLocale): string {
  return `${origin.replace(/\/$/, '')}${buildEventPath(slug, locale)}`;
}

/**
 * The magic-link post-auth destination. Uses `?redirect=` — the param the auth
 * callback actually reads (NOT `?next=`, which it ignores) — so a freshly
 * invited free-tier account lands on the gated event page.
 */
export function buildEventInviteRedirect(
  origin: string,
  slug: string,
  locale: EventLocale,
): string {
  const path = buildEventPath(slug, locale);
  return `${origin.replace(/\/$/, '')}/api/auth/callback?redirect=${encodeURIComponent(path)}`;
}
