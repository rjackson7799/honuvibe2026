'use client';

import { useEffect, useLayoutEffect, useRef, useState } from 'react';
import { CalendarDays, ArrowRight, X } from 'lucide-react';
import { useLocale, useTranslations } from 'next-intl';
import { Link } from '@/i18n/navigation';
import {
  featuredEvent,
  publicEventBlurb,
  publicEventTitle,
} from '@/lib/events/public-events';
import { formatEventDateTime } from '@/lib/events/format';

/**
 * Site-wide announcement strip for the currently-featured free/public event.
 *
 * Mounted once inside MarketingNavClient, so it renders on every marketing page
 * (each marketing page renders <MarketingNav/>). Content is manually curated in
 * lib/events/public-events.ts — NOT the invite-only live_events DB table.
 *
 * Layout: the marketing nav is fixed at top-0. Rather than edit every hero's
 * top padding, the strip publishes its measured height to the `--m-strip-h` CSS
 * variable on <html>. The nav reads `top-[var(--m-strip-h)]` and MarketingShell
 * reads `pt-[var(--m-strip-h)]`, so the strip stacks above the nav and shifts
 * all content down by exactly its height. On dismiss the var resets to 0px.
 */
const STRIP_VAR = '--m-strip-h';

const dismissKey = (slug: string) => `honuvibe-event-strip-dismissed:${slug}`;

export function MarketingEventStrip() {
  const event = featuredEvent();
  const t = useTranslations('public_events');
  const locale = useLocale();
  const lang = locale === 'ja' ? 'ja' : 'en';
  const ref = useRef<HTMLDivElement | null>(null);
  // Render after mount so reading localStorage can't cause a hydration mismatch
  // (same pattern as components/learn/SetPasswordBanner.tsx).
  const [visible, setVisible] = useState(false);

  useEffect(() => {
    if (!event) return;
    const dismissed = localStorage.getItem(dismissKey(event.slug)) === '1';
    setVisible(!dismissed);
  }, [event]);

  // Keep --m-strip-h in sync with the actual rendered height (handles wrapping
  // on narrow viewports). Reset to 0px whenever the strip is hidden/unmounted.
  useLayoutEffect(() => {
    const root = document.documentElement;
    const reset = () => root.style.setProperty(STRIP_VAR, '0px');
    if (!visible || !ref.current) {
      reset();
      return reset;
    }
    const node = ref.current;
    const apply = () => root.style.setProperty(STRIP_VAR, `${node.offsetHeight}px`);
    apply();
    const ro = new ResizeObserver(apply);
    ro.observe(node);
    return () => {
      ro.disconnect();
      reset();
    };
  }, [visible]);

  if (!event || !visible) return null;

  const title = publicEventTitle(event, lang);
  const blurb = publicEventBlurb(event, lang);
  const when = formatEventDateTime(event.startsAt, event.timezone, lang);

  function handleDismiss() {
    if (event) localStorage.setItem(dismissKey(event.slug), '1');
    setVisible(false);
  }

  return (
    <div
      ref={ref}
      role="region"
      aria-label={t('strip_aria')}
      className="fixed inset-x-0 top-0 z-[201] bg-[var(--m-ink-primary)] text-white motion-safe:transition-colors"
    >
      <div className="mx-auto flex max-w-[1200px] items-center gap-2 px-5 md:px-8">
        <Link
          href={`/events/${event.slug}`}
          className="group flex min-w-0 flex-1 items-center gap-2.5 py-2.5"
        >
          <CalendarDays
            size={16}
            className="shrink-0 text-[var(--m-accent-teal)]"
            aria-hidden
          />
          <span className="flex flex-wrap items-baseline gap-x-2 gap-y-0.5 text-[13px] leading-snug md:text-[13.5px]">
            <span className="font-semibold">{blurb}</span>
            <span className="text-white/80">
              {title} · {when}
            </span>
          </span>
          <span className="ml-1 hidden shrink-0 items-center gap-1 text-[13px] font-semibold text-[var(--m-accent-teal)] sm:inline-flex">
            {t('strip_cta')}
            <ArrowRight
              size={14}
              className="motion-safe:transition-transform group-hover:translate-x-0.5"
              aria-hidden
            />
          </span>
        </Link>
        <button
          type="button"
          onClick={handleDismiss}
          aria-label={t('strip_dismiss')}
          className="-mr-2.5 flex h-11 w-11 shrink-0 items-center justify-center text-white/60 transition-colors hover:text-white"
        >
          <X size={18} aria-hidden />
        </button>
      </div>
    </div>
  );
}
