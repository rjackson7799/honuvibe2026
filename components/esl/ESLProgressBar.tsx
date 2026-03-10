'use client';

import { useTranslations } from 'next-intl';

type ESLProgressBarProps = {
  vocabLearned: number;
  vocabTotal: number;
  comprehensionScore: number | null;
};

export function ESLProgressBar({
  vocabLearned,
  vocabTotal,
  comprehensionScore,
}: ESLProgressBarProps) {
  const t = useTranslations('esl');
  const vocabPercent = vocabTotal > 0 ? Math.round((vocabLearned / vocabTotal) * 100) : 0;

  return (
    <div className="flex flex-col gap-3 p-4 rounded-xl bg-[var(--bg-secondary)] border border-[var(--border-primary)]">
      <div className="flex items-center justify-between text-sm">
        <span className="text-[var(--fg-secondary)]">
          {t('learned_count', { count: vocabLearned, total: vocabTotal })}
        </span>
        {comprehensionScore !== null && (
          <span className="text-[var(--fg-secondary)]">
            {t('comprehension_score', { score: comprehensionScore })}
          </span>
        )}
      </div>
      <div className="h-2 rounded-full bg-[var(--bg-tertiary)] overflow-hidden">
        <div
          className="h-full rounded-full bg-[var(--accent-teal)] transition-all duration-500"
          style={{ width: `${vocabPercent}%` }}
        />
      </div>
    </div>
  );
}
