interface ProgressBarProps {
  label: string;
  current: number;
  target: number;
  projected?: number;
  unit?: string;
}

export default function ProgressBar({
  label,
  current,
  target,
  projected,
  unit = '',
}: ProgressBarProps) {
  const currentPct = target > 0 ? Math.min(Math.round((current / target) * 100), 100) : 0;
  const projectedPct =
    projected !== undefined && target > 0
      ? Math.min(Math.round((projected / target) * 100), 100)
      : undefined;

  const displayPct = projectedPct ?? currentPct;

  let barColor = 'bg-red-500 dark:bg-red-400';
  let barColorLight = 'bg-red-300/50 dark:bg-red-500/30';
  if (displayPct >= 66) {
    barColor = 'bg-emerald-500 dark:bg-emerald-400';
    barColorLight = 'bg-emerald-300/50 dark:bg-emerald-400/25';
  } else if (displayPct >= 33) {
    barColor = 'bg-amber-500 dark:bg-amber-400';
    barColorLight = 'bg-amber-300/50 dark:bg-amber-400/25';
  }

  const hasProjection = projectedPct !== undefined && projectedPct > currentPct;

  return (
    <div>
      <div className="flex items-baseline justify-between mb-1.5">
        <span className="text-xs font-semibold uppercase tracking-wider text-gray-500 dark:text-gray-400">
          {label}
        </span>
        <div className="flex items-baseline gap-1.5">
          <span className="text-sm font-bold tabular-nums text-gray-900 dark:text-gray-100">
            {current.toLocaleString()}
            {unit}
          </span>
          {hasProjection && (
            <>
              <span className="text-[10px] text-gray-400 dark:text-gray-500">/</span>
              <span className="text-xs font-medium tabular-nums text-gray-400 dark:text-gray-500">
                {projected!.toLocaleString()}
                {unit}
              </span>
            </>
          )}
          <span className="text-xs text-gray-400 dark:text-gray-500">
            of {target.toLocaleString()}
            {unit}
          </span>
        </div>
      </div>

      <div className="relative h-2 w-full rounded-full bg-gray-100 dark:bg-gray-700/60 overflow-hidden">
        {/* Projected fill (lighter, behind current) */}
        {hasProjection && (
          <div
            className={`absolute inset-y-0 left-0 rounded-full transition-all duration-700 ease-out ${barColorLight}`}
            style={{ width: `${projectedPct}%` }}
          />
        )}
        {/* Current fill (solid, on top) */}
        <div
          className={`absolute inset-y-0 left-0 rounded-full transition-all duration-500 ease-out ${barColor}`}
          style={{ width: `${currentPct}%` }}
        />
      </div>

      {/* Percentage labels */}
      <div className="flex items-center justify-between mt-1">
        <span className="text-[10px] font-medium tabular-nums text-gray-400 dark:text-gray-500">
          {currentPct}%
        </span>
        {hasProjection && (
          <span className="text-[10px] font-medium tabular-nums text-gray-400 dark:text-gray-500">
            {projectedPct}% projected
          </span>
        )}
      </div>
    </div>
  );
}
