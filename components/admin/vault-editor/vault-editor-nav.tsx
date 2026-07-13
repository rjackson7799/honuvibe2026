'use client';

import { Check } from 'lucide-react';
import { cn } from '@/lib/utils';
import type { RequiredCheck } from '@/lib/vault/editor-progress';

export type EditorStep = {
  id: string;
  label: string;
  /** All of this step's required checks pass (steps without checks stay false). */
  complete: boolean;
};

type VaultEditorNavProps = {
  steps: EditorStep[];
  activeId: string;
  checks: RequiredCheck[];
  onNavigate: (id: string) => void;
  className?: string;
};

/**
 * Left "SETUP · 5 STEPS" scroll navigator: numbered items highlight the
 * section in view (teal fill = active, check = required fields complete)
 * plus an informational required-fields progress meter.
 */
export function VaultEditorNav({
  steps,
  activeId,
  checks,
  onNavigate,
  className,
}: VaultEditorNavProps) {
  const done = checks.filter((c) => c.done).length;
  const pct = checks.length === 0 ? 0 : Math.round((done / checks.length) * 100);

  return (
    <aside className={className}>
      <p className="mb-3 text-[11px] font-semibold uppercase tracking-[0.18em] text-fg-tertiary">
        Setup · {steps.length} steps
      </p>
      <nav className="space-y-1">
        {steps.map((step, i) => {
          const isActive = step.id === activeId;
          return (
            <button
              key={step.id}
              type="button"
              onClick={() => onNavigate(step.id)}
              aria-current={isActive ? 'true' : undefined}
              className={cn(
                'flex w-full items-center gap-2.5 rounded-lg px-3 py-2 text-left text-sm transition-colors',
                isActive
                  ? 'bg-[color:var(--accent-teal-subtle)] font-medium text-[color:var(--accent-teal)]'
                  : 'text-fg-secondary hover:bg-bg-secondary hover:text-fg-primary',
              )}
            >
              <span
                className={cn(
                  'flex h-5 w-5 shrink-0 items-center justify-center rounded-full text-[11px] font-semibold',
                  isActive
                    ? 'bg-[color:var(--accent-teal)] text-white'
                    : step.complete
                      ? 'bg-[color:var(--accent-teal-subtle)] text-[color:var(--accent-teal)]'
                      : 'bg-bg-tertiary text-fg-tertiary',
                )}
              >
                {step.complete && !isActive ? <Check size={11} /> : i + 1}
              </span>
              {step.label}
            </button>
          );
        })}
      </nav>

      <div className="mt-4 rounded-lg border border-border-default bg-bg-secondary p-3">
        <p className="text-xs font-medium text-fg-secondary">Required fields</p>
        <div className="mt-2 h-1 overflow-hidden rounded-full bg-bg-tertiary">
          <div
            className="h-full rounded-full bg-[color:var(--accent-teal)] transition-[width] duration-[var(--duration-normal)]"
            style={{ width: `${pct}%` }}
          />
        </div>
        <p className="mt-1.5 text-xs text-fg-tertiary">
          {done} of {checks.length} complete
        </p>
      </div>
    </aside>
  );
}
