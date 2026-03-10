'use client';

import { useTranslations, useLocale } from 'next-intl';
import { ArrowDown } from 'lucide-react';
import { VaultContentCard } from './VaultContentCard';
import type { VaultContentItem } from '@/lib/vault/types';

type VaultDifficultyPathProps = {
  tag: string;
  tagLabel: string;
  levels: {
    beginner: VaultContentItem[];
    intermediate: VaultContentItem[];
    advanced: VaultContentItem[];
  };
};

const LEVEL_COLORS = {
  beginner: 'border-emerald-500/30 bg-emerald-500/5',
  intermediate: 'border-accent-gold/30 bg-accent-gold/5',
  advanced: 'border-red-500/30 bg-red-500/5',
} as const;

export function VaultDifficultyPath({ tag, tagLabel, levels }: VaultDifficultyPathProps) {
  const t = useTranslations('vault');

  const totalCount = levels.beginner.length + levels.intermediate.length + levels.advanced.length;
  if (totalCount === 0) return null;

  const totalMinutes =
    [...levels.beginner, ...levels.intermediate, ...levels.advanced]
      .reduce((sum, item) => sum + (item.duration_minutes ?? 0), 0);

  const levelKeys = ['beginner', 'intermediate', 'advanced'] as const;
  const startLevel = levelKeys.find((k) => levels[k].length > 0) ?? 'beginner';
  const endLevel = [...levelKeys].reverse().find((k) => levels[k].length > 0) ?? 'advanced';

  return (
    <div className="space-y-4">
      <div>
        <h2 className="text-lg font-serif text-fg-primary">
          {t('difficulty_path_heading', { topic: tagLabel })}
        </h2>
        <p className="text-sm text-fg-tertiary mt-1">
          {t('difficulty_path_summary', {
            count: String(totalCount),
            minutes: String(totalMinutes),
            startLevel: t(`level_${startLevel}`),
            endLevel: t(`level_${endLevel}`),
          })}
        </p>
      </div>

      {levelKeys.map((level, idx) => {
        const items = levels[level];
        if (items.length === 0) return null;

        return (
          <div key={level}>
            {idx > 0 && levelKeys.slice(0, idx).some((k) => levels[k].length > 0) && (
              <div className="flex justify-center py-2">
                <div className="flex items-center gap-1 text-xs text-fg-tertiary">
                  <ArrowDown size={14} />
                  <span>{t('level_up')}</span>
                </div>
              </div>
            )}
            <div className={`rounded-lg border p-4 ${LEVEL_COLORS[level]}`}>
              <h3 className="text-sm font-medium text-fg-secondary mb-3 capitalize">
                {t(`level_${level}`)}
              </h3>
              <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-3">
                {items.map((item) => (
                  <VaultContentCard key={item.id} item={item} />
                ))}
              </div>
            </div>
          </div>
        );
      })}
    </div>
  );
}
