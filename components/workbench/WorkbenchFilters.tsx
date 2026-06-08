'use client';

import { useTranslations } from 'next-intl';
import { cn } from '@/lib/utils';
import {
  WORKBENCH_DOMAINS,
  WORKBENCH_DIFFICULTIES,
  type WorkbenchDifficulty,
  type WorkbenchDomain,
} from '@/lib/workbench/types';

type Props = {
  domain: WorkbenchDomain | null;
  onDomainChange: (value: WorkbenchDomain | null) => void;
  difficulty: WorkbenchDifficulty | null;
  onDifficultyChange: (value: WorkbenchDifficulty | null) => void;
};

const chipBase =
  'px-3.5 py-1.5 rounded-full text-[12.5px] font-semibold border transition-all whitespace-nowrap';
const chipInactive =
  'bg-bg-secondary text-fg-secondary border-border-default hover:border-border-hover hover:text-fg-primary';
const chipActive =
  'bg-[color:var(--accent-teal)] text-white border-[color:var(--accent-teal)]';

// Active chip colour per difficulty, matching the Vault filters palette.
const levelActive: Record<WorkbenchDifficulty, string> = {
  beginner: 'bg-[color:var(--accent-teal)] text-white border-[color:var(--accent-teal)]',
  intermediate: 'bg-[color:var(--accent-coral)] text-white border-[color:var(--accent-coral)]',
  advanced: 'bg-[color:var(--accent-purple)] text-white border-[color:var(--accent-purple)]',
};

export function WorkbenchFilters({
  domain,
  onDomainChange,
  difficulty,
  onDifficultyChange,
}: Props) {
  const t = useTranslations('workbench');

  const domainLabel: Record<WorkbenchDomain, string> = {
    marketing: t('domain_marketing'),
    operations: t('domain_operations'),
    communication: t('domain_communication'),
  };
  const levelLabel: Record<WorkbenchDifficulty, string> = {
    beginner: t('level_beginner'),
    intermediate: t('level_intermediate'),
    advanced: t('level_advanced'),
  };

  return (
    <div className="space-y-3">
      {/* Domain */}
      <div className="flex flex-wrap gap-2">
        <button
          type="button"
          onClick={() => onDomainChange(null)}
          className={cn(chipBase, !domain ? chipActive : chipInactive)}
        >
          {t('filter_domain')}
        </button>
        {WORKBENCH_DOMAINS.map((d) => (
          <button
            key={d}
            type="button"
            onClick={() => onDomainChange(domain === d ? null : d)}
            className={cn(chipBase, domain === d ? chipActive : chipInactive)}
          >
            {domainLabel[d]}
          </button>
        ))}
      </div>

      {/* Difficulty */}
      <div className="flex flex-wrap gap-2 items-center">
        <button
          type="button"
          onClick={() => onDifficultyChange(null)}
          className={cn(chipBase, !difficulty ? chipActive : chipInactive)}
        >
          {t('filter_level')}
        </button>
        {WORKBENCH_DIFFICULTIES.map((d) => (
          <button
            key={d}
            type="button"
            onClick={() => onDifficultyChange(difficulty === d ? null : d)}
            className={cn(chipBase, difficulty === d ? levelActive[d] : chipInactive)}
          >
            {levelLabel[d]}
          </button>
        ))}
      </div>
    </div>
  );
}
