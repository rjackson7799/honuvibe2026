'use client';

import { usePathname } from 'next/navigation';
import { useTranslations } from 'next-intl';
import Link from 'next/link';
import { cn } from '@/lib/utils';
import { LayoutDashboard, BookOpen, GraduationCap, Library, Users, FileText } from 'lucide-react';
import { ThemeToggle } from '@/components/layout/theme-toggle';
import { LangToggle } from '@/components/layout/lang-toggle';
import { UserMenu } from '@/components/layout/user-menu';

const navItems = [
  { href: '/admin', label: 'Dashboard', icon: LayoutDashboard, exact: true },
  { href: '/admin/courses', label: 'Courses', icon: BookOpen },
  { href: '/admin/instructors', label: 'Instructors', icon: GraduationCap },
  { href: '/admin/library', label: 'Library', icon: Library },
  { href: '/admin/students', label: 'Students', icon: Users },
  { href: '/admin/applications', label: 'Applications', icon: FileText },
];

export function AdminNav() {
  const pathname = usePathname();
  const t = useTranslations('nav');
  // Strip locale prefix for matching
  const logicalPath = pathname.replace(/^\/(en|ja)/, '') || '/';

  const userMenuLabels = {
    signIn: t('sign_in'),
    dashboard: t('dashboard'),
    admin: t('admin'),
    signOut: t('sign_out'),
  };

  return (
    <>
      {/* Desktop sidebar */}
      <nav className="hidden md:flex flex-col w-56 shrink-0 border-r border-border-default bg-bg-secondary sticky top-14 md:top-16 h-[calc(100vh-3.5rem)] md:h-[calc(100vh-4rem)] overflow-y-auto p-4 gap-1">
        <div className="mb-6 px-3">
          <h2 className="text-sm font-semibold text-fg-primary uppercase tracking-wider">Admin</h2>
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
              className={cn(
                'flex items-center gap-3 px-3 py-2.5 rounded-lg text-sm transition-colors duration-[var(--duration-fast)]',
                isActive
                  ? 'bg-accent-teal/10 text-accent-teal font-medium'
                  : 'text-fg-secondary hover:text-fg-primary hover:bg-bg-tertiary',
              )}
            >
              <Icon size={18} />
              {item.label}
            </Link>
          );
        })}

        {/* Bottom controls — pushed down with mt-auto */}
        <div className="mt-auto pt-4 border-t border-border-default flex items-center gap-1">
          <ThemeToggle />
          <LangToggle />
          <div className="ml-auto">
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
              {item.label}
            </Link>
          );
        })}
      </nav>
    </>
  );
}
