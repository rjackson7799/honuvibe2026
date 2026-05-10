'use client';

import { usePathname } from 'next/navigation';
import { Footer } from './footer';

// Explicit allowlist of routes that render the dark legacy <Footer />.
// Everything else — marketing routes (which mount <MarketingFooter /> from
// their page shell), auth shells, and bespoke partner pages — gets nothing
// from this component. An allowlist is used (instead of marketing-route
// exclusion) to guarantee a single footer per page even if usePathname()
// returns null during static rendering of this client subtree.
const DARK_FOOTER_PATTERNS: readonly RegExp[] = [
  /^\/(ja\/)?privacy\/?$/,
  /^\/(ja\/)?terms\/?$/,
  /^\/(ja\/)?cookies\/?$/,
  /^\/(ja\/)?honuhub\/?$/,
  // Catches partner landing pages keyed by slug (e.g. /partners/foo) but not
  // /partners/smashhaus or /partners/vertice-society, both of which have
  // their own bespoke chrome.
  /^\/(ja\/)?partners\/(?!smashhaus(\/|$)|vertice-society(\/|$))[^/]+\/?$/,
];

export function ConditionalFooter() {
  const pathname = usePathname();
  if (!pathname) return null;
  if (!DARK_FOOTER_PATTERNS.some((rx) => rx.test(pathname))) return null;
  return <Footer />;
}
