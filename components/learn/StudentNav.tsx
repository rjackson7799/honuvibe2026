'use client';

import { useState, useEffect } from 'react';
import { usePathname } from 'next/navigation';
import { useTranslations } from 'next-intl';
import Link from 'next/link';
import { cn } from '@/lib/utils';
import {
  LayoutDashboard,
  BookOpen,
  Calendar,
  Library,
  PlaySquare,
  Users,
  Settings,
  PanelLeftClose,
  PanelLeftOpen,
} from 'lucide-react';
import { ThemeToggle } from '@/components/layout/theme-toggle';
import { LangToggle } from '@/components/layout/lang-toggle';
import { UserMenu } from '@/components/layout/user-menu';

const STORAGE_KEY = 'honuvibe-sidebar-collapsed';

const navItems = [
  { href: '/learn/dashboard', labelKey: 'nav_overview', icon: LayoutDashboard, exact: true },
  { href: '/learn/dashboard/courses', labelKey: 'nav_courses', icon: BookOpen, exact: false },
  { href: '/learn/dashboard/schedule', labelKey: 'nav_schedule', icon: Calendar, exact: false },
  { href: '/learn/dashboard/resources', labelKey: 'nav_resources', icon: Library, exact: false },
  { href: '/learn/dashboard/my-library', labelKey: 'nav_my_library', icon: PlaySquare, exact: false },
  { href: '/learn/dashboard/community', labelKey: 'nav_community', icon: Users, exact: false },
  { href: '/learn/dashboard/settings', labelKey: 'nav_settings', icon: Settings, exact: false },
];

export function StudentNav() {
  const pathname = usePathname();
  const t = useTranslations('dashboard');
  const navT = useTranslations('nav');
  const [collapsed, setCollapsed] = useState(false);

  // Load collapse state from localStorage
  useEffect(() => {
    const stored = localStorage.getItem(STORAGE_KEY);
    if (stored === 'true') setCollapsed(true);
  }, []);

  const toggleCollapse = () => {
    const next = !collapsed;
    setCollapsed(next);
    localStorage.setItem(STORAGE_KEY, String(next));
  };

  // Strip locale prefix for matching
  const logicalPath = pathname.replace(/^\/(en|ja)/, '') || '/';

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
          'hidden md:flex flex-col shrink-0 border-r border-border-default bg-bg-secondary sticky top-0 h-screen overflow-y-auto p-4 gap-1 transition-all duration-[var(--duration-normal)]',
          collapsed ? 'w-16' : 'w-56',
        )}
      >
        <div className={cn('mb-4 flex items-center', collapsed ? 'justify-center' : 'justify-between px-3')}>
          {!collapsed && (
            <h2 className="text-sm font-semibold text-fg-primary uppercase tracking-wider">
              {t('heading_overview')}
            </h2>
          )}
          <button
            onClick={toggleCollapse}
            className="text-fg-tertiary hover:text-fg-primary transition-colors p-1 rounded-md hover:bg-bg-tertiary"
            aria-label={collapsed ? 'Expand sidebar' : 'Collapse sidebar'}
          >
            {collapsed ? <PanelLeftOpen size={18} /> : <PanelLeftClose size={18} />}
          </button>
        </div>

        {navItems.map((item) => {
          const isActive = item.exact
            ? logicalPath === item.href
            : logicalPath.startsWith(item.href);
          const Icon = item.icon;
          return (
            <Link
              key={item.href}
              href={item.href}
              title={collapsed ? t(item.labelKey) : undefined}
              className={cn(
                'flex items-center rounded-lg text-sm transition-colors duration-[var(--duration-fast)]',
                collapsed ? 'justify-center px-2 py-2.5' : 'gap-3 px-3 py-2.5',
                isActive
                  ? 'bg-accent-teal/10 text-accent-teal font-medium'
                  : 'text-fg-secondary hover:text-fg-primary hover:bg-bg-tertiary',
              )}
            >
              <Icon size={18} />
              {!collapsed && t(item.labelKey)}
            </Link>
          );
        })}

        {/* Bottom controls — pushed down with mt-auto */}
        <div
          className={cn(
            'mt-auto pt-4 border-t border-border-default',
            collapsed ? 'flex flex-col items-center gap-1' : 'flex items-center gap-1',
          )}
        >
          <ThemeToggle />
          <LangToggle compact={collapsed} />
          <div className={collapsed ? '' : 'ml-auto'}>
            <UserMenu labels={userMenuLabels} dropdownPosition="above" />
          </div>
        </div>
      </nav>

      {/* Mobile bottom nav */}
      <nav className="md:hidden fixed bottom-0 left-0 right-0 z-50 border-t border-border-default bg-bg-secondary flex">
        {navItems.map((item) => {
          const isActive = item.exact
            ? logicalPath === item.href
            : logicalPath.startsWith(item.href);
          const Icon = item.icon;
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
              <span className="truncate max-w-full px-1">{t(item.labelKey)}</span>
            </Link>
          );
        })}
      </nav>
    </>
  );
}
