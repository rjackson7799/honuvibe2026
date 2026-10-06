'use client';

import NextLink from 'next/link';
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

/** The CTA may point at an API route (Join the Vault), which must not get the /ja prefix. */
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
      <NextLink href={apiHrefForLocale(cta.href, locale)} prefetch={false} className={className} onClick={onClick}>
        {cta.label}
      </NextLink>
    );
  }
  return (
    <Link href={cta.href} className={className} onClick={onClick}>
      {cta.label}
    </Link>
  );
}
