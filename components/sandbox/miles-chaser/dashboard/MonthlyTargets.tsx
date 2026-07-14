interface MonthlyTargetsProps {
  monthlyQM: number;
  monthlyQS: number;
  monthlyQD: number;
  monthsRemaining: number;
}

export default function MonthlyTargets({
  monthlyQM,
  monthlyQS,
  monthlyQD,
  monthsRemaining,
}: MonthlyTargetsProps) {
  return (
    <div className="rounded-lg bg-gray-50 dark:bg-gray-700/40 p-3">
      <div className="flex items-center justify-between mb-2.5">
        <span className="text-[11px] font-semibold uppercase tracking-wider text-gray-500 dark:text-gray-400">
          Monthly targets
        </span>
        <span className="text-[11px] font-medium text-gray-400 dark:text-gray-500">
          {monthsRemaining} mo remaining
        </span>
      </div>

      <div className="grid grid-cols-3 gap-3">
        <TargetMetric label="QM" value={monthlyQM} />
        <TargetMetric label="QS" value={monthlyQS} />
        <TargetMetric label="QD" value={monthlyQD} prefix="$" />
      </div>
    </div>
  );
}

function TargetMetric({
  label,
  value,
  prefix = '',
}: {
  label: string;
  value: number;
  prefix?: string;
}) {
  return (
    <div className="text-center">
      <p className="text-base font-bold tabular-nums text-gray-900 dark:text-gray-100">
        {prefix}
        {value.toLocaleString()}
      </p>
      <p className="text-[10px] font-medium uppercase tracking-wider text-gray-400 dark:text-gray-500 mt-0.5">
        {label}/mo
      </p>
    </div>
  );
}
