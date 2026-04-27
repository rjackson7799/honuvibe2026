'use client';

import { usePathname } from 'next/navigation';

// Routes that have their own dedicated chrome (e.g. StudentDashboardLayout's
// sidebar) and should NOT render the marketing top nav.
function isAuthShellRoute(pathname: string) {
  return /^\/(ja\/)?(learn\/(dashboard|vault)|admin)(\/|$)/.test(pathname);
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
  const noNavPadding = isAuthShellRoute(pathname);
  return (
    <main className={noNavPadding ? 'min-h-screen' : 'min-h-screen pt-14 md:pt-16'}>
      {children}
    </main>
  );
}
