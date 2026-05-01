import { cn } from '@/lib/utils';

type CardVariant = 'default' | 'glass' | 'learn';

type CardProps = {
  children: React.ReactNode;
  variant?: CardVariant;
  hover?: boolean;
  padding?: 'sm' | 'md' | 'lg';
  className?: string;
};

const paddingStyles = {
  sm: 'p-4',
  md: 'p-6',
  lg: 'p-8',
};

const variantStyles: Record<CardVariant, string> = {
  default: 'bg-bg-secondary border border-border-default',
  glass: 'glass-card',
  learn: 'bg-bg-secondary border border-border-default rounded-[14px] shadow-[var(--shadow-md)]',
};

const hoverStyles: Record<CardVariant, string> = {
  default: 'hover:shadow-md hover:-translate-y-0.5 hover:border-border-hover',
  glass: 'hover:-translate-y-1',
  learn: 'hover:shadow-[var(--shadow-lg)] hover:-translate-y-0.5 hover:border-[color:var(--border-accent)]',
};

const radiusStyles: Record<CardVariant, string> = {
  default: 'rounded-lg',
  glass: 'rounded-lg',
  learn: 'rounded-[14px]',
};

export function Card({ children, variant = 'default', hover = false, padding = 'md', className }: CardProps) {
  return (
    <div
      className={cn(
        radiusStyles[variant],
        variantStyles[variant],
        hover && cn('transition-all duration-[var(--duration-normal)]', hoverStyles[variant]),
        paddingStyles[padding],
        className,
      )}
    >
      {children}
    </div>
  );
}
