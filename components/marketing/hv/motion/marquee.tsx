'use client';

import type { CSSProperties } from 'react';
import { cn } from '@/lib/utils';
import { useReducedMotion } from './use-reduced-motion';

type MarqueeProps = {
  items: readonly string[];
  /** 'dark' pills (green-900, amber dot) or 'light' pills (sand-50, terracotta dot). */
  tone?: 'dark' | 'light';
  /** Scroll right-to-left by default; `reverse` scrolls the other way (the design alternates rows). */
  reverse?: boolean;
  /** Accessible name for the list. */
  label: string;
  /** Seconds per item (README: duration = items × 3.2s). */
  secondsPerItem?: number;
  className?: string;
};

/**
 * README "Marquee": a row of 48px pills scrolling with `hv-marquee`, edges
 * fading via a horizontal mask, paused on hover. The animation name, timing
 * and iteration live on `.hv-marquee-track` in globals.css; only the duration
 * and direction are inline, so the hover pause utility and the reduced-motion
 * rule can override. Under reduced motion the row is a plain, keyboard-
 * scrollable list with no duplication.
 */
export function HvMarquee({ items, tone = 'dark', reverse = false, label, secondsPerItem = 3.2, className }: MarqueeProps) {
  const reduce = useReducedMotion();
  const duration = Math.max(items.length, 1) * secondsPerItem;

  const pill = (text: string, key: string) => (
    <span
      key={key}
      role="listitem"
      className={cn(
        'inline-flex min-h-12 flex-none items-center gap-2.5 whitespace-nowrap rounded-full px-5',
        'font-hv-display text-[17px] font-semibold tracking-[-0.01em]',
        tone === 'dark'
          ? 'border border-hv-green-900 bg-hv-green-900 text-hv-sand-100'
          : 'border border-hv-sand-300 bg-hv-sand-50 text-hv-green-900',
      )}
    >
      <span aria-hidden className={cn('h-1.5 w-1.5 rounded-full', tone === 'dark' ? 'bg-hv-amber' : 'bg-hv-terracotta')} />
      {text}
    </span>
  );

  const trackStyle: CSSProperties | undefined = reduce
    ? undefined
    : { animationDuration: `${duration}s`, animationDirection: reverse ? 'reverse' : 'normal' };

  return (
    <div
      role="list"
      aria-label={label}
      data-reduced-motion={reduce ? 'true' : 'false'}
      tabIndex={reduce ? 0 : undefined}
      className={cn(
        'group px-5 md:px-8',
        reduce
          ? 'overflow-x-auto focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-hv-amber'
          : 'overflow-hidden [mask-image:linear-gradient(90deg,transparent,#000_6%,#000_94%,transparent)]',
        className,
      )}
    >
      <div
        data-testid="hv-marquee-track"
        className={cn('hv-marquee-track flex w-max gap-2.5 pr-2.5', !reduce && 'group-hover:[animation-play-state:paused]')}
        style={trackStyle}
      >
        {items.map((t, i) => pill(t, `a-${i}`))}
        {!reduce && (
          <span aria-hidden className="contents">
            {items.map((t, i) => pill(t, `b-${i}`))}
          </span>
        )}
      </div>
    </div>
  );
}
