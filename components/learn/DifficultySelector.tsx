'use client';

import { useTranslations } from 'next-intl';
import type { DifficultyPreference } from '@/lib/paths/types';

type DifficultySelectorProps = {
  selected: DifficultyPreference;
  onChange: (value: DifficultyPreference) => void;
};

const DIFFICULTY_OPTIONS: DifficultyPreference[] = [
  'beginner',
  'intermediate',
  'advanced',
];

export function DifficultySelector({
  selected,
  onChange,
}: DifficultySelectorProps) {
  const t = useTranslations('study_paths');

  return (
    <div className="space-y-2">
      <label className="block text-sm font-medium text-fg-secondary">
        {t('difficulty_label')}
      </label>
      <div className="space-y-2">
        {DIFFICULTY_OPTIONS.map((level) => (
          <button
            key={level}
            type="button"
            onClick={() => onChange(level)}
            className={`w-full text-left rounded-lg border px-4 py-3 transition-all duration-[var(--duration-normal)] ${
              selected === level
                ? 'border-accent-teal bg-accent-teal/10 text-fg-primary'
                : 'border-border-primary bg-bg-secondary text-fg-secondary hover:border-border-hover'
            }`}
          >
            <div className="flex items-center gap-3">
              <div
                className={`h-4 w-4 rounded-full border-2 flex items-center justify-center ${
                  selected === level
                    ? 'border-accent-teal'
                    : 'border-border-primary'
                }`}
              >
                {selected === level && (
                  <div className="h-2 w-2 rounded-full bg-accent-teal" />
                )}
              </div>
              <span className="text-sm">
                {t(`difficulty_${level}`)}
              </span>
            </div>
          </button>
        ))}
      </div>
    </div>
  );
}
