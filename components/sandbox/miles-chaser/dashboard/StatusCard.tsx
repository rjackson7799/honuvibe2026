import type { EnrollmentWithProgram } from '../hooks/useEnrollments';
import type { ProjectionResult } from '@/lib/sandbox/miles-chaser/types/domain';
import type { TierDefinition } from '@/lib/sandbox/miles-chaser/types/database';
import Badge from '../ui/Badge';
import ProgressBar from './ProgressBar';
import PacingBadge from './PacingBadge';
import MonthlyTargets from './MonthlyTargets';

const TIER_NAMES: Record<string, string> = {
  none: 'Member',
  silver: 'Silver',
  gold: 'Gold',
  platinum: 'Platinum',
  mvp_gold: 'MVP Gold 100K',
};

interface StatusCardProps {
  enrollment: EnrollmentWithProgram;
  projection: ProjectionResult | null;
}

export default function StatusCard({ enrollment, projection }: StatusCardProps) {
  const program = enrollment.loyalty_programs;
  const tiers = (program?.tiers || []) as TierDefinition[];
  const targetTierDef = tiers.find((t) => t.key === enrollment.target_tier);

  const showTargets =
    projection &&
    projection.pacing !== 'achieved' &&
    (projection.monthlyTargetQM > 0 ||
      projection.monthlyTargetQS > 0 ||
      projection.monthlyTargetQD > 0);

  return (
    <div className="rounded-xl border border-gray-200 dark:border-gray-700 bg-white dark:bg-gray-800 overflow-hidden">
      {/* Header */}
      <div className="px-5 pt-5 pb-4">
        <div className="flex items-start justify-between">
          <div>
            <p className="text-xs font-medium text-gray-500 dark:text-gray-400">
              {program?.display_name}
            </p>
            <div className="flex items-center gap-2 mt-1.5">
              <Badge tier={enrollment.current_tier}>
                {TIER_NAMES[enrollment.current_tier] || enrollment.current_tier}
              </Badge>
              <svg
                className="w-3.5 h-3.5 text-gray-300 dark:text-gray-600"
                fill="none"
                stroke="currentColor"
                viewBox="0 0 24 24"
              >
                <path
                  strokeLinecap="round"
                  strokeLinejoin="round"
                  strokeWidth={2}
                  d="M9 5l7 7-7 7"
                />
              </svg>
              <Badge tier={enrollment.target_tier}>
                {TIER_NAMES[enrollment.target_tier] || enrollment.target_tier}
              </Badge>
            </div>
          </div>
          <div className="flex flex-col items-end gap-1.5">
            {projection && <PacingBadge pacing={projection.pacing} />}
            <span className="text-[11px] tabular-nums text-gray-400 dark:text-gray-500">
              {enrollment.qualification_year_start} &mdash;{' '}
              {enrollment.qualification_year_end}
            </span>
          </div>
        </div>

        {/* Completion headline */}
        {projection && (
          <div className="mt-4 flex items-baseline gap-2">
            <span className="text-3xl font-extrabold tabular-nums text-gray-900 dark:text-gray-100">
              {Math.round(projection.completionPct)}%
            </span>
            <span className="text-sm text-gray-500 dark:text-gray-400">
              to{' '}
              {TIER_NAMES[projection.targetTier] || projection.targetTier}
            </span>
          </div>
        )}
      </div>

      {/* Progress bars */}
      {targetTierDef && (
        <div className="px-5 pb-4 space-y-4">
          <ProgressBar
            label="Qualifying Miles"
            current={enrollment.current_qualifying_miles}
            target={targetTierDef.qm}
            projected={projection?.projectedQM}
            unit=" QM"
          />
          <ProgressBar
            label="Qualifying Segments"
            current={enrollment.current_qualifying_segments}
            target={targetTierDef.qs}
            projected={projection?.projectedQS}
            unit=" QS"
          />
          <ProgressBar
            label="Qualifying Dollars"
            current={enrollment.current_qualifying_dollars}
            target={targetTierDef.qd}
            projected={projection?.projectedQD}
          />
        </div>
      )}

      {/* Monthly targets */}
      {showTargets && (
        <div className="px-5 pb-4">
          <MonthlyTargets
            monthlyQM={projection.monthlyTargetQM}
            monthlyQS={projection.monthlyTargetQS}
            monthlyQD={projection.monthlyTargetQD}
            monthsRemaining={Math.max(
              1,
              Math.ceil(
                (new Date(enrollment.qualification_year_end).getTime() - Date.now()) /
                  (1000 * 60 * 60 * 24 * 30)
              )
            )}
          />
        </div>
      )}

      {/* Summary */}
      {projection?.summary && (
        <div className="px-5 py-3 border-t border-gray-100 dark:border-gray-700/60 bg-gray-50/50 dark:bg-gray-800/50">
          <p className="text-sm text-gray-600 dark:text-gray-300 leading-relaxed">
            {projection.summary}
          </p>
        </div>
      )}
    </div>
  );
}
