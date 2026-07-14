'use client';

import Link from 'next/link';
import { useId, useState } from 'react';
import { FlaskConical, X } from 'lucide-react';

type Props = {
  demoName: string;
  /** Per-demo reset-behavior copy, e.g. "Your changes live in this browser
   *  tab and reset when you close it." Shown in the badge tooltip. */
  stateNote: string;
};

/**
 * Slim sticky bar framing every sandbox demo. Styled with HonuVibe DARK
 * tokens so it reads as a frame around a foreign app. The bar is 44px tall
 * and every control stretches its full height (44px touch targets).
 * Tooltip: toggles on click, shows on hover/focus, closes on Escape,
 * announced via aria-describedby.
 */
export function DemoChrome({ demoName, stateNote }: Props) {
  const [tipOpen, setTipOpen] = useState(false);
  const tipId = useId();

  return (
    <div className="sticky top-0 z-[500] flex h-11 items-stretch gap-3 border-b border-white/10 bg-[#0d1220] px-4 text-white print:hidden">
      <span className="sr-only">
        This is an interactive HonuVibe Sandbox demo running on simulated data. {stateNote}
      </span>
      <Link
        href="/sandbox"
        className="flex items-center text-[13px] font-bold tracking-[-0.01em] text-white transition-opacity hover:opacity-80 focus-visible:outline focus-visible:outline-2 focus-visible:outline-[#3ec8c0]"
      >
        HonuVibe<span className="text-[#0fa9a0]">&nbsp;Sandbox</span>
      </Link>
      <span className="self-center text-white/30" aria-hidden>·</span>
      <span className="flex items-center text-[13px] font-medium text-white/80">{demoName}</span>

      <span
        className="relative ml-auto flex items-center"
        onMouseEnter={() => setTipOpen(true)}
        onMouseLeave={() => setTipOpen(false)}
      >
        <button
          type="button"
          onClick={() => setTipOpen((v) => !v)}
          onFocus={() => setTipOpen(true)}
          onBlur={() => setTipOpen(false)}
          onKeyDown={(e) => e.key === 'Escape' && setTipOpen(false)}
          aria-describedby={tipId}
          aria-expanded={tipOpen}
          className="inline-flex h-full min-w-[44px] items-center gap-1.5 rounded-none bg-transparent px-2.5 font-mono text-[10.5px] font-bold uppercase tracking-[0.12em] text-[#3ec8c0] focus-visible:outline focus-visible:outline-2 focus-visible:outline-[#3ec8c0]"
        >
          <span className="inline-flex items-center gap-1.5 rounded-full bg-[rgba(15,169,160,0.18)] px-2.5 py-1">
            <FlaskConical size={11} aria-hidden />
            Simulated data
          </span>
        </button>
        <span
          id={tipId}
          role="tooltip"
          hidden={!tipOpen}
          className="absolute right-0 top-full z-10 mt-1 w-64 rounded-lg border border-white/10 bg-[#131a2e] p-3 text-[12px] leading-relaxed text-white/85 shadow-lg"
        >
          {stateNote}
        </span>
      </span>

      <Link
        href="/sandbox"
        aria-label="Exit demo"
        className="inline-flex min-w-[44px] items-center gap-1 rounded-none px-2 text-[12.5px] font-semibold text-white/70 transition-colors hover:bg-white/10 hover:text-white focus-visible:outline focus-visible:outline-2 focus-visible:outline-[#3ec8c0]"
      >
        <X size={14} aria-hidden />
        Exit
      </Link>
    </div>
  );
}
