'use client';

import { useState } from 'react';
import { useLocale, useTranslations } from 'next-intl';
import { Button } from '@/components/ui/button';
import { GoalTextarea } from './GoalTextarea';
import { DifficultySelector } from './DifficultySelector';
import { FocusAreaChips } from './FocusAreaChips';
import type {
  DifficultyPreference,
  LanguagePreference,
  PathIntakeInput,
} from '@/lib/paths/types';

type PathIntakeFormProps = {
  tags: { slug: string; name_en: string; name_jp?: string | null }[];
  onSubmit: (input: PathIntakeInput) => void;
  isSubmitting: boolean;
  userTier?: 'free' | 'premium';
};

export function PathIntakeForm({
  tags,
  onSubmit,
  isSubmitting,
  userTier = 'free',
}: PathIntakeFormProps) {
  const t = useTranslations('study_paths');
  const locale = useLocale();

  const [goal, setGoal] = useState('');
  const [difficulty, setDifficulty] =
    useState<DifficultyPreference>('beginner');
  const [focusAreas, setFocusAreas] = useState<string[]>([]);
  const [language, setLanguage] = useState<LanguagePreference>(
    locale === 'ja' ? 'ja' : 'en',
  );

  function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    if (!goal.trim()) return;

    onSubmit({
      goal_description: goal.trim(),
      difficulty_preference: difficulty,
      language_preference: language,
      focus_areas: focusAreas,
    });
  }

  return (
    <form onSubmit={handleSubmit} className="space-y-8">
      <GoalTextarea value={goal} onChange={setGoal} />

      <DifficultySelector selected={difficulty} onChange={setDifficulty} />

      {tags.length > 0 && (
        <FocusAreaChips
          tags={tags}
          selected={focusAreas}
          onChange={setFocusAreas}
          locale={locale}
        />
      )}

      <div className="space-y-2">
        <label className="block text-sm font-medium text-fg-secondary">
          {t('language_label')}
        </label>
        <div className="flex gap-3">
          {(['en', 'ja'] as LanguagePreference[]).map((lang) => (
            <button
              key={lang}
              type="button"
              onClick={() => setLanguage(lang)}
              className={`rounded-lg border px-4 py-2 text-sm transition-all duration-[var(--duration-normal)] ${
                language === lang
                  ? 'border-accent-teal bg-accent-teal/10 text-fg-primary'
                  : 'border-border-primary bg-bg-secondary text-fg-secondary hover:border-border-hover'
              }`}
            >
              {lang === 'en' ? 'English' : 'Japanese'}
            </button>
          ))}
        </div>
      </div>

      <Button
        type="submit"
        variant="primary"
        size="lg"
        fullWidth
        disabled={!goal.trim() || isSubmitting}
      >
        {t('generate_cta')}
      </Button>

      {userTier === 'free' && (
        <p className="text-center text-xs text-fg-muted">
          {t('free_note')}
        </p>
      )}
    </form>
  );
}
