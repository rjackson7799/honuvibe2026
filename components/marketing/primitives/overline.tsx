import type { ReactNode } from 'react';
import { cn } from '@/lib/utils';

type OverlineTone = 'caption' | 'teal' | 'coral';

type OverlineProps = {
  children: ReactNode;
  tone?: OverlineTone;
  className?: string;
};

const toneClasses: Record<OverlineTone, string> = {
  caption: 'text-[var(--m-ink-tertiary)]',
  teal: 'text-[var(--m-accent-teal)]',
  coral: 'text-[var(--m-accent-coral)]',
};

export function Overline({ children, tone = 'caption', className }: OverlineProps) {
  return (
    <p
      className={cn(
        'text-[11.5px] font-bold uppercase tracking-[0.09em]',
        toneClasses[tone],
        className,
      )}
    >
      {children}
    </p>
  );
}
