import type { PacingStatus } from '@/lib/sandbox/miles-chaser/types/domain';
import Badge from '../ui/Badge';

const PACING_CONFIG: Record<
  PacingStatus,
  { label: string; variant: 'green' | 'blue' | 'yellow' | 'red' }
> = {
  achieved: { label: 'Achieved', variant: 'green' },
  ahead: { label: 'Ahead', variant: 'green' },
  on_track: { label: 'On Track', variant: 'blue' },
  behind: { label: 'Behind', variant: 'yellow' },
  at_risk: { label: 'At Risk', variant: 'red' },
};

interface PacingBadgeProps {
  pacing: PacingStatus;
  className?: string;
}

export default function PacingBadge({ pacing, className = '' }: PacingBadgeProps) {
  const config = PACING_CONFIG[pacing];

  return (
    <span className={className}>
      <Badge variant={config.variant}>{config.label}</Badge>
    </span>
  );
}
