import type { ReactNode } from 'react';
import { cn } from '@/lib/utils';

type NumberedStepProps = {
  index: number | string;
  title: ReactNode;
  body: ReactNode;
  /** 'horizontal' = number circle inline at top (Partnerships 4-step). 'inline' = number left, content right (Explore 3-step). */
  layout?: 'horizontal' | 'inline';
  className?: string;
};

export function NumberedStep({
  index,
  title,
  body,
  layout = 'horizontal',
  className,
}: NumberedStepProps) {
  const circle = (
    <div
      className={cn(
        'flex h-10 w-10 shrink-0 items-center justify-center rounded-full',
        'bg-[var(--m-accent-teal)] text-white text-base font-bold',
        'shadow-[0_4px_12px_rgba(15,169,160,0.3)]',
      )}
    >
      {index}
    </div>
  );

  const titleEl = (
    <h3 className="text-[17px] font-bold tracking-[-0.01em] text-[var(--m-ink-primary)]">
      {title}
    </h3>
  );

  const bodyEl = (
    <p className="text-[14.5px] leading-[1.7] text-[var(--m-ink-secondary)]">
      {body}
    </p>
  );

  if (layout === 'inline') {
    return (
      <div className={cn('flex items-start gap-5', className)}>
        {circle}
        <div className="flex flex-col gap-2">
          {titleEl}
          {bodyEl}
        </div>
      </div>
    );
  }

  return (
    <div className={cn('flex flex-col gap-3', className)}>
      {circle}
      <div className="flex flex-col gap-2.5">
        {titleEl}
        {bodyEl}
      </div>
    </div>
  );
}
