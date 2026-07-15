'use client';

import { useEffect, useState } from 'react';
import { usePathname, useRouter } from 'next/navigation';
import { useTranslations } from 'next-intl';
import Link from 'next/link';
import { cn } from '@/lib/utils';
import {
  LayoutDashboard,
  BookOpen,
  Lock,
  FlaskConical,
  Route,
  Users,
  GraduationCap,
  CalendarDays,
  Shield,
  LogOut,
} from 'lucide-react';
import { createClient } from '@/lib/supabase/client';
import { HonuVibeWordmark } from '@/components/ui/honuvibe-wordmark';

type NavItem = {
  href: string;
  labelKey: string;
  icon: typeof LayoutDashboard;
  exact: boolean;
  ns?: string;
};

const baseNavItems: NavItem[] = [
  { href: '/learn/dashboard', labelKey: 'nav_dashboard', icon: LayoutDashboard, exact: true },
  { href: '/learn/dashboard/courses', labelKey: 'nav_courses', icon: BookOpen, exact: false },
  { href: '/learn/vault', labelKey: 'nav_vault', icon: Lock, exact: false },
  { href: '/learn/vault/workbench', labelKey: 'nav_workbench', icon: FlaskConical, exact: false },
  { href: '/learn/paths', labelKey: 'nav_study_paths', icon: Route, exact: false },
  { href: '/learn/dashboard/events', labelKey: 'nav_events', icon: CalendarDays, exact: false },
  { href: '/learn/dashboard/community', labelKey: 'nav_community', icon: Users, exact: false },
];

const instructorNavItem: NavItem = {
  href: '/learn/dashboard/my-classes',
  labelKey: 'my_classes',
  icon: GraduationCap,
  exact: false,
  ns: 'instructor',
};

export function StudentNav() {
  const pathname = usePathname();
  const router = useRouter();
  const t = useTranslations('dashboard');
  const tInstructor = useTranslations('instructor');
  const navT = useTranslations('nav');

  const [isInstructor, setIsInstructor] = useState(false);
  const [isAdmin, setIsAdmin] = useState(false);

  useEffect(() => {
    async function check() {
      const supabase = createClient();
      const { data: { session } } = await supabase.auth.getSession();
      if (!session?.user) return;

      const { data: profile } = await supabase
        .from('users')
        .select('role')
        .eq('id', session.user.id)
        .single();

      if (profile?.role === 'admin') setIsAdmin(true);

      if (profile?.role === 'instructor' || profile?.role === 'admin') {
        const { data: instrProfile } = await supabase
          .from('instructor_profiles')
          .select('id')
          .eq('user_id', session.user.id)
          .eq('is_active', true)
          .maybeSingle();

        setIsInstructor(!!instrProfile);
      }
    }
    check();
  }, []);

  async function handleSignOut() {
    const supabase = createClient();
    await supabase.auth.signOut();
    router.refresh();
  }

  const logicalPath = pathname.replace(/^\/(en|ja)/, '') || '/';

  const navItems: NavItem[] = isInstructor
    ? [...baseNavItems.slice(0, 4), instructorNavItem, ...baseNavItems.slice(4)]
    : baseNavItems;

  // Mobile bottom bar: show the primary destinations only (events/community live in
  // the full sidebar). Profile/Billing/Notifications/Sign-out are reachable from the
  // top bar, which renders on mobile too.
  const mobileItems = navItems
    .filter((i) => i.href !== '/learn/dashboard/events' && i.href !== '/learn/dashboard/community')
    .slice(0, 6);

  // Most-specific match wins, so a parent entry (Vault) doesn't stay highlighted
  // when a nested entry (Workbench at /learn/vault/workbench) is the active one.
  const matchesPath = (item: NavItem) =>
    item.exact
      ? logicalPath === item.href
      : logicalPath === item.href || logicalPath.startsWith(`${item.href}/`);
  const isItemActive = (item: NavItem) =>
    matchesPath(item) &&
    !navItems.some(
      (other) => other !== item && other.href.length > item.href.length && matchesPath(other),
    );

  const getLabel = (item: NavItem) =>
    item.ns === 'instructor' ? tInstructor(item.labelKey) : t(item.labelKey);

  const itemClass = (active: boolean, muted = false) =>
    cn(
      'w-full flex items-center gap-2.5 px-3 py-2.5 rounded-[9px] text-[13.5px] text-left transition-all duration-[var(--duration-fast)]',
      active
        ? 'bg-[color:var(--accent-teal)] text-white font-semibold shadow-sm'
        : muted
          ? 'text-fg-tertiary hover:text-fg-secondary hover:bg-[rgba(26,43,51,0.05)]'
          : 'text-fg-secondary hover:text-fg-primary hover:bg-[rgba(26,43,51,0.05)] font-medium',
    );

  return (
    <>
      {/* Desktop sidebar */}
      <nav className="hidden md:flex flex-col shrink-0 w-[220px] h-screen sticky top-0 bg-bg-tertiary border-r border-border-default">
        {/* Logo */}
        <div className="px-5 h-14 border-b border-border-default flex items-center">
          <HonuVibeWordmark />
        </div>

        {/* Main nav */}
        <div className="flex-1 min-h-0 overflow-y-auto px-2.5 py-3">
          <div className="flex flex-col gap-0.5">
            {navItems.map((item) => {
              const isActive = isItemActive(item);
              const Icon = item.icon;
              return (
                <Link key={item.href} href={item.href} className={itemClass(isActive)}>
                  <Icon size={17} className="shrink-0 opacity-90" />
                  <span className="truncate">{getLabel(item)}</span>
                </Link>
              );
            })}
          </div>
        </div>

        {/* Bottom: admin (if applicable) + sign out */}
        <div className="border-t border-border-default px-2.5 py-3 flex flex-col gap-0.5">
          {isAdmin && (
            <Link href="/admin" className={itemClass(false, true)}>
              <Shield size={17} className="shrink-0 opacity-90" />
              <span className="truncate">{navT('admin')}</span>
            </Link>
          )}
          <button type="button" onClick={handleSignOut} className={itemClass(false, true)}>
            <LogOut size={17} className="shrink-0 opacity-90" />
            <span className="truncate">{navT('sign_out')}</span>
          </button>
        </div>
      </nav>

      {/* Mobile bottom nav — restyled for canvas palette */}
      <nav className="md:hidden fixed bottom-0 left-0 right-0 z-50 bg-bg-tertiary border-t border-border-default flex">
        {mobileItems.map((item) => {
          const isActive = isItemActive(item);
          const Icon = item.icon;
          return (
            <Link
              key={item.href}
              href={item.href}
              className={cn(
                'flex-1 flex flex-col items-center gap-1 py-2.5 text-[10.5px] font-medium transition-colors',
                isActive
                  ? 'text-[color:var(--accent-teal)]'
                  : 'text-fg-tertiary hover:text-fg-secondary',
              )}
            >
              <Icon size={18} />
              <span className="truncate max-w-full px-1">{getLabel(item)}</span>
            </Link>
          );
        })}
      </nav>
    </>
  );
}
