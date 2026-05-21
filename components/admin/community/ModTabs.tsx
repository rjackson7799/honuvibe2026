'use client';

import Link from 'next/link';
import { usePathname, useSearchParams } from 'next/navigation';
import { cn } from '@/lib/utils';

const TABS = [
  { id: 'reports', label: 'Reports' },
  { id: 'posts', label: 'All posts' },
  { id: 'bans', label: 'Banned users' },
] as const;

export function ModTabs({ active }: { active: 'reports' | 'posts' | 'bans' }) {
  const pathname = usePathname();
  const params = useSearchParams();

  return (
    <div className="flex gap-1 border-b border-border-default">
      {TABS.map((tab) => {
        const isActive = active === tab.id;
        const sp = new URLSearchParams(params.toString());
        if (tab.id === 'reports') sp.delete('tab');
        else sp.set('tab', tab.id);
        const href = `${pathname}${sp.toString() ? `?${sp.toString()}` : ''}`;
        return (
          <Link
            key={tab.id}
            href={href}
            className={cn(
              'px-4 py-2.5 text-[13.5px] font-semibold border-b-2 -mb-px transition-colors',
              isActive
                ? 'text-[color:var(--accent-teal)] border-[color:var(--accent-teal)]'
                : 'text-fg-tertiary border-transparent hover:text-fg-primary',
            )}
          >
            {tab.label}
          </Link>
        );
      })}
    </div>
  );
}
