/**
 * Server-side analytics — fires Plausible custom events from API routes and
 * webhook handlers via the Plausible Events API.
 *
 * Why this exists: client-only checkout tracking undercounts (ad-blockers,
 * Stripe redirects). Firing `checkout_started` / `checkout_completed` from the
 * server makes the funnel count ad-block-proof. The Stripe dashboard remains
 * the financial source of truth — this is for funnel drop-off, not accounting.
 *
 * No-ops unless NEXT_PUBLIC_PLAUSIBLE_DOMAIN is set. Fire-and-forget: it never
 * throws, so a tracking failure can never break a checkout or webhook.
 */

const PLAUSIBLE_DOMAIN = process.env.NEXT_PUBLIC_PLAUSIBLE_DOMAIN;
const PLAUSIBLE_API_URL =
  process.env.PLAUSIBLE_API_URL ?? 'https://plausible.io/api/event';

type ServerEventOptions = {
  /** Canonical URL the event is attributed to (e.g. an origin + path). */
  url: string;
  /** Non-PII string props only. */
  props?: Record<string, string>;
  /** Forward the caller's UA when available (better attribution). */
  userAgent?: string;
  /** Forward the caller's IP (X-Forwarded-For) when available. */
  ip?: string | null;
};

export async function trackServerEvent(
  name: string,
  { url, props, userAgent, ip }: ServerEventOptions,
): Promise<void> {
  if (!PLAUSIBLE_DOMAIN) return;
  try {
    await fetch(PLAUSIBLE_API_URL, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        // Plausible requires a User-Agent; a custom one is fine for counting.
        'User-Agent': userAgent ?? 'HonuVibe-Server/1.0',
        ...(ip ? { 'X-Forwarded-For': ip } : {}),
      },
      body: JSON.stringify({
        name,
        domain: PLAUSIBLE_DOMAIN,
        url,
        ...(props ? { props } : {}),
      }),
    });
  } catch (err) {
    // Never let analytics break the money path.
    console.error('[analytics-server] trackServerEvent failed:', err);
  }
}

/** Convenience: build the canonical url + headers from a Next request. */
export function serverEventContextFromRequest(request: Request): {
  url: string;
  userAgent?: string;
  ip?: string | null;
} {
  const origin =
    request.headers.get('origin') ??
    process.env.NEXT_PUBLIC_SITE_URL ??
    (PLAUSIBLE_DOMAIN ? `https://${PLAUSIBLE_DOMAIN}` : 'http://localhost:3000');
  let path = '/';
  try {
    path = new URL(request.url).pathname;
  } catch {
    /* keep default */
  }
  return {
    url: `${origin}${path}`,
    userAgent: request.headers.get('user-agent') ?? undefined,
    ip:
      request.headers.get('x-forwarded-for') ??
      request.headers.get('x-real-ip'),
  };
}
