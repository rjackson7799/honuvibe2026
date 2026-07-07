'use client';

import Image from 'next/image';
import { useTranslations, useLocale } from 'next-intl';
import { useRouter } from 'next/navigation';
import { ArrowRight, ChevronRight } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { BadgePill } from '@/components/ui/badge-pill';
import type { EnrollmentWithCourse } from '@/lib/enrollments/types';

type DashboardCourseRowProps = {
  enrollment: EnrollmentWithCourse;
  /** Real session-completion percent from the progress map. */
  progressPercent?: number;
};

// Calendar position in the course schedule — used for the "Week X of Y"
// label only, never for the progress bar.
function getCurrentWeek(startDate: string | null, totalWeeks: number | null): number {
  if (!startDate || !totalWeeks) return 1;
  const start = new Date(startDate);
  const now = new Date();
  const diffMs = now.getTime() - start.getTime();
  const diffWeeks = Math.floor(diffMs / (7 * 24 * 60 * 60 * 1000)) + 1;
  return Math.max(1, Math.min(diffWeeks, totalWeeks));
}

export function DashboardCourseRow({ enrollment, progressPercent }: DashboardCourseRowProps) {
  const t = useTranslations('learn');
  const locale = useLocale();
  const router = useRouter();

  const course = enrollment.course;
  const title = locale === 'ja' && course.title_jp ? course.title_jp : course.title_en;
  const description =
    locale === 'ja' && course.description_jp ? course.description_jp : course.description_en;

  const currentWeek = getCurrentWeek(course.start_date, course.total_weeks);
  const totalWeeks = course.total_weeks ?? 1;
  const isComplete = enrollment.status === 'completed';
  const percent = isComplete ? 100 : Math.min(100, Math.max(0, progressPercent ?? 0));

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
      className="group flex items-center gap-3.5 sm:gap-5 bg-bg-secondary border border-border-default rounded-[14px] p-3 sm:p-4 shadow-[var(--shadow-md)] hover:shadow-[var(--shadow-lg)] hover:-translate-y-0.5 hover:border-[color:var(--accent-teal)]/35 transition-all duration-200 cursor-pointer"
    >
      {/* Thumbnail — always rendered; placeholder keeps row heights uniform */}
      <div className="w-[104px] sm:w-[160px] aspect-[16/9] rounded-[10px] bg-bg-tertiary overflow-hidden shrink-0">
        {course.thumbnail_url ? (
          <Image
            src={course.thumbnail_url}
            alt={title}
            width={320}
            height={180}
            className="w-full h-full object-cover transition-transform duration-[var(--duration-slow)] group-hover:scale-105"
          />
        ) : (
          <div className="w-full h-full flex items-center justify-center text-fg-tertiary">
            <svg width="28" height="28" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1">
              <rect x="3" y="3" width="18" height="18" rx="2" />
              <path d="M3 15l4-4a2 2 0 0 1 2.8 0L15 16" />
              <path d="M14 14l1-1a2 2 0 0 1 2.8 0L21 16" />
            </svg>
          </div>
        )}
      </div>

      {/* Content */}
      <div className="flex-1 min-w-0 flex flex-col gap-1.5">
        <div className="flex items-center gap-2 flex-wrap">
          <BadgePill variant={isComplete ? 'coral' : 'teal'} size="xs">
            {isComplete ? t('completed') : t('in_progress')}
          </BadgePill>
          <span className="text-[11.5px] text-fg-tertiary font-medium">
            {t('week_of', { current: currentWeek, total: totalWeeks })}
          </span>
        </div>

        <h3 className="text-[15.5px] sm:text-[16px] font-bold text-fg-primary leading-snug tracking-[-0.015em] line-clamp-1">
          {title}
        </h3>

        {description && (
          <p className="hidden sm:block text-[12.5px] text-fg-secondary line-clamp-1">
            {description}
          </p>
        )}

        <div className="flex items-center gap-3 mt-0.5">
          <div className="flex-1 h-[5px] bg-[rgba(26,43,51,0.07)] rounded-full overflow-hidden">
            <div
              className={`h-full rounded-full transition-all duration-500 ${
                isComplete ? 'bg-[color:var(--accent-coral)]' : 'bg-[color:var(--accent-teal)]'
              }`}
              style={{ width: `${percent}%` }}
            />
          </div>
          <span className="text-[11.5px] text-fg-tertiary whitespace-nowrap">
            {t('progress', { percent })}
          </span>
        </div>
      </div>

      {/* CTA — the whole row is tappable on mobile, so the button only shows sm+ */}
      <div className="hidden sm:flex self-center shrink-0">
        <Button variant="primary" size="sm" icon={ArrowRight} iconPosition="right">
          {t('continue')}
        </Button>
      </div>
      <ChevronRight size={18} className="sm:hidden shrink-0 text-fg-tertiary" />
    </div>
  );
}
