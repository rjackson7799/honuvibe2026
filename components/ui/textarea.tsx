import { cn } from '@/lib/utils';
import { forwardRef, useState } from 'react';

type TextareaProps = {
  label?: string;
  error?: string;
  showCount?: boolean;
} & React.TextareaHTMLAttributes<HTMLTextAreaElement>;

export const Textarea = forwardRef<HTMLTextAreaElement, TextareaProps>(
  ({ label, error, showCount, maxLength, className, id, onChange, ...props }, ref) => {
    const textareaId = id || label?.toLowerCase().replace(/\s+/g, '-');
    const [count, setCount] = useState(0);

    const handleChange = (e: React.ChangeEvent<HTMLTextAreaElement>) => {
      setCount(e.target.value.length);
      onChange?.(e);
    };

    return (
      <div className="flex flex-col gap-1.5">
        {label && (
          <label
            htmlFor={textareaId}
            className="text-sm font-medium text-fg-secondary"
          >
            {label}
          </label>
        )}
        <textarea
          ref={ref}
          id={textareaId}
          maxLength={maxLength}
          onChange={handleChange}
          className={cn(
            'min-h-[120px] w-full rounded bg-bg-tertiary px-4 py-3 text-[16px] text-fg-primary',
            'border border-border-default',
            'placeholder:text-fg-tertiary',
            'focus:border-accent-teal focus:outline-none focus:ring-1 focus:ring-accent-teal',
            'transition-colors duration-[var(--duration-fast)]',
            'resize-y disabled:opacity-50',
            error && 'border-red-500',
            className,
          )}
          {...props}
        />
        <div className="flex justify-between">
          {error && <p className="text-sm text-red-500">{error}</p>}
          {showCount && maxLength && (
            <p className="ml-auto text-xs text-fg-tertiary">
              {count}/{maxLength}
            </p>
          )}
        </div>
      </div>
    );
  },
);

Textarea.displayName = 'Textarea';
