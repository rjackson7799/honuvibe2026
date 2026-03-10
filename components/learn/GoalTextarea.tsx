'use client';

import { useTranslations } from 'next-intl';

type GoalTextareaProps = {
  value: string;
  onChange: (value: string) => void;
  maxLength?: number;
};

export function GoalTextarea({
  value,
  onChange,
  maxLength = 500,
}: GoalTextareaProps) {
  const t = useTranslations('study_paths');

  return (
    <div className="space-y-2">
      <label className="block text-sm font-medium text-fg-secondary">
        {t('goal_label')}
      </label>
      <textarea
        value={value}
        onChange={(e) => onChange(e.target.value.slice(0, maxLength))}
        placeholder={t('goal_placeholder')}
        rows={4}
        className="w-full rounded-lg border border-border-primary bg-bg-secondary px-4 py-3 text-fg-primary placeholder:text-fg-muted focus:border-accent-teal focus:outline-none focus:ring-1 focus:ring-accent-teal transition-colors duration-[var(--duration-normal)] resize-none text-base"
      />
      <div className="text-right text-xs text-fg-muted">
        {value.length}/{maxLength}
      </div>
    </div>
  );
}
