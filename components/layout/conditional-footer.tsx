'use client';

import { usePathname } from 'next/navigation';
import { isMarketingPathWithLocale } from '@/lib/marketing-routes';
import { Footer } from './footer';

export function ConditionalFooter() {
  const pathname = usePathname();
  const isAuthRoute = /^\/(ja\/)?(learn\/(dashboard|vault)|admin)(\/|$)/.test(pathname);
  const isBespokePartnerRoute = /^\/(ja\/)?partners\/smashhaus\/?$/.test(pathname);
  // Marketing routes mount <MarketingFooter /> via the page shell.
  const isMarketingRoute = isMarketingPathWithLocale(pathname);

  if (isAuthRoute || isBespokePartnerRoute || isMarketingRoute) return null;

  return <Footer />;
}
