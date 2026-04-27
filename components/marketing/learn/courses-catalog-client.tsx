'use client';

import { useState, useMemo } from 'react';
import { useTranslations } from 'next-intl';
import { ArrowRight } from 'lucide-react';
import { Link } from '@/i18n/navigation';
import type { Course } from '@/lib/courses/types';
import {
  type CatalogFilter,
  filterCatalog,
  isBuilderTrack,
} from '@/lib/courses/filters';
import { cn } from '@/lib/utils';

type Props = {
  courses: Course[];
  locale: string;
};

const FILTER_KEYS: { value: CatalogFilter; key: 'filter_all' | 'filter_beginner' | 'filter_intermediate' | 'filter_advanced' | 'filter_track' }[] = [
  { value: 'all', key: 'filter_all' },
  { value: 'beginner', key: 'filter_beginner' },
  { value: 'intermediate', key: 'filter_intermediate' },
  { value: 'advanced', key: 'filter_advanced' },
  { value: 'builder-track', key: 'filter_track' },
];

export function LearnCoursesCatalogClient({ courses, locale }: Props) {
  const t = useTranslations('learn.courses_catalog');
  const [active, setActive] = useState<CatalogFilter>('all');

  const filtered = useMemo(() => filterCatalog(courses, active), [courses, active]);

  return (
    <>
      <div
        role="tablist"
        aria-label={t('overline')}
        className="mb-10 flex flex-wrap gap-2.5"
      >
        {FILTER_KEYS.map(({ value, key }) => {
          const isActive = active === value;
          return (
            <button
              key={value}
              type="button"
              role="tab"
              aria-selected={isActive}
              onClick={() => setActive(value)}
              className={cn(
                'rounded-full px-[18px] py-2 text-[13.5px] font-semibold transition-all duration-200',
                'focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[var(--m-accent-teal)] focus-visible:ring-offset-2 focus-visible:ring-offset-[var(--m-sand)]',
                isActive
                  ? 'border border-transparent bg-[var(--m-accent-teal)] text-white'
                  : 'border border-[var(--m-border-default)] bg-transparent text-[var(--m-ink-secondary)] hover:border-[var(--m-border-teal)] hover:text-[var(--m-ink-primary)]',
              )}
            >
              {t(key)}
            </button>
          );
        })}
      </div>

      {filtered.length === 0 ? (
        <p className="rounded-2xl border border-dashed border-[var(--m-border-default)] bg-[var(--m-white)] px-6 py-16 text-center text-[15px] text-[var(--m-ink-tertiary)]">
          {t('empty_state')}
        </p>
      ) : (
        <div className="mb-8 grid gap-6 md:grid-cols-2 lg:grid-cols-3">
          {filtered.map((course) => (
            <CatalogCourseCard key={course.id} course={course} locale={locale} />
          ))}
        </div>
      )}

      <div className="text-right">
        <Link
          href="#catalog"
          className="inline-flex items-center gap-1.5 text-[14.5px] font-semibold text-[var(--m-accent-teal)] transition-opacity hover:opacity-80"
        >
          {t('see_all')}
          <ArrowRight size={16} strokeWidth={2} />
        </Link>
      </div>
    </>
  );
}

function CatalogCourseCard({ course, locale }: { course: Course; locale: string }) {
  const t = useTranslations('learn.courses_catalog');
  const isJa = locale === 'ja';
  const title = (isJa && course.title_jp) || course.title_en;
  const description = (isJa && course.description_jp) || course.description_en;
  const isTrack = isBuilderTrack(course);

  const langLabel =
    course.language === 'both'
      ? t('tag_lang_both')
      : course.language === 'ja'
        ? t('tag_lang_ja')
        : t('tag_lang_en');

  const tags: string[] = [
    course.level ? course.level.toUpperCase() : null,
    course.total_weeks ? t('tag_weeks', { count: course.total_weeks }) : null,
    langLabel,
  ].filter((x): x is string => Boolean(x));

  const priceDisplay = formatPrice(course.price_usd, course.price_jpy, isJa);
  const startsDisplay = course.start_date
    ? t('starts_label', {
        date: new Date(course.start_date).toLocaleDateString(isJa ? 'ja-JP' : 'en-US', {
          month: 'short',
          day: 'numeric',
          year: 'numeric',
        }),
      })
    : t('tbd_label');

  return (
    <Link
      href={`/learn/${course.slug}`}
      className={cn(
        'group relative flex flex-col overflow-hidden rounded-[14px] border border-[var(--m-border-soft)] bg-[var(--m-white)] p-7',
        'shadow-[var(--m-shadow-xs)] transition-all duration-300',
        'hover:-translate-y-1 hover:border-[var(--m-border-teal)] hover:shadow-[0_12px_40px_rgba(15,169,160,0.1)]',
      )}
    >
      {isTrack && (
        <span className="absolute right-0 top-0 rounded-bl-[10px] bg-[var(--m-accent-coral)] px-3.5 py-1 text-[10.5px] font-bold tracking-[0.06em] text-white">
          {t('track_ribbon')}
        </span>
      )}

      <div className="mb-5 flex flex-wrap gap-2">
        {tags.map((tag) => (
          <span
            key={tag}
            className="rounded-full bg-[var(--m-accent-coral-soft)] px-2.5 py-1 text-[11px] font-bold tracking-[0.04em] text-[var(--m-accent-coral)]"
          >
            {tag}
          </span>
        ))}
      </div>

      <h3 className="mb-2.5 text-[22px] font-bold leading-tight tracking-[-0.01em] text-[var(--m-ink-primary)] transition-colors group-hover:text-[var(--m-accent-teal)]">
        {title}
      </h3>

      {description && (
        <p className="mb-5 flex-1 text-[14.5px] leading-[1.65] text-[var(--m-ink-secondary)] line-clamp-3">
          {description}
        </p>
      )}

      <div className="mb-4 flex items-end justify-between border-t border-[var(--m-border-soft)] pt-4">
        <p className="text-[11.5px] text-[var(--m-ink-tertiary)]">{startsDisplay}</p>
        <p className="text-[17px] font-bold text-[var(--m-ink-primary)]">{priceDisplay}</p>
      </div>

      <span className="inline-flex items-center gap-1.5 text-[14.5px] font-bold text-[var(--m-accent-teal)]">
        {t('card_cta')}
        <ArrowRight size={16} strokeWidth={2} />
      </span>
    </Link>
  );
}

function formatPrice(usd: number | null, jpy: number | null, isJa: boolean): string {
  if (isJa && jpy != null) {
    return new Intl.NumberFormat('ja-JP', {
      style: 'currency',
      currency: 'JPY',
      maximumFractionDigits: 0,
    }).format(jpy);
  }
  if (usd != null) {
    return new Intl.NumberFormat('en-US', {
      style: 'currency',
      currency: 'USD',
      maximumFractionDigits: 0,
    }).format(usd);
  }
  return '—';
}
