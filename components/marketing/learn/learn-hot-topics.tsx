import { useTranslations } from 'next-intl';
import { Link } from '@/i18n/navigation';
import { HvEyebrow, HvHeading, HvSection } from '@/components/marketing/hv';
import type { LearnCatalogEntry } from '@/lib/learn/catalog';
import { useEntryMetaText } from './learn-catalog-card';

function HotTopic({ entry, index }: { entry: LearnCatalogEntry; index: number }) {
  const t = useTranslations('learn_catalog.hot_topics');
  const meta = useEntryMetaText(entry);
  return (
    <li>
      <Link
        href={entry.href}
        className="flex h-full min-h-[190px] flex-col gap-2.5 rounded-[14px] border border-hv-sand-300 bg-hv-sand-50 p-5 transition-colors hover:border-hv-green-900 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-hv-amber focus-visible:ring-offset-2"
      >
        <span className="flex justify-between gap-2.5 text-[12.5px] text-hv-ink-500">
          <span aria-hidden className="font-hv-display font-bold text-hv-terracotta">
            {String(index + 1).padStart(2, '0')}
          </span>
          {meta && <span>{meta}</span>}
        </span>
        <h3 className="font-hv-display text-[21px] font-bold leading-[1.15] tracking-[-0.02em] text-hv-green-900 [word-break:auto-phrase]">
          {entry.title}
        </h3>
        {entry.blurb && <p className="line-clamp-3 text-[14.5px] leading-[1.5] text-hv-ink-500">{entry.blurb}</p>}
        <span className="mt-auto text-[14px] font-semibold text-hv-terracotta">
          {t('open')} <span aria-hidden>→</span>
        </span>
      </Link>
    </li>
  );
}

/** Four real lessons (D3). Hidden when fewer than two exist. */
export function LearnHotTopics({ topics }: { topics: LearnCatalogEntry[] }) {
  const t = useTranslations('learn_catalog.hot_topics');
  if (topics.length < 2) return null;

  return (
    <HvSection id="hot">
      <div data-reveal>
        <div className="flex flex-wrap items-end justify-between gap-4">
          <div>
            <HvEyebrow dot>{t('eyebrow')}</HvEyebrow>
            <HvHeading level="h2-sm" className="mt-2.5 text-hv-green-900 [word-break:auto-phrase]">
              {t('title')}
            </HvHeading>
          </div>
          <p className="text-[14px] text-hv-ink-500">{t('aside')}</p>
        </div>
        <ol className="mt-6 grid gap-4 [grid-template-columns:repeat(auto-fit,minmax(min(100%,260px),1fr))]">
          {topics.map((entry, i) => (
            <HotTopic key={entry.id} entry={entry} index={i} />
          ))}
        </ol>
      </div>
    </HvSection>
  );
}
