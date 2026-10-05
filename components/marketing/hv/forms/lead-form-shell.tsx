import type { ReactNode } from 'react';
import { cn } from '@/lib/utils';
import { HvEyebrow } from '../eyebrow';
import { HvHeading } from '../heading';

type LeadFormShellProps = {
  eyebrow: string;
  title: string;
  body: string;
  /** Promises with amber checkmarks under the body. */
  promises: readonly string[];
  /** The form (or its success panel) rendered in the right column. */
  children: ReactNode;
  id?: string;
  className?: string;
};

/**
 * README "Lead forms (Build brief and Partner enquiry)": a dark green card,
 * two columns — promises on the left, the form on the right. Server-safe; the
 * form itself is the client component passed as children.
 */
export function HvLeadFormShell({ eyebrow, title, body, promises, children, id, className }: LeadFormShellProps) {
  return (
    <div
      id={id}
      className={cn(
        'grid items-start gap-9 rounded-[16px] bg-hv-green-900 p-6 text-hv-sand-100 md:p-[44px]',
        '[grid-template-columns:repeat(auto-fit,minmax(min(100%,360px),1fr))]',
        className,
      )}
    >
      <div>
        <HvEyebrow tone="amber">{eyebrow}</HvEyebrow>
        <HvHeading level="h2" className="mt-2.5 max-w-[18ch] text-[clamp(28px,3.4vw,44px)]">
          {title}
        </HvHeading>
        <p className="mt-3.5 max-w-[44ch] text-[16.5px] leading-[1.6] text-hv-green-200">{body}</p>
        <ul className="mt-6 grid gap-3">
          {promises.map((p) => (
            <li key={p} className="flex gap-2.5 text-[15.5px] leading-[1.5] text-hv-green-200">
              <span aria-hidden className="font-bold text-hv-amber">
                ✓
              </span>
              <span>{p}</span>
            </li>
          ))}
        </ul>
      </div>
      {children}
    </div>
  );
}

type PanelProps = { children: ReactNode; className?: string };

/** The green-800 panel that holds the form fields. */
export function HvLeadFormPanel({ children, className }: PanelProps) {
  return <div className={cn('grid gap-[18px] rounded-[14px] bg-hv-green-800 p-6', className)}>{children}</div>;
}

type SuccessProps = { title: string; body: ReactNode; className?: string };

/** The confirmation panel that replaces the form on submit ("Brief received."). */
export function HvLeadFormSuccess({ title, body, className }: SuccessProps) {
  return (
    <div role="status" className={cn('grid gap-2.5 rounded-[14px] bg-hv-green-800 p-7', className)}>
      <p className="font-hv-display text-[24px] font-bold tracking-[-0.02em]">{title}</p>
      <p className="text-[15.5px] leading-[1.6] text-hv-green-200">{body}</p>
    </div>
  );
}
