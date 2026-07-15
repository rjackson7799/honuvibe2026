'use client';

import type { ReactNode } from 'react';
import { inputClass, labelClass } from '@/components/admin/editor-shell/field-classes';

export function Grid({ children }: { children: ReactNode }) {
  return <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">{children}</div>;
}

/**
 * Wrapping <label> keeps the caption bound to its control without hand-rolled
 * ids. Inside a SectionCard (bg-bg-secondary), controls use the shell's
 * bg-bg-tertiary so they read as inset rather than blending into the card.
 */
export function Field({ label, children }: { label: string; children: ReactNode }) {
  return (
    <label className="block">
      <span className={labelClass}>{label}</span>
      {children}
    </label>
  );
}

export function Toggle({
  label,
  description,
  value,
  onChange,
}: {
  label: string;
  description?: string;
  value: boolean;
  onChange: (v: boolean) => void;
}) {
  return (
    <label className="flex cursor-pointer items-start gap-3 rounded-lg border border-border-default bg-bg-tertiary p-3">
      <input
        type="checkbox"
        checked={value}
        onChange={(e) => onChange(e.target.checked)}
        className="mt-0.5 h-4 w-4 rounded border-border-default bg-bg-tertiary text-accent-teal focus:ring-accent-teal"
      />
      <span className="flex-1">
        <span className="block text-sm font-medium text-fg-primary">{label}</span>
        {description && (
          <span className="mt-0.5 block text-xs text-fg-tertiary">{description}</span>
        )}
      </span>
    </label>
  );
}

export function ColorInput({
  value,
  onChange,
}: {
  value: string;
  onChange: (v: string) => void;
}) {
  // <input type="color"> rejects anything but a full 6-digit hex, so fall back
  // to black for the swatch while the text field holds the partial value.
  const displayValue = /^#[0-9a-fA-F]{6}$/.test(value) ? value : '#000000';
  return (
    <div className="flex items-center gap-2">
      <input
        type="color"
        value={displayValue}
        onChange={(e) => onChange(e.target.value)}
        className="h-9 w-12 shrink-0 cursor-pointer rounded-lg border border-border-default bg-bg-tertiary"
      />
      <input
        type="text"
        value={value}
        onChange={(e) => onChange(e.target.value)}
        placeholder="#FF3366"
        className={inputClass}
      />
    </div>
  );
}
