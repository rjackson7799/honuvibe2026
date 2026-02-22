import { cn } from '@/lib/utils';

type OverlineProps = {
  children: React.ReactNode;
  className?: string;
};

export function Overline({ children, className }: OverlineProps) {
  return (
    <span
      className={cn(
        'inline-block text-[11px] font-semibold uppercase tracking-[0.18em]',
        'text-accent-teal',
        className,
      )}
    >
      {children}
    </span>
  );
}
