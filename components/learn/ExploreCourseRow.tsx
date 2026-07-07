'use client';

import Image from 'next/image';
import Link from 'next/link';
import { useTranslations, useLocale } from 'next-intl';
import { ChevronRight } from 'lucide-react';
import { PriceDisplay } from './PriceDisplay';
import type { Course } from '@/lib/courses/types';

type ExploreCourseRowProps = {
  course: Course;
  /** Fully locale-prefixed destination. */
  viewCourseHref: string;
};

export function ExploreCourseRow({ course, viewCourseHref }: ExploreCourseRowProps) {
  const t = useTranslations('learn');
  const locale = useLocale();

  const title = locale === 'ja' && course.title_jp ? course.title_jp : course.title_en;

  const overlineParts = [
    course.level ? t(course.level) : null,
    course.total_weeks ? t('weeks', { count: course.total_weeks }) : null,
  ].filter(Boolean);

  return (
    <Link
      href={viewCourseHref}
      className="group flex items-center gap-3.5 bg-bg-secondary border border-border-default rounded-[14px] p-3 shadow-[var(--shadow-md)] hover:shadow-[var(--shadow-lg)] hover:-translate-y-0.5 hover:border-border-hover transition-all duration-200"
    >
      {/* Thumbnail */}
      <div className="w-[96px] aspect-[16/9] rounded-[10px] bg-bg-tertiary overflow-hidden shrink-0">
        {course.thumbnail_url ? (
          <Image
            src={course.thumbnail_url}
            alt={title}
            width={192}
            height={108}
            className="w-full h-full object-cover transition-transform duration-[var(--duration-slow)] group-hover:scale-105"
          />
        ) : (
          <div className="w-full h-full flex items-center justify-center text-fg-tertiary">
            <svg width="22" height="22" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1">
              <rect x="3" y="3" width="18" height="18" rx="2" />
              <path d="M3 15l4-4a2 2 0 0 1 2.8 0L15 16" />
              <path d="M14 14l1-1a2 2 0 0 1 2.8 0L21 16" />
            </svg>
          </div>
        )}
      </div>

      {/* Details */}
      <div className="flex-1 min-w-0 flex flex-col gap-0.5">
        {overlineParts.length > 0 && (
          <span className="text-[10.5px] font-semibold uppercase tracking-[0.14em] text-fg-tertiary">
            {overlineParts.join(' · ')}
          </span>
        )}
        <h4 className="text-[14px] font-bold text-fg-primary leading-snug tracking-[-0.01em] line-clamp-1 group-hover:text-accent-teal transition-colors duration-[var(--duration-fast)]">
          {title}
        </h4>
        <PriceDisplay priceUsd={course.price_usd} priceJpy={course.price_jpy} size="sm" />
      </div>

      <ChevronRight size={16} className="shrink-0 text-fg-tertiary" />
    </Link>
  );
}
