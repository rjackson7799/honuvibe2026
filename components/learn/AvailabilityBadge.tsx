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

  if (status === 'in-progress') {
    return (
      <span
        className={cn(
          'text-sm font-medium text-fg-secondary',
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

  const remaining = (maxEnrollment ?? 0) - currentEnrollment;

  return (
    <span
      className={cn('text-sm font-medium text-accent-teal', className)}
    >
      {t('spots_left', { count: remaining })}
    </span>
  );
}
