'use client';

import { useTranslations } from 'next-intl';
import { Zap, ClipboardCheck } from 'lucide-react';
import type { WorkbenchUsage } from '@/lib/workbench/types';

/** Small badge pair: runs + evaluations remaining today. */
export function WorkbenchUsageMeter({ usage }: { usage: WorkbenchUsage }) {
  const t = useTranslations('workbench');
  const runsLeft = Math.max(usage.runs.cap - usage.runs.used, 0);
  const scoresLeft = Math.max(usage.scores.cap - usage.scores.used, 0);

  return (
    <div className="flex items-center gap-2 flex-wrap text-[12px]">
      <span className="inline-flex items-center gap-1.5 px-2.5 py-1 rounded-full bg-bg-tertiary text-fg-secondary">
        <Zap size={13} className="text-[color:var(--accent-teal)]" />
        {t('ws_runs_left', { remaining: runsLeft, cap: usage.runs.cap })}
      </span>
      <span className="inline-flex items-center gap-1.5 px-2.5 py-1 rounded-full bg-bg-tertiary text-fg-secondary">
        <ClipboardCheck size={13} className="text-[color:var(--accent-gold)]" />
        {t('ws_scores_left', { remaining: scoresLeft, cap: usage.scores.cap })}
      </span>
    </div>
  );
}
