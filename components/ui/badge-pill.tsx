import { cn } from '@/lib/utils';

type BadgePillVariant = 'teal' | 'coral' | 'purple' | 'gray' | 'live' | 'navy' | 'translucent';
type BadgePillSize = 'xs' | 'sm' | 'md';

type BadgePillProps = {
  children: React.ReactNode;
  variant?: BadgePillVariant;
  size?: BadgePillSize;
  className?: string;
};

const variantStyles: Record<BadgePillVariant, string> = {
  teal: 'bg-[color:var(--accent-teal-subtle)] text-[color:var(--accent-teal)]',
  coral: 'bg-[color:var(--accent-coral-subtle)] text-[color:var(--accent-coral)]',
  purple: 'bg-[color:var(--accent-purple-subtle)] text-[color:var(--accent-purple)]',
  gray: 'bg-bg-tertiary text-fg-secondary',
  live: 'bg-[color:var(--accent-coral-subtle)] text-[color:var(--accent-coral)] uppercase tracking-[0.06em]',
  navy: 'bg-fg-primary text-bg-secondary',
  translucent: 'bg-white/15 text-white border border-white/20 backdrop-blur-sm',
};

const sizeStyles: Record<BadgePillSize, string> = {
  xs: 'text-[10.5px] font-bold px-2 py-0.5 leading-tight',
  sm: 'text-[11.5px] font-semibold px-2.5 py-0.5',
  md: 'text-xs font-semibold px-3 py-1',
};

export function BadgePill({
  children,
  variant = 'gray',
  size = 'sm',
  className,
}: BadgePillProps) {
  return (
    <span
      className={cn(
        'inline-flex items-center gap-1 rounded-full whitespace-nowrap',
        variantStyles[variant],
        sizeStyles[size],
        className,
      )}
    >
      {children}
    </span>
  );
}
