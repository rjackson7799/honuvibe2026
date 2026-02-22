import { cn } from '@/lib/utils';

type CardProps = {
  children: React.ReactNode;
  hover?: boolean;
  padding?: 'sm' | 'md' | 'lg';
  className?: string;
};

const paddingStyles = {
  sm: 'p-4',
  md: 'p-6',
  lg: 'p-8',
};

export function Card({ children, hover = false, padding = 'md', className }: CardProps) {
  return (
    <div
      className={cn(
        'rounded-lg bg-bg-secondary border border-border-default',
        hover && 'transition-all duration-[var(--duration-normal)] hover:shadow-md hover:-translate-y-0.5 hover:border-border-hover',
        paddingStyles[padding],
        className,
      )}
    >
      {children}
    </div>
  );
}
