'use client';

import { useState, useCallback } from 'react';
import { BookOpen } from 'lucide-react';
import { useTranslations } from 'next-intl';
import { ESLProgressBar } from './ESLProgressBar';
import { VocabularyCard } from './VocabularyCard';
import { GrammarSpotlight } from './GrammarSpotlight';
import { CulturalNoteCard } from './CulturalNoteCard';
import { ComprehensionCheck } from './ComprehensionCheck';
import { FlashcardMode } from './FlashcardMode';
import { Button } from '@/components/ui/button';
import type {
  ESLLessonWithAudio,
  ESLProgress,
  VocabularyItem,
  GrammarPoint,
  CulturalNote,
  ComprehensionItem,
} from '@/lib/esl/types';

type ESLLessonViewProps = {
  lesson: ESLLessonWithAudio;
  progress: ESLProgress | null;
  eslLessonId: string;
};

export function ESLLessonView({ lesson, progress, eslLessonId }: ESLLessonViewProps) {
  const t = useTranslations('esl');
  const vocabulary = (lesson.vocabulary_json ?? []) as VocabularyItem[];
  const grammar = (lesson.grammar_json ?? []) as GrammarPoint[];
  const culturalNotes = (lesson.cultural_notes_json ?? []) as CulturalNote[];
  const comprehension = (lesson.comprehension_json ?? []) as ComprehensionItem[];

  const [learnedIndices, setLearnedIndices] = useState<number[]>(
    (progress?.vocabulary_completed as number[]) ?? [],
  );
  const [flashcardKnown, setFlashcardKnown] = useState<number[]>(
    (progress?.flashcard_known as number[]) ?? [],
  );
  const [comprehensionScore, setComprehensionScore] = useState<number | null>(
    progress?.comprehension_score ?? null,
  );
  const [showFlashcards, setShowFlashcards] = useState(false);

  const saveProgress = useCallback(
    async (updates: Record<string, unknown>) => {
      try {
        await fetch('/api/esl/progress', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ eslLessonId, ...updates }),
        });
      } catch {
        // Silently fail — progress is best-effort
      }
    },
    [eslLessonId],
  );

  const handleToggleLearned = useCallback(
    (index: number) => {
      setLearnedIndices((prev) => {
        const next = prev.includes(index)
          ? prev.filter((i) => i !== index)
          : [...prev, index];
        saveProgress({ vocabulary_completed: next });
        return next;
      });
    },
    [saveProgress],
  );

  const handleFlashcardUpdate = useCallback(
    (indices: number[]) => {
      setFlashcardKnown(indices);
      saveProgress({ flashcard_known: indices });
    },
    [saveProgress],
  );

  const handleComprehensionComplete = useCallback(
    (score: number) => {
      setComprehensionScore(score);
      saveProgress({ comprehension_score: score });
    },
    [saveProgress],
  );

  return (
    <div className="space-y-8">
      {/* Progress bar */}
      <ESLProgressBar
        vocabLearned={learnedIndices.length}
        vocabTotal={vocabulary.length}
        comprehensionScore={comprehensionScore}
      />

      {/* Vocabulary section */}
      {vocabulary.length > 0 && (
        <section>
          <div className="flex items-center justify-between mb-4">
            <h3 className="text-lg font-semibold text-[var(--fg-primary)]">
              {t('vocabulary_heading')}
            </h3>
            <Button
              onClick={() => setShowFlashcards(true)}
              variant="ghost"
            >
              <BookOpen size={14} className="mr-1.5" />
              {t('flashcards')}
            </Button>
          </div>
          <div className="space-y-3">
            {vocabulary.map((item, i) => (
              <VocabularyCard
                key={item.id}
                item={item}
                index={i}
                audio={lesson.audio}
                isLearned={learnedIndices.includes(i)}
                onToggleLearned={handleToggleLearned}
              />
            ))}
          </div>
        </section>
      )}

      {/* Grammar section */}
      {grammar.length > 0 && (
        <section>
          <h3 className="text-lg font-semibold text-[var(--fg-primary)] mb-4">
            {t('grammar_heading')}
          </h3>
          <div className="space-y-3">
            {grammar.map((point) => (
              <GrammarSpotlight
                key={point.id}
                point={point}
                audio={lesson.audio}
              />
            ))}
          </div>
        </section>
      )}

      {/* Cultural notes section */}
      {culturalNotes.length > 0 && (
        <section>
          <h3 className="text-lg font-semibold text-[var(--fg-primary)] mb-4">
            {t('cultural_heading')}
          </h3>
          <div className="space-y-3">
            {culturalNotes.map((note) => (
              <CulturalNoteCard key={note.id} note={note} />
            ))}
          </div>
        </section>
      )}

      {/* Comprehension check */}
      {comprehension.length > 0 && (
        <section>
          <h3 className="text-lg font-semibold text-[var(--fg-primary)] mb-4">
            {t('comprehension_heading')}
          </h3>
          <ComprehensionCheck
            items={comprehension}
            onComplete={handleComprehensionComplete}
          />
        </section>
      )}

      {/* Flashcard overlay */}
      {showFlashcards && (
        <FlashcardMode
          vocabulary={vocabulary}
          audio={lesson.audio}
          knownIndices={flashcardKnown}
          onClose={() => setShowFlashcards(false)}
          onUpdateKnown={handleFlashcardUpdate}
        />
      )}
    </div>
  );
}
