'use client';

import { useEffect, useRef } from 'react';
import { X } from 'lucide-react';
import { Link } from '@/i18n/navigation';
import { cn } from '@/lib/utils';
import { HvLangToggle } from '../hv/lang-toggle';
import { MarketingUserMenu, type MarketingUserMenuLabels } from './marketing-user-menu';
import { NavCtaAnchor, navCtaClass, type MarketingNavLabels, type NavCtaLink, type NavLink } from './nav-cta-anchor';
import { isActiveNavHref } from './nav-cta';

type Props = {
  open: boolean;
  onClose: () => void;
  links: NavLink[];
  pathname: string;
  cta: NavCtaLink | null;
  userMenuLabels: MarketingUserMenuLabels;
  labels: MarketingNavLabels;
};

const FOCUSABLE = 'a[href], button:not([disabled]), input:not([disabled]), [tabindex]:not([tabindex="-1"])';

/**
 * Full-screen takeover menu below the lg breakpoint, on the header's dark
 * green. Locks body scroll, closes on Escape, keeps Tab inside the dialog and
 * returns focus to the hamburger on close.
 */
export function MarketingMobileSheet({ open, onClose, links, pathname, cta, userMenuLabels, labels }: Props) {
  const dialogRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    const dialog = dialogRef.current;
    if (!open || !dialog) return;
    const previousFocus = document.activeElement;
    const previousOverflow = document.body.style.overflow;
    document.body.style.overflow = 'hidden';
    dialog.querySelector<HTMLElement>(FOCUSABLE)?.focus();

    function onKeyDown(event: KeyboardEvent) {
      if (event.key === 'Escape') {
        onClose();
        return;
      }
      if (event.key !== 'Tab' || !dialog) return;
      const items = Array.from(dialog.querySelectorAll<HTMLElement>(FOCUSABLE));
      const first = items[0];
      const last = items[items.length - 1];
      if (!first || !last) return;
      if (event.shiftKey && document.activeElement === first) {
        event.preventDefault();
        last.focus();
      } else if (!event.shiftKey && document.activeElement === last) {
        event.preventDefault();
        first.focus();
      }
    }

    document.addEventListener('keydown', onKeyDown);
    return () => {
      document.removeEventListener('keydown', onKeyDown);
      document.body.style.overflow = previousOverflow;
      if (previousFocus instanceof HTMLElement && previousFocus.isConnected) previousFocus.focus();
    };
  }, [open, onClose]);

  if (!open) return null;

  return (
    <div
      ref={dialogRef}
      role="dialog"
      aria-modal="true"
      aria-label={labels.menu}
      className="fixed inset-0 z-[300] flex flex-col bg-hv-green-900 text-hv-sand-100"
    >
      <div className="flex h-[68px] items-center justify-between border-b border-hv-green-800 px-5">
        <span className="font-hv-display text-[20px] font-bold tracking-[-0.02em]">HonuVibe</span>
        <button
          type="button"
          onClick={onClose}
          aria-label={labels.closeMenu}
          className="flex h-11 w-11 items-center justify-center rounded-[8px] transition-colors hover:bg-hv-green-800"
        >
          <X size={22} aria-hidden />
        </button>
      </div>

      <nav aria-label={labels.primary} className="flex flex-1 flex-col gap-1 overflow-y-auto px-5 py-8">
        {links.map((link) => {
          const active = isActiveNavHref(pathname, link.href);
          return (
            <Link
              key={link.href}
              href={link.href}
              onClick={onClose}
              aria-current={active ? 'page' : undefined}
              className={cn(
                'flex min-h-[52px] items-center rounded-[10px] px-3 font-hv-display text-[22px] font-semibold tracking-[-0.02em] transition-colors',
                active ? 'bg-hv-green-800 text-hv-amber' : 'text-hv-sand-100 hover:bg-hv-green-800',
              )}
            >
              {link.label}
            </Link>
          );
        })}

        {cta && (
          <NavCtaAnchor cta={cta} onClick={onClose} className={cn(navCtaClass, 'mt-6 min-h-[54px] px-6 text-[17px]')} />
        )}
      </nav>

      <div className="flex items-center justify-between gap-4 border-t border-hv-green-800 px-5 py-5">
        <HvLangToggle tone="dark" label={labels.language} />
        <MarketingUserMenu labels={userMenuLabels} placement="up" />
      </div>
    </div>
  );
}
