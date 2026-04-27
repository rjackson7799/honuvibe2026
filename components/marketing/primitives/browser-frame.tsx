import type { ReactNode } from 'react';
import { cn } from '@/lib/utils';

type BrowserFrameProps = {
  url: string;
  /** When true, prefixes a 🔒 lock glyph in the URL chip. */
  secure?: boolean;
  children: ReactNode;
  /** Inline height for the content area. Defaults to 380. */
  height?: number | string;
  className?: string;
};

export function BrowserFrame({
  url,
  secure = true,
  children,
  height = 380,
  className,
}: BrowserFrameProps) {
  return (
    <div
      className={cn(
        'overflow-hidden rounded-[16px] bg-[var(--m-white)]',
        'border border-[var(--m-border-soft)]',
        'shadow-[var(--m-shadow-xl)]',
        className,
      )}
    >
      {/* Chrome bar */}
      <div className="flex items-center gap-2.5 border-b border-[var(--m-border-soft)] bg-[#F2EDE4] px-4 py-2.5">
        <div className="flex gap-1.5">
          <span className="h-2.5 w-2.5 rounded-full bg-[#FF6058]" />
          <span className="h-2.5 w-2.5 rounded-full bg-[#FFBD2E]" />
          <span className="h-2.5 w-2.5 rounded-full bg-[#28CA42]" />
        </div>
        <div className="flex h-[22px] flex-1 items-center rounded-[5px] bg-[rgba(26,43,51,0.07)] pl-2.5 text-[11px] text-[var(--m-ink-tertiary)]">
          {secure && <span className="mr-1">🔒</span>}
          {url}
        </div>
      </div>
      {/* Content area */}
      <div style={{ height }} className="overflow-hidden">
        {children}
      </div>
    </div>
  );
}
