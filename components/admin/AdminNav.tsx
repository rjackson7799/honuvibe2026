'use client';

import { usePathname } from 'next/navigation';
import Link from 'next/link';
import { cn } from '@/lib/utils';
import { LayoutDashboard, BookOpen, Users, FileText, Upload } from 'lucide-react';

const navItems = [
  { href: '/admin', label: 'Dashboard', icon: LayoutDashboard, exact: true },
  { href: '/admin/courses', label: 'Courses', icon: BookOpen },
  { href: '/admin/students', label: 'Students', icon: Users },
  { href: '/admin/applications', label: 'Applications', icon: FileText },
];

export function AdminNav() {
  const pathname = usePathname();
  // Strip locale prefix for matching
  const logicalPath = pathname.replace(/^\/(en|ja)/, '') || '/';

  return (
    <>
      {/* Desktop sidebar */}
      <nav className="hidden md:flex flex-col w-56 shrink-0 border-r border-border-default bg-bg-secondary min-h-screen p-4 gap-1">
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
