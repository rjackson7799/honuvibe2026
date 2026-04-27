'use client';

import { useEffect } from 'react';
import { X } from 'lucide-react';
import { Link } from '@/i18n/navigation';
import { cn } from '@/lib/utils';
import { MarketingLangToggle } from './marketing-lang-toggle';
import { MarketingUserMenu, type MarketingUserMenuLabels } from './marketing-user-menu';

export type MobileNavLink = { href: string; label: string };

type Props = {
  open: boolean;
  onClose: () => void;
  links: MobileNavLink[];
  activeHref: string | null;
  showGetStarted: boolean;
  getStartedLabel: string;
  userMenuLabels: MarketingUserMenuLabels;
};

export function MarketingMobileMenu({
  open,
  onClose,
  links,
  activeHref,
  showGetStarted,
  getStartedLabel,
  userMenuLabels,
}: Props) {
  // Lock body scroll while open.
  useEffect(() => {
    if (!open) return;
    const previous = document.body.style.overflow;
    document.body.style.overflow = 'hidden';
    return () => {
      document.body.style.overflow = previous;
    };
  }, [open]);

  // Close on Escape.
  useEffect(() => {
    if (!open) return;
    function onKey(e: KeyboardEvent) {
      if (e.key === 'Escape') onClose();
    }
    document.addEventListener('keydown', onKey);
    return () => document.removeEventListener('keydown', onKey);
  }, [open, onClose]);

  if (!open) return null;

  return (
    <div
      role="dialog"
      aria-modal="true"
      className="fixed inset-0 z-[300] flex flex-col bg-[var(--m-canvas)]"
      data-shell="marketing"
    >
      {/* Top bar mirroring nav height so it feels like a takeover */}
      <div className="flex h-[68px] items-center justify-between border-b border-[var(--m-border-soft)] px-5">
        <span className="text-[18px] font-bold tracking-[-0.01em] text-[var(--m-ink-primary)]">
          HonuVibe<span className="text-[var(--m-accent-teal)]">.AI</span>
        </span>
        <button
          type="button"
          onClick={onClose}
          aria-label="Close menu"
          className="flex h-10 w-10 items-center justify-center rounded-full text-[var(--m-ink-secondary)] transition-colors hover:bg-[var(--m-sand)]"
        >
          <X size={22} />
        </button>
      </div>

      <nav className="flex flex-1 flex-col gap-2 overflow-y-auto px-5 py-8">
        {links.map((link) => {
          const isActive = activeHref === link.href;
          return (
            <Link
              key={link.href}
              href={link.href}
              onClick={onClose}
              className={cn(
                'rounded-lg px-3 py-3 text-[18px] font-semibold transition-colors',
                isActive
                  ? 'bg-[var(--m-accent-teal-soft)] text-[var(--m-accent-teal)]'
                  : 'text-[var(--m-ink-primary)] hover:bg-[var(--m-sand)]',
              )}
            >
              {link.label}
            </Link>
          );
        })}

        {showGetStarted && (
          <Link
            href="/learn"
            onClick={onClose}
            className={cn(
              'mt-4 inline-flex items-center justify-center gap-2 rounded-[10px]',
              'bg-[var(--m-accent-teal)] px-6 py-3.5 text-[15px] font-bold text-white',
              'shadow-[var(--m-shadow-teal-sm)] transition-colors hover:bg-[var(--m-accent-teal-dark)]',
            )}
          >
            {getStartedLabel}
          </Link>
        )}
      </nav>

      <div className="flex items-center justify-between border-t border-[var(--m-border-soft)] px-5 py-5">
        <MarketingLangToggle />
        <MarketingUserMenu labels={userMenuLabels} />
      </div>
    </div>
  );
}
