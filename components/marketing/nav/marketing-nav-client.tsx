'use client';

import { useEffect, useState } from 'react';
import { Menu } from 'lucide-react';
import { Link, usePathname } from '@/i18n/navigation';
import { cn } from '@/lib/utils';
import { HonuIcon } from '@/components/marketing/icons/honu';
import { MarketingLangToggle } from './marketing-lang-toggle';
import { MarketingUserMenu, type MarketingUserMenuLabels } from './marketing-user-menu';
import { MarketingMobileMenu, type MobileNavLink } from './marketing-mobile-menu';

type Props = {
  links: MobileNavLink[];
  /** Show the "Get Started" CTA — homepage only per design. */
  showGetStarted: boolean;
  getStartedLabel: string;
  userMenuLabels: MarketingUserMenuLabels;
};

export function MarketingNavClient({
  links,
  showGetStarted,
  getStartedLabel,
  userMenuLabels,
}: Props) {
  const pathname = usePathname();
  const [scrolled, setScrolled] = useState(false);
  const [mobileOpen, setMobileOpen] = useState(false);

  useEffect(() => {
    let ticking = false;
    const onScroll = () => {
      if (ticking) return;
      requestAnimationFrame(() => {
        setScrolled((prev) => {
          const next = window.scrollY > 20;
          return prev === next ? prev : next;
        });
        ticking = false;
      });
      ticking = true;
    };
    window.addEventListener('scroll', onScroll, { passive: true });
    onScroll();
    return () => window.removeEventListener('scroll', onScroll);
  }, []);

  // Determine active link by exact pathname match (locale-stripped via next-intl).
  const activeHref = links.find((l) => l.href === pathname)?.href ?? null;

  // Per design, the Partnerships link uses coral active accent; everything else teal.
  const partnershipsActive = activeHref === '/partnerships';
  const activeColor = partnershipsActive
    ? 'var(--m-accent-coral)'
    : 'var(--m-accent-teal)';

  return (
    <>
      <nav
        className={cn(
          'fixed inset-x-0 top-0 z-[200] h-[68px] bg-[var(--m-canvas)]',
          'transition-[border-color,box-shadow] duration-300',
          scrolled
            ? 'border-b border-[rgba(26,43,51,0.1)] shadow-[0_2px_20px_rgba(26,43,51,0.06)]'
            : 'border-b border-transparent shadow-none',
        )}
      >
        <div className="mx-auto flex h-full max-w-[1200px] items-center justify-between px-5 md:px-8">
          {/* Logo */}
          <Link
            href="/"
            className="flex items-center gap-2.5 text-[var(--m-accent-teal)]"
          >
            <HonuIcon size={30} />
            <span className="text-[18px] font-bold tracking-[-0.01em] text-[var(--m-ink-primary)]">
              HonuVibe<span className="text-[var(--m-accent-teal)]">.AI</span>
            </span>
          </Link>

          {/* Desktop links */}
          <div className="hidden items-center gap-8 lg:flex">
            {links.map((link) => {
              const isActive = link.href === activeHref;
              return (
                <Link
                  key={link.href}
                  href={link.href}
                  className={cn(
                    'pb-0.5 text-[14.5px] transition-colors duration-200',
                    isActive
                      ? 'font-semibold'
                      : 'font-medium text-[var(--m-ink-secondary)] hover:text-[var(--m-ink-primary)]',
                  )}
                  style={
                    isActive
                      ? {
                          color: activeColor,
                          borderBottom: `2px solid ${activeColor}`,
                        }
                      : undefined
                  }
                >
                  {link.label}
                </Link>
              );
            })}
          </div>

          {/* Right controls */}
          <div className="flex items-center gap-3">
            <div className="hidden items-center gap-3 lg:flex">
              <MarketingLangToggle />
              <MarketingUserMenu labels={userMenuLabels} />
              {showGetStarted && (
                <Link
                  href="/learn"
                  className={cn(
                    'inline-flex items-center gap-2 rounded-lg px-5 py-2',
                    'bg-[var(--m-accent-teal)] text-[14px] font-semibold text-white',
                    'shadow-[var(--m-shadow-teal-sm)] transition-colors',
                    'hover:bg-[var(--m-accent-teal-dark)]',
                  )}
                >
                  {getStartedLabel}
                </Link>
              )}
            </div>

            {/* Mobile hamburger */}
            <button
              type="button"
              onClick={() => setMobileOpen(true)}
              aria-label="Open menu"
              className="flex h-10 w-10 items-center justify-center rounded-md text-[var(--m-ink-primary)] transition-colors hover:bg-[var(--m-sand)] lg:hidden"
            >
              <Menu size={22} />
            </button>
          </div>
        </div>
      </nav>

      <MarketingMobileMenu
        open={mobileOpen}
        onClose={() => setMobileOpen(false)}
        links={links}
        activeHref={activeHref}
        showGetStarted={showGetStarted}
        getStartedLabel={getStartedLabel}
        userMenuLabels={userMenuLabels}
      />
    </>
  );
}
