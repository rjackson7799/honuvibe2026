import { cn } from '@/lib/utils';
import type { GlossaryDifficulty } from '@/lib/sanity/types';

type DifficultyBadgeProps = {
  difficulty: GlossaryDifficulty;
  label: string;
  className?: string;
};

const styleByDifficulty: Record<GlossaryDifficulty, string> = {
  beginner:
    'bg-[var(--m-accent-teal-soft)] text-[var(--m-accent-teal-dark)] border-[var(--m-border-teal)]',
  intermediate:
    'bg-[var(--m-accent-coral-soft)] text-[var(--m-accent-coral-dark)] border-[var(--m-border-coral)]',
  advanced:
    'bg-[var(--m-sand)] text-[var(--m-ink-tertiary)] border-[var(--m-border-default)]',
};

export function DifficultyBadge({ difficulty, label, className }: DifficultyBadgeProps) {
  return (
    <span
      className={cn(
        'inline-flex items-center rounded-full border px-2.5 py-0.5',
        'text-[11px] font-semibold uppercase tracking-[0.06em]',
        styleByDifficulty[difficulty],
        className,
      )}
    >
      {label}
    </span>
  );
}
