import type { ElementType, ReactNode } from 'react';
import { cn } from '@/lib/utils';
import { HvContainer } from './container';

type SectionVariant = 'page' | 'dark' | 'sand';
type SectionSpacing = 'default' | 'hero' | 'tight' | 'flush';

type SectionProps = {
  children: ReactNode;
  /** 'page' = inherits the sand page background, 'dark' = green-900 band, 'sand' = sand-200 band. */
  variant?: SectionVariant;
  /**
   * The design stacks sections with top padding only (80px) and lets the
   * footer carry the final bottom space. 'hero' is the dark hero band
   * (44px top / 56px bottom). 'flush' leaves spacing to the caller.
   */
  spacing?: SectionSpacing;
  /** Wrap children in HvContainer (default). Pass false for full-bleed content. */
  contained?: boolean;
  as?: ElementType;
  id?: string;
  className?: string;
  containerClassName?: string;
};

const variantClasses: Record<SectionVariant, string> = {
  page: '',
  dark: 'bg-hv-green-900 text-hv-sand-100',
  sand: 'bg-hv-sand-200 text-hv-ink',
};

const spacingClasses: Record<SectionSpacing, string> = {
  default: 'pt-16 md:pt-20',
  hero: 'pt-10 pb-12 md:pt-11 md:pb-14',
  tight: 'pt-6 md:pt-8',
  flush: '',
};

export function HvSection({
  children,
  variant = 'page',
  spacing = 'default',
  contained = true,
  as: Tag = 'section',
  id,
  className,
  containerClassName,
}: SectionProps) {
  return (
    <Tag id={id} className={cn(variantClasses[variant], spacingClasses[spacing], className)}>
      {contained ? <HvContainer className={containerClassName}>{children}</HvContainer> : children}
    </Tag>
  );
}
