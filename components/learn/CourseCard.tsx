'use client';

import Image from 'next/image';
import { useState } from 'react';
import { useTranslations, useLocale } from 'next-intl';
import { Link } from '@/i18n/navigation';
import { Overline } from '@/components/ui/overline';
import { Button } from '@/components/ui/button';
import { PriceDisplay } from './PriceDisplay';
import { AvailabilityBadge } from './AvailabilityBadge';
import type { Course } from '@/lib/courses/types';
import { ArrowRight } from 'lucide-react';
import { SyllabusDownloadLink } from './SyllabusDownloadLink';
import { cn } from '@/lib/utils';

type CourseCardProps = {
  course: Course;
  variant?: 'catalog' | 'dashboard';
  viewCourseHref?: string;
  className?: string;
};

export function CourseCard({ course, variant = 'catalog', viewCourseHref, className }: CourseCardProps) {
  const t = useTranslations('learn');
  const locale = useLocale();
  const [enrolling, setEnrolling] = useState(false);
  const [enrollError, setEnrollError] = useState<string | null>(null);

  async function handleEnroll(e: React.MouseEvent) {
    e.preventDefault();
    setEnrolling(true);
    setEnrollError(null);
    try {
      const res = await fetch('/api/stripe/checkout', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ courseId: course.id, locale }),
      });
      const data = await res.json();
      if (!res.ok) throw new Error(data.error ?? 'Checkout failed');
      window.location.href = data.url;
    } catch (err) {
      setEnrollError(err instanceof Error ? err.message : 'Something went wrong');
      setEnrolling(false);
    }
  }

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

  const cardClasses = cn(
    'group flex flex-col h-full rounded-lg bg-bg-secondary border border-border-default overflow-hidden',
    'transition-all duration-[var(--duration-normal)]',
    'hover:shadow-md hover:-translate-y-0.5 hover:border-border-hover',
    className,
  );

  const cardInner = (
    <>
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
        {course.thumbnail_url && (
          <div className="absolute bottom-0 left-0 right-0 h-8 bg-gradient-to-t from-bg-secondary to-transparent" />
        )}
      </div>

      <div className="p-5 flex flex-col flex-1 gap-3">
        <Overline>{overlineParts.join(' · ')}</Overline>

        <h3 className="text-lg font-serif text-fg-primary leading-snug group-hover:text-accent-teal transition-colors duration-[var(--duration-fast)]">
          {title}
        </h3>

        {description && (
          <p className="text-sm text-fg-secondary line-clamp-2 flex-1">
            {description}
          </p>
        )}

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

        <PriceDisplay
          priceUsd={course.price_usd}
          priceJpy={course.price_jpy}
          size="md"
        />

        {course.is_published && (
          <SyllabusDownloadLink courseId={course.id} variant="card" />
        )}

        {variant === 'dashboard' ? (
          <div className="mt-auto flex flex-col gap-2">
            <Button
              variant="primary"
              size="sm"
              icon={ArrowRight}
              iconPosition="right"
              onClick={handleEnroll}
              disabled={enrolling}
            >
              {enrolling ? '…' : t('enroll_now')}
            </Button>
            {enrollError && (
              <p className="text-xs text-red-400">{enrollError}</p>
            )}
            <Link href={viewCourseHref ?? `/learn/${course.slug}`}>
              <Button variant="ghost" size="sm" className="w-full">
                {t('view_course')}
              </Button>
            </Link>
          </div>
        ) : (
          <Button
            variant="primary"
            size="sm"
            icon={ArrowRight}
            iconPosition="right"
            className="mt-auto"
          >
            {t('view_course')}
          </Button>
        )}
      </div>
    </>
  );

  if (variant === 'dashboard') {
    return <div className={cardClasses}>{cardInner}</div>;
  }

  return (
    <Link href={`/learn/${course.slug}`} className={cardClasses}>
      {cardInner}
    </Link>
  );
}
