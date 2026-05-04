import { useTranslations } from 'next-intl';
import { BadgePill } from '@/components/ui/badge-pill';

type AvailabilityBadgeProps = {
  currentEnrollment: number;
  maxEnrollment: number | null;
  status: string;
  startDate?: string | null;
  className?: string;
};

export function AvailabilityBadge({
  currentEnrollment,
  maxEnrollment,
  status,
  startDate,
  className,
}: AvailabilityBadgeProps) {
  const t = useTranslations('learn');

  const isStarted = startDate ? new Date(startDate) <= new Date() : false;
  const effectiveStatus = isStarted && status === 'published' ? 'in-progress' : status;

  if (effectiveStatus === 'completed') {
    return (
      <BadgePill variant="gray" size="sm" className={className}>
        {t('course_complete')}
      </BadgePill>
    );
  }

  if (effectiveStatus === 'in-progress') {
    return (
      <BadgePill variant="coral" size="sm" className={className}>
        {t('in_progress')}
      </BadgePill>
    );
  }

  if (maxEnrollment && currentEnrollment >= maxEnrollment) {
    return (
      <BadgePill variant="coral" size="sm" className={className}>
        {t('cohort_full')}
      </BadgePill>
    );
  }

  const remaining = maxEnrollment ? maxEnrollment - currentEnrollment : null;

  return (
    <span className={`inline-flex items-center gap-2 ${className ?? ''}`.trim()}>
      <BadgePill variant="teal" size="sm">
        {t('open_for_enrollment')}
      </BadgePill>
      {remaining !== null && (
        <span className="text-sm text-[var(--m-ink-tertiary)]">
          {t('spots_left', { count: remaining })}
        </span>
      )}
    </span>
  );
}
