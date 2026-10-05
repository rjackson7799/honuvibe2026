import type { ReactNode } from 'react';
import { cn } from '@/lib/utils';

type CtaBandProps = {
  title: string;
  body?: string;
  /** One or two HvButtons. */
  actions: ReactNode;
  /** 'sand' = sand-200 closing band (default); 'dark' = green-900. */
  tone?: 'sand' | 'dark';
  className?: string;
};

/**
 * The closing band used at the foot of Learn, Course and Build ("Start free.
 * Open the whole Vault when you're ready." / "Rather build it yourself?").
 */
export function HvCtaBand({ title, body, actions, tone = 'sand', className }: CtaBandProps) {
  const dark = tone === 'dark';
  return (
    <div
      data-reveal
      className={cn(
        'flex flex-wrap items-center justify-between gap-5 rounded-[16px] px-7 py-6',
        dark ? 'bg-hv-green-900 text-hv-sand-100' : 'bg-hv-sand-200 text-hv-green-900',
        className,
      )}
    >
      <div className="max-w-[56ch]">
        <h2 className="font-hv-display text-[24px] font-bold tracking-[-0.02em]">{title}</h2>
        {body && <p className={cn('mt-1.5 text-[15px] leading-[1.55]', dark ? 'text-hv-green-200' : 'text-hv-ink-700')}>{body}</p>}
      </div>
      <div className="flex flex-wrap gap-2.5">{actions}</div>
    </div>
  );
}
