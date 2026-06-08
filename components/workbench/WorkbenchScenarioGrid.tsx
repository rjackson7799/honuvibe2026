'use client';

import { useEffect, useMemo, useState } from 'react';
import { useTranslations } from 'next-intl';
import { trackEvent } from '@/lib/analytics';
import { WorkbenchFilters } from './WorkbenchFilters';
import { WorkbenchScenarioCard } from './WorkbenchScenarioCard';
import type {
  WorkbenchDifficulty,
  WorkbenchDomain,
  WorkbenchScenario,
} from '@/lib/workbench/types';

/**
 * Member-facing scenario library. The full published set (~15 curated
 * scenarios) is fetched server-side and filtered here client-side by domain +
 * difficulty — no pagination or per-filter refetch is warranted at this size.
 */
export function WorkbenchScenarioGrid({
  scenarios,
}: {
  scenarios: WorkbenchScenario[];
}) {
  const t = useTranslations('workbench');
  const [domain, setDomain] = useState<WorkbenchDomain | null>(null);
  const [difficulty, setDifficulty] = useState<WorkbenchDifficulty | null>(null);

  useEffect(() => {
    trackEvent('workbench_browse');
  }, []);

  const filtered = useMemo(
    () =>
      scenarios.filter(
        (s) =>
          (!domain || s.domain === domain) &&
          (!difficulty || s.difficulty === difficulty),
      ),
    [scenarios, domain, difficulty],
  );

  return (
    <div className="space-y-5">
      <WorkbenchFilters
        domain={domain}
        onDomainChange={setDomain}
        difficulty={difficulty}
        onDifficultyChange={setDifficulty}
      />

      <p className="text-xs text-fg-tertiary">
        {t('items_found', { count: filtered.length })}
      </p>

      {filtered.length > 0 ? (
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
          {filtered.map((s) => (
            <WorkbenchScenarioCard key={s.id} scenario={s} />
          ))}
        </div>
      ) : (
        <div className="text-center py-16">
          <p className="text-fg-tertiary text-sm">{t('no_results')}</p>
        </div>
      )}
    </div>
  );
}
