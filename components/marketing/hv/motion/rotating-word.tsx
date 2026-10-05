'use client';

import { useEffect, useState } from 'react';
import { cn } from '@/lib/utils';
import { useReducedMotion } from './use-reduced-motion';

type RotatingWordProps = {
  items: readonly string[];
  /** Milliseconds between swaps (README: 2.8–4.8s). */
  interval?: number;
  /** 'amber' is the design default inside a sentence on dark. */
  tone?: 'amber' | 'inherit';
  className?: string;
};

/**
 * README "Rotating hero line": a phrase inside a sentence swaps on a timer and
 * each new item rises in with `hv-rise`. Under reduced motion it renders the
 * first item and never starts the timer. Screen readers get the first item
 * only; the rotating copy is decorative repetition, not new information.
 */
export function HvRotatingWord({ items, interval = 3200, tone = 'amber', className }: RotatingWordProps) {
  const reduce = useReducedMotion();
  const [index, setIndex] = useState(0);

  useEffect(() => {
    if (reduce || items.length < 2) return;
    const id = window.setInterval(() => setIndex((i) => (i + 1) % items.length), interval);
    return () => window.clearInterval(id);
  }, [reduce, items.length, interval]);

  const current = items[reduce ? 0 : index] ?? '';

  return (
    <span className={cn('inline-block overflow-hidden align-bottom', tone === 'amber' && 'text-hv-amber', className)}>
      <span className="sr-only">{items[0]}</span>
      <span
        key={reduce ? 'static' : index}
        aria-hidden
        data-testid="hv-rotating-word"
        className={cn('inline-block', !reduce && 'animate-hv-rise')}
      >
        {current}
      </span>
    </span>
  );
}
