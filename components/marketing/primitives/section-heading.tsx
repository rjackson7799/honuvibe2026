import type { ElementType, ReactNode } from 'react';
import { cn } from '@/lib/utils';

type SectionHeadingProps = {
  children: ReactNode;
  /** 'h2' = 28-42px (most sections), 'h3' = 22-30px (sub-sections) */
  size?: 'h2' | 'h3';
  as?: ElementType;
  className?: string;
};

export function SectionHeading({
  children,
  size = 'h2',
  as: Tag = 'h2',
  className,
}: SectionHeadingProps) {
  return (
    <Tag
      className={cn(
        'font-bold text-[var(--m-ink-primary)]',
        size === 'h2'
          ? 'text-[var(--m-text-h2)] tracking-[-0.022em] leading-[1.15]'
          : 'text-[var(--m-text-h3)] tracking-[-0.015em] leading-[1.2]',
        className,
      )}
    >
      {children}
    </Tag>
  );
}
