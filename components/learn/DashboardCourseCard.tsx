'use client';

import { useTranslations, useLocale } from 'next-intl';
import { useRouter } from 'next/navigation';
import { ArrowRight } from 'lucide-react';
import { Button } from '@/components/ui/button';
import type { EnrollmentWithCourse } from '@/lib/enrollments/types';

type DashboardCourseCardProps = {
  enrollment: EnrollmentWithCourse;
};

function getCurrentWeek(startDate: string | null, totalWeeks: number | null): number {
  if (!startDate || !totalWeeks) return 1;
  const start = new Date(startDate);
  const now = new Date();
  const diffMs = now.getTime() - start.getTime();
  const diffWeeks = Math.floor(diffMs / (7 * 24 * 60 * 60 * 1000)) + 1;
  return Math.max(1, Math.min(diffWeeks, totalWeeks));
}

export function DashboardCourseCard({ enrollment }: DashboardCourseCardProps) {
  const t = useTranslations('learn');
  const locale = useLocale();
  const router = useRouter();

  const course = enrollment.course;
  const title = locale === 'ja' && course.title_jp ? course.title_jp : course.title_en;

  const currentWeek = getCurrentWeek(course.start_date, course.total_weeks);
  const totalWeeks = course.total_weeks ?? 1;
  const progressPercent = Math.round((currentWeek / totalWeeks) * 100);

  const prefix = locale === 'ja' ? '/ja' : '';

  return (
    <div
      role="button"
      tabIndex={0}
      onClick={() => router.push(`${prefix}/learn/dashboard/${course.slug}`)}
      onKeyDown={(e) => { if (e.key === 'Enter' || e.key === ' ') router.push(`${prefix}/learn/dashboard/${course.slug}`); }}
      className="flex flex-col bg-bg-secondary border border-border-default rounded-lg overflow-hidden hover:border-border-hover hover:shadow-md transition-all duration-[var(--duration-normal)] cursor-pointer"
    >
      {/* Thumbnail */}
      {course.thumbnail_url && (
        <div className="aspect-[21/9] bg-bg-tertiary overflow-hidden">
          <img
            src={course.thumbnail_url}
            alt={title}
            className="w-full h-full object-cover"
          />
        </div>
      )}

      <div className="p-5 flex flex-col gap-3 flex-1">
        {/* Status pill */}
        <div className="flex items-center gap-2">
          <span className="text-xs font-medium text-accent-teal px-2 py-0.5 bg-accent-teal/10 rounded-full">
            {t('in_progress')}
          </span>
          <span className="text-xs text-fg-tertiary">
            {t('week_of', { current: currentWeek, total: totalWeeks })}
          </span>
        </div>

        {/* Title */}
        <h3 className="text-lg font-serif text-fg-primary leading-snug">{title}</h3>

        {/* Progress bar */}
        <div className="space-y-1">
          <div className="flex items-center justify-between text-xs text-fg-tertiary">
            <span>{t('progress', { percent: progressPercent })}</span>
          </div>
          <div className="h-1.5 bg-bg-tertiary rounded-full overflow-hidden">
            <div
              className="h-full bg-accent-teal rounded-full transition-all duration-[var(--duration-slow)]"
              style={{ width: `${progressPercent}%` }}
            />
          </div>
        </div>

        {/* CTA */}
        <Button
          variant="primary"
          size="sm"
          icon={ArrowRight}
          iconPosition="right"
          className="mt-auto"
        >
          {t('continue')}
        </Button>
      </div>
    </div>
  );
}
