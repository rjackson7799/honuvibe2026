'use client';

import { usePathname } from 'next/navigation';
import Link from 'next/link';
import { useTranslations } from 'next-intl';
import { cn } from '@/lib/utils';
import { Bookmark, Clock, StickyNote, Library, LayoutGrid } from 'lucide-react';

type VaultSubNavProps = {
  isAuthenticated?: boolean;
};

const baseLinks = [
  { href: '/learn/vault', key: 'nav_browse', icon: LayoutGrid, exact: true },
  { href: '/learn/vault/series', key: 'nav_series', icon: Library, exact: false },
] as const;

const authLinks = [
  { href: '/learn/vault/bookmarks', key: 'nav_bookmarks', icon: Bookmark, exact: false },
  { href: '/learn/vault/watch-later', key: 'nav_watch_later', icon: Clock, exact: false },
  { href: '/learn/vault/notes', key: 'nav_notes', icon: StickyNote, exact: false },
] as const;

export function VaultSubNav({ isAuthenticated = false }: VaultSubNavProps) {
  const pathname = usePathname();
  const t = useTranslations('vault');
  const logicalPath = pathname.replace(/^\/(en|ja)/, '') || '/';

  const links = isAuthenticated ? [...baseLinks, ...authLinks] : baseLinks;

  return (
    <nav className="flex items-center gap-5 overflow-x-auto overflow-y-hidden border-b border-border-default">
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
              'inline-flex items-center gap-1.5 px-1 pt-2 pb-2.5 -mb-px text-[13.5px] font-semibold whitespace-nowrap transition-colors border-b-2',
              isActive
                ? 'text-[color:var(--accent-teal)] border-[color:var(--accent-teal)]'
                : 'text-fg-tertiary hover:text-fg-primary border-transparent',
            )}
          >
            <Icon size={14} />
            {t(link.key)}
          </Link>
        );
      })}
    </nav>
  );
}
