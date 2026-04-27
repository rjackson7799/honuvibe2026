import type { ElementType, ReactNode } from 'react';
import { cn } from '@/lib/utils';

type SectionVariant = 'canvas' | 'sand' | 'navy' | 'gradient';

type SectionProps = {
  children: ReactNode;
  variant?: SectionVariant;
  /** Vertical rhythm: 'default' = 96/64, 'hero' = 88px top with no bottom, 'tight' = 64/48, 'flush' = 0 (caller manages) */
  spacing?: 'default' | 'hero' | 'tight' | 'flush';
  as?: ElementType;
  id?: string;
  className?: string;
};

const variantClasses: Record<SectionVariant, string> = {
  canvas: 'bg-[var(--m-canvas)]',
  sand: 'bg-[var(--m-sand)]',
  navy: 'bg-[var(--m-ink-primary)] text-white',
  gradient:
    'border-t border-[rgba(15,169,160,0.12)] bg-[linear-gradient(135deg,rgba(15,169,160,0.06)_0%,var(--m-sand)_50%,rgba(232,118,90,0.06)_100%)]',
};

const spacingClasses: Record<NonNullable<SectionProps['spacing']>, string> = {
  default: 'py-16 md:py-24',  // 64 / 96
  hero: 'pt-[88px] pb-16 md:pb-20',
  tight: 'py-12 md:py-16',
  flush: '',
};

export function Section({
  children,
  variant = 'canvas',
  spacing = 'default',
  as: Tag = 'section',
  id,
  className,
}: SectionProps) {
  return (
    <Tag
      id={id}
      className={cn(variantClasses[variant], spacingClasses[spacing], className)}
    >
      {children}
    </Tag>
  );
}
