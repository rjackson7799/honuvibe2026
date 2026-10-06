'use client';

import { useEffect, useRef, useState } from 'react';
import NextLink from 'next/link';
import { useRouter, usePathname } from 'next/navigation';
import { useLocale } from 'next-intl';
import { LayoutDashboard, LogOut, Shield } from 'lucide-react';
import { Link } from '@/i18n/navigation';
import { createClient } from '@/lib/supabase/client';
import { cn } from '@/lib/utils';

export type MarketingUserMenuLabels = {
  signIn: string;
  account: string;
  dashboard: string;
  admin: string;
  signOut: string;
};

type Props = {
  labels: MarketingUserMenuLabels;
  /** 'down' (header) opens the dropdown below; 'up' (mobile sheet footer) opens above. */
  placement?: 'down' | 'up';
};

/** /signin (or /ja/signin) carrying the current page as ?redirect=, except on the auth pages themselves. */
export function signInHref(locale: string, pathname: string | null): string {
  const base = locale === 'ja' ? '/ja/signin' : '/signin';
  if (!pathname || /^\/(ja\/)?(signin|signup)(\/|$)/.test(pathname)) return base;
  return `${base}?redirect=${encodeURIComponent(pathname)}`;
}

/**
 * Account control for the green marketing header (README "Header": "Sign in"
 * in #F6F1E2). Same session logic as components/layout/user-menu.tsx.
 *
 * Logged out: a "Sign in" text link to /signin?redirect=<current page>.
 * Logged in: a circular initial avatar; click opens Dashboard / Admin / Sign out.
 */
export function MarketingUserMenu({ labels, placement = 'down' }: Props) {
  const router = useRouter();
  const pathname = usePathname();
  const locale = useLocale();
  const [user, setUser] = useState<{ name: string; email: string } | null>(null);
  const [isAdmin, setIsAdmin] = useState(false);
  const [loading, setLoading] = useState(true);
  const [open, setOpen] = useState(false);
  const wrapperRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    const supabase = createClient();

    async function loadUser() {
      const { data: { session } } = await supabase.auth.getSession();
      if (session?.user) {
        const meta = session.user.user_metadata as { full_name?: string; name?: string } | null;
        setUser({
          name: meta?.full_name || meta?.name || session.user.email?.split('@')[0] || '',
          email: session.user.email || '',
        });
        const { data: profile } = await supabase
          .from('users')
          .select('role')
          .eq('id', session.user.id)
          .single();
        setIsAdmin(profile?.role === 'admin');
      } else {
        setUser(null);
        setIsAdmin(false);
      }
      setLoading(false);
    }

    void loadUser();

    const { data: { subscription } } = supabase.auth.onAuthStateChange((_evt, session) => {
      if (session?.user) {
        const meta = session.user.user_metadata as { full_name?: string; name?: string } | null;
        setUser({
          name: meta?.full_name || meta?.name || session.user.email?.split('@')[0] || '',
          email: session.user.email || '',
        });
      } else {
        setUser(null);
        setIsAdmin(false);
      }
    });

    return () => subscription.unsubscribe();
  }, []);

  useEffect(() => {
    if (!open) return;
    function clickOutside(e: MouseEvent) {
      if (wrapperRef.current && !wrapperRef.current.contains(e.target as Node)) setOpen(false);
    }
    function escape(e: KeyboardEvent) {
      if (e.key === 'Escape') setOpen(false);
    }
    document.addEventListener('mousedown', clickOutside);
    document.addEventListener('keydown', escape);
    return () => {
      document.removeEventListener('mousedown', clickOutside);
      document.removeEventListener('keydown', escape);
    };
  }, [open]);

  async function handleSignOut() {
    const supabase = createClient();
    await supabase.auth.signOut();
    setOpen(false);
    setUser(null);
    setIsAdmin(false);
    router.refresh();
  }

  if (loading) return <div className="h-11 w-11" />;

  if (!user) {
    return (
      <NextLink
        href={signInHref(locale, pathname)}
        className="inline-flex min-h-[44px] items-center text-[15px] text-hv-sand-100 transition-colors hover:text-hv-amber"
      >
        {labels.signIn}
      </NextLink>
    );
  }

  const initial = (user.name || user.email || '?').trim().charAt(0).toUpperCase();

  const itemClass = cn(
    'flex min-h-[44px] w-full items-center gap-3 rounded-[8px] px-3 text-left text-[15px]',
    'text-hv-ink-700 transition-colors hover:bg-hv-sand-200 hover:text-hv-green-900',
  );

  return (
    <div ref={wrapperRef} className="relative">
      <button
        type="button"
        onClick={() => setOpen((v) => !v)}
        aria-haspopup="menu"
        aria-expanded={open}
        aria-label={labels.account}
        className={cn(
          'inline-flex h-11 w-11 items-center justify-center rounded-full',
          'border border-hv-green-600 bg-hv-green-800 font-hv-display text-[16px] font-bold text-hv-sand-100',
          'transition-colors hover:border-hv-amber',
          'focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-hv-amber',
        )}
      >
        {initial}
      </button>

      {open && (
        <div
          role="menu"
          className={cn(
            'absolute right-0 z-[210] min-w-[230px] rounded-[14px] border border-hv-sand-300 bg-hv-sand-50 p-1.5 shadow-hv-panel',
            placement === 'up' ? 'bottom-full mb-2' : 'top-full mt-2',
          )}
        >
          <div className="mb-1 border-b border-hv-sand-300 px-3 py-2">
            <div className="truncate text-[14px] font-semibold text-hv-green-900">{user.name}</div>
            <div className="truncate text-[13px] text-hv-ink-500">{user.email}</div>
          </div>

          <Link href="/learn/dashboard" onClick={() => setOpen(false)} className={itemClass} role="menuitem">
            <LayoutDashboard size={16} aria-hidden />
            {labels.dashboard}
          </Link>

          {isAdmin && (
            <Link href="/admin" onClick={() => setOpen(false)} className={itemClass} role="menuitem">
              <Shield size={16} aria-hidden />
              {labels.admin}
            </Link>
          )}

          <button type="button" onClick={() => void handleSignOut()} className={itemClass} role="menuitem">
            <LogOut size={16} aria-hidden />
            {labels.signOut}
          </button>
        </div>
      )}
    </div>
  );
}
