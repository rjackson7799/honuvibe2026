import type { DailyEnrollmentPoint } from '@/lib/partner-portal/queries';

type Props = {
  data: DailyEnrollmentPoint[];
  height?: number;
};

export function EnrollmentTrendChart({ data, height = 120 }: Props) {
  if (data.length === 0) return null;

  const maxCount = Math.max(1, ...data.map((d) => d.count));
  const barGap = 2;
  const viewBoxWidth = 600;
  const chartHeight = height;
  const paddingTop = 16;
  const usableHeight = chartHeight - paddingTop - 20; // reserve label strip
  const barWidth = (viewBoxWidth - barGap * (data.length - 1)) / data.length;

  const total = data.reduce((s, d) => s + d.count, 0);

  const firstLabel = formatShortDate(data[0].date);
  const lastLabel = formatShortDate(data[data.length - 1].date);

  return (
    <div
      className="rounded-lg border border-border-default bg-bg-secondary p-5"
      aria-label={`Enrollments per day, last ${data.length} days`}
    >
      <div className="mb-3 flex items-baseline justify-between">
        <div>
          <h3 className="font-serif text-lg text-fg-primary">Activity last {data.length} days</h3>
          <p className="text-xs text-fg-tertiary">Peak day: {maxCount}</p>
        </div>
        <p className="text-sm text-fg-secondary">{total} enrollments</p>
      </div>

      <svg
        role="img"
        aria-hidden="true"
        viewBox={`0 0 ${viewBoxWidth} ${chartHeight}`}
        preserveAspectRatio="none"
        className="w-full"
        style={{ height: `${chartHeight}px` }}
      >
        {data.map((d, i) => {
          const barHeight = (d.count / maxCount) * usableHeight;
          const x = i * (barWidth + barGap);
          const y = paddingTop + (usableHeight - barHeight);
          return (
            <rect
              key={d.date}
              x={x}
              y={y}
              width={barWidth}
              height={barHeight}
              rx={1}
              className="fill-accent-teal/60"
            >
              <title>{`${d.date}: ${d.count}`}</title>
            </rect>
          );
        })}
      </svg>

      <div className="mt-1 flex justify-between text-[10px] text-fg-tertiary">
        <span>{firstLabel}</span>
        <span>{lastLabel}</span>
      </div>

      <ul className="sr-only">
        {data.map((d) => (
          <li key={d.date}>
            {d.date}: {d.count} enrollments
          </li>
        ))}
      </ul>
    </div>
  );
}

function formatShortDate(iso: string): string {
  const d = new Date(iso);
  return d.toLocaleDateString('en-US', { month: 'short', day: 'numeric' });
}
