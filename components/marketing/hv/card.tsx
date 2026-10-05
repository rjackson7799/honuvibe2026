import type { ElementType, ReactNode } from 'react';
import { cn } from '@/lib/utils';

type CardVariant = 'light' | 'dark' | 'sand' | 'well';
type CardRadius = 14 | 16 | 20;

type CardProps = {
  children: ReactNode;
  /**
   * light = sand-50 card with sand-300 border (cards on cream),
   * dark = green-900 panel with sand text, sand = sand-200 band,
   * well = green-800 fill (cards inside a dark section).
   */
  variant?: CardVariant;
  radius?: CardRadius;
  /** Hover lift (2–4px) + the card shadow (README "Hovers"). */
  interactive?: boolean;
  as?: ElementType;
  id?: string;
  className?: string;
};

const variantClasses: Record<CardVariant, string> = {
  light: 'bg-hv-sand-50 text-hv-ink border border-hv-sand-300',
  dark: 'bg-hv-green-900 text-hv-sand-100',
  sand: 'bg-hv-sand-200 text-hv-ink',
  well: 'bg-hv-green-800 text-hv-sand-100',
};

const radiusClasses: Record<CardRadius, string> = {
  14: 'rounded-[14px]',
  16: 'rounded-[16px]',
  20: 'rounded-[20px]',
};

const interactiveClasses = cn(
  'transition-[transform,box-shadow,border-color] duration-[250ms] ease-hv',
  'hover:-translate-y-1 hover:shadow-hv-card',
);

export function HvCard({
  children,
  variant = 'light',
  radius = 16,
  interactive = false,
  as: Tag = 'div',
  id,
  className,
}: CardProps) {
  return (
    <Tag
      id={id}
      className={cn(variantClasses[variant], radiusClasses[radius], interactive && interactiveClasses, className)}
    >
      {children}
    </Tag>
  );
}
