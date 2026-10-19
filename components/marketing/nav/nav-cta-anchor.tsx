'use client';

import { useLocale } from 'next-intl';
import { Link } from '@/i18n/navigation';
import { cn } from '@/lib/utils';
import { apiHrefForLocale } from './nav-cta';

export type NavLink = { href: string; label: string };
export type NavCtaLink = { href: string; label: string };
export type MarketingNavLabels = {
  primary: string;
  language: string;
  openMenu: string;
  closeMenu: string;
  menu: string;
};

/** README header CTA: amber, 44px tall, radius 8px, 15px/600. */
export const navCtaClass = cn(
  'inline-flex min-h-[44px] items-center justify-center whitespace-nowrap rounded-[8px] bg-hv-amber font-semibold text-hv-green-900',
  'transition-[transform,box-shadow] duration-[250ms] ease-hv hover:-translate-y-0.5 hover:shadow-hv-cta',
  'focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-hv-sand-100 focus-visible:ring-offset-2 focus-visible:ring-offset-hv-green-900',
);

/**
 * The CTA may point at an API route (Join the Vault), which must not get the
 * /ja prefix and must be a full navigation: a Next Link would do a client-side
 * RSC fetch of the route and strand the click (mirrors HvButton).
 */
export function NavCtaAnchor({
  cta,
  className,
  onClick,
}: {
  cta: NavCtaLink;
  className?: string;
  onClick?: () => void;
}) {
  const locale = useLocale();
  if (cta.href.startsWith('/api/')) {
    return (
      <a href={apiHrefForLocale(cta.href, locale)} className={className} onClick={onClick}>
        {cta.label}
      </a>
    );
  }
  return (
    <Link href={cta.href} className={className} onClick={onClick}>
      {cta.label}
    </Link>
  );
}
