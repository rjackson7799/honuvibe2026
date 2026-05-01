'use client';

import { useState, useEffect, useRef } from 'react';
import { useRouter } from 'next/navigation';
import { LogOut, LayoutDashboard, Shield, User } from 'lucide-react';
import { Link } from '@/i18n/navigation';
import { createClient } from '@/lib/supabase/client';
import { cn } from '@/lib/utils';

type UserMenuLabels = {
  signIn: string;
  studentLogin?: string;
  account?: string;
  dashboard: string;
  admin: string;
  signOut: string;
};

type UserMenuProps = {
  labels: UserMenuLabels;
  compact?: boolean;
  direction?: 'vertical' | 'horizontal';
  variant?: 'row' | 'dropdown';
  onNavigate?: () => void;
  showDashboardLink?: boolean;
};

export function UserMenu({
  labels,
  compact = false,
  direction = 'vertical',
  variant = 'row',
  onNavigate,
  showDashboardLink = true,
}: UserMenuProps) {
  const router = useRouter();
  const [user, setUser] = useState<{ name: string; email: string } | null>(null);
  const [isAdmin, setIsAdmin] = useState(false);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    const supabase = createClient();

    async function loadUser() {
      const { data: { session } } = await supabase.auth.getSession();
      if (session?.user) {
        const meta = session.user.user_metadata;
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

    loadUser();

    const { data: { subscription } } = supabase.auth.onAuthStateChange((_event, session) => {
      if (session?.user) {
        const meta = session.user.user_metadata;
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

  async function handleSignOut() {
    const supabase = createClient();
    await supabase.auth.signOut();
    setUser(null);
    setIsAdmin(false);
    router.refresh();
  }

  if (loading) {
    return <div className="min-h-[44px] min-w-[44px]" />;
  }

  if (variant === 'dropdown') {
    return (
      <DropdownMenu
        user={user}
        isAdmin={isAdmin}
        labels={labels}
        onSignOut={handleSignOut}
        onNavigate={onNavigate}
      />
    );
  }

  if (!user) {
    return (
      <Link
        href="/learn/auth"
        onClick={onNavigate}
        className={cn(
          'inline-flex items-center gap-1.5 px-3 py-2 rounded',
          'text-sm text-fg-secondary hover:text-fg-primary',
          'transition-colors duration-[var(--duration-fast)]',
        )}
      >
        <User size={16} />
        {!compact && <span>{labels.signIn}</span>}
      </Link>
    );
  }

  const linkClass = cn(
    'flex items-center rounded-lg text-sm transition-colors duration-[var(--duration-fast)]',
    compact ? 'justify-center px-2 py-2.5' : 'gap-3 px-3 py-2.5',
    'text-fg-secondary hover:text-fg-primary hover:bg-bg-tertiary',
  );

  return (
    <div className={cn('flex gap-0.5', direction === 'horizontal' ? 'flex-row items-center' : 'flex-col')}>
      {showDashboardLink && (
        <Link href="/learn/dashboard" onClick={onNavigate} className={linkClass} title={compact ? labels.dashboard : undefined}>
          <LayoutDashboard size={18} />
          {!compact && labels.dashboard}
        </Link>
      )}

      {isAdmin && (
        <Link href="/admin" onClick={onNavigate} className={linkClass} title={compact ? labels.admin : undefined}>
          <Shield size={18} />
          {!compact && labels.admin}
        </Link>
      )}

      <button
        onClick={handleSignOut}
        className={cn(linkClass, 'w-full')}
        title={compact ? labels.signOut : undefined}
      >
        <LogOut size={18} />
        {!compact && labels.signOut}
      </button>
    </div>
  );
}

type DropdownMenuProps = {
  user: { name: string; email: string } | null;
  isAdmin: boolean;
  labels: UserMenuLabels;
  onSignOut: () => Promise<void>;
  onNavigate?: () => void;
};

function DropdownMenu({ user, isAdmin, labels, onSignOut, onNavigate }: DropdownMenuProps) {
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

  function handleNavigate() {
    setOpen(false);
    onNavigate?.();
  }

  if (!user) {
    return (
      <Link
        href="/learn/auth"
        onClick={onNavigate}
        className={cn(
          'inline-flex items-center gap-2 px-4 py-2 rounded-md',
          'text-sm font-medium',
          'bg-accent-teal/10 text-accent-teal hover:bg-accent-teal/20',
          'border border-accent-teal/30 hover:border-accent-teal/50',
          'transition-all duration-[var(--duration-fast)]',
        )}
      >
        <User size={15} />
        <span>{labels.studentLogin ?? labels.signIn}</span>
      </Link>
    );
  }

  const initial = (user.name || user.email || '?').trim().charAt(0).toUpperCase();
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
        aria-label={labels.account ?? user.name}
        className={cn(
          'inline-flex items-center justify-center',
          'w-9 h-9 rounded-full',
          'bg-bg-tertiary hover:bg-bg-glass',
          'border border-border-secondary hover:border-border-hover',
          'text-sm font-semibold text-fg-primary',
          'transition-all duration-[var(--duration-fast)]',
        )}
      >
        {initial}
      </button>

      {open && (
        <div
          role="menu"
          className={cn(
            'absolute right-0 top-full mt-2',
            'min-w-[220px] py-2 px-1.5',
            'rounded-lg border border-border-secondary',
            'bg-bg-glass backdrop-blur-[24px] backdrop-saturate-[180%]',
            'shadow-lg',
            'z-[210]',
          )}
        >
          <div className="px-3 py-2 mb-1 border-b border-border-secondary">
            <div className="text-sm font-medium text-fg-primary truncate">{user.name}</div>
            <div className="text-xs text-fg-tertiary truncate">{user.email}</div>
          </div>

          <Link href="/learn/dashboard" onClick={handleNavigate} className={itemClass} role="menuitem">
            <LayoutDashboard size={16} />
            {labels.dashboard}
          </Link>

          {isAdmin && (
            <Link href="/admin" onClick={handleNavigate} className={itemClass} role="menuitem">
              <Shield size={16} />
              {labels.admin}
            </Link>
          )}

          <button
            onClick={() => {
              setOpen(false);
              void onSignOut();
            }}
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
