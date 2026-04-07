import { useTranslations } from 'next-intl';
import { cn } from '@/lib/utils';

type AvailabilityBadgeProps = {
  currentEnrollment: number;
  maxEnrollment: number | null;
  status: string;
  className?: string;
};

export function AvailabilityBadge({
  currentEnrollment,
  maxEnrollment,
  status,
  className,
}: AvailabilityBadgeProps) {
  const t = useTranslations('learn');

  if (status === 'completed') {
    return (
      <span
        className={cn(
          'inline-flex items-center rounded-full px-2.5 py-0.5 text-xs font-medium',
          'bg-bg-tertiary text-fg-muted border border-border-default',
          className,
        )}
      >
        {t('course_complete')}
      </span>
    );
  }

  if (status === 'in-progress') {
    return (
      <span
        className={cn(
          'inline-flex items-center rounded-full px-2.5 py-0.5 text-xs font-medium',
          'bg-accent-gold/10 text-accent-gold border border-accent-gold/20',
          className,
        )}
      >
        {t('in_progress')}
      </span>
    );
  }

  if (maxEnrollment && currentEnrollment >= maxEnrollment) {
    return (
      <span
        className={cn(
          'text-sm font-medium text-accent-gold',
          className,
        )}
      >
        {t('cohort_full')}
      </span>
    );
  }

  const remaining = maxEnrollment ? maxEnrollment - currentEnrollment : null;

  return (
    <span className={cn('inline-flex items-center gap-2', className)}>
      <span className="inline-flex items-center rounded-full px-2.5 py-0.5 text-xs font-medium bg-accent-teal/10 text-accent-teal border border-accent-teal/20">
        {t('open_for_enrollment')}
      </span>
      {remaining !== null && (
        <span className="text-sm text-fg-tertiary">
          {t('spots_left', { count: remaining })}
        </span>
      )}
    </span>
  );
}
