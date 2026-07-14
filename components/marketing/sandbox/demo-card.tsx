'use client';

import Image from 'next/image';
import Link from 'next/link';
import { useLocale, useTranslations } from 'next-intl';
import { ArrowRight, FlaskConical } from 'lucide-react';
import { BrowserFrame } from '@/components/marketing/primitives';
import { demoHref, type SandboxDemo } from '@/lib/sandbox/demos';
import { trackSandboxDemoInterest } from '@/lib/analytics';
import { cn } from '@/lib/utils';

type Props = {
  demo: SandboxDemo;
  /** Eager-load the card image — the demo cards are the page's LCP visuals. */
  priority?: boolean;
};

/**
 * One demo card. Live demos link out with plain next/link (NOT the
 * @/i18n/navigation Link — demos live outside the locale tree, and a
 * locale-prefixed href would 404/redirect on /ja). Launches are measured as
 * demo pageviews, so live cards fire no click event. Coming-soon cards
 * navigate nowhere and fire trackSandboxDemoInterest instead.
 */
export function SandboxDemoCard({ demo, priority = false }: Props) {
  const t = useTranslations('sandbox');
  const locale = useLocale();
  const isLive = demo.status === 'live';
  const name = t(`demos.${demo.key}.name`);

  const frame = (
    <BrowserFrame
      url={`sandbox.honuvibe.ai/${demo.slug}`}
      height="auto"
      className={cn(
        'transition-shadow duration-300',
        isLive && 'group-hover:shadow-[var(--m-shadow-xl)]',
      )}
    >
      <div className="relative aspect-[16/10] w-full bg-[var(--m-sand)]">
        <Image
          src={demo.image}
          alt={t(`demos.${demo.key}.alt`)}
          fill
          priority={priority}
          sizes="(min-width: 1024px) 50vw, 100vw"
          className={cn(
            'object-cover object-top',
            !isLive && 'opacity-90 saturate-[0.85]',
          )}
        />
      </div>
    </BrowserFrame>
  );

  const meta = (
    <div className="mt-5">
      <div className="mb-2 flex flex-wrap items-center gap-2">
        <span className="inline-flex items-center gap-1.5 rounded-full bg-[rgba(15,169,160,0.12)] px-2.5 py-1 font-mono text-[10.5px] font-bold uppercase tracking-[0.12em] text-[var(--m-accent-teal)]">
          <FlaskConical size={11} aria-hidden />
          {t('card.simulated')}
        </span>
        {locale === 'ja' && (
          <span className="inline-flex items-center rounded-full bg-[rgba(26,43,51,0.06)] px-2.5 py-1 font-mono text-[10.5px] font-bold uppercase tracking-[0.12em] text-[var(--m-ink-tertiary)]">
            {t('card.en_only')}
          </span>
        )}
      </div>

      <h3 className="text-[22px] font-bold tracking-[-0.015em] text-[var(--m-ink-primary)]">
        {name}
      </h3>
      <p className="mt-2 text-[15px] leading-[1.65] text-[var(--m-ink-secondary)]">
        {t(`demos.${demo.key}.tagline`)}
      </p>

      <div className="mt-4 flex flex-wrap gap-1.5">
        {demo.stack.map((item) => (
          <span
            key={item}
            className="rounded-md border border-[var(--m-border-soft)] bg-[var(--m-white)] px-2 py-1 font-mono text-[11px] text-[var(--m-ink-secondary)]"
          >
            {item}
          </span>
        ))}
      </div>

      <div className="mt-5">
        {isLive ? (
          <span className="inline-flex min-h-[44px] items-center gap-2 text-[14.5px] font-semibold text-[var(--m-accent-teal)]">
            {t('card.launch')}
            <ArrowRight
              size={15}
              strokeWidth={2}
              className="transition-transform duration-200 group-hover:translate-x-0.5"
            />
          </span>
        ) : (
          <span className="inline-flex min-h-[44px] items-center rounded-lg bg-[rgba(26,43,51,0.05)] px-4 text-[13.5px] font-semibold uppercase tracking-[0.06em] text-[var(--m-ink-tertiary)]">
            {t('card.coming_soon')}
          </span>
        )}
      </div>
    </div>
  );

  if (isLive) {
    return (
      <Link
        href={demoHref(demo.slug)}
        className="group block"
        aria-label={`${t('card.launch')} — ${name}`}
      >
        {frame}
        {meta}
      </Link>
    );
  }

  // Coming soon: not an interactive control — clicking goes nowhere and only
  // fires a passive interest event, so this stays a plain div (a <button>
  // would strip the h3 from the heading tree and allow only phrasing content).
  return (
    <div
      onClick={() =>
        trackSandboxDemoInterest({ demo_slug: demo.slug, locale })
      }
      className="group block w-full"
    >
      {frame}
      {meta}
    </div>
  );
}
