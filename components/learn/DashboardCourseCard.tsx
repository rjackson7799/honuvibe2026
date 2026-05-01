'use client';

import { useTranslations, useLocale } from 'next-intl';
import { useRouter } from 'next/navigation';
import { ArrowRight } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { BadgePill } from '@/components/ui/badge-pill';
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
  const isComplete = progressPercent === 100;

  const prefix = locale === 'ja' ? '/ja' : '';
  const navigate = () => router.push(`${prefix}/learn/dashboard/${course.slug}`);

  return (
    <div
      role="button"
      tabIndex={0}
      onClick={navigate}
      onKeyDown={(e) => {
        if (e.key === 'Enter' || e.key === ' ') navigate();
      }}
      className="group flex flex-col bg-bg-secondary border border-border-default rounded-[14px] overflow-hidden shadow-[var(--shadow-md)] hover:shadow-[var(--shadow-lg)] hover:-translate-y-0.5 hover:border-[color:var(--accent-teal)]/35 transition-all duration-200 cursor-pointer"
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
        <div className="flex items-center gap-2 flex-wrap">
          <BadgePill variant={isComplete ? 'coral' : 'teal'} size="xs">
            {isComplete ? t('completed') : t('in_progress')}
          </BadgePill>
          <span className="text-[11.5px] text-fg-tertiary font-medium">
            {t('week_of', { current: currentWeek, total: totalWeeks })}
          </span>
        </div>

        {/* Title */}
        <h3 className="text-[17px] font-bold text-fg-primary leading-snug tracking-[-0.015em]">
          {title}
        </h3>

        {/* Progress bar */}
        <div className="space-y-1.5">
          <div className="flex items-center justify-between text-[11.5px] text-fg-tertiary">
            <span>{t('progress', { percent: progressPercent })}</span>
          </div>
          <div className="h-[5px] bg-[rgba(26,43,51,0.07)] rounded-full overflow-hidden">
            <div
              className={`h-full rounded-full transition-all duration-500 ${
                isComplete ? 'bg-[color:var(--accent-coral)]' : 'bg-[color:var(--accent-teal)]'
              }`}
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
