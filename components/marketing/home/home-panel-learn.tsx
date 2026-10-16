import { useTranslations } from 'next-intl';
import { Link } from '@/i18n/navigation';
import { HvButton, HvHeading } from '@/components/marketing/hv';
import { TRACK_IDS } from '@/lib/tracks';
import type { HomeLesson } from './lessons';

type Props = {
  /** "Recently added" chips; empty hides the row. */
  recent: readonly HomeLesson[];
};

/** Tab 01: the five tracks, recently added lessons, and the AI Essentials starter strip. */
export function HomePanelLearn({ recent }: Props) {
  const t = useTranslations('home.panel_learn');
  const tt = useTranslations('tracks');

  return (
    <div className="flex flex-1 flex-col gap-3.5">
      <div className="flex flex-wrap items-center justify-between gap-3">
        <span className="text-[12px] font-bold uppercase tracking-[0.12em] text-hv-terracotta">{t('eyebrow')}</span>
        <span className="text-[13.5px] text-hv-ink-500">{t('meta')}</span>
      </div>
      <HvHeading level="panel" className="text-hv-green-900 [word-break:auto-phrase]">
        {t('heading')}
      </HvHeading>

      <ol className="grid gap-2">
        {TRACK_IDS.map((id, i) => (
          <li key={id}>
            <Link
              href={`/learn?track=${id}`}
              className="grid min-h-14 grid-cols-[30px_minmax(0,1fr)_auto] items-center gap-3 rounded-[10px] border border-hv-sand-300 bg-hv-sand-50 px-3.5 py-3 text-hv-green-900 transition-[transform,box-shadow] duration-[250ms] ease-hv hover:translate-x-1 hover:shadow-hv-card focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-hv-amber"
            >
              <span aria-hidden className="font-hv-display text-[13px] font-bold text-hv-taupe">
                {String(i + 1).padStart(2, '0')}
              </span>
              <span>
                <span className="block text-[16px] font-semibold text-hv-green-900">{tt(`${id}.label`)}</span>
                <span className="mt-0.5 block text-[13.5px] text-hv-ink-500">{tt(`${id}.blurb`)}</span>
              </span>
              <span className="text-[13px] font-semibold text-hv-terracotta">
                {t('view')} <span aria-hidden>→</span>
              </span>
            </Link>
          </li>
        ))}
      </ol>

      {recent.length > 0 && (
        <div data-testid="home-recent" className="flex flex-col gap-2.5 pt-1.5">
          <div className="flex flex-wrap items-center justify-between gap-3">
            <span className="inline-flex items-center gap-2 text-[12px] font-bold uppercase tracking-[0.12em] text-hv-green-900">
              <span aria-hidden className="inline-block h-[7px] w-[7px] rounded-full bg-hv-terracotta animate-hv-pulse" />
              {t('trending')}
            </span>
            <span className="text-[13.5px] text-hv-ink-500">{t('trending_meta')}</span>
          </div>
          <ul className="flex flex-wrap gap-2">
            {recent.map((lesson) => (
              <li key={lesson.id}>
                <Link
                  href="/learn"
                  className="inline-flex min-h-[44px] items-center gap-2 rounded-full border border-hv-sand-300 bg-hv-sand-50 px-3.5 text-[14px] font-medium text-hv-green-900 transition-colors duration-[250ms] hover:bg-hv-sand-200 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-hv-amber"
                >
                  {lesson.title}
                  <span aria-hidden className="text-hv-terracotta">
                    →
                  </span>
                </Link>
              </li>
            ))}
          </ul>
        </div>
      )}

      <div className="mt-auto flex flex-wrap items-center justify-between gap-3 rounded-[12px] bg-hv-green-900 px-[18px] py-4 text-hv-sand-100">
        <p className="text-[15px] leading-[1.45]">
          {t.rich('starter', { b: (chunks) => <strong>{chunks}</strong> })}
        </p>
        <HvButton href="/learn?track=ai_essentials" variant="amber" size="sm" arrow>
          {t('starter_cta')}
        </HvButton>
      </div>
    </div>
  );
}
