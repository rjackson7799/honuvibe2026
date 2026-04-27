import { cn } from '@/lib/utils';

type PhotoPlaceholderProps = {
  /** A short label rendered inside the placeholder (monospace caption). */
  label?: string;
  /** Optional gradient override; otherwise uses a warm sand gradient. */
  bg?: string;
  /** Aspect treatment. Caller controls width via className/style. */
  height?: number | string;
  width?: number | string;
  /** True for 'dashed' Explore-style placeholder card with centered + icon. */
  variant?: 'gradient' | 'dashed';
  className?: string;
};

const defaultBg =
  'linear-gradient(155deg, #d4c4a0 0%, #c0a87a 40%, #a89060 100%)';

export function PhotoPlaceholder({
  label = 'photo placeholder',
  bg = defaultBg,
  height = 360,
  width = '100%',
  variant = 'gradient',
  className,
}: PhotoPlaceholderProps) {
  if (variant === 'dashed') {
    return (
      <div
        style={{ width, height }}
        className={cn(
          'relative flex flex-col items-center justify-center gap-2',
          'rounded-[20px] border-[1.5px] border-dashed border-[rgba(26,43,51,0.18)]',
          'bg-transparent text-[var(--m-ink-tertiary)]',
          className,
        )}
      >
        <div className="flex h-14 w-14 items-center justify-center rounded-full border-[1.5px] border-dashed border-[var(--m-accent-teal)] text-[var(--m-accent-teal)]">
          <svg width="22" height="22" viewBox="0 0 22 22" fill="none" stroke="currentColor" strokeWidth={1.5} strokeLinecap="round">
            <path d="M11 4v14M4 11h14" />
          </svg>
        </div>
        <p className="text-[11px] font-mono uppercase tracking-[0.04em]">{label}</p>
      </div>
    );
  }

  return (
    <div
      style={{ width, height, background: bg }}
      className={cn(
        'relative flex flex-col items-center justify-center gap-2',
        'overflow-hidden rounded-[16px] border border-[var(--m-border-soft)]',
        className,
      )}
    >
      <svg width="28" height="28" viewBox="0 0 28 28" fill="none">
        <circle cx="14" cy="10" r="5" fill="rgba(26,43,51,0.18)" />
        <path d="M4 24c0-5.5 4.5-9 10-9s10 3.5 10 9" fill="rgba(26,43,51,0.12)" />
      </svg>
      <span className="px-3 text-center font-mono text-[11px] font-semibold tracking-[0.04em] text-[rgba(26,43,51,0.35)]">
        {label}
      </span>
    </div>
  );
}
