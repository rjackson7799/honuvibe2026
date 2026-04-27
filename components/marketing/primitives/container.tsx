import type { ReactNode } from 'react';
import { cn } from '@/lib/utils';

type ContainerProps = {
  children: ReactNode;
  className?: string;
};

export function Container({ children, className }: ContainerProps) {
  return (
    <div className={cn('mx-auto w-full max-w-[1200px] px-5 sm:px-8 lg:px-8', className)}>
      {children}
    </div>
  );
}
