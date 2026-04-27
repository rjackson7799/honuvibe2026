import type { ReactNode } from 'react';
import { cn } from '@/lib/utils';

type BadgeTone = 'info' | 'status' | 'active' | 'by-application' | 'coming-soon';

type BadgeProps = {
  children: ReactNode;
  tone?: BadgeTone;
  className?: string;
};

const toneClasses: Record<BadgeTone, string> = {
  // Pinkish ground, teal text — used for course-card metadata badges
  info: 'bg-[var(--m-accent-coral-soft)] text-[var(--m-accent-teal)]',
  // Solid teal — confirmed/in-session status
  status: 'bg-[var(--m-accent-teal)] text-white',
  // Tinted teal — active / in-progress state
  active: 'bg-[var(--m-accent-teal-soft)] text-[var(--m-accent-teal)]',
  // Solid navy — exclusive/by-application
  'by-application': 'bg-[var(--m-ink-primary)] text-white',
  // Solid coral — coming-soon partner
  'coming-soon': 'bg-[var(--m-accent-coral)] text-white',
};

export function Badge({ children, tone = 'info', className }: BadgeProps) {
  return (
    <span
      className={cn(
        'inline-flex items-center rounded-full px-3 py-1',
        'text-[11px] font-bold tracking-[0.06em] uppercase',
        toneClasses[tone],
        className,
      )}
    >
      {children}
    </span>
  );
}
