import { cn } from '@/lib/utils';

type DividerProps = {
  width?: string;
  className?: string;
};

export function Divider({ width = '100%', className }: DividerProps) {
  return (
    <hr
      className={cn('border-0 border-t border-border-secondary', className)}
      style={{ width }}
    />
  );
}
