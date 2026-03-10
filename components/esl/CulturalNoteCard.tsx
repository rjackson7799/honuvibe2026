'use client';

import { useState } from 'react';
import { ChevronDown, ChevronUp, Globe, Briefcase, MessageCircle } from 'lucide-react';
import { useTranslations, useLocale } from 'next-intl';
import type { CulturalNote } from '@/lib/esl/types';

type CulturalNoteCardProps = {
  note: CulturalNote;
};

const categoryIcons = {
  professional: Briefcase,
  cultural: Globe,
  linguistic: MessageCircle,
};

const categoryColors = {
  professional: 'bg-blue-500/10 text-blue-400 border-blue-500/20',
  cultural: 'bg-purple-500/10 text-purple-400 border-purple-500/20',
  linguistic: 'bg-teal-500/10 text-teal-400 border-teal-500/20',
};

export function CulturalNoteCard({ note }: CulturalNoteCardProps) {
  const [expanded, setExpanded] = useState(false);
  const locale = useLocale();
  const Icon = categoryIcons[note.category];

  return (
    <div className="rounded-xl border border-[var(--border-primary)] bg-[var(--bg-secondary)]">
      <button
        type="button"
        onClick={() => setExpanded(!expanded)}
        className="w-full flex items-center gap-3 p-4 text-left"
      >
        <div className={`p-2 rounded-lg border ${categoryColors[note.category]}`}>
          <Icon size={16} />
        </div>
        <div className="flex-1 min-w-0">
          <p className="font-medium text-sm text-[var(--fg-primary)]">
            {locale === 'ja' ? note.title_jp : note.title_en}
          </p>
        </div>
        {expanded ? (
          <ChevronUp size={16} className="text-[var(--fg-muted)] shrink-0" />
        ) : (
          <ChevronDown size={16} className="text-[var(--fg-muted)] shrink-0" />
        )}
      </button>

      {expanded && (
        <div className="px-4 pb-4 space-y-3 border-t border-[var(--border-primary)]">
          <div className="pt-3">
            <p className="text-sm text-[var(--fg-primary)]">{note.content_en}</p>
            <p className="text-sm text-[var(--fg-secondary)] mt-2">{note.content_jp}</p>
          </div>

          {note.tip_jp && (
            <div className="p-3 rounded-lg bg-[var(--accent-gold)]/5 border border-[var(--accent-gold)]/20">
              <p className="text-xs font-medium text-[var(--accent-gold)] mb-1">
                {locale === 'ja' ? '実践的ヒント' : 'Practical Tip'}
              </p>
              <p className="text-sm text-[var(--fg-secondary)]">{note.tip_jp}</p>
            </div>
          )}
        </div>
      )}
    </div>
  );
}
