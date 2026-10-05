'use client';

import { useEffect, useRef, useState } from 'react';
import { useTranslations } from 'next-intl';
import { cn } from '@/lib/utils';
import { useReducedMotion } from './motion/use-reduced-motion';

export type Testimonial = { text: string; name: string; org: string };

type TestimonialCarouselProps = {
  quotes: readonly Testimonial[];
  /** Milliseconds between quotes (README: 6.5s). */
  interval?: number;
  /** light = sand-50 card beside a FAQ; dark = green-800 card (Sign In left panel). */
  tone?: 'light' | 'dark';
  className?: string;
};

/**
 * README "Testimonial carousel": large amber “ glyph, a blockquote, name and
 * role. Auto-advances; each new quote fades in and rises 8px over 0.6s. Dots
 * are 6px (18px when active).
 *
 * WCAG 2.2.2 (Pause, Stop, Hide): auto-rotation pauses while the pointer or
 * keyboard focus is inside the card, and stops for good once the visitor
 * picks a quote by hand. Reduced motion: no timer, no entrance animation,
 * dots still work.
 */
export function HvTestimonialCarousel({ quotes, interval = 6500, tone = 'light', className }: TestimonialCarouselProps) {
  const t = useTranslations('hv');
  const reduce = useReducedMotion();
  const [index, setIndex] = useState(0);
  const [hovering, setHovering] = useState(false);
  const [manual, setManual] = useState(false);
  const quoteRef = useRef<HTMLDivElement | null>(null);
  const first = useRef(true);

  const rotating = !reduce && !manual && !hovering && quotes.length > 1;

  useEffect(() => {
    if (!rotating) return;
    const id = window.setInterval(() => setIndex((i) => (i + 1) % quotes.length), interval);
    return () => window.clearInterval(id);
  }, [rotating, quotes.length, interval]);

  useEffect(() => {
    if (first.current) {
      first.current = false;
      return;
    }
    const el = quoteRef.current;
    if (reduce || !el || typeof el.animate !== 'function') return;
    el.animate(
      [
        { opacity: 0, transform: 'translateY(8px)' },
        { opacity: 1, transform: 'none' },
      ],
      { duration: 600, easing: 'cubic-bezier(.2,.7,.2,1)' },
    );
  }, [index, reduce]);

  if (quotes.length === 0) return null;
  const quote = quotes[Math.min(index, quotes.length - 1)];
  const dark = tone === 'dark';

  return (
    <figure
      role="group"
      aria-roledescription="carousel"
      data-rotating={rotating ? 'true' : 'false'}
      onMouseEnter={() => setHovering(true)}
      onMouseLeave={() => setHovering(false)}
      onFocus={() => setHovering(true)}
      onBlur={(e) => {
        if (!e.currentTarget.contains(e.relatedTarget as Node | null)) setHovering(false);
      }}
      className={cn(
        'flex max-w-[480px] flex-col gap-[18px] rounded-[16px] px-7 py-[26px]',
        dark ? 'bg-hv-green-800 text-hv-sand-100' : 'border border-hv-sand-300 bg-hv-sand-50 text-hv-green-900',
        className,
      )}
    >
      <span aria-hidden className="h-[22px] font-hv-display text-[44px] font-bold leading-[0.6] text-hv-amber">
        “
      </span>
      <div ref={quoteRef} aria-live="off" className="flex min-h-[190px] flex-col gap-[18px]">
        <blockquote className="m-0 font-hv-display text-[20px] font-medium leading-[1.4] tracking-[-0.01em] [text-wrap:pretty]">
          {quote.text}
        </blockquote>
        <figcaption className="mt-auto flex flex-col gap-0.5">
          <span className="text-[15px] font-semibold">{quote.name}</span>
          <span className={cn('text-[14px]', dark ? 'text-hv-green-400' : 'text-hv-ink-500')}>{quote.org}</span>
        </figcaption>
      </div>
      {quotes.length > 1 && (
        <div className="-ml-[19px] flex items-center" role="group" aria-label={t('carousel_label')}>
          {quotes.map((_, i) => {
            const active = i === index;
            return (
              <button
                key={i}
                type="button"
                aria-pressed={active}
                aria-label={t('quote_n', { n: i + 1 })}
                onClick={() => {
                  setIndex(i);
                  setManual(true);
                }}
                className="inline-flex h-11 w-11 items-center justify-center rounded-full focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-hv-amber"
              >
                <span
                  aria-hidden
                  data-active={active ? 'true' : 'false'}
                  className={cn(
                    'block h-1.5 rounded-full transition-[width,background-color] duration-[400ms]',
                    active ? 'w-[18px]' : 'w-1.5',
                    active ? (dark ? 'bg-hv-amber' : 'bg-hv-terracotta') : dark ? 'bg-hv-green-700' : 'bg-hv-sand-300',
                  )}
                />
              </button>
            );
          })}
        </div>
      )}
    </figure>
  );
}
