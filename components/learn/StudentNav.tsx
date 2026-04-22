'use client';

import { useState, useEffect } from 'react';
import { usePathname } from 'next/navigation';
import { useTranslations } from 'next-intl';
import Link from 'next/link';
import { cn } from '@/lib/utils';
import {
  LayoutDashboard,
  BookOpen,
  Lock,
  Users,
  CreditCard,
  UserCircle,
  PanelLeftClose,
  PanelLeftOpen,
  GraduationCap,
} from 'lucide-react';
import { ThemeToggle } from '@/components/layout/theme-toggle';
import { LangToggle } from '@/components/layout/lang-toggle';
import { UserMenu } from '@/components/layout/user-menu';
import { createClient } from '@/lib/supabase/client';

const STORAGE_KEY = 'honuvibe-sidebar-collapsed';

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
  { href: '/learn/dashboard/community', labelKey: 'nav_community', icon: Users, exact: false },
  { href: '/learn/dashboard/billing', labelKey: 'nav_billing', icon: CreditCard, exact: false },
  { href: '/learn/dashboard/settings', labelKey: 'nav_profile', icon: UserCircle, exact: false },
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
  const t = useTranslations('dashboard');
  const tInstructor = useTranslations('instructor');
  const navT = useTranslations('nav');
  const [collapsed, setCollapsed] = useState(false);
  const [isInstructor, setIsInstructor] = useState(false);

  // Load collapse state from localStorage
  useEffect(() => {
    const stored = localStorage.getItem(STORAGE_KEY);
    if (stored === 'true') setCollapsed(true);
  }, []);

  // Check if user is an instructor
  useEffect(() => {
    async function checkInstructor() {
      const supabase = createClient();
      const { data: { session } } = await supabase.auth.getSession();
      if (!session?.user) return;

      const { data: profile } = await supabase
        .from('users')
        .select('role')
        .eq('id', session.user.id)
        .single();

      if (profile?.role === 'instructor' || profile?.role === 'admin') {
        // Confirm they have an instructor profile
        const { data: instrProfile } = await supabase
          .from('instructor_profiles')
          .select('id')
          .eq('user_id', session.user.id)
          .eq('is_active', true)
          .maybeSingle();

        setIsInstructor(!!instrProfile);
      }
    }
    checkInstructor();
  }, []);

  const toggleCollapse = () => {
    const next = !collapsed;
    setCollapsed(next);
    localStorage.setItem(STORAGE_KEY, String(next));
  };

  // Strip locale prefix for matching
  const logicalPath = pathname.replace(/^\/(en|ja)/, '') || '/';

  // Build nav items — insert instructor item after "Community" if applicable
  const navItems: NavItem[] = isInstructor
    ? [
        ...baseNavItems.slice(0, 4), // Home, My Courses, The Vault, Community
        instructorNavItem,
        ...baseNavItems.slice(4),    // Billing, Settings
      ]
    : baseNavItems;

  const getLabel = (item: NavItem) =>
    item.ns === 'instructor' ? tInstructor(item.labelKey) : t(item.labelKey);

  const userMenuLabels = {
    signIn: navT('sign_in'),
    dashboard: navT('dashboard'),
    admin: navT('admin'),
    signOut: navT('sign_out'),
  };

  return (
    <>
      {/* Desktop sidebar */}
      <nav
        className={cn(
          'hidden md:flex flex-col shrink-0 border-r border-border-default bg-bg-secondary sticky top-0 h-screen p-3 gap-2 transition-all duration-[var(--duration-normal)]',
          collapsed ? 'w-16' : 'w-56',
        )}
      >
        <div className={cn('flex items-center', collapsed ? 'flex-col gap-1' : 'justify-between px-1')}>
          <div className={cn('flex items-center', collapsed ? 'flex-col gap-1' : 'gap-1')}>
            <ThemeToggle />
            <LangToggle compact={collapsed} />
          </div>
          <button
            onClick={toggleCollapse}
            className="text-fg-tertiary hover:text-fg-primary transition-colors p-1 rounded-md hover:bg-bg-tertiary"
            aria-label={collapsed ? 'Expand sidebar' : 'Collapse sidebar'}
          >
            {collapsed ? <PanelLeftOpen size={18} /> : <PanelLeftClose size={18} />}
          </button>
        </div>

        <div className="min-h-0 flex-1 overflow-y-auto">
          <div className="flex flex-col gap-1">
            {navItems.map((item) => {
              const isActive = item.exact
                ? logicalPath === item.href
                : logicalPath.startsWith(item.href);
              const Icon = item.icon;
              const label = getLabel(item);
              return (
                <Link
                  key={item.href}
                  href={item.href}
                  title={collapsed ? label : undefined}
                  className={cn(
                    'flex items-center rounded-lg text-sm transition-colors duration-[var(--duration-fast)]',
                    collapsed ? 'justify-center px-2 py-2.5' : 'gap-3 px-3 py-2.5',
                    isActive
                      ? 'bg-accent-teal/10 text-accent-teal font-medium'
                      : 'text-fg-secondary hover:text-fg-primary hover:bg-bg-tertiary',
                  )}
                >
                  <Icon size={18} />
                  {!collapsed && label}
                </Link>
              );
            })}
          </div>
        </div>

        {/* Bottom controls — pushed down with mt-auto */}
        <div className="mt-auto pt-4 border-t border-border-default">
          <UserMenu labels={userMenuLabels} compact={collapsed} showDashboardLink={false} />
        </div>
      </nav>

      {/* Mobile bottom nav */}
      <nav className="md:hidden fixed bottom-0 left-0 right-0 z-50 border-t border-border-default bg-bg-secondary flex">
        {navItems.map((item) => {
          const isActive = item.exact
            ? logicalPath === item.href
            : logicalPath.startsWith(item.href);
          const Icon = item.icon;
          const label = getLabel(item);
          return (
            <Link
              key={item.href}
              href={item.href}
              className={cn(
                'flex-1 flex flex-col items-center gap-1 py-3 text-xs transition-colors',
                isActive ? 'text-accent-teal' : 'text-fg-tertiary',
              )}
            >
              <Icon size={20} />
              <span className="truncate max-w-full px-1">{label}</span>
            </Link>
          );
        })}
      </nav>
    </>
  );
}
