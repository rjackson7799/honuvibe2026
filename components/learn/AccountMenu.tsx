'use client';

import { useState, useEffect, useRef } from 'react';
import Link from 'next/link';
import { useRouter } from 'next/navigation';
import { useTranslations } from 'next-intl';
import { UserCircle, CreditCard, Shield, LogOut } from 'lucide-react';
import { createClient } from '@/lib/supabase/client';
import { cn } from '@/lib/utils';

type AccountMenuProps = {
  initial: string;
  displayName: string;
  email: string;
  settingsHref: string;
  billingHref: string;
  isAdmin: boolean;
  adminHref: string;
};

/**
 * Member-area account dropdown: the teal initial avatar opens a menu with an
 * identity header + Profile / Billing / Admin (admins only) / Sign out. Fed by
 * props from StudentDashboardLayout (which already fetches the user), so it does
 * no client-side auth query of its own. The accessible dropdown scaffold
 * (aria menu roles, click-outside, Esc) mirrors components/layout/user-menu.tsx.
 */
export function AccountMenu({
  initial,
  displayName,
  email,
  settingsHref,
  billingHref,
  isAdmin,
  adminHref,
}: AccountMenuProps) {
  const t = useTranslations('dashboard');
  const navT = useTranslations('nav');
  const router = useRouter();
  const [open, setOpen] = useState(false);
  const wrapperRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    if (!open) return;
    function handleClickOutside(e: MouseEvent) {
      if (wrapperRef.current && !wrapperRef.current.contains(e.target as Node)) {
        setOpen(false);
      }
    }
    function handleEscape(e: KeyboardEvent) {
      if (e.key === 'Escape') setOpen(false);
    }
    document.addEventListener('mousedown', handleClickOutside);
    document.addEventListener('keydown', handleEscape);
    return () => {
      document.removeEventListener('mousedown', handleClickOutside);
      document.removeEventListener('keydown', handleEscape);
    };
  }, [open]);

  async function handleSignOut() {
    setOpen(false);
    const supabase = createClient();
    await supabase.auth.signOut();
    router.refresh();
  }

  const itemClass = cn(
    'flex items-center gap-3 px-3 py-2.5 rounded-md text-sm w-full text-left',
    'text-fg-secondary hover:text-fg-primary hover:bg-bg-tertiary',
    'transition-colors duration-[var(--duration-fast)]',
  );

  return (
    <div ref={wrapperRef} className="relative">
      <button
        type="button"
        onClick={() => setOpen((v) => !v)}
        aria-haspopup="menu"
        aria-expanded={open}
        aria-label={navT('account')}
        className="w-[38px] h-[38px] rounded-[10px] bg-[color:var(--accent-teal)] hover:bg-[color:var(--accent-teal-hover)] text-white text-[15px] font-bold flex items-center justify-center transition-colors"
      >
        {initial}
      </button>

      {open && (
        <div
          role="menu"
          className={cn(
            'absolute right-0 top-full mt-2 min-w-[220px] py-2 px-1.5',
            'rounded-lg border border-border-secondary',
            'bg-bg-glass backdrop-blur-[24px] backdrop-saturate-[180%]',
            'shadow-lg z-[210]',
          )}
        >
          <div className="px-3 py-2 mb-1 border-b border-border-secondary">
            <div className="text-sm font-medium text-fg-primary truncate">{displayName}</div>
            <div className="text-xs text-fg-tertiary truncate">{email}</div>
          </div>

          <Link href={settingsHref} onClick={() => setOpen(false)} className={itemClass} role="menuitem">
            <UserCircle size={16} />
            {t('nav_profile')}
          </Link>

          <Link href={billingHref} onClick={() => setOpen(false)} className={itemClass} role="menuitem">
            <CreditCard size={16} />
            {t('nav_billing')}
          </Link>

          {isAdmin && (
            <Link href={adminHref} onClick={() => setOpen(false)} className={itemClass} role="menuitem">
              <Shield size={16} />
              {navT('admin')}
            </Link>
          )}

          <button type="button" onClick={handleSignOut} className={itemClass} role="menuitem">
            <LogOut size={16} />
            {navT('sign_out')}
          </button>
        </div>
      )}
    </div>
  );
}
