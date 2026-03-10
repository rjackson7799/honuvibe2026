'use client';

import { useState, useCallback } from 'react';
import { X, Shuffle, Check, RotateCcw, Volume2 } from 'lucide-react';
import { useTranslations, useLocale } from 'next-intl';
import { AudioPlayButton } from './AudioPlayButton';
import type { VocabularyItem, ESLAudio } from '@/lib/esl/types';

type FlashcardModeProps = {
  vocabulary: VocabularyItem[];
  audio: ESLAudio[];
  knownIndices: number[];
  onClose: () => void;
  onUpdateKnown: (indices: number[]) => void;
};

function getAudioUrl(audio: ESLAudio[], key: string): string | undefined {
  return audio.find((a) => a.reference_key === key)?.public_url;
}

export function FlashcardMode({
  vocabulary,
  audio,
  knownIndices: initialKnown,
  onClose,
  onUpdateKnown,
}: FlashcardModeProps) {
  const t = useTranslations('esl');
  const locale = useLocale();
  const [currentIndex, setCurrentIndex] = useState(0);
  const [flipped, setFlipped] = useState(false);
  const [known, setKnown] = useState<Set<number>>(new Set(initialKnown));
  const [order, setOrder] = useState<number[]>(
    vocabulary.map((_, i) => i),
  );

  const currentVocabIndex = order[currentIndex];
  const currentItem = vocabulary[currentVocabIndex];

  const handleShuffle = useCallback(() => {
    const shuffled = [...order].sort(() => Math.random() - 0.5);
    setOrder(shuffled);
    setCurrentIndex(0);
    setFlipped(false);
  }, [order]);

  const handleMark = (isKnown: boolean) => {
    const newKnown = new Set(known);
    if (isKnown) {
      newKnown.add(currentVocabIndex);
    } else {
      newKnown.delete(currentVocabIndex);
    }
    setKnown(newKnown);
    onUpdateKnown(Array.from(newKnown));

    // Next card
    if (currentIndex + 1 < order.length) {
      setCurrentIndex((i) => i + 1);
      setFlipped(false);
    }
  };

  if (!currentItem) {
    // All cards reviewed
    return (
      <div className="fixed inset-0 z-50 bg-[var(--bg-primary)] flex flex-col items-center justify-center p-6">
        <div className="text-center">
          <p className="text-2xl font-semibold text-[var(--fg-primary)]">
            {t('learned_count', { count: known.size, total: vocabulary.length })}
          </p>
          <div className="flex gap-3 mt-6 justify-center">
            <button
              type="button"
              onClick={() => {
                setCurrentIndex(0);
                setFlipped(false);
              }}
              className="flex items-center gap-2 px-4 py-2 rounded-lg bg-[var(--bg-secondary)] border border-[var(--border-primary)] text-sm text-[var(--fg-primary)]"
            >
              <RotateCcw size={14} />
              {locale === 'ja' ? 'もう一度' : 'Review Again'}
            </button>
            <button
              type="button"
              onClick={onClose}
              className="flex items-center gap-2 px-4 py-2 rounded-lg bg-[var(--accent-teal)] text-white text-sm"
            >
              {locale === 'ja' ? '完了' : 'Done'}
            </button>
          </div>
        </div>
      </div>
    );
  }

  return (
    <div className="fixed inset-0 z-50 bg-[var(--bg-primary)] flex flex-col">
      {/* Header */}
      <div className="flex items-center justify-between p-4 border-b border-[var(--border-primary)]">
        <span className="text-sm text-[var(--fg-secondary)]">
          {currentIndex + 1} / {order.length}
        </span>
        <div className="flex items-center gap-2">
          <span className="text-xs text-[var(--fg-muted)]">
            {t('learned_count', { count: known.size, total: vocabulary.length })}
          </span>
          <button
            type="button"
            onClick={handleShuffle}
            className="p-2 rounded-lg hover:bg-[var(--bg-secondary)] text-[var(--fg-muted)]"
            aria-label={t('shuffle')}
          >
            <Shuffle size={16} />
          </button>
          <button
            type="button"
            onClick={onClose}
            className="p-2 rounded-lg hover:bg-[var(--bg-secondary)] text-[var(--fg-muted)]"
          >
            <X size={16} />
          </button>
        </div>
      </div>

      {/* Card */}
      <div className="flex-1 flex items-center justify-center p-6">
        <button
          type="button"
          onClick={() => setFlipped(!flipped)}
          className="w-full max-w-md aspect-[3/2] rounded-2xl border-2 border-[var(--border-primary)] bg-[var(--bg-secondary)] p-8 flex flex-col items-center justify-center gap-4 transition-all hover:border-[var(--border-hover)] cursor-pointer"
        >
          {!flipped ? (
            <>
              <p className="text-2xl font-semibold text-[var(--fg-primary)]">
                {currentItem.term_en}
              </p>
              <p className="text-sm text-[var(--fg-muted)] font-mono">
                {currentItem.reading_en}
              </p>
              <AudioPlayButton
                src={getAudioUrl(audio, currentItem.audio_keys.word)}
                size="md"
              />
              <p className="text-xs text-[var(--fg-muted)] mt-4">
                {locale === 'ja' ? 'タップして日本語を表示' : 'Tap to reveal'}
              </p>
            </>
          ) : (
            <>
              <p className="text-xl font-semibold text-[var(--fg-primary)]">
                {currentItem.term_jp}
              </p>
              <p className="text-sm text-[var(--fg-secondary)] text-center max-w-xs">
                {currentItem.definition_jp}
              </p>
              <p className="text-xs text-[var(--fg-muted)] mt-2">
                {currentItem.term_en} · {currentItem.part_of_speech}
              </p>
            </>
          )}
        </button>
      </div>

      {/* Bottom actions */}
      <div className="flex items-center justify-center gap-4 p-6 border-t border-[var(--border-primary)]">
        <button
          type="button"
          onClick={() => handleMark(false)}
          className="flex items-center gap-2 px-6 py-3 rounded-xl bg-rose-500/10 text-rose-400 border border-rose-500/20 text-sm font-medium"
        >
          <RotateCcw size={16} />
          {t('still_learning')}
        </button>
        <button
          type="button"
          onClick={() => handleMark(true)}
          className="flex items-center gap-2 px-6 py-3 rounded-xl bg-emerald-500/10 text-emerald-400 border border-emerald-500/20 text-sm font-medium"
        >
          <Check size={16} />
          {t('known')}
        </button>
      </div>
    </div>
  );
}

