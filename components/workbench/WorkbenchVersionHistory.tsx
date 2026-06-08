'use client';

import { useTranslations } from 'next-intl';
import { cn } from '@/lib/utils';
import type { WorkbenchAttempt } from '@/lib/workbench/types';

type Props = {
  attempts: WorkbenchAttempt[];
  currentId: string | null;
  onSelect: (attempt: WorkbenchAttempt) => void;
};

/** Version pills v1..vN (oldest → newest) with score; selecting one loads it. */
export function WorkbenchVersionHistory({ attempts, currentId, onSelect }: Props) {
  const t = useTranslations('workbench');
  if (attempts.length === 0) return null;

  const ordered = [...attempts].sort((a, b) => a.version - b.version);

  return (
    <div className="flex items-center gap-2 flex-wrap">
      <span className="text-[11.5px] font-bold uppercase tracking-[0.1em] text-fg-tertiary">
        {t('ws_versions')}
      </span>
      {ordered.map((a) => {
        const active = a.id === currentId;
        return (
          <button
            key={a.id}
            type="button"
            onClick={() => onSelect(a)}
            className={cn(
              'px-3 py-1 rounded-full text-[12px] font-semibold border transition-colors tabular-nums',
              active
                ? 'bg-[color:var(--accent-teal)] text-white border-[color:var(--accent-teal)]'
                : 'bg-bg-secondary text-fg-secondary border-border-default hover:border-border-hover hover:text-fg-primary',
            )}
          >
            v{a.version}
            {a.overall_score != null ? ` · ${a.overall_score}` : ''}
          </button>
        );
      })}
    </div>
  );
}
