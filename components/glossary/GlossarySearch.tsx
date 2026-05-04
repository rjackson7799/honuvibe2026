'use client';

import { Search } from 'lucide-react';
import { cn } from '@/lib/utils';

type GlossarySearchProps = {
  value: string;
  onChange: (value: string) => void;
  placeholder: string;
  className?: string;
};

export function GlossarySearch({
  value,
  onChange,
  placeholder,
  className,
}: GlossarySearchProps) {
  return (
    <div className={cn('relative w-full max-w-[480px]', className)}>
      <Search
        size={16}
        strokeWidth={2}
        className="pointer-events-none absolute left-4 top-1/2 -translate-y-1/2 text-[var(--m-ink-tertiary)]"
        aria-hidden
      />
      <input
        type="search"
        value={value}
        onChange={(e) => onChange(e.target.value)}
        placeholder={placeholder}
        className={cn(
          'h-12 w-full rounded-full border border-[var(--m-border-default)] bg-[var(--m-white)]',
          'pl-11 pr-5 text-[15px] text-[var(--m-ink-primary)]',
          'placeholder:text-[var(--m-ink-tertiary)]',
          'shadow-[var(--m-shadow-xs)]',
          'transition-colors duration-200',
          'focus:outline-none focus:border-[var(--m-accent-teal)] focus:shadow-[var(--m-shadow-teal-sm)]',
        )}
      />
    </div>
  );
}
