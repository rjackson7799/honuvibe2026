import { cn } from '@/lib/utils';

type LogoLockupProps = {
  left: string;
  right?: string;
  mark?: string;
  size?: 'sm' | 'md' | 'lg' | 'xl';
  theme?: 'navy' | 'canvas';
  partnerColor?: string;
  className?: string;
};

const sizeClasses: Record<NonNullable<LogoLockupProps['size']>, string> = {
  sm: 'text-[clamp(20px,2.5vw,28px)]',
  md: 'text-[clamp(28px,3.5vw,44px)]',
  lg: 'text-[clamp(44px,6vw,72px)]',
  xl: 'text-[clamp(56px,9vw,112px)]',
};

const markSizeClasses: Record<NonNullable<LogoLockupProps['size']>, string> = {
  sm: 'text-[clamp(16px,2vw,22px)]',
  md: 'text-[clamp(24px,3vw,36px)]',
  lg: 'text-[clamp(40px,5.5vw,64px)]',
  xl: 'text-[clamp(52px,8vw,96px)]',
};

export function LogoLockup({
  left,
  right = 'HonuVibe.AI',
  mark = '×',
  size = 'lg',
  theme = 'navy',
  partnerColor,
  className,
}: LogoLockupProps) {
  const baseColor = theme === 'navy' ? 'text-white' : 'text-[var(--m-ink-primary)]';
  const markColor =
    theme === 'navy' ? 'text-[var(--m-accent-teal)]' : 'text-[var(--m-accent-teal)]';

  return (
    <div
      className={cn(
        'flex items-baseline justify-center gap-[0.4em] font-serif italic leading-none tracking-[-0.02em]',
        sizeClasses[size],
        baseColor,
        className,
      )}
    >
      <span
        className="text-right uppercase not-italic font-bold tracking-[0.02em]"
        style={partnerColor ? { color: partnerColor } : undefined}
      >
        {left}
      </span>
      <span className={cn('italic', markColor, markSizeClasses[size])}>{mark}</span>
      <span className="text-left not-italic font-bold tracking-[-0.01em]">{right}</span>
    </div>
  );
}
