'use client';

// COPIED from components/admin/event-survey/{QuestionEditor,OptionsEditor}.tsx
// (not imported): those are hard-bound to EN/JP PAIRS, and decision #4 makes
// the questionnaire single-locale. Kept: the `QuestionDraft` shape, the
// validate() gate with inline error, the option value auto-derived from the
// label until the admin types a custom one, and the exact Tailwind classes.
// Added: a section picker, allow_other, long, and a reword-only mode (after
// send: prompt / help / option labels only — structure and values are locked).

import { useState } from 'react';
import { Plus, X } from 'lucide-react';
import { MAX_OPTIONS, OTHER_VALUE, type QuestionType, type QuestionnaireSection } from '@/lib/studio/engagement/questions-schema';

export type OptionDraft = { value: string; label: string };

export type QuestionDraft = {
  id: string | null; // null = new (the id is assigned on save)
  section_key: string;
  qtype: QuestionType;
  prompt: string;
  help: string;
  required: boolean;
  options: OptionDraft[];
  allow_other: boolean;
  max_select: number | null;
  long: boolean;
};

export function blankDraft(section_key: string): QuestionDraft {
  return {
    id: null,
    section_key,
    qtype: 'single',
    prompt: '',
    help: '',
    required: true,
    options: [
      { value: '', label: '' },
      { value: '', label: '' },
    ],
    allow_other: false,
    max_select: null,
    long: false,
  };
}

const INPUT =
  'w-full rounded-md border border-border-default bg-bg-primary px-3 py-2 text-sm text-fg-primary placeholder:text-fg-tertiary focus:border-accent-teal focus:outline-none disabled:opacity-60';
const LABEL = 'block text-[12px] font-semibold text-fg-secondary mb-1';

const QTYPES: { value: QuestionType; label: string }[] = [
  { value: 'single', label: 'Single choice' },
  { value: 'multi', label: 'Multiple choice' },
  { value: 'text', label: 'Free text' },
];

function slugify(s: string): string {
  return (
    s
      .toLowerCase()
      .trim()
      .replace(/[^a-z0-9]+/g, '_')
      .replace(/^_+|_+$/g, '')
      .slice(0, 60) || 'option'
  );
}

export function validateDraft(d: QuestionDraft): string | null {
  if (!d.prompt.trim()) return 'A prompt is required.';
  if (d.prompt.trim().length > 500) return 'Keep the prompt under 500 characters.';
  if (d.help.trim().length > 500) return 'Keep the help text under 500 characters.';
  if (d.qtype !== 'text') {
    const opts = d.options.filter((o) => o.label.trim());
    if (opts.length < 2) return 'Choice questions need at least 2 labeled options.';
    if (opts.length > MAX_OPTIONS) return `Choice questions can have at most ${MAX_OPTIONS} options.`;
    const values = opts.map((o) => o.value.trim()).filter(Boolean);
    if (new Set(values).size !== opts.length) return 'Option values must be unique and non-empty.';
    if (values.includes(OTHER_VALUE)) return `"${OTHER_VALUE}" is reserved — turn on "Allow Other" instead.`;
    const ceiling = opts.length + (d.allow_other ? 1 : 0);
    if (d.qtype === 'multi' && d.max_select != null && (d.max_select < 1 || d.max_select > ceiling)) {
      return `Max selectable must be between 1 and ${ceiling}.`;
    }
  }
  return null;
}

/** Drop blank option rows; strip flags that do not apply to the type. */
export function cleanDraft(d: QuestionDraft): QuestionDraft {
  const isText = d.qtype === 'text';
  return {
    ...d,
    prompt: d.prompt.trim(),
    help: d.help.trim(),
    options: isText ? [] : d.options.filter((o) => o.label.trim() && o.value.trim()).map((o) => ({ value: o.value.trim(), label: o.label.trim() })),
    allow_other: isText ? false : d.allow_other,
    max_select: d.qtype === 'multi' ? d.max_select : null,
    long: isText ? d.long : false,
  };
}

function OptionsEditor({ options, onChange, rewordOnly }: { options: OptionDraft[]; onChange: (next: OptionDraft[]) => void; rewordOnly: boolean }) {
  function update(i: number, patch: Partial<OptionDraft>) {
    onChange(options.map((o, idx) => (idx === i ? { ...o, ...patch } : o)));
  }
  function updateLabel(i: number, label: string) {
    const o = options[i];
    // Auto-derive the value from the label until the admin has typed a custom one.
    const derivedFromOld = slugify(o.label);
    const shouldSync = !rewordOnly && (o.value === '' || o.value === derivedFromOld);
    update(i, { label, ...(shouldSync ? { value: slugify(label) } : {}) });
  }
  return (
    <div className="space-y-2">
      <div className="grid grid-cols-[1fr_minmax(0,160px)_auto] gap-2 text-[11px] font-semibold uppercase tracking-[0.04em] text-fg-tertiary">
        <span>Label</span>
        <span>Value</span>
        <span className="sr-only">Remove</span>
      </div>
      {options.map((o, i) => (
        <div key={i} className="grid grid-cols-[1fr_minmax(0,160px)_auto] items-center gap-2">
          <input className={INPUT} value={o.label} placeholder="e.g. Google search" onChange={(e) => updateLabel(i, e.target.value)} />
          <input
            className={`${INPUT} font-mono text-[12px]`}
            value={o.value}
            placeholder="google_search"
            disabled={rewordOnly}
            onChange={(e) => update(i, { value: slugify(e.target.value) })}
          />
          <button
            type="button"
            disabled={rewordOnly}
            onClick={() => onChange(options.filter((_, idx) => idx !== i))}
            className="text-fg-tertiary transition-colors hover:text-red-600 disabled:opacity-30 min-h-[44px] min-w-[44px] inline-flex items-center justify-center"
            aria-label="Remove option"
          >
            <X size={16} />
          </button>
        </div>
      ))}
      {!rewordOnly && options.length < MAX_OPTIONS && (
        <button
          type="button"
          onClick={() => onChange([...options, { value: '', label: '' }])}
          className="inline-flex items-center gap-1.5 text-[13px] font-medium text-accent-teal hover:underline min-h-[44px]"
        >
          <Plus size={14} /> Add option
        </button>
      )}
    </div>
  );
}

export function QuestionnaireQuestionEditor({
  initial,
  sections,
  rewordOnly,
  onSave,
  onCancel,
  pending,
}: {
  initial: QuestionDraft;
  sections: QuestionnaireSection[];
  /** After send: only prompt, help and option labels may change. */
  rewordOnly: boolean;
  onSave: (draft: QuestionDraft) => void;
  onCancel: () => void;
  pending: boolean;
}) {
  const [d, setD] = useState<QuestionDraft>(initial);
  const [error, setError] = useState<string | null>(null);

  function submit() {
    const err = validateDraft(d);
    if (err) {
      setError(err);
      return;
    }
    onSave(cleanDraft(d));
  }

  return (
    <div className="space-y-4 rounded-xl border border-accent-teal/40 bg-bg-primary p-4">
      {rewordOnly && (
        <p className="rounded-lg bg-amber-500/10 px-3 py-2 text-[13px] text-amber-700">
          This questionnaire has been sent. You can fix wording (prompt, help text, option labels); type, section,
          required, options and their values are locked so saved answers stay valid.
        </p>
      )}

      <div className="grid gap-3 sm:grid-cols-[180px_1fr_1fr]">
        <div>
          <label className={LABEL}>Type</label>
          <select className={INPUT} value={d.qtype} disabled={rewordOnly} onChange={(e) => setD({ ...d, qtype: e.target.value as QuestionType })}>
            {QTYPES.map((q) => (
              <option key={q.value} value={q.value}>
                {q.label}
              </option>
            ))}
          </select>
        </div>
        <div>
          <label className={LABEL}>Section</label>
          <select className={INPUT} value={d.section_key} disabled={rewordOnly} onChange={(e) => setD({ ...d, section_key: e.target.value })}>
            {sections.map((s) => (
              <option key={s.key} value={s.key}>
                {s.title}
              </option>
            ))}
          </select>
        </div>
        <div className="flex flex-wrap items-end gap-4">
          <label className="flex items-center gap-2 text-sm text-fg-secondary min-h-[44px]">
            <input type="checkbox" checked={d.required} disabled={rewordOnly} onChange={(e) => setD({ ...d, required: e.target.checked })} />
            Required
          </label>
          {d.qtype !== 'text' && (
            <label className="flex items-center gap-2 text-sm text-fg-secondary min-h-[44px]">
              <input type="checkbox" checked={d.allow_other} disabled={rewordOnly} onChange={(e) => setD({ ...d, allow_other: e.target.checked })} />
              Allow &ldquo;Other&rdquo;
            </label>
          )}
          {d.qtype === 'text' && (
            <label className="flex items-center gap-2 text-sm text-fg-secondary min-h-[44px]">
              <input type="checkbox" checked={d.long} disabled={rewordOnly} onChange={(e) => setD({ ...d, long: e.target.checked })} />
              Long answer (5,000 chars)
            </label>
          )}
          {d.qtype === 'multi' && (
            <label className="flex items-center gap-2 text-sm text-fg-secondary min-h-[44px]">
              Max selectable
              <input
                type="number"
                min={1}
                className={`${INPUT} w-20`}
                value={d.max_select ?? ''}
                placeholder="∞"
                disabled={rewordOnly}
                onChange={(e) => setD({ ...d, max_select: e.target.value ? Number(e.target.value) : null })}
              />
            </label>
          )}
        </div>
      </div>

      <div className="grid gap-3">
        <div>
          <label className={LABEL}>Prompt</label>
          <input className={INPUT} value={d.prompt} maxLength={500} placeholder="What would a great next 12 months look like, in numbers?" onChange={(e) => setD({ ...d, prompt: e.target.value })} />
        </div>
        <div>
          <label className={LABEL}>Help text (optional)</label>
          <input className={INPUT} value={d.help} maxLength={500} onChange={(e) => setD({ ...d, help: e.target.value })} />
        </div>
      </div>

      {d.qtype !== 'text' && (
        <div>
          <label className={LABEL}>Options</label>
          <OptionsEditor options={d.options} onChange={(options) => setD({ ...d, options })} rewordOnly={rewordOnly} />
        </div>
      )}

      {error && <p className="text-[13px] text-red-600">{error}</p>}

      <div className="flex items-center gap-2 pt-1">
        <button
          type="button"
          disabled={pending}
          onClick={submit}
          className="rounded-lg bg-accent-teal px-4 py-2 min-h-[44px] text-sm font-semibold text-white transition-colors hover:bg-accent-teal/90 disabled:opacity-50"
        >
          {pending ? 'Saving…' : 'Save question'}
        </button>
        <button
          type="button"
          disabled={pending}
          onClick={onCancel}
          className="rounded-lg border border-border-default px-4 py-2 min-h-[44px] text-sm font-medium text-fg-secondary transition-colors hover:text-fg-primary disabled:opacity-50"
        >
          Cancel
        </button>
      </div>
    </div>
  );
}
