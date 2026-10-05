import type { ButtonHTMLAttributes, ReactNode } from 'react';
import { cn } from '@/lib/utils';

export type PillTone = 'dark' | 'light';

type PillProps = {
  children: ReactNode;
  tone?: PillTone;
  /** Leading 6px dot (marquee pills, add-on chips). */
  dot?: boolean;
  className?: string;
};

/** Static pill (marquee rows, "We build" chips, add-on chips). */
export function HvPill({ children, tone = 'light', dot = false, className }: PillProps) {
  return (
    <span
      className={cn(
        'inline-flex min-h-10 items-center gap-2 whitespace-nowrap rounded-full px-[14px] text-[14.5px] font-medium',
        tone === 'dark'
          ? 'bg-hv-green-900 text-hv-sand-100 border border-hv-green-900'
          : 'bg-hv-sand-50 text-hv-green-900 border border-hv-sand-300',
        className,
      )}
    >
      {dot && (
        <span
          aria-hidden
          className={cn('h-1.5 w-1.5 rounded-full', tone === 'dark' ? 'bg-hv-amber' : 'bg-hv-terracotta')}
        />
      )}
      {children}
    </span>
  );
}

type PillToggleProps = Omit<ButtonHTMLAttributes<HTMLButtonElement>, 'className' | 'children' | 'type'> & {
  children: ReactNode;
  active: boolean;
  /** dark = inside a dark panel (amber active fill); light = on sand (green-900 active fill). */
  tone?: PillTone;
  className?: string;
};

/**
 * Toggle pill for filters and form choices. Exposes `aria-pressed`; group it
 * with `role="group"` or `role="radiogroup"` at the call site. Not a client
 * module itself: whoever passes `onClick` is already a Client Component.
 */
export function HvPillToggle({ children, active, tone = 'light', className, ...rest }: PillToggleProps) {
  const base = cn(
    'inline-flex min-h-[44px] items-center justify-center rounded-full px-4 text-[14.5px] font-semibold',
    'border-[1.5px] transition-[background-color,border-color,color] duration-200',
    'focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-hv-amber focus-visible:ring-offset-2',
  );
  const look =
    tone === 'dark'
      ? active
        ? 'bg-hv-amber border-hv-amber text-hv-green-900'
        : 'bg-transparent border-hv-green-700 text-hv-sand-100 hover:border-hv-amber'
      : active
        ? 'bg-hv-green-900 border-hv-green-900 text-hv-sand-100'
        : 'bg-transparent border-hv-sand-400 text-hv-green-900 hover:border-hv-green-900';

  return (
    <button type="button" aria-pressed={active} className={cn(base, look, className)} {...rest}>
      {children}
    </button>
  );
}
