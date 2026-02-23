'use client';

import { useTranslations } from 'next-intl';
import type { CourseVocabulary } from '@/lib/courses/types';

type VocabularyListProps = {
  vocabulary: CourseVocabulary[];
};

export function VocabularyList({ vocabulary }: VocabularyListProps) {
  const t = useTranslations('learn');

  if (vocabulary.length === 0) return null;

  return (
    <div>
      <h4 className="text-sm font-medium text-fg-primary mb-3">
        {t('vocabulary')}
      </h4>
      <div className="grid grid-cols-1 sm:grid-cols-2 gap-2">
        {vocabulary.map((v) => (
          <div
            key={v.id}
            className="flex items-center gap-3 bg-bg-tertiary rounded-lg px-3 py-2"
          >
            <span className="text-sm font-medium text-fg-primary">{v.term_en}</span>
            <span className="text-fg-tertiary">/</span>
            <span className="text-sm text-fg-secondary">{v.term_jp}</span>
          </div>
        ))}
      </div>
    </div>
  );
}
