import { cn } from '@/lib/utils';

type TagProps = {
  children: React.ReactNode;
  color?: string;
  className?: string;
};

export function Tag({ children, color, className }: TagProps) {
  return (
    <span
      className={cn(
        'inline-flex items-center rounded-[3px] px-2 py-0.5',
        'font-mono text-[11px] leading-tight',
        'bg-bg-tertiary text-fg-secondary border border-border-default',
        className,
      )}
      style={color ? { borderColor: color, color } : undefined}
    >
      {children}
    </span>
  );
}
