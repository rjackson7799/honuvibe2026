import type { InputHTMLAttributes, ReactNode, TextareaHTMLAttributes } from 'react';
import { cn } from '@/lib/utils';

export type FieldTone = 'dark' | 'light';

const labelClass = (tone: FieldTone) =>
  cn('text-[13px] font-semibold uppercase tracking-[0.06em]', tone === 'dark' ? 'text-hv-green-400' : 'text-hv-ink-500');

const controlClass = (tone: FieldTone) =>
  cn(
    'w-full rounded-[9px] border-[1.5px] px-3.5 text-[16px] outline-none transition-colors',
    tone === 'dark'
      ? 'border-hv-green-700 bg-hv-green-900 text-hv-sand-100 placeholder:text-hv-green-400 focus:border-hv-amber'
      : 'border-hv-sand-300 bg-hv-sand-50 text-hv-ink placeholder:text-hv-taupe focus:border-hv-green-900',
    'disabled:opacity-60',
  );

type FieldProps = {
  label: ReactNode;
  /** Id of the control inside; required so the label always names its input. */
  htmlFor: string;
  tone?: FieldTone;
  /** Right-aligned helper beside the label (e.g. "Forgot password?"). */
  aside?: ReactNode;
  hint?: ReactNode;
  children: ReactNode;
  className?: string;
};

/** Label + control wrapper used by every hv form (brief, enquiry, sign in). */
export function HvField({ label, htmlFor, tone = 'dark', aside, hint, children, className }: FieldProps) {
  // Caller passes the same id to the HvInput / HvTextarea child.
  return (
    <div className={cn('grid gap-[7px]', className)}>
      <div className="flex items-center justify-between gap-3">
        <label htmlFor={htmlFor} className={labelClass(tone)}>
          {label}
        </label>
        {aside}
      </div>
      {children}
      {hint && <p className={cn('text-[13px]', tone === 'dark' ? 'text-hv-green-400' : 'text-hv-taupe')}>{hint}</p>}
    </div>
  );
}

type InputProps = Omit<InputHTMLAttributes<HTMLInputElement>, 'className'> & {
  tone?: FieldTone;
  className?: string;
};

export function HvInput({ tone = 'dark', className, ...rest }: InputProps) {
  return <input className={cn(controlClass(tone), 'min-h-[50px]', className)} {...rest} />;
}

type TextareaProps = Omit<TextareaHTMLAttributes<HTMLTextAreaElement>, 'className'> & {
  tone?: FieldTone;
  className?: string;
};

export function HvTextarea({ tone = 'dark', className, rows = 4, ...rest }: TextareaProps) {
  return <textarea rows={rows} className={cn(controlClass(tone), 'resize-y py-3.5 leading-[1.5]', className)} {...rest} />;
}
