'use client';

import { useTranslations } from 'next-intl';
import type {
  WorkbenchDimension,
  WorkbenchEvaluatorResult,
  WorkbenchScores,
} from '@/lib/workbench/types';

type Props = {
  scores: WorkbenchScores;
  overallScore: number;
  strengths: string[];
  improvements: string[];
  applicableDimensions: WorkbenchDimension[];
  /** Full per-dimension rationale/improvement — present only for a just-scored
   *  attempt (it is not persisted). When absent (historical view), the panel
   *  falls back to the persisted strengths/improvements summaries. */
  dimensions?: WorkbenchEvaluatorResult | null;
};

export function WorkbenchRubricPanel({
  scores,
  overallScore,
  strengths,
  improvements,
  applicableDimensions,
  dimensions,
}: Props) {
  const t = useTranslations('workbench');

  const dimLabel: Record<WorkbenchDimension, string> = {
    role: t('dim_role'),
    context: t('dim_context'),
    task: t('dim_task'),
    constraints: t('dim_constraints'),
    format: t('dim_format'),
    examples: t('dim_examples'),
  };

  return (
    <div className="space-y-5 rounded-[14px] border border-border-default bg-bg-secondary p-4">
      {/* Overall */}
      <div className="flex items-baseline gap-2">
        <span className="text-[30px] font-bold text-fg-primary leading-none tabular-nums">
          {overallScore}
        </span>
        <span className="text-[13px] text-fg-tertiary font-medium">
          / 100 · {t('ws_overall')}
        </span>
      </div>

      {/* Per-dimension bars */}
      <div className="space-y-3">
        {applicableDimensions.map((dim) => {
          const score = scores[dim] ?? 0;
          const detail = dimensions?.[dim];
          return (
            <div key={dim} className="space-y-1.5">
              <div className="flex items-center justify-between text-[12.5px]">
                <span className="font-semibold text-fg-secondary">{dimLabel[dim]}</span>
                <span className="text-fg-tertiary tabular-nums">{score}/5</span>
              </div>
              <div className="h-1.5 rounded-full bg-bg-tertiary overflow-hidden">
                <div
                  className="h-full rounded-full bg-[color:var(--accent-teal)]"
                  style={{ width: `${(score / 5) * 100}%` }}
                />
              </div>
              {detail && (
                <div className="space-y-0.5 pt-0.5">
                  <p className="text-[12px] text-fg-secondary leading-[1.5]">{detail.rationale}</p>
                  <p className="text-[12px] text-fg-tertiary leading-[1.5]">
                    <span className="font-semibold text-[color:var(--accent-teal)]">
                      {t('ws_fix')}:
                    </span>{' '}
                    {detail.improvement}
                  </p>
                </div>
              )}
            </div>
          );
        })}
      </div>

      {/* Summary lists — shown for the historical view (no per-dim detail). */}
      {!dimensions && strengths.length > 0 && (
        <div>
          <p className="text-[11.5px] font-bold uppercase tracking-[0.1em] text-fg-tertiary mb-1.5">
            {t('ws_strengths')}
          </p>
          <ul className="space-y-1">
            {strengths.map((s, i) => (
              <li key={i} className="text-[12.5px] text-fg-secondary flex gap-2 leading-[1.5]">
                <span className="text-[color:var(--accent-teal)] font-bold">+</span>
                {s}
              </li>
            ))}
          </ul>
        </div>
      )}
      {!dimensions && improvements.length > 0 && (
        <div>
          <p className="text-[11.5px] font-bold uppercase tracking-[0.1em] text-fg-tertiary mb-1.5">
            {t('ws_improvements')}
          </p>
          <ul className="space-y-1">
            {improvements.map((s, i) => (
              <li key={i} className="text-[12.5px] text-fg-secondary flex gap-2 leading-[1.5]">
                <span className="text-[color:var(--accent-gold)] font-bold">→</span>
                {s}
              </li>
            ))}
          </ul>
        </div>
      )}
    </div>
  );
}
