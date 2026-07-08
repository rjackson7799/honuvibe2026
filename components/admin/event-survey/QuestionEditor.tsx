'use client';

import { useState } from 'react';
import type { EventSurveyQType } from '@/lib/survey/event-surveys';
import { OptionsEditor, type OptionDraft } from './OptionsEditor';

export type QuestionDraft = {
  qtype: EventSurveyQType;
  promptEn: string;
  promptJp: string;
  helpEn: string;
  helpJp: string;
  required: boolean;
  maxSelect: number | null;
  options: OptionDraft[];
};

export function blankDraft(): QuestionDraft {
  return {
    qtype: 'single',
    promptEn: '',
    promptJp: '',
    helpEn: '',
    helpJp: '',
    required: true,
    maxSelect: null,
    options: [
      { value: '', labelEn: '', labelJp: '' },
      { value: '', labelEn: '', labelJp: '' },
    ],
  };
}

const INPUT =
  'w-full rounded-md border border-border-default bg-bg-primary px-3 py-2 text-sm text-fg-primary placeholder:text-fg-tertiary focus:border-accent-teal focus:outline-none';
const LABEL = 'block text-[12px] font-semibold text-fg-secondary mb-1';

const QTYPES: { value: EventSurveyQType; label: string }[] = [
  { value: 'single', label: 'Single choice' },
  { value: 'multi', label: 'Multiple choice' },
  { value: 'text', label: 'Free text' },
];

function validate(d: QuestionDraft): string | null {
  if (!d.promptEn.trim() || !d.promptJp.trim()) return 'Both EN and JP prompts are required.';
  if (d.qtype !== 'text') {
    const opts = d.options.filter((o) => o.labelEn.trim() && o.labelJp.trim());
    if (opts.length < 2) return 'Choice questions need at least 2 fully-labeled options.';
    const values = opts.map((o) => o.value.trim()).filter(Boolean);
    if (new Set(values).size !== opts.length) return 'Option values must be unique and non-empty.';
    if (d.qtype === 'multi' && d.maxSelect != null && d.maxSelect > opts.length) {
      return 'Max selectable cannot exceed the number of options.';
    }
  }
  return null;
}

export function QuestionEditor({
  initial,
  onSave,
  onCancel,
  pending,
}: {
  initial: QuestionDraft;
  onSave: (draft: QuestionDraft) => void;
  onCancel: () => void;
  pending: boolean;
}) {
  const [d, setD] = useState<QuestionDraft>(initial);
  const [error, setError] = useState<string | null>(null);

  function submit() {
    const err = validate(d);
    if (err) {
      setError(err);
      return;
    }
    // Drop blank option rows before saving.
    const cleaned: QuestionDraft = {
      ...d,
      options:
        d.qtype === 'text'
          ? []
          : d.options.filter((o) => o.labelEn.trim() && o.labelJp.trim() && o.value.trim()),
    };
    onSave(cleaned);
  }

  return (
    <div className="space-y-4 rounded-xl border border-accent-teal/40 bg-bg-primary p-4">
      <div className="grid gap-3 sm:grid-cols-[200px_1fr]">
        <div>
          <label className={LABEL}>Type</label>
          <select
            className={INPUT}
            value={d.qtype}
            onChange={(e) => setD({ ...d, qtype: e.target.value as EventSurveyQType })}
          >
            {QTYPES.map((q) => (
              <option key={q.value} value={q.value}>
                {q.label}
              </option>
            ))}
          </select>
        </div>
        <div className="flex items-end gap-4">
          <label className="flex items-center gap-2 text-sm text-fg-secondary">
            <input
              type="checkbox"
              checked={d.required}
              onChange={(e) => setD({ ...d, required: e.target.checked })}
            />
            Required
          </label>
          {d.qtype === 'multi' && (
            <label className="flex items-center gap-2 text-sm text-fg-secondary">
              Max selectable
              <input
                type="number"
                min={1}
                className={`${INPUT} w-20`}
                value={d.maxSelect ?? ''}
                placeholder="∞"
                onChange={(e) =>
                  setD({ ...d, maxSelect: e.target.value ? Number(e.target.value) : null })
                }
              />
            </label>
          )}
        </div>
      </div>

      <div className="grid gap-3 sm:grid-cols-2">
        <div>
          <label className={LABEL}>Prompt (EN)</label>
          <input
            className={INPUT}
            value={d.promptEn}
            placeholder="What do you most want to get out of this session?"
            onChange={(e) => setD({ ...d, promptEn: e.target.value })}
          />
        </div>
        <div>
          <label className={LABEL}>Prompt (JP)</label>
          <input
            className={INPUT}
            value={d.promptJp}
            placeholder="このセッションで最も得たいものは何ですか？"
            onChange={(e) => setD({ ...d, promptJp: e.target.value })}
          />
        </div>
        <div>
          <label className={LABEL}>Help text (EN, optional)</label>
          <input
            className={INPUT}
            value={d.helpEn}
            onChange={(e) => setD({ ...d, helpEn: e.target.value })}
          />
        </div>
        <div>
          <label className={LABEL}>Help text (JP, optional)</label>
          <input
            className={INPUT}
            value={d.helpJp}
            onChange={(e) => setD({ ...d, helpJp: e.target.value })}
          />
        </div>
      </div>

      {d.qtype !== 'text' && (
        <div>
          <label className={LABEL}>Options</label>
          <OptionsEditor options={d.options} onChange={(options) => setD({ ...d, options })} />
        </div>
      )}

      {error && <p className="text-[13px] text-red-600">{error}</p>}

      <div className="flex items-center gap-2 pt-1">
        <button
          type="button"
          disabled={pending}
          onClick={submit}
          className="rounded-lg bg-accent-teal px-4 py-2 text-sm font-semibold text-white transition-colors hover:bg-accent-teal/90 disabled:opacity-50"
        >
          {pending ? 'Saving…' : 'Save question'}
        </button>
        <button
          type="button"
          disabled={pending}
          onClick={onCancel}
          className="rounded-lg border border-border-default px-4 py-2 text-sm font-medium text-fg-secondary transition-colors hover:text-fg-primary disabled:opacity-50"
        >
          Cancel
        </button>
      </div>
    </div>
  );
}
