'use client';

import { useId, useState, type ReactNode } from 'react';
import { cn } from '@/lib/utils';

export type FaqItem = { q: string; a: ReactNode };

type FaqAccordionProps = {
  items: FaqItem[];
  /** Index open on first render; -1 for all closed. */
  defaultOpen?: number;
  className?: string;
};

/**
 * README "FAQ accordion": rows divided by sand-300 rules, question in Space
 * Grotesk 600, a "+" that rotates to "×" when open, only one row open at a
 * time. Real `aria-expanded` / `aria-controls` wiring; closed panels use the
 * `hidden` attribute so they stay out of the tab order.
 */
export function HvFaqAccordion({ items, defaultOpen = 0, className }: FaqAccordionProps) {
  const [open, setOpen] = useState<number>(defaultOpen);
  const baseId = useId();

  return (
    <div className={cn('grid', className)}>
      {items.map((item, i) => {
        const isOpen = open === i;
        const panelId = `${baseId}-panel-${i}`;
        const buttonId = `${baseId}-button-${i}`;
        return (
          <div key={i} className="border-t border-hv-sand-300">
            <button
              type="button"
              id={buttonId}
              aria-expanded={isOpen}
              aria-controls={panelId}
              onClick={() => setOpen(isOpen ? -1 : i)}
              className={cn(
                'flex min-h-14 w-full items-center justify-between gap-4 py-[18px] text-left',
                'font-hv-display text-[18px] font-semibold tracking-[-0.01em] text-hv-green-900',
                'transition-colors hover:text-hv-terracotta',
                'focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-hv-amber focus-visible:ring-offset-2',
              )}
            >
              <span>{item.q}</span>
              <span
                aria-hidden
                className={cn(
                  'flex-none text-[22px] leading-none text-hv-terracotta transition-transform duration-300',
                  isOpen && 'rotate-45',
                )}
              >
                +
              </span>
            </button>
            <div id={panelId} role="region" aria-labelledby={buttonId} hidden={!isOpen}>
              <div className="max-w-[60ch] pb-[18px] text-[15.5px] leading-[1.65] text-hv-ink-700">{item.a}</div>
            </div>
          </div>
        );
      })}
    </div>
  );
}
