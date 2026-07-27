/**
 * The single source of truth for `next/image` remote patterns.
 *
 * `next.config.ts` spreads this into `images.remotePatterns`, and callers that
 * render a URL from user- or admin-supplied data check it with
 * `isRenderableRemoteImage` BEFORE handing it to `<Image>`. A URL that next/image
 * rejects at render throws, which on a member-facing page takes the whole page
 * down instead of degrading to a placeholder.
 *
 * A host-only check is not enough: `https://project.supabase.co/not-storage/x.png`
 * has an allowed host and still fails, because the pattern constrains the pathname
 * too. The matcher below mirrors Next's own semantics for protocol, hostname and
 * pathname.
 *
 * This module deliberately has NO imports — it is loaded from the Next config
 * context, which resolves neither the `@/` alias nor anything that pulls in React.
 */

export type RemoteImagePattern = {
  protocol: 'https';
  hostname: string;
  pathname?: string;
};

export const REMOTE_IMAGE_PATTERNS: readonly RemoteImagePattern[] = [
  {
    protocol: 'https',
    hostname: 'cdn.sanity.io',
    pathname: '/images/**',
  },
  {
    protocol: 'https',
    hostname: '*.supabase.co',
    pathname: '/storage/v1/object/public/**',
  },
  {
    protocol: 'https',
    hostname: 'placehold.co',
  },
] as const;

/**
 * Next matches a leading `*.` against exactly ONE label, so `*.supabase.co`
 * accepts `p.supabase.co` but rejects both `a.b.supabase.co` and bare
 * `supabase.co`.
 */
function hostnameMatches(hostname: string, pattern: string): boolean {
  if (!pattern.startsWith('*.')) return hostname === pattern;

  const suffix = pattern.slice(2);
  if (!hostname.endsWith(`.${suffix}`)) return false;

  const label = hostname.slice(0, -(suffix.length + 1));
  return label.length > 0 && !label.includes('.');
}

/** A `/prefix/**` pattern requires the path to sit under `/prefix/`. */
function pathnameMatches(pathname: string, pattern: string | undefined): boolean {
  if (pattern === undefined) return true;
  if (!pattern.endsWith('/**')) return pathname === pattern;
  return pathname.startsWith(pattern.slice(0, -2));
}

/**
 * True only when `<Image src={url}>` will actually render.
 *
 * Root-relative values (`/logo.svg`) are NOT renderable by this contract: the
 * column this guards is a free-text admin field, partner assets live in Supabase
 * storage, and nothing in the product places partner logos in `/public`, so
 * accepting a path from the database would add a traversal-shaped surface for no
 * real use case. Callers fall back to a monogram.
 */
export function isRenderableRemoteImage(url: string | null | undefined): boolean {
  if (typeof url !== 'string' || url.trim() === '') return false;

  let parsed: URL;
  try {
    parsed = new URL(url);
  } catch {
    return false;
  }

  if (parsed.protocol !== 'https:') return false;
  if (parsed.username || parsed.password) return false;
  if (parsed.port) return false;

  return REMOTE_IMAGE_PATTERNS.some(
    (pattern) =>
      hostnameMatches(parsed.hostname, pattern.hostname) &&
      pathnameMatches(parsed.pathname, pattern.pathname),
  );
}
