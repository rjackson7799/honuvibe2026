'use client';

import { usePathname } from 'next/navigation';
import Link from 'next/link';
import { cn } from '@/lib/utils';
import { Bookmark, Clock, StickyNote, Library, LayoutGrid } from 'lucide-react';

type VaultSubNavProps = {
  isAuthenticated?: boolean;
};

const baseLinks = [
  { href: '/learn/vault', label: 'Browse', icon: LayoutGrid, exact: true },
  { href: '/learn/vault/series', label: 'Series', icon: Library, exact: false },
];

const authLinks = [
  { href: '/learn/vault/bookmarks', label: 'Bookmarks', icon: Bookmark, exact: false },
  { href: '/learn/vault/watch-later', label: 'Watch Later', icon: Clock, exact: false },
  { href: '/learn/vault/notes', label: 'Notes', icon: StickyNote, exact: false },
];

export function VaultSubNav({ isAuthenticated = false }: VaultSubNavProps) {
  const pathname = usePathname();
  const logicalPath = pathname.replace(/^\/(en|ja)/, '') || '/';

  const links = isAuthenticated ? [...baseLinks, ...authLinks] : baseLinks;

  return (
    <nav className="flex items-center gap-1 overflow-x-auto pb-1 -mb-1">
      {links.map((link) => {
        const isActive = link.exact
          ? logicalPath === link.href
          : logicalPath.startsWith(link.href);
        const Icon = link.icon;

        return (
          <Link
            key={link.href}
            href={link.href}
            className={cn(
              'inline-flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-sm font-medium whitespace-nowrap transition-colors',
              isActive
                ? 'bg-accent-teal/10 text-accent-teal'
                : 'text-fg-tertiary hover:text-fg-primary hover:bg-bg-tertiary',
            )}
          >
            <Icon size={14} />
            {link.label}
          </Link>
        );
      })}
    </nav>
  );
}
