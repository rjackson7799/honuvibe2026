'use client';

import { usePathname } from 'next/navigation';
import { Footer } from './footer';

export function ConditionalFooter() {
  const pathname = usePathname();
  const isAuthRoute = /^\/(ja\/)?(learn\/dashboard|admin)(\/|$)/.test(pathname);

  if (isAuthRoute) return null;

  return <Footer />;
}
