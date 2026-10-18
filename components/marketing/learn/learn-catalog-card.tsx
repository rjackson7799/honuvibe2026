import { useTranslations } from 'next-intl';
import { Link } from '@/i18n/navigation';
import { cn } from '@/lib/utils';
import type { LearnCatalogEntry } from '@/lib/learn/catalog';

/**
 * Card cover tones (design 02 `l.bg` / `l.fg` pairs), all hv tokens. Every
 * pair keeps the 12px track label at WCAG AA; the design's terracotta + peach
 * pair did not, so tone 5 is amber + green-900.
 */
export const COVER_TONES: Record<LearnCatalogEntry['coverTone'], string> = {
  0: 'bg-hv-green-900 text-hv-amber',
  1: 'bg-hv-green-800 text-hv-green-200',
  2: 'bg-hv-bronze text-hv-cover-peach',
  3: 'bg-hv-terracotta-dark text-hv-cover-blush',
  4: 'bg-hv-green-700 text-hv-cover-wheat',
  5: 'bg-hv-amber text-hv-green-900',
};

const CONTENT_TYPES = ['video', 'workshop', 'article', 'template', 'tool', 'prompt_pack'];

/** "12 min · Beginner", "Video", "4 weeks" — D6. Empty string when nothing is known. */
export function useEntryMetaText(entry: LearnCatalogEntry): string {
  const t = useTranslations('learn_catalog.catalog');
  const { meta, level } = entry;
  let length = '';
  if (meta?.kind === 'minutes') length = t('minutes', { count: meta.value });
  else if (meta?.kind === 'weeks') length = t('weeks', { count: meta.value });
  else if (meta?.kind === 'type' && CONTENT_TYPES.includes(meta.value)) length = t(`types.${meta.value}`);
  return [length, level ? t(`levels.${level}`) : ''].filter(Boolean).join(' · ');
}

/** One catalog card: the whole card is a single link. */
export function LearnCatalogCard({ entry }: { entry: LearnCatalogEntry }) {
  const t = useTranslations('learn_catalog.catalog');
  const tt = useTranslations('tracks');
  const metaText = useEntryMetaText(entry);

  return (
    <Link
      href={entry.href}
      className={cn(
        'group flex h-full flex-col overflow-hidden rounded-[14px] border border-hv-sand-300 bg-hv-sand-50',
        'transition-[transform,box-shadow] duration-200 ease-hv hover:shadow-hv-card-sm motion-safe:hover:-translate-y-1',
        'focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-hv-amber focus-visible:ring-offset-2',
      )}
    >
      <div className={cn('flex h-[150px] flex-col justify-between p-[18px]', COVER_TONES[entry.coverTone])}>
        <div className="flex items-start justify-between gap-2.5">
          <span className="text-[12px] uppercase tracking-[0.08em]">
            {entry.track ? tt(`${entry.track}.label`) : ''}
          </span>
          {entry.free && (
            <span
              className={cn(
                'rounded-[6px] px-2 py-1 text-[12px] font-bold uppercase tracking-[0.08em]',
                entry.coverTone === 5 ? 'bg-hv-green-900 text-hv-amber' : 'bg-hv-amber text-hv-green-900',
              )}
            >
              {t('free_badge')}
            </span>
          )}
        </div>
        {entry.kind === 'course' && (
          <span className="self-start rounded-[6px] border border-current px-2 py-1 text-[12px] font-semibold uppercase tracking-[0.08em]">
            {t('course_tag')}
          </span>
        )}
      </div>
      <div className="flex flex-1 flex-col gap-2 px-[18px] pb-[18px] pt-4">
        <h3 className="text-[17.5px] font-semibold leading-[1.25] text-hv-green-900 [word-break:auto-phrase]">
          {entry.title}
        </h3>
        {entry.blurb && <p className="line-clamp-2 text-[14.5px] leading-[1.5] text-hv-ink-500">{entry.blurb}</p>}
        <div className="mt-auto flex flex-wrap items-center justify-between gap-2.5 pt-2">
          <span className="text-[14px] font-semibold text-hv-terracotta">
            {entry.free ? t('cta_free') : t('cta_start')} <span aria-hidden>→</span>
          </span>
          {metaText && <span className="text-[12.5px] text-hv-ink-500">{metaText}</span>}
        </div>
      </div>
    </Link>
  );
}
