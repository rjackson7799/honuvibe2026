'use client';

import { useState } from 'react';
import { Menu } from 'lucide-react';
import { Link, usePathname } from '@/i18n/navigation';
import { cn } from '@/lib/utils';
import { HvLangToggle } from '../hv/lang-toggle';
import { MarketingUserMenu, type MarketingUserMenuLabels } from './marketing-user-menu';
import { MarketingMobileSheet } from './marketing-mobile-sheet';
import { MarketingEventStrip } from '../event-strip';
import { isActiveNavHref } from './nav-cta';
import {
  NavCtaAnchor,
  navCtaClass,
  type MarketingNavLabels,
  type NavCtaLink,
  type NavLink,
} from './nav-cta-anchor';
import type { PublicEvent } from '@/lib/events/public-events';

type Props = {
  links: NavLink[];
  /** Page CTA (amber, 44px). null hides it. */
  cta: NavCtaLink | null;
  userMenuLabels: MarketingUserMenuLabels;
  labels: MarketingNavLabels;
  /** Featured announcement-strip event, resolved server-side. null hides the strip. */
  bannerEvent: PublicEvent | null;
};

/**
 * README "Header": sticky #0E3629 bar with a #16483A bottom border. Fixed (not
 * sticky) so it can sit under the admin-toggled event strip, which publishes
 * its height to --m-strip-h; 68px tall so every page's existing top padding
 * still clears it.
 */
export function MarketingNavClient({ links, cta, userMenuLabels, labels, bannerEvent }: Props) {
  const pathname = usePathname();
  const [mobileOpen, setMobileOpen] = useState(false);

  return (
    <>
      <MarketingEventStrip event={bannerEvent} />
      <header className="fixed inset-x-0 top-[var(--m-strip-h)] z-[200] h-[68px] border-b border-hv-green-800 bg-hv-green-900 text-hv-sand-100">
        <div className="mx-auto flex h-full max-w-[var(--hv-container)] items-center gap-7 px-5 md:px-8">
          <Link
            href="/"
            className="inline-flex min-h-[44px] items-center font-hv-display text-[20px] font-bold tracking-[-0.02em] text-hv-sand-100"
          >
            HonuVibe
          </Link>

          <nav aria-label={labels.primary} className="hidden items-center gap-[22px] text-[15px] lg:flex">
            {links.map((link) => {
              const active = isActiveNavHref(pathname, link.href);
              return (
                <Link
                  key={link.href}
                  href={link.href}
                  aria-current={active ? 'page' : undefined}
                  className={cn(
                    'inline-flex min-h-[44px] items-center transition-colors duration-200',
                    active
                      ? 'text-hv-sand-100 shadow-[inset_0_-2px_0_var(--hv-amber)]'
                      : 'text-hv-green-200 hover:text-hv-sand-100',
                  )}
                >
                  {link.label}
                </Link>
              );
            })}
          </nav>

          <div className="ml-auto flex items-center gap-3 sm:gap-[18px]">
            <div className="hidden items-center gap-[18px] lg:flex">
              <HvLangToggle tone="dark" label={labels.language} />
              <MarketingUserMenu labels={userMenuLabels} />
            </div>
            {cta && (
              <NavCtaAnchor cta={cta} className={cn(navCtaClass, 'px-3.5 text-[14px] sm:px-[18px] sm:text-[15px]')} />
            )}
            <button
              type="button"
              onClick={() => setMobileOpen(true)}
              aria-label={labels.openMenu}
              aria-expanded={mobileOpen}
              aria-haspopup="dialog"
              className="flex h-11 w-11 items-center justify-center rounded-[8px] text-hv-sand-100 transition-colors hover:bg-hv-green-800 lg:hidden"
            >
              <Menu size={22} aria-hidden />
            </button>
          </div>
        </div>
      </header>

      <MarketingMobileSheet
        open={mobileOpen}
        onClose={() => setMobileOpen(false)}
        links={links}
        pathname={pathname}
        cta={cta}
        userMenuLabels={userMenuLabels}
        labels={labels}
      />
    </>
  );
}
