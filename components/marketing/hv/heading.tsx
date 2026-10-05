import type { ElementType, ReactNode } from 'react';
import { cn } from '@/lib/utils';

type HeadingLevel = 'h1' | 'h1-lg' | 'h2' | 'h2-sm' | 'panel' | 'h3' | 'h3-sm';

type HeadingProps = {
  children: ReactNode;
  /**
   * h1 = hero (38–56px), h1-lg = the Learn hero (42–68px), h2 = section
   * (30–46px), h2-sm = sub-section (28–40px), panel = panel/card H2 (28px),
   * h3 = card title (24px), h3-sm = small card title (20–21px).
   */
  level?: HeadingLevel;
  /** Rendered element; defaults to the semantic tag for the level. */
  as?: ElementType;
  className?: string;
  id?: string;
};

const levelClasses: Record<HeadingLevel, string> = {
  h1: 'text-hv-h1 leading-[1.02] tracking-[-0.04em] [text-wrap:balance]',
  'h1-lg': 'text-hv-h1-lg leading-[1] tracking-[-0.04em] [text-wrap:balance]',
  h2: 'text-hv-h2 leading-[1.04] tracking-[-0.035em]',
  'h2-sm': 'text-hv-h2-sm leading-[1.05] tracking-[-0.035em]',
  panel: 'text-hv-h2-panel leading-[1.08] tracking-[-0.03em]',
  h3: 'text-hv-h3 leading-[1.1] tracking-[-0.02em]',
  'h3-sm': 'text-[21px] leading-[1.15] tracking-[-0.02em]',
};

const defaultTag: Record<HeadingLevel, ElementType> = {
  h1: 'h1',
  'h1-lg': 'h1',
  h2: 'h2',
  'h2-sm': 'h2',
  panel: 'h2',
  h3: 'h3',
  'h3-sm': 'h3',
};

/** README "Typography": display headings are Space Grotesk 700; colour comes from the surface. */
export function HvHeading({ children, level = 'h2', as, className, id }: HeadingProps) {
  const Tag = as ?? defaultTag[level];
  return (
    <Tag id={id} className={cn('hv-display font-hv-display font-bold', levelClasses[level], className)}>
      {children}
    </Tag>
  );
}
