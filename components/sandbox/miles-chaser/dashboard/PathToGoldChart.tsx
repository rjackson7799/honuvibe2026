'use client';

import {
  BarChart,
  Bar,
  XAxis,
  YAxis,
  Tooltip,
  Legend,
  ResponsiveContainer,
  ReferenceLine,
} from 'recharts';
import type { EnrollmentWithProgram } from '../hooks/useEnrollments';
import type { ProjectionResult } from '@/lib/sandbox/miles-chaser/types/domain';
import type { TierDefinition } from '@/lib/sandbox/miles-chaser/types/database';

const TIER_NAMES: Record<string, string> = {
  none: 'Member',
  silver: 'Silver',
  gold: 'Gold',
  platinum: 'Platinum',
  mvp_gold: 'MVP Gold 100K',
};

interface PathToGoldChartProps {
  enrollment: EnrollmentWithProgram;
  projection: ProjectionResult;
}

export default function PathToGoldChart({
  enrollment,
  projection,
}: PathToGoldChartProps) {
  const tiers = (enrollment.loyalty_programs?.tiers || []) as TierDefinition[];
  const targetTierDef = tiers.find((t) => t.key === enrollment.target_tier);
  if (!targetTierDef) return null;

  const tierName = TIER_NAMES[enrollment.target_tier] || enrollment.target_tier;

  // Current enrollment metrics
  const currentQM = enrollment.current_qualifying_miles;
  const currentQS = enrollment.current_qualifying_segments;
  const currentQD = Number(enrollment.current_qualifying_dollars);

  // Planned = projected minus current
  const plannedQM = Math.max(0, projection.projectedQM - currentQM);
  const plannedQS = Math.max(0, projection.projectedQS - currentQS);
  const plannedQD = Math.max(0, projection.projectedQD - currentQD);

  // Normalize each metric to % of target
  const normalize = (value: number, target: number) =>
    target > 0 ? Math.round((value / target) * 100) : 100;

  const chartData = [
    {
      metric: 'Miles',
      Earned: normalize(currentQM, targetTierDef.qm),
      Planned: normalize(plannedQM, targetTierDef.qm),
      Gap: normalize(projection.gapQM, targetTierDef.qm),
    },
    {
      metric: 'Segments',
      Earned: normalize(currentQS, targetTierDef.qs),
      Planned: normalize(plannedQS, targetTierDef.qs),
      Gap: normalize(projection.gapQS, targetTierDef.qs),
    },
    {
      metric: 'Dollars',
      Earned: normalize(currentQD, targetTierDef.qd),
      Planned: normalize(plannedQD, targetTierDef.qd),
      Gap: normalize(projection.gapQD, targetTierDef.qd),
    },
  ];

  // Expected pace % based on time elapsed in qualification year
  const yearStart = new Date(enrollment.qualification_year_start).getTime();
  const yearEnd = new Date(enrollment.qualification_year_end).getTime();
  const now = Date.now();
  const totalMs = yearEnd - yearStart;
  const elapsedMs = Math.max(0, Math.min(now - yearStart, totalMs));
  const expectedPct = totalMs > 0 ? Math.round((elapsedMs / totalMs) * 100) : 0;

  return (
    <div className="rounded-xl border border-gray-200 dark:border-gray-700 bg-white dark:bg-gray-800 p-5">
      <h3 className="text-sm font-semibold text-gray-900 dark:text-gray-100 mb-1">
        Path to {tierName}
      </h3>
      <p className="text-xs text-gray-500 dark:text-gray-400 mb-4">
        Progress breakdown by metric (% of target)
      </p>

      {/* role="img" + label = the chart's text alternative for screen
          readers; recharts' SVG internals are decorative behind it. */}
      <div
        role="img"
        aria-label={`Progress toward ${tierName}: miles ${chartData[0].Earned + chartData[0].Planned}% of target, segments ${chartData[1].Earned + chartData[1].Planned}% of target, dollars ${chartData[2].Earned + chartData[2].Planned}% of target, including planned trips. Expected pace is ${expectedPct}%.`}
      >
      <ResponsiveContainer width="100%" height={200}>
        <BarChart data={chartData} layout="vertical" barCategoryGap="20%">
          <XAxis
            type="number"
            domain={[0, 100]}
            tickFormatter={(v: number) => `${v}%`}
            tick={{ fontSize: 11, fill: '#9CA3AF' }}
            axisLine={false}
            tickLine={false}
          />
          <YAxis
            type="category"
            dataKey="metric"
            width={65}
            tick={{ fontSize: 12, fill: '#9CA3AF' }}
            axisLine={false}
            tickLine={false}
          />
          <Tooltip
            formatter={(value: number, name: string) => [`${value}%`, name]}
            contentStyle={{
              backgroundColor: 'rgba(31, 41, 55, 0.95)',
              border: 'none',
              borderRadius: '8px',
              fontSize: '12px',
              color: '#F9FAFB',
            }}
            itemStyle={{ color: '#F9FAFB' }}
            labelStyle={{ color: '#D1D5DB', fontWeight: 600 }}
            cursor={{ fill: 'rgba(156, 163, 175, 0.08)' }}
          />
          <Legend
            iconSize={10}
            wrapperStyle={{ fontSize: 11, paddingTop: 8 }}
          />
          <ReferenceLine
            x={expectedPct}
            stroke="#6B7280"
            strokeDasharray="4 4"
            label={{
              value: 'Pace',
              fontSize: 10,
              fill: '#9CA3AF',
              position: 'top',
            }}
          />
          <Bar
            dataKey="Earned"
            stackId="progress"
            fill="#10B981"
            radius={[0, 0, 0, 0]}
          />
          <Bar
            dataKey="Planned"
            stackId="progress"
            fill="#60A5FA"
            radius={[0, 0, 0, 0]}
          />
          <Bar
            dataKey="Gap"
            stackId="progress"
            fill="#E5E7EB"
            radius={[0, 4, 4, 0]}
          />
        </BarChart>
      </ResponsiveContainer>
      </div>
    </div>
  );
}
