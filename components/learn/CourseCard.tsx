'use client';

import Image from 'next/image';
import { useTranslations, useLocale } from 'next-intl';
import { Link } from '@/i18n/navigation';
import { Overline } from '@/components/ui/overline';
import { Button } from '@/components/ui/button';
import { PriceDisplay } from './PriceDisplay';
import { AvailabilityBadge } from './AvailabilityBadge';
import type { Course } from '@/lib/courses/types';
import { ArrowRight } from 'lucide-react';
import { cn } from '@/lib/utils';

type CourseCardProps = {
  course: Course;
  variant?: 'catalog' | 'dashboard';
  className?: string;
};

export function CourseCard({ course, variant = 'catalog', className }: CourseCardProps) {
  const t = useTranslations('learn');
  const locale = useLocale();

  const title = locale === 'ja' && course.title_jp ? course.title_jp : course.title_en;
  const description = locale === 'ja' && course.description_jp ? course.description_jp : course.description_en;

  const overlineParts = [
    course.level ? t(course.level) : null,
    course.total_weeks ? t('weeks', { count: course.total_weeks }) : null,
    course.language === 'both' ? 'EN/JP' : course.language?.toUpperCase(),
  ].filter(Boolean);

  const startDateFormatted = course.start_date
    ? new Date(course.start_date).toLocaleDateString(
        locale === 'ja' ? 'ja-JP' : 'en-US',
        { month: 'short', day: 'numeric' },
      )
    : null;

  return (
    <Link
      href={`/learn/${course.slug}`}
      className={cn(
        'group flex flex-col h-full rounded-lg bg-bg-secondary border border-border-default overflow-hidden',
        'transition-all duration-[var(--duration-normal)]',
        'hover:shadow-md hover:-translate-y-0.5 hover:border-border-hover',
        className,
      )}
    >
      {/* Thumbnail */}
      <div className="aspect-[16/9] bg-bg-tertiary overflow-hidden relative">
        {course.thumbnail_url ? (
          <Image
            src={course.thumbnail_url}
            alt={title}
            width={600}
            height={340}
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
        {/* Bottom gradient fade */}
        {course.thumbnail_url && (
          <div className="absolute bottom-0 left-0 right-0 h-8 bg-gradient-to-t from-bg-secondary to-transparent" />
        )}
      </div>

      <div className="p-5 flex flex-col flex-1 gap-3">
        {/* Overline */}
        <Overline>{overlineParts.join(' · ')}</Overline>

        {/* Title */}
        <h3 className="text-lg font-serif text-fg-primary leading-snug group-hover:text-accent-teal transition-colors duration-[var(--duration-fast)]">
          {title}
        </h3>

        {/* Description */}
        {description && (
          <p className="text-sm text-fg-secondary line-clamp-2 flex-1">
            {description}
          </p>
        )}

        {/* Date + Availability */}
        <div className="flex items-center gap-2 text-sm">
          {startDateFormatted && (
            <span className="text-fg-tertiary">
              {t('starts', { date: startDateFormatted })}
            </span>
          )}
          {startDateFormatted && course.max_enrollment && (
            <span className="text-fg-tertiary">·</span>
          )}
          <AvailabilityBadge
            currentEnrollment={course.current_enrollment}
            maxEnrollment={course.max_enrollment}
            status={course.status}
          />
        </div>

        {/* Price */}
        <PriceDisplay
          priceUsd={course.price_usd}
          priceJpy={course.price_jpy}
          size="md"
        />

        {/* CTA */}
        <Button
          variant="primary"
          size="sm"
          icon={ArrowRight}
          iconPosition="right"
          className="mt-auto"
        >
          {t('view_course')}
        </Button>
      </div>
    </Link>
  );
}
