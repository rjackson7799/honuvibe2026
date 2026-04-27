import type { ElementType, ReactNode } from 'react';
import { cn } from '@/lib/utils';

type DisplayHeadingProps = {
  children: ReactNode;
  /** 'default' = 40-62px (most heroes), 'xl' = 52-80px (About hero) */
  size?: 'default' | 'xl';
  as?: ElementType;
  className?: string;
};

export function DisplayHeading({
  children,
  size = 'default',
  as: Tag = 'h1',
  className,
}: DisplayHeadingProps) {
  return (
    <Tag
      className={cn(
        'font-bold text-[var(--m-ink-primary)] leading-[1.08]',
        size === 'xl'
          ? 'text-[var(--m-text-display-xl)] tracking-[-0.035em]'
          : 'text-[var(--m-text-h1)] tracking-[-0.025em]',
        className,
      )}
    >
      {children}
    </Tag>
  );
}
