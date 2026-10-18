import { useTranslations } from 'next-intl';
import { Link } from '@/i18n/navigation';
import { cn } from '@/lib/utils';
import type { LearnCatalogEntry } from '@/lib/learn/catalog';
import { COVER_TONES } from './learn-catalog-card';

/** Hero feature card for the first free lesson (D4). Renders nothing without one. */
export function LearnFreeCard({ entry }: { entry: LearnCatalogEntry | null }) {
  const t = useTranslations('learn_catalog.free_card');
  const tt = useTranslations('tracks');
  if (!entry) return null;

  return (
    <Link
      href={entry.href}
      data-intro
      className={cn(
        'flex flex-col overflow-hidden rounded-[16px] bg-hv-sand-100 text-hv-ink transition-shadow duration-[250ms]',
        'hover:shadow-hv-glow-amber focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-hv-amber',
      )}
    >
      <div className={cn('relative aspect-[16/9]', COVER_TONES[entry.coverTone])}>
        <span
          className={cn(
            'absolute left-3.5 top-3.5 rounded-[7px] px-[11px] py-1.5 text-[12px] font-bold uppercase tracking-[0.08em]',
            entry.coverTone === 5 ? 'bg-hv-green-900 text-hv-amber' : 'bg-hv-amber text-hv-green-900',
          )}
        >
          {t('badge')}
        </span>
      </div>
      <div className="flex flex-col gap-2 px-6 pb-6 pt-[22px]">
        {entry.track && (
          <span className="text-[12px] uppercase tracking-[0.1em] text-hv-ink-500">{tt(`${entry.track}.label`)}</span>
        )}
        <h2 className="font-hv-display text-[26px] font-bold leading-[1.1] tracking-[-0.03em] text-hv-green-900 [word-break:auto-phrase]">
          {entry.title}
        </h2>
        {entry.blurb && <p className="line-clamp-3 text-[15px] leading-[1.55] text-hv-ink-500">{entry.blurb}</p>}
        <span className="mt-2 font-semibold text-hv-terracotta">
          {t('cta')} <span aria-hidden>→</span>
        </span>
      </div>
    </Link>
  );
}
