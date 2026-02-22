import { cn } from '@/lib/utils';
import { ChevronDown } from 'lucide-react';
import { forwardRef } from 'react';

type SelectOption = {
  value: string;
  label: string;
};

type SelectProps = {
  label?: string;
  options: SelectOption[];
  placeholder?: string;
  error?: string;
} & Omit<React.SelectHTMLAttributes<HTMLSelectElement>, 'children'>;

export const Select = forwardRef<HTMLSelectElement, SelectProps>(
  ({ label, options, placeholder, error, className, id, ...props }, ref) => {
    const selectId = id || label?.toLowerCase().replace(/\s+/g, '-');

    return (
      <div className="flex flex-col gap-1.5">
        {label && (
          <label
            htmlFor={selectId}
            className="text-sm font-medium text-fg-secondary"
          >
            {label}
          </label>
        )}
        <div className="relative">
          <select
            ref={ref}
            id={selectId}
            className={cn(
              'h-12 w-full appearance-none rounded bg-bg-tertiary px-4 pr-10 text-[16px] text-fg-primary',
              'border border-border-default',
              'focus:border-accent-teal focus:outline-none focus:ring-1 focus:ring-accent-teal',
              'transition-colors duration-[var(--duration-fast)]',
              'disabled:opacity-50',
              error && 'border-red-500',
              className,
            )}
            {...props}
          >
            {placeholder && (
              <option value="" disabled>
                {placeholder}
              </option>
            )}
            {options.map((option) => (
              <option key={option.value} value={option.value}>
                {option.label}
              </option>
            ))}
          </select>
          <ChevronDown
            size={18}
            className="pointer-events-none absolute right-3 top-1/2 -translate-y-1/2 text-fg-tertiary"
          />
        </div>
        {error && (
          <p className="text-sm text-red-500">{error}</p>
        )}
      </div>
    );
  },
);

Select.displayName = 'Select';
