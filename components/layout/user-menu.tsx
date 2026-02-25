'use client';

import { useState, useEffect, useRef } from 'react';
import { useRouter } from 'next/navigation';
import { LogOut, LayoutDashboard, Shield, User } from 'lucide-react';
import { Link } from '@/i18n/navigation';
import { createClient } from '@/lib/supabase/client';
import { cn } from '@/lib/utils';

type UserMenuLabels = {
  signIn: string;
  dashboard: string;
  admin: string;
  signOut: string;
};

type UserMenuProps = {
  labels: UserMenuLabels;
  dropdownPosition?: 'below' | 'above';
};

export function UserMenu({ labels, dropdownPosition = 'below' }: UserMenuProps) {
  const router = useRouter();
  const [user, setUser] = useState<{ name: string; email: string } | null>(null);
  const [isAdmin, setIsAdmin] = useState(false);
  const [open, setOpen] = useState(false);
  const [loading, setLoading] = useState(true);
  const menuRef = useRef<HTMLDivElement>(null);

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

  // Close dropdown on outside click
  useEffect(() => {
    function handleClickOutside(e: MouseEvent) {
      if (menuRef.current && !menuRef.current.contains(e.target as Node)) {
        setOpen(false);
      }
    }
    if (open) {
      document.addEventListener('mousedown', handleClickOutside);
      return () => document.removeEventListener('mousedown', handleClickOutside);
    }
  }, [open]);

  // Close on Escape
  useEffect(() => {
    function handleEscape(e: KeyboardEvent) {
      if (e.key === 'Escape') setOpen(false);
    }
    if (open) {
      document.addEventListener('keydown', handleEscape);
      return () => document.removeEventListener('keydown', handleEscape);
    }
  }, [open]);

  async function handleSignOut() {
    const supabase = createClient();
    await supabase.auth.signOut();
    setUser(null);
    setIsAdmin(false);
    setOpen(false);
    router.refresh();
  }

  if (loading) {
    return <div className="min-h-[44px] min-w-[44px]" />;
  }

  // Logged out: show Sign In link
  if (!user) {
    return (
      <Link
        href="/learn/auth"
        className={cn(
          'inline-flex items-center gap-1.5 px-3 py-2 rounded',
          'text-sm text-fg-secondary hover:text-fg-primary',
          'transition-colors duration-[var(--duration-fast)]',
        )}
      >
        <User size={16} />
        <span className="hidden sm:inline">{labels.signIn}</span>
      </Link>
    );
  }

  // Logged in: avatar + dropdown
  const initials = user.name
    .split(' ')
    .map((w) => w[0])
    .join('')
    .toUpperCase()
    .slice(0, 2) || '?';

  return (
    <div ref={menuRef} className="relative">
      <button
        onClick={() => setOpen(!open)}
        className={cn(
          'inline-flex items-center justify-center',
          'h-8 w-8 rounded-full',
          'bg-accent-teal/20 text-accent-teal',
          'text-xs font-semibold',
          'hover:bg-accent-teal/30',
          'transition-colors duration-[var(--duration-fast)]',
          'focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-accent-teal',
        )}
        aria-label={user.name}
        aria-expanded={open}
        aria-haspopup="true"
      >
        {initials}
      </button>

      {open && (
        <div
          className={cn(
            'absolute w-52',
            'rounded-lg border border-border-secondary',
            'bg-bg-secondary shadow-lg',
            'py-1 z-[250]',
            dropdownPosition === 'above'
              ? 'bottom-full mb-2 left-0'
              : 'top-full mt-2 right-0',
          )}
          role="menu"
        >
          {/* User info */}
          <div className="px-3 py-2 border-b border-border-secondary">
            <p className="text-sm font-medium text-fg-primary truncate">{user.name}</p>
            <p className="text-xs text-fg-muted truncate">{user.email}</p>
          </div>

          {/* Links */}
          <Link
            href="/learn/dashboard"
            onClick={() => setOpen(false)}
            className="flex items-center gap-2 px-3 py-2 text-sm text-fg-secondary hover:text-fg-primary hover:bg-bg-tertiary transition-colors"
            role="menuitem"
          >
            <LayoutDashboard size={16} />
            {labels.dashboard}
          </Link>

          {isAdmin && (
            <Link
              href="/admin"
              onClick={() => setOpen(false)}
              className="flex items-center gap-2 px-3 py-2 text-sm text-fg-secondary hover:text-fg-primary hover:bg-bg-tertiary transition-colors"
              role="menuitem"
            >
              <Shield size={16} />
              {labels.admin}
            </Link>
          )}

          <div className="border-t border-border-secondary my-1" />

          <button
            onClick={handleSignOut}
            className="flex items-center gap-2 w-full px-3 py-2 text-sm text-fg-secondary hover:text-fg-primary hover:bg-bg-tertiary transition-colors"
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
