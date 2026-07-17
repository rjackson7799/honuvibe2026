import { cn } from '@/lib/utils';

type ProgressBarProps = {
  /** 0-100. Clamped, so a bad input can't overflow the track. */
  percent: number;
  /** Coral marks a finished course; teal is in-progress. */
  tone?: 'teal' | 'coral' | 'auto';
  size?: 'sm' | 'md';
  className?: string;
  label?: string;
};

/**
 * Shared progress bar for the dashboard, replacing the inline bar the "My
 * Courses" card used to hand-roll. (PathCard keeps its own bar for now — the
 * plan lists it as unchanged, and its dimensions/track differ slightly.)
 *
 * `tone="auto"` turns coral at 100% — the existing dashboard behaviour.
 */
export function ProgressBar({
  percent,
  tone = 'auto',
  size = 'sm',
  className,
  label,
}: ProgressBarProps) {
  const clamped = Math.max(0, Math.min(100, Math.round(percent)));
  const isComplete = clamped === 100;
  const fill =
    tone === 'coral' || (tone === 'auto' && isComplete)
      ? 'bg-[color:var(--accent-coral)]'
      : 'bg-[color:var(--accent-teal)]';

  return (
    <div
      className={cn(
        'bg-[color:var(--border-secondary)] rounded-full overflow-hidden',
        size === 'sm' ? 'h-[5px]' : 'h-2',
        className,
      )}
      role="progressbar"
      aria-valuenow={clamped}
      aria-valuemin={0}
      aria-valuemax={100}
      aria-label={label}
    >
      <div
        className={cn('h-full rounded-full transition-all duration-500', fill)}
        style={{ width: `${clamped}%` }}
      />
    </div>
  );
}
