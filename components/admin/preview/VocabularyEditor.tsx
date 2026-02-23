'use client';

import { X, Plus } from 'lucide-react';
import { Input } from '@/components/ui/input';
import type { ParsedVocabularyData } from '@/lib/courses/types';

type VocabularyEditorProps = {
  vocabulary: ParsedVocabularyData[];
  onChange: (vocabulary: ParsedVocabularyData[]) => void;
};

export function VocabularyEditor({ vocabulary, onChange }: VocabularyEditorProps) {
  function updateTerm(index: number, partial: Partial<ParsedVocabularyData>) {
    const updated = vocabulary.map((v, i) => (i === index ? { ...v, ...partial } : v));
    onChange(updated);
  }

  function addTerm() {
    onChange([...vocabulary, { term_en: '', term_jp: '' }]);
  }

  function removeTerm(index: number) {
    onChange(vocabulary.filter((_, i) => i !== index));
  }

  if (vocabulary.length === 0) {
    return (
      <div className="space-y-2">
        <label className="text-xs font-medium text-fg-tertiary uppercase tracking-wider">Vocabulary</label>
        <button
          type="button"
          onClick={addTerm}
          className="flex items-center gap-1.5 text-xs text-accent-teal hover:text-accent-teal-hover transition-colors"
        >
          <Plus size={14} /> Add Vocabulary
        </button>
      </div>
    );
  }

  return (
    <div className="space-y-2">
      <label className="text-xs font-medium text-fg-tertiary uppercase tracking-wider">Vocabulary</label>
      {vocabulary.map((term, i) => (
        <div key={i} className="flex items-center gap-2">
          <Input
            value={term.term_en}
            onChange={(e) => updateTerm(i, { term_en: e.target.value })}
            placeholder="English term"
            className="!h-9 !text-sm flex-1"
          />
          <Input
            value={term.term_jp}
            onChange={(e) => updateTerm(i, { term_jp: e.target.value })}
            placeholder="Japanese term"
            className="!h-9 !text-sm flex-1"
          />
          <button
            type="button"
            onClick={() => removeTerm(i)}
            className="text-fg-tertiary hover:text-red-400 shrink-0"
          >
            <X size={14} />
          </button>
        </div>
      ))}
      <button
        type="button"
        onClick={addTerm}
        className="flex items-center gap-1.5 text-xs text-accent-teal hover:text-accent-teal-hover transition-colors"
      >
        <Plus size={14} /> Add Term
      </button>
    </div>
  );
}
