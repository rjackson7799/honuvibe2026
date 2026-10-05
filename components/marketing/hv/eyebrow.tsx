import type { ElementType, ReactNode } from 'react';
import { cn } from '@/lib/utils';

type EyebrowTone = 'terracotta' | 'amber' | 'muted' | 'green' | 'taupe';

type EyebrowProps = {
  children: ReactNode;
  /** terracotta = eyebrow on light (default); amber or green = on dark; muted/taupe = quiet labels. */
  tone?: EyebrowTone;
  /** Adds the pulsing live dot ("This week in the Vault", "Hot"). */
  dot?: boolean;
  as?: ElementType;
  className?: string;
};

const toneClasses: Record<EyebrowTone, string> = {
  terracotta: 'text-hv-terracotta',
  amber: 'text-hv-amber',
  muted: 'text-hv-ink-500',
  green: 'text-hv-green-400',
  taupe: 'text-hv-taupe',
};

const dotClasses: Record<EyebrowTone, string> = {
  terracotta: 'bg-hv-terracotta',
  amber: 'bg-hv-amber',
  muted: 'bg-hv-ink-500',
  green: 'bg-hv-green-400',
  taupe: 'bg-hv-taupe',
};

/** README "Eyebrow": Public Sans 700, 12px, uppercase, 0.12em tracking. */
export function HvEyebrow({ children, tone = 'terracotta', dot = false, as: Tag = 'p', className }: EyebrowProps) {
  return (
    <Tag
      className={cn(
        'inline-flex items-center gap-2 text-[12px] font-bold uppercase tracking-[0.12em]',
        toneClasses[tone],
        className,
      )}
    >
      {dot && (
        <span
          aria-hidden
          className={cn('inline-block h-[7px] w-[7px] rounded-full animate-hv-pulse', dotClasses[tone])}
        />
      )}
      {children}
    </Tag>
  );
}
