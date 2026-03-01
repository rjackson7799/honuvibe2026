'use client';

import { useState, useEffect } from 'react';
import { usePathname } from '@/i18n/navigation';
import { Menu } from 'lucide-react';
import { Link } from '@/i18n/navigation';
import { cn } from '@/lib/utils';
import { IconButton } from '@/components/ui/icon-button';
import { LangToggle } from './lang-toggle';
import { MobileMenu } from './mobile-menu';
import { UserMenu } from './user-menu';

type NavLink = { href: string; label: string };

type UserMenuLabels = {
  signIn: string;
  dashboard: string;
  admin: string;
  signOut: string;
};

type NavClientProps = {
  links: NavLink[];
  userMenuLabels: UserMenuLabels;
};

export function NavClient({ links, userMenuLabels }: NavClientProps) {
  const pathname = usePathname();
  const isAuthRoute = /^\/(ja\/)?(learn\/dashboard|admin)(\/|$)/.test(pathname);
  const isLightZonePage = pathname.startsWith('/partners/');
  const [scrolled, setScrolled] = useState(false);
  const [mobileMenuOpen, setMobileMenuOpen] = useState(false);

  useEffect(() => {
    let ticking = false;
    const handleScroll = () => {
      if (!ticking) {
        requestAnimationFrame(() => {
          const shouldBeScrolled = window.scrollY > 50;
          setScrolled((prev) => (prev === shouldBeScrolled ? prev : shouldBeScrolled));
          ticking = false;
        });
        ticking = true;
      }
    };

    window.addEventListener('scroll', handleScroll, { passive: true });
    return () => window.removeEventListener('scroll', handleScroll);
  }, []);

  return (
    <>
      <nav
        className={cn(
          'dark-zone',
          'fixed top-0 left-0 right-0 z-[200] h-14 md:h-16',
          'flex items-center justify-between px-5 md:px-8',
          'transition-all duration-[400ms]',
          scrolled || isLightZonePage
            ? 'bg-bg-glass backdrop-blur-[24px] backdrop-saturate-[180%] border-b border-border-secondary'
            : 'bg-transparent',
        )}
      >
        {/* Logo */}
        <Link href="/" className="text-lg font-semibold text-fg-primary tracking-tight">
          HonuVibe<span className="text-accent-teal">.AI</span>
        </Link>

        {/* Desktop Nav Links — hidden on authenticated routes */}
        {!isAuthRoute && (
          <div className="hidden lg:flex items-center gap-1">
            {links.map((link) => (
              <Link
                key={link.href}
                href={link.href}
                className="px-3 py-2 text-sm text-fg-secondary hover:text-fg-primary transition-colors duration-[var(--duration-fast)]"
              >
                {link.label}
              </Link>
            ))}
          </div>
        )}

        {/* Right side: User + Theme + Lang + Hamburger */}
        <div className="flex items-center gap-1">
          {/* On auth routes, controls move to sidebar on desktop — show only on mobile */}
          <div className={isAuthRoute ? 'md:hidden' : 'hidden lg:block'}>
            <UserMenu labels={userMenuLabels} />
          </div>
          <div className={isAuthRoute ? 'md:hidden flex items-center gap-1' : 'flex items-center gap-1'}>
            <LangToggle />
          </div>
          {!isAuthRoute && (
            <div className="lg:hidden">
              <IconButton
                icon={Menu}
                label="Open menu"
                onClick={() => setMobileMenuOpen(true)}
              />
            </div>
          )}
        </div>
      </nav>

      <MobileMenu
        open={mobileMenuOpen}
        onClose={() => setMobileMenuOpen(false)}
        links={links}
        userMenuLabels={userMenuLabels}
      />
    </>
  );
}
