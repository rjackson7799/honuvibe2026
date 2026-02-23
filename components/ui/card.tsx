import { cn } from '@/lib/utils';

type CardVariant = 'default' | 'glass';

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
};

const hoverStyles: Record<CardVariant, string> = {
  default: 'hover:shadow-md hover:-translate-y-0.5 hover:border-border-hover',
  glass: 'hover:-translate-y-1',
};

export function Card({ children, variant = 'default', hover = false, padding = 'md', className }: CardProps) {
  return (
    <div
      className={cn(
        'rounded-lg',
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
