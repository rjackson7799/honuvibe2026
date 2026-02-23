'use client';

import { useEffect } from 'react';
import { X } from 'lucide-react';
import { Link } from '@/i18n/navigation';
import { cn } from '@/lib/utils';
import { IconButton } from '@/components/ui/icon-button';
import { ThemeToggle } from './theme-toggle';
import { LangToggle } from './lang-toggle';
import { UserMenu } from './user-menu';

type UserMenuLabels = {
  signIn: string;
  dashboard: string;
  admin: string;
  signOut: string;
};

type MobileMenuProps = {
  open: boolean;
  onClose: () => void;
  links: { href: string; label: string }[];
  userMenuLabels: UserMenuLabels;
};

export function MobileMenu({ open, onClose, links, userMenuLabels }: MobileMenuProps) {
  useEffect(() => {
    if (open) {
      document.body.style.overflow = 'hidden';
    } else {
      document.body.style.overflow = '';
    }
    return () => {
      document.body.style.overflow = '';
    };
  }, [open]);

  useEffect(() => {
    const handleEscape = (e: KeyboardEvent) => {
      if (e.key === 'Escape') onClose();
    };
    if (open) {
      document.addEventListener('keydown', handleEscape);
      return () => document.removeEventListener('keydown', handleEscape);
    }
  }, [open, onClose]);

  return (
    <div
      className={cn(
        'fixed inset-0 z-[300] bg-bg-primary',
        'flex flex-col transition-all duration-[var(--duration-slow)]',
        open ? 'opacity-100 visible' : 'opacity-0 invisible pointer-events-none',
      )}
      aria-hidden={!open}
    >
      {/* Header */}
      <div className="flex items-center justify-between px-5 h-14">
        <span className="text-lg font-semibold text-fg-primary tracking-tight">
          HonuVibe<span className="text-accent-teal">.AI</span>
        </span>
        <IconButton icon={X} label="Close menu" onClick={onClose} />
      </div>

      {/* Links */}
      <nav className="flex-1 flex flex-col px-5 pt-8">
        {links.map((link) => (
          <Link
            key={link.href}
            href={link.href}
            onClick={onClose}
            className="flex items-center h-14 text-lg text-fg-secondary hover:text-fg-primary border-b border-border-secondary transition-colors"
          >
            {link.label}
          </Link>
        ))}
      </nav>

      {/* User menu */}
      <div className="px-5 py-4 border-t border-border-secondary" onClick={onClose}>
        <UserMenu labels={userMenuLabels} />
      </div>

      {/* Bottom: Theme + Lang */}
      <div className="flex items-center justify-between px-5 py-6 border-t border-border-secondary">
        <div className="flex items-center gap-2">
          <ThemeToggle />
          <LangToggle />
        </div>
      </div>
    </div>
  );
}
