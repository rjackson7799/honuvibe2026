'use client';

import { useState } from 'react';
import { CheckCircle2, XCircle, ArrowRight } from 'lucide-react';
import { useTranslations, useLocale } from 'next-intl';
import { Button } from '@/components/ui/button';
import type { ComprehensionItem } from '@/lib/esl/types';

type ComprehensionCheckProps = {
  items: ComprehensionItem[];
  onComplete: (score: number) => void;
};

export function ComprehensionCheck({ items, onComplete }: ComprehensionCheckProps) {
  const t = useTranslations('esl');
  const locale = useLocale();
  const [currentIndex, setCurrentIndex] = useState(0);
  const [selectedAnswer, setSelectedAnswer] = useState<string | null>(null);
  const [showResult, setShowResult] = useState(false);
  const [correctCount, setCorrectCount] = useState(0);
  const [completed, setCompleted] = useState(false);

  const current = items[currentIndex];
  if (!current) return null;

  const isCorrect = selectedAnswer === String(current.correct_answer);

  const handleCheck = () => {
    if (!selectedAnswer) return;
    setShowResult(true);
    if (isCorrect) {
      setCorrectCount((c) => c + 1);
    }
  };

  const handleNext = () => {
    if (currentIndex + 1 >= items.length) {
      const score = Math.round(((correctCount + (isCorrect ? 0 : 0)) / items.length) * 100);
      // correctCount already updated in handleCheck
      const finalScore = Math.round(
        ((correctCount) / items.length) * 100
      );
      setCompleted(true);
      onComplete(finalScore);
      return;
    }
    setCurrentIndex((i) => i + 1);
    setSelectedAnswer(null);
    setShowResult(false);
  };

  if (completed) {
    const finalScore = Math.round((correctCount / items.length) * 100);
    return (
      <div className="text-center py-8">
        <p className="text-2xl font-semibold text-[var(--fg-primary)]">
          {t('comprehension_score', { score: finalScore })}
        </p>
        <p className="text-sm text-[var(--fg-secondary)] mt-2">
          {correctCount} / {items.length}
        </p>
      </div>
    );
  }

  return (
    <div className="space-y-4">
      {/* Progress indicator */}
      <div className="flex items-center gap-2 text-xs text-[var(--fg-muted)]">
        <span>{currentIndex + 1} / {items.length}</span>
        <div className="flex-1 h-1 rounded-full bg-[var(--bg-tertiary)]">
          <div
            className="h-full rounded-full bg-[var(--accent-teal)] transition-all"
            style={{ width: `${((currentIndex + 1) / items.length) * 100}%` }}
          />
        </div>
      </div>

      {/* Question */}
      <div className="p-4 rounded-xl bg-[var(--bg-secondary)] border border-[var(--border-primary)]">
        <p className="text-sm font-medium text-[var(--fg-primary)]">
          {locale === 'ja' ? current.question_jp : current.question_en}
        </p>

        {/* Options */}
        {current.options && current.options.length > 0 && (
          <div className="mt-3 space-y-2">
            {current.options.map((option, i) => {
              const isSelected = selectedAnswer === option;
              const isAnswer = String(current.correct_answer) === option;

              let optionStyle = 'border-[var(--border-primary)] hover:border-[var(--border-hover)]';
              if (showResult && isAnswer) {
                optionStyle = 'border-emerald-500 bg-emerald-500/10';
              } else if (showResult && isSelected && !isAnswer) {
                optionStyle = 'border-rose-500 bg-rose-500/10';
              } else if (isSelected) {
                optionStyle = 'border-[var(--accent-teal)] bg-[var(--accent-teal)]/10';
              }

              return (
                <button
                  key={i}
                  type="button"
                  onClick={() => !showResult && setSelectedAnswer(option)}
                  disabled={showResult}
                  className={`w-full text-left p-3 rounded-lg border text-sm transition-colors ${optionStyle}`}
                >
                  <div className="flex items-center gap-2">
                    <span className="text-[var(--fg-primary)]">{option}</span>
                    {showResult && isAnswer && (
                      <CheckCircle2 size={16} className="text-emerald-400 ml-auto shrink-0" />
                    )}
                    {showResult && isSelected && !isAnswer && (
                      <XCircle size={16} className="text-rose-400 ml-auto shrink-0" />
                    )}
                  </div>
                </button>
              );
            })}
          </div>
        )}

        {/* Fill-in-blank / translation: text input */}
        {(!current.options || current.options.length === 0) && !showResult && (
          <input
            type="text"
            value={selectedAnswer ?? ''}
            onChange={(e) => setSelectedAnswer(e.target.value)}
            placeholder={locale === 'ja' ? '答えを入力...' : 'Type your answer...'}
            className="mt-3 w-full p-3 rounded-lg border border-[var(--border-primary)] bg-[var(--bg-primary)] text-sm text-[var(--fg-primary)] placeholder:text-[var(--fg-muted)]"
          />
        )}

        {/* Result explanation */}
        {showResult && (
          <div className="mt-3 p-3 rounded-lg bg-[var(--bg-tertiary)]">
            <p className="text-xs font-medium text-[var(--fg-muted)] mb-1">
              {t('show_explanation')}
            </p>
            <p className="text-sm text-[var(--fg-secondary)]">
              {current.explanation_jp}
            </p>
          </div>
        )}
      </div>

      {/* Actions */}
      <div className="flex justify-end gap-2">
        {!showResult ? (
          <Button
            onClick={handleCheck}
            disabled={!selectedAnswer}
            variant="primary"
          >
            {t('check_answer')}
          </Button>
        ) : (
          <Button onClick={handleNext} variant="primary">
            {currentIndex + 1 >= items.length ? t('comprehension_score', { score: '' }).split(':')[0] : t('next_question')}
            <ArrowRight size={14} className="ml-1" />
          </Button>
        )}
      </div>
    </div>
  );
}
