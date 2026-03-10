'use client';

import { useState } from 'react';
import { ChevronDown, ChevronUp, Check } from 'lucide-react';
import { useTranslations, useLocale } from 'next-intl';
import { AudioPlayButton } from './AudioPlayButton';
import type { VocabularyItem, ESLAudio } from '@/lib/esl/types';

type VocabularyCardProps = {
  item: VocabularyItem;
  index: number;
  audio: ESLAudio[];
  isLearned: boolean;
  onToggleLearned: (index: number) => void;
};

function getAudioUrl(audio: ESLAudio[], key: string): string | undefined {
  return audio.find((a) => a.reference_key === key)?.public_url;
}

const difficultyColors = {
  essential: 'bg-emerald-500/10 text-emerald-400 border-emerald-500/20',
  intermediate: 'bg-amber-500/10 text-amber-400 border-amber-500/20',
  advanced: 'bg-rose-500/10 text-rose-400 border-rose-500/20',
};

export function VocabularyCard({
  item,
  index,
  audio,
  isLearned,
  onToggleLearned,
}: VocabularyCardProps) {
  const [expanded, setExpanded] = useState(false);
  const t = useTranslations('esl');
  const locale = useLocale();

  return (
    <div
      className={`rounded-xl border transition-colors ${
        isLearned
          ? 'border-emerald-500/30 bg-emerald-500/5'
          : 'border-[var(--border-primary)] bg-[var(--bg-secondary)]'
      }`}
    >
      {/* Header — always visible */}
      <button
        type="button"
        onClick={() => setExpanded(!expanded)}
        className="w-full flex items-center gap-3 p-4 text-left"
      >
        <div className="flex-1 min-w-0">
          <div className="flex items-center gap-2 flex-wrap">
            <span className="font-semibold text-[var(--fg-primary)]">
              {item.term_en}
            </span>
            <AudioPlayButton
              src={getAudioUrl(audio, item.audio_keys.word)}
              label={`${t('audio_play')}: ${item.term_en}`}
            />
            <span className={`text-[10px] px-2 py-0.5 rounded-full border ${difficultyColors[item.difficulty]}`}>
              {t(`difficulty_${item.difficulty}`)}
            </span>
            <span className="text-xs text-[var(--fg-muted)] italic">
              {item.part_of_speech}
            </span>
          </div>
          <div className="text-sm text-[var(--fg-secondary)] mt-0.5">
            {item.term_jp}
          </div>
          <div className="text-xs text-[var(--fg-muted)] mt-0.5 font-mono">
            {item.reading_en}
          </div>
        </div>
        {expanded ? (
          <ChevronUp size={16} className="text-[var(--fg-muted)] shrink-0" />
        ) : (
          <ChevronDown size={16} className="text-[var(--fg-muted)] shrink-0" />
        )}
      </button>

      {/* Expanded content */}
      {expanded && (
        <div className="px-4 pb-4 space-y-4 border-t border-[var(--border-primary)]">
          {/* Definition */}
          <div className="pt-3">
            <p className="text-sm text-[var(--fg-primary)]">{item.definition_en}</p>
            <p className="text-sm text-[var(--fg-secondary)] mt-1">{item.definition_jp}</p>
          </div>

          {/* Usage sentences */}
          <div>
            <p className="text-xs font-medium text-[var(--fg-muted)] uppercase tracking-wider mb-2">
              {t('usage_label')}
            </p>
            <div className="space-y-3">
              {item.usage_sentences.map((sentence, si) => {
                const sentenceKey = item.audio_keys.sentences[si];
                return (
                  <div key={si} className="text-sm">
                    <div className="flex items-start gap-2">
                      <p className="text-[var(--fg-primary)] flex-1">
                        &ldquo;{sentence.sentence_en}&rdquo;
                      </p>
                      {sentenceKey && (
                        <AudioPlayButton
                          src={getAudioUrl(audio, sentenceKey)}
                          label={`${t('audio_play')}: sentence ${si + 1}`}
                        />
                      )}
                    </div>
                    <p className="text-[var(--fg-secondary)] mt-0.5">
                      &ldquo;{sentence.sentence_jp}&rdquo;
                    </p>
                  </div>
                );
              })}
            </div>
          </div>

          {/* Notes */}
          {item.notes_jp && (
            <div>
              <p className="text-xs font-medium text-[var(--fg-muted)] uppercase tracking-wider mb-1">
                {t('notes_label')}
              </p>
              <p className="text-sm text-[var(--fg-secondary)] italic">
                {item.notes_jp}
              </p>
            </div>
          )}

          {/* Learned toggle */}
          <button
            type="button"
            onClick={() => onToggleLearned(index)}
            className={`flex items-center gap-2 text-sm px-3 py-1.5 rounded-lg transition-colors ${
              isLearned
                ? 'bg-emerald-500/10 text-emerald-400'
                : 'bg-[var(--bg-tertiary)] text-[var(--fg-secondary)] hover:text-[var(--fg-primary)]'
            }`}
          >
            <Check size={14} />
            {isLearned ? t('mark_unlearned') : t('mark_learned')}
          </button>
        </div>
      )}
    </div>
  );
}
