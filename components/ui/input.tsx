import { cn } from '@/lib/utils';
import { forwardRef } from 'react';

type InputProps = {
  label?: string;
  error?: string;
  locale?: string;
} & React.InputHTMLAttributes<HTMLInputElement>;

export const Input = forwardRef<HTMLInputElement, InputProps>(
  ({ label, error, locale, className, id, ...props }, ref) => {
    const inputId = id || label?.toLowerCase().replace(/\s+/g, '-');

    return (
      <div className="flex flex-col gap-1.5">
        {label && (
          <label
            htmlFor={inputId}
            className="text-sm font-medium text-fg-secondary"
          >
            {label}
          </label>
        )}
        <input
          ref={ref}
          id={inputId}
          className={cn(
            'h-12 w-full rounded bg-bg-tertiary px-4 text-[16px] text-fg-primary',
            'border border-border-default',
            'placeholder:text-fg-tertiary',
            'focus:border-accent-teal focus:outline-none focus:ring-1 focus:ring-accent-teal',
            'transition-colors duration-[var(--duration-fast)]',
            'disabled:opacity-50',
            locale === 'ja' && 'leading-[1.75] tracking-[0.03em]',
            error && 'border-red-500 focus:border-red-500 focus:ring-red-500',
            className,
          )}
          {...props}
        />
        {error && (
          <p className="text-sm text-red-500">{error}</p>
        )}
      </div>
    );
  },
);

Input.displayName = 'Input';
