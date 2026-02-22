import { cn } from '@/lib/utils';
import { type LucideIcon } from 'lucide-react';

type IconButtonProps = {
  icon: LucideIcon;
  label: string;
  size?: 'sm' | 'md';
  className?: string;
} & React.ButtonHTMLAttributes<HTMLButtonElement>;

export function IconButton({ icon: Icon, label, size = 'md', className, ...props }: IconButtonProps) {
  const sizeValue = size === 'sm' ? 18 : 20;

  return (
    <button
      aria-label={label}
      className={cn(
        'inline-flex items-center justify-center',
        'min-h-[44px] min-w-[44px] rounded',
        'text-fg-secondary hover:text-fg-primary',
        'transition-colors duration-[var(--duration-fast)]',
        'focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-accent-teal',
        className,
      )}
      {...props}
    >
      <Icon size={sizeValue} />
    </button>
  );
}
