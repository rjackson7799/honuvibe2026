'use client';

import { usePathname } from 'next/navigation';
import { isMarketingPathWithLocale } from '@/lib/marketing-routes';

// Routes that have their own dedicated chrome (e.g. StudentDashboardLayout's
// sidebar) and should NOT render the marketing top nav.
// /learn/auth, /join/*, and the tokenized survey pages (/survey/<slug>,
// /events/<slug>/survey) are chromeless — each carries its own HonuVibe.AI
// branding inside its card, so the legacy dark global Nav would just clash with
// the new marketing-shell aesthetic users see elsewhere.
// The legacy /survey/ai-essentials page has no branding of its own and was
// built for the dark Nav, so it is deliberately excluded; /events/<slug>
// itself keeps the Nav — only its /survey child is a card.
export function isAuthShellRoute(pathname: string) {
  return /^\/(ja\/)?(learn\/(dashboard|vault|auth|paths)|admin|join|survey\/(?!ai-essentials(?:\/|$))[^/]+|events\/[^/]+\/survey)(\/|$)/.test(
    pathname,
  );
}

// Slot pattern: the async <Nav /> is resolved by the server layout before
// being passed in as `children`, so this client wrapper only decides whether
// to render the resolved tree. Avoids invoking an async server component from
// inside a client subtree (forbidden in Next 16 / React 19).
export function ConditionalNav({ children }: { children: React.ReactNode }) {
  const pathname = usePathname();
  if (isAuthShellRoute(pathname)) return null;
  return <>{children}</>;
}

export function ConditionalMain({ children }: { children: React.ReactNode }) {
  const pathname = usePathname();
  // Auth shell routes have their own chrome → no global padding.
  // Marketing routes mount <MarketingNav> inside <MarketingShell> and each
  // first section self-pads to clear it → no global padding.
  // Everything else (legacy public routes still on the dark Nav) keeps
  // pt-14 md:pt-16 to clear the fixed dark Nav.
  const noNavPadding = isAuthShellRoute(pathname) || isMarketingPathWithLocale(pathname);
  return (
    <main className={noNavPadding ? 'min-h-screen' : 'min-h-screen pt-14 md:pt-16'}>
      {children}
    </main>
  );
}
