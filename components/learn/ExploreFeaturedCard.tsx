'use client';

import Image from 'next/image';
import Link from 'next/link';
import { useTranslations, useLocale } from 'next-intl';
import { ArrowRight } from 'lucide-react';
import { Overline } from '@/components/ui/overline';
import { Button } from '@/components/ui/button';
import { PriceDisplay } from './PriceDisplay';
import { SyllabusDownloadLink } from './SyllabusDownloadLink';
import type { Course } from '@/lib/courses/types';

type ExploreFeaturedCardProps = {
  course: Course;
  /** Fully locale-prefixed destination for the View Course CTA. */
  viewCourseHref: string;
};

export function ExploreFeaturedCard({ course, viewCourseHref }: ExploreFeaturedCardProps) {
  const t = useTranslations('learn');
  const locale = useLocale();

  const title = locale === 'ja' && course.title_jp ? course.title_jp : course.title_en;
  const description =
    locale === 'ja' && course.description_jp ? course.description_jp : course.description_en;

  const overlineParts = [
    course.level ? t(course.level) : null,
    course.total_weeks ? t('weeks', { count: course.total_weeks }) : null,
    course.language === 'both' ? 'EN/JP' : course.language?.toUpperCase(),
  ].filter(Boolean);

  return (
    <div className="group flex flex-col sm:flex-row items-stretch bg-bg-secondary border border-border-default rounded-[14px] overflow-hidden shadow-[var(--shadow-md)] hover:shadow-[var(--shadow-lg)] hover:border-border-hover transition-all duration-200">
      {/* Cover */}
      <div className="sm:w-[45%] shrink-0 aspect-[16/9] sm:aspect-auto bg-bg-tertiary overflow-hidden">
        {course.thumbnail_url ? (
          <Image
            src={course.thumbnail_url}
            alt={title}
            width={720}
            height={405}
            className="w-full h-full object-cover transition-transform duration-[var(--duration-slow)] group-hover:scale-105"
          />
        ) : (
          <div className="w-full h-full flex items-center justify-center text-fg-tertiary">
            <svg width="48" height="48" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1">
              <rect x="3" y="3" width="18" height="18" rx="2" />
              <path d="M3 15l4-4a2 2 0 0 1 2.8 0L15 16" />
              <path d="M14 14l1-1a2 2 0 0 1 2.8 0L21 16" />
            </svg>
          </div>
        )}
      </div>

      {/* Details */}
      <div className="flex-1 p-5 sm:p-6 flex flex-col gap-3">
        <Overline>{overlineParts.join(' · ')}</Overline>

        <h3 className="text-xl sm:text-2xl font-serif text-fg-primary leading-snug">
          {title}
        </h3>

        {description && (
          <p className="text-sm text-fg-secondary line-clamp-2">{description}</p>
        )}

        <div className="mt-auto pt-2 flex items-center justify-between gap-4 flex-wrap">
          <PriceDisplay priceUsd={course.price_usd} priceJpy={course.price_jpy} size="md" />
          {course.is_published && (
            <SyllabusDownloadLink courseId={course.id} variant="card" />
          )}
        </div>

        <Link href={viewCourseHref} className="w-full sm:w-auto">
          <Button variant="primary" size="sm" icon={ArrowRight} iconPosition="right" fullWidth>
            {t('view_course')}
          </Button>
        </Link>
      </div>
    </div>
  );
}
