'use client';

import { cn } from '@/lib/utils';

export type EditorStep = {
  id: string;
  label: string;
};

type PartnerEditorNavProps = {
  steps: readonly EditorStep[];
  activeId: string;
  onNavigate: (id: string) => void;
  className?: string;
};

/**
 * Left "SETUP · 5 STEPS" scroll navigator, matching the Vault editor's rail
 * (teal fill = section in view). Partners is edit-only — every field is
 * already populated — so there is no completion state to show and no meter.
 */
export function PartnerEditorNav({
  steps,
  activeId,
  onNavigate,
  className,
}: PartnerEditorNavProps) {
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
                    : 'bg-bg-tertiary text-fg-tertiary',
                )}
              >
                {i + 1}
              </span>
              {step.label}
            </button>
          );
        })}
      </nav>
    </aside>
  );
}
