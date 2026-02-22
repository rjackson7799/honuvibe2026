'use client';

import { useState, useEffect } from 'react';
import { Menu } from 'lucide-react';
import { useTranslations } from 'next-intl';
import { Link } from '@/i18n/navigation';
import { cn } from '@/lib/utils';
import { IconButton } from '@/components/ui/icon-button';
import { ThemeToggle } from './theme-toggle';
import { LangToggle } from './lang-toggle';
import { MobileMenu } from './mobile-menu';

const navLinks = [
  { href: '/honuhub', key: 'honuhub' },
  { href: '/exploration', key: 'exploration' },
  { href: '/learn', key: 'learn' },
  { href: '/blog', key: 'blog' },
  { href: '/about', key: 'about' },
  { href: '/apply', key: 'apply' },
] as const;

export function Nav() {
  const t = useTranslations('nav');
  const [scrolled, setScrolled] = useState(false);
  const [mobileMenuOpen, setMobileMenuOpen] = useState(false);

  useEffect(() => {
    let ticking = false;
    const handleScroll = () => {
      if (!ticking) {
        requestAnimationFrame(() => {
          setScrolled(window.scrollY > 50);
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
          'fixed top-0 left-0 right-0 z-[200] h-14 md:h-16',
          'flex items-center justify-between px-5 md:px-8',
          'transition-all duration-[400ms]',
          scrolled
            ? 'bg-bg-glass backdrop-blur-[24px] backdrop-saturate-[180%] border-b border-border-secondary'
            : 'bg-transparent',
        )}
      >
        {/* Logo */}
        <Link href="/" className="text-lg font-semibold text-fg-primary tracking-tight">
          HonuVibe<span className="text-accent-teal">.AI</span>
        </Link>

        {/* Desktop Nav Links */}
        <div className="hidden xl:flex items-center gap-1">
          {navLinks.map((link) => (
            <Link
              key={link.key}
              href={link.href}
              className="px-3 py-2 text-sm text-fg-secondary hover:text-fg-primary transition-colors duration-[var(--duration-fast)]"
            >
              {t(link.key)}
            </Link>
          ))}
        </div>

        {/* Right side: Theme + Lang + Hamburger */}
        <div className="flex items-center gap-1">
          <ThemeToggle />
          <LangToggle />
          <div className="xl:hidden">
            <IconButton
              icon={Menu}
              label="Open menu"
              onClick={() => setMobileMenuOpen(true)}
            />
          </div>
        </div>
      </nav>

      <MobileMenu
        open={mobileMenuOpen}
        onClose={() => setMobileMenuOpen(false)}
        links={navLinks.map((l) => ({ href: l.href, label: t(l.key) }))}
      />
    </>
  );
}
