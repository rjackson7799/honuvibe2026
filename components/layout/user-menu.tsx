'use client';

import { useState, useEffect } from 'react';
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
  compact?: boolean;
  direction?: 'vertical' | 'horizontal';
  onNavigate?: () => void;
};

export function UserMenu({ labels, compact = false, direction = 'vertical', onNavigate }: UserMenuProps) {
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
      <Link href="/learn/dashboard" onClick={onNavigate} className={linkClass} title={compact ? labels.dashboard : undefined}>
        <LayoutDashboard size={18} />
        {!compact && labels.dashboard}
      </Link>

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
