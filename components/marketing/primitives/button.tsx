'use client';

import type { AnchorHTMLAttributes, ButtonHTMLAttributes, ReactNode } from 'react';
import { ArrowRight } from 'lucide-react';
import { cn } from '@/lib/utils';

type Variant = 'primary-teal' | 'outline-teal' | 'primary-coral' | 'outline-coral' | 'ghost';
type Size = 'sm' | 'md' | 'lg';

type CommonProps = {
  children: ReactNode;
  variant?: Variant;
  size?: Size;
  withArrow?: boolean;
  className?: string;
};

type ButtonProps = CommonProps &
  Omit<ButtonHTMLAttributes<HTMLButtonElement>, 'className' | 'children'> & {
    href?: undefined;
  };

type LinkProps = CommonProps &
  Omit<AnchorHTMLAttributes<HTMLAnchorElement>, 'className' | 'children' | 'href'> & {
    href: string;
  };

type Props = ButtonProps | LinkProps;

const variantClasses: Record<Variant, string> = {
  'primary-teal': cn(
    'bg-[var(--m-accent-teal)] text-white border border-transparent',
    'hover:bg-[var(--m-accent-teal-dark)] hover:-translate-y-px',
    'shadow-[var(--m-shadow-teal-sm)] hover:shadow-[var(--m-shadow-teal-md)]',
  ),
  'outline-teal': cn(
    'bg-transparent text-[var(--m-accent-teal)] border-[1.5px] border-[var(--m-accent-teal)]',
    'hover:bg-[var(--m-accent-teal-soft)]',
  ),
  'primary-coral': cn(
    'bg-[var(--m-accent-coral)] text-white border border-transparent',
    'hover:bg-[var(--m-accent-coral-dark)] hover:-translate-y-px',
    'shadow-[var(--m-shadow-coral-sm)] hover:shadow-[var(--m-shadow-coral-md)]',
  ),
  'outline-coral': cn(
    'bg-transparent text-[var(--m-accent-coral)] border-[1.5px] border-[var(--m-accent-coral)]',
    'hover:bg-[var(--m-accent-coral-soft)]',
  ),
  ghost: cn(
    'bg-transparent text-[var(--m-accent-teal)] border-none p-0',
    'hover:opacity-80',
  ),
};

const sizeClasses: Record<Size, string> = {
  sm: 'text-[14px] font-semibold px-4 py-2 rounded-lg',
  md: 'text-[15px] font-bold px-7 py-3.5 rounded-[10px]',
  lg: 'text-[16px] font-bold px-8 py-4 rounded-[10px]',
};

export function Button(props: Props) {
  const {
    children,
    variant = 'primary-teal',
    size = 'md',
    withArrow,
    className,
    ...rest
  } = props;

  const isGhost = variant === 'ghost';

  const classes = cn(
    'inline-flex items-center justify-center gap-2 cursor-pointer',
    'transition-all duration-200',
    'focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[var(--m-accent-teal)] focus-visible:ring-offset-2 focus-visible:ring-offset-[var(--m-canvas)]',
    'disabled:opacity-60 disabled:cursor-not-allowed',
    !isGhost && sizeClasses[size],
    variantClasses[variant],
    className,
  );

  const content = (
    <>
      {children}
      {withArrow && <ArrowRight size={16} strokeWidth={2} />}
    </>
  );

  if ('href' in rest && rest.href) {
    const { href, ...anchorRest } = rest;
    return (
      <a href={href} className={classes} {...anchorRest}>
        {content}
      </a>
    );
  }

  return (
    <button className={classes} {...(rest as ButtonHTMLAttributes<HTMLButtonElement>)}>
      {content}
    </button>
  );
}
