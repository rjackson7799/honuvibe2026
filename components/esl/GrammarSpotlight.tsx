'use client';

import { useState } from 'react';
import { ChevronDown, ChevronUp } from 'lucide-react';
import { useTranslations, useLocale } from 'next-intl';
import { AudioPlayButton } from './AudioPlayButton';
import type { GrammarPoint, ESLAudio } from '@/lib/esl/types';

type GrammarSpotlightProps = {
  point: GrammarPoint;
  audio: ESLAudio[];
};

function getAudioUrl(audio: ESLAudio[], key: string): string | undefined {
  return audio.find((a) => a.reference_key === key)?.public_url;
}

export function GrammarSpotlight({ point, audio }: GrammarSpotlightProps) {
  const [expanded, setExpanded] = useState(true);
  const t = useTranslations('esl');
  const locale = useLocale();

  return (
    <div className="rounded-xl border border-[var(--border-primary)] bg-[var(--bg-secondary)]">
      <button
        type="button"
        onClick={() => setExpanded(!expanded)}
        className="w-full flex items-center gap-3 p-4 text-left"
      >
        <div className="flex-1 min-w-0">
          <p className="font-semibold text-[var(--fg-primary)]">
            {locale === 'ja' ? point.title_jp : point.title_en}
          </p>
          <p className="text-xs text-[var(--fg-muted)] mt-1 font-mono">
            {point.pattern}
          </p>
        </div>
        {expanded ? (
          <ChevronUp size={16} className="text-[var(--fg-muted)] shrink-0" />
        ) : (
          <ChevronDown size={16} className="text-[var(--fg-muted)] shrink-0" />
        )}
      </button>

      {expanded && (
        <div className="px-4 pb-4 space-y-4 border-t border-[var(--border-primary)]">
          {/* Explanation */}
          <div className="pt-3">
            <p className="text-sm text-[var(--fg-primary)]">{point.explanation_en}</p>
            <p className="text-sm text-[var(--fg-secondary)] mt-1">{point.explanation_jp}</p>
          </div>

          {/* Examples */}
          <div className="space-y-3">
            {point.examples.map((example, i) => {
              const exampleKey = point.audio_keys.examples[i];
              return (
                <div
                  key={i}
                  className="p-3 rounded-lg bg-[var(--bg-tertiary)] text-sm"
                >
                  <div className="flex items-start gap-2">
                    <p className="text-[var(--fg-primary)] flex-1">
                      &ldquo;{example.sentence_en}&rdquo;
                    </p>
                    {exampleKey && (
                      <AudioPlayButton
                        src={getAudioUrl(audio, exampleKey)}
                        label={`${t('audio_play')}: example ${i + 1}`}
                      />
                    )}
                  </div>
                  <p className="text-[var(--fg-secondary)] mt-1">
                    &ldquo;{example.sentence_jp}&rdquo;
                  </p>
                  {example.annotation_jp && (
                    <p className="text-xs text-[var(--accent-teal)] mt-1 italic">
                      {example.annotation_jp}
                    </p>
                  )}
                </div>
              );
            })}
          </div>

          {/* Common mistakes */}
          {point.common_mistakes_jp && (
            <div className="p-3 rounded-lg bg-amber-500/5 border border-amber-500/20">
              <p className="text-xs font-medium text-amber-400 mb-1">
                {locale === 'ja' ? 'よくある間違い' : 'Common Mistakes'}
              </p>
              <p className="text-sm text-[var(--fg-secondary)]">
                {point.common_mistakes_jp}
              </p>
            </div>
          )}
        </div>
      )}
    </div>
  );
}
