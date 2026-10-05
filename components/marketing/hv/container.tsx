import type { ElementType, ReactNode } from 'react';
import { cn } from '@/lib/utils';

type ContainerProps = {
  children: ReactNode;
  as?: ElementType;
  className?: string;
};

/** Design content width: 1320px centered, 32px side padding (20px on phones). */
export function HvContainer({ children, as: Tag = 'div', className }: ContainerProps) {
  return (
    <Tag className={cn('mx-auto w-full max-w-[var(--hv-container)] px-5 md:px-8', className)}>
      {children}
    </Tag>
  );
}
