'use client';

import { useEffect, useRef, useState } from 'react';
import { useRouter } from 'next/navigation';
import { LayoutDashboard, LogOut, Shield, User } from 'lucide-react';
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
};

/**
 * Light-themed avatar dropdown for the marketing nav. Mirrors the logic in
 * components/layout/user-menu.tsx (variant="dropdown") but renders against
 * the --m-* token set so it composes with the marketing shell.
 *
 * Logged out: renders a teal "Student Login" pill linking to /learn/auth.
 * Logged in: shows a circular initial avatar; click opens a dropdown with
 * Dashboard / Admin / Sign out.
 */
export function MarketingUserMenu({ labels }: Props) {
  const router = useRouter();
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

  if (loading) return <div className="h-9 w-9" />;

  if (!user) {
    return (
      <Link
        href="/learn/auth"
        className={cn(
          'inline-flex items-center gap-1.5 rounded-md px-3 py-1.5',
          'border border-[var(--m-border-teal)] bg-[var(--m-accent-teal-soft)]',
          'text-[13px] font-semibold text-[var(--m-accent-teal)]',
          'transition-colors hover:bg-[rgba(15,169,160,0.14)]',
        )}
      >
        <User size={15} />
        <span>{labels.signIn}</span>
      </Link>
    );
  }

  const initial = (user.name || user.email || '?').trim().charAt(0).toUpperCase();

  const itemClass = cn(
    'flex w-full items-center gap-3 rounded-md px-3 py-2.5 text-left text-sm',
    'text-[var(--m-ink-secondary)] transition-colors',
    'hover:bg-[var(--m-sand)] hover:text-[var(--m-ink-primary)]',
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
          'inline-flex h-9 w-9 items-center justify-center rounded-full',
          'border border-[var(--m-border-default)] bg-[var(--m-white)]',
          'text-sm font-bold text-[var(--m-ink-primary)]',
          'transition-all hover:border-[var(--m-border-teal)] hover:shadow-[var(--m-shadow-xs)]',
          'focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[var(--m-accent-teal)] focus-visible:ring-offset-2 focus-visible:ring-offset-[var(--m-canvas)]',
        )}
      >
        {initial}
      </button>

      {open && (
        <div
          role="menu"
          className={cn(
            'absolute right-0 top-full z-[210] mt-2 min-w-[220px]',
            'rounded-xl border border-[var(--m-border-soft)] bg-[var(--m-white)]',
            'p-1.5 shadow-[var(--m-shadow-md)]',
          )}
        >
          <div className="mb-1 border-b border-[var(--m-border-soft)] px-3 py-2">
            <div className="truncate text-sm font-semibold text-[var(--m-ink-primary)]">{user.name}</div>
            <div className="truncate text-xs text-[var(--m-ink-tertiary)]">{user.email}</div>
          </div>

          <Link href="/learn/dashboard" onClick={() => setOpen(false)} className={itemClass} role="menuitem">
            <LayoutDashboard size={16} />
            {labels.dashboard}
          </Link>

          {isAdmin && (
            <Link href="/admin" onClick={() => setOpen(false)} className={itemClass} role="menuitem">
              <Shield size={16} />
              {labels.admin}
            </Link>
          )}

          <button
            type="button"
            onClick={() => void handleSignOut()}
            className={itemClass}
            role="menuitem"
          >
            <LogOut size={16} />
            {labels.signOut}
          </button>
        </div>
      )}
    </div>
  );
}
