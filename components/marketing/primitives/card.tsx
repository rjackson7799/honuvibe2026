import type { ElementType, ReactNode } from 'react';
import { cn } from '@/lib/utils';

type CardProps = {
  children: ReactNode;
  /** 'default' = white card, 'sand' = sand background, 'navy' = dark spotlight (used in pricing highlight) */
  variant?: 'default' | 'sand' | 'navy';
  /** Adds the standard hover lift + tinted border + shadow upgrade. */
  interactive?: boolean;
  /** Override radius; defaults to 16px (var --m-radius-xl). */
  radius?: 'lg' | 'xl' | '2xl';
  as?: ElementType;
  className?: string;
};

const variantClasses: Record<NonNullable<CardProps['variant']>, string> = {
  default:
    'bg-[var(--m-white)] border border-[var(--m-border-soft)] shadow-[var(--m-shadow-xs)]',
  sand:
    'bg-[var(--m-sand)] border border-[var(--m-border-soft)] shadow-[var(--m-shadow-xs)]',
  navy:
    'bg-[var(--m-ink-primary)] text-white border-none shadow-[var(--m-shadow-lg)]',
};

const radiusClasses = {
  lg: 'rounded-[14px]',
  xl: 'rounded-2xl', // 16px feels right; tailwind 2xl is 16px in default scale
  '2xl': 'rounded-[20px]',
};

const interactiveClasses = cn(
  'transition-all duration-300',
  'hover:-translate-y-1 hover:border-[var(--m-border-teal)]',
  'hover:shadow-[var(--m-shadow-md)]',
);

export function Card({
  children,
  variant = 'default',
  interactive = false,
  radius = 'xl',
  as: Tag = 'div',
  className,
}: CardProps) {
  return (
    <Tag
      className={cn(
        variantClasses[variant],
        radiusClasses[radius],
        interactive && interactiveClasses,
        className,
      )}
    >
      {children}
    </Tag>
  );
}
