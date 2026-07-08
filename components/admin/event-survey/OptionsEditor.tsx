'use client';

import { Plus, X } from 'lucide-react';

export type OptionDraft = { value: string; labelEn: string; labelJp: string };

const INPUT =
  'w-full rounded-md border border-border-default bg-bg-primary px-2.5 py-1.5 text-sm text-fg-primary placeholder:text-fg-tertiary focus:border-accent-teal focus:outline-none';

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

export function OptionsEditor({
  options,
  onChange,
}: {
  options: OptionDraft[];
  onChange: (next: OptionDraft[]) => void;
}) {
  function update(i: number, patch: Partial<OptionDraft>) {
    onChange(options.map((o, idx) => (idx === i ? { ...o, ...patch } : o)));
  }

  function updateLabelEn(i: number, labelEn: string) {
    const o = options[i];
    // Auto-derive the (language-neutral) value from the English label until the
    // admin has typed a custom value.
    const derivedFromOld = slugify(o.labelEn);
    const shouldSync = o.value === '' || o.value === derivedFromOld;
    update(i, { labelEn, ...(shouldSync ? { value: slugify(labelEn) } : {}) });
  }

  return (
    <div className="space-y-2">
      <div className="grid grid-cols-[1fr_1fr_minmax(0,140px)_auto] gap-2 text-[11px] font-semibold uppercase tracking-[0.04em] text-fg-tertiary">
        <span>Label (EN)</span>
        <span>Label (JP)</span>
        <span>Value</span>
        <span className="sr-only">Remove</span>
      </div>
      {options.map((o, i) => (
        <div key={i} className="grid grid-cols-[1fr_1fr_minmax(0,140px)_auto] items-center gap-2">
          <input
            className={INPUT}
            value={o.labelEn}
            placeholder="e.g. Beginner"
            onChange={(e) => updateLabelEn(i, e.target.value)}
          />
          <input
            className={INPUT}
            value={o.labelJp}
            placeholder="例：初心者"
            onChange={(e) => update(i, { labelJp: e.target.value })}
          />
          <input
            className={`${INPUT} font-mono text-[12px]`}
            value={o.value}
            placeholder="beginner"
            onChange={(e) => update(i, { value: slugify(e.target.value) })}
          />
          <button
            type="button"
            onClick={() => onChange(options.filter((_, idx) => idx !== i))}
            className="text-fg-tertiary transition-colors hover:text-red-600"
            aria-label="Remove option"
          >
            <X size={16} />
          </button>
        </div>
      ))}
      <button
        type="button"
        onClick={() => onChange([...options, { value: '', labelEn: '', labelJp: '' }])}
        className="inline-flex items-center gap-1.5 text-[13px] font-medium text-accent-teal hover:underline"
      >
        <Plus size={14} /> Add option
      </button>
    </div>
  );
}
