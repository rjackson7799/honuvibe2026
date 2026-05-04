'use client';

import { usePathname } from 'next/navigation';
import { useTranslations } from 'next-intl';
import Link from 'next/link';
import { cn } from '@/lib/utils';
import { LayoutDashboard, BookOpen, GraduationCap, Lock, Users, FileText, DollarSign, ClipboardList, Handshake, Inbox, UserPlus, FileEdit } from 'lucide-react';
import { ThemeToggle } from '@/components/layout/theme-toggle';
import { LangToggle } from '@/components/layout/lang-toggle';
import { UserMenu } from '@/components/layout/user-menu';
import { HonuVibeWordmark } from '@/components/ui/honuvibe-wordmark';

const navItems = [
  { href: '/admin', label: 'Dashboard', icon: LayoutDashboard, exact: true },
  { href: '/admin/courses', label: 'Courses', icon: BookOpen },
  { href: '/admin/courses/proposals', label: 'Proposals', icon: FileEdit },
  { href: '/admin/instructors', label: 'Instructors', icon: GraduationCap },
  { href: '/admin/instructor-applications', label: 'Instructor Apps', icon: UserPlus },
  { href: '/admin/vault', label: 'Vault', icon: Lock },
  { href: '/admin/students', label: 'Students', icon: Users },
  { href: '/admin/partners', label: 'Partners', icon: Handshake },
  { href: '/admin/applications', label: 'Applications', icon: FileText },
  { href: '/admin/partnership-inquiries', label: 'Partnership Inquiries', icon: Inbox },
  { href: '/admin/surveys', label: 'Surveys', icon: ClipboardList },
  { href: '/admin/revenue', label: 'Revenue', icon: DollarSign },
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
      <nav className="hidden md:flex flex-col shrink-0 w-56 h-screen sticky top-0 bg-bg-secondary border-r border-border-default">
        {/* Logo */}
        <div className="px-5 pt-5 pb-4 border-b border-border-default flex items-center">
          <HonuVibeWordmark />
        </div>

        {/* Lang toggle */}
        <div className="px-4 py-3 border-b border-border-default">
          <LangToggle />
        </div>

        {/* Main nav */}
        <div className="flex-1 min-h-0 overflow-y-auto px-2.5 py-3">
          <div className="flex flex-col gap-1">
            {navItems.map((item) => {
              const isActive = item.exact
                ? logicalPath === item.href
                : item.href === '/admin/courses'
                  ? logicalPath.startsWith('/admin/courses') &&
                    !logicalPath.startsWith('/admin/courses/proposals')
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
          </div>
        </div>

        {/* Bottom controls */}
        <div className="border-t border-border-default px-2.5 py-3 flex flex-col gap-2">
          <UserMenu labels={userMenuLabels} />
          <div className="flex items-center gap-1">
            <ThemeToggle />
          </div>
        </div>
      </nav>

      {/* Mobile bottom nav */}
      <nav className="md:hidden fixed bottom-0 left-0 right-0 z-50 border-t border-border-default bg-bg-secondary flex">
        {navItems.map((item) => {
          const isActive = item.exact
            ? logicalPath === item.href
            : item.href === '/admin/courses'
              ? logicalPath.startsWith('/admin/courses') &&
                !logicalPath.startsWith('/admin/courses/proposals')
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
