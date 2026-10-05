import type { AnchorHTMLAttributes, ButtonHTMLAttributes, ReactNode } from 'react';
import { Link } from '@/i18n/navigation';
import { cn } from '@/lib/utils';

export type HvButtonVariant =
  | 'amber' // primary CTA: amber fill, green-900 text
  | 'dark' // primary on light: green-900 fill, sand text
  | 'outline' // secondary on light: green-900 border
  | 'outline-dark' // secondary on dark: green-600 border, sand text, green-800 hover fill
  | 'link' // text link CTA on light: green-900 → terracotta
  | 'link-terracotta' // text link CTA in terracotta
  | 'link-amber'; // text link CTA on dark

export type HvButtonSize = 'hero' | 'md' | 'nav' | 'sm';

type CommonProps = {
  children: ReactNode;
  variant?: HvButtonVariant;
  size?: HvButtonSize;
  /** Appends the design's "→" glyph. */
  arrow?: boolean;
  className?: string;
};

type ButtonProps = CommonProps &
  Omit<ButtonHTMLAttributes<HTMLButtonElement>, 'className' | 'children'> & { href?: undefined };

type LinkProps = CommonProps &
  Omit<AnchorHTMLAttributes<HTMLAnchorElement>, 'className' | 'children' | 'href'> & { href: string };

type Props = ButtonProps | LinkProps;

const variantClasses: Record<HvButtonVariant, string> = {
  amber: cn(
    'bg-hv-amber text-hv-green-900 border border-transparent',
    'hover:-translate-y-0.5 hover:shadow-hv-cta',
  ),
  dark: cn('bg-hv-green-900 text-hv-sand-100 border border-transparent', 'hover:bg-hv-green-800'),
  outline: cn(
    'bg-transparent text-hv-green-900 border-[1.5px] border-hv-green-900',
    'hover:bg-hv-green-900 hover:text-hv-sand-100',
  ),
  'outline-dark': cn(
    'bg-transparent text-hv-sand-100 border-[1.5px] border-hv-green-600',
    'hover:bg-hv-green-800',
  ),
  link: 'bg-transparent text-hv-green-900 hover:text-hv-terracotta',
  'link-terracotta': 'bg-transparent text-hv-terracotta hover:text-hv-terracotta-dark',
  'link-amber': 'bg-transparent text-hv-amber hover:text-hv-sand-100',
};

const sizeClasses: Record<HvButtonSize, string> = {
  hero: 'min-h-[54px] px-[26px] text-[17px] rounded-[10px]',
  md: 'min-h-[50px] px-5 text-[16px] rounded-[10px]',
  nav: 'min-h-[44px] px-[18px] text-[15px] rounded-[8px]',
  sm: 'min-h-[44px] px-4 text-[15px] rounded-[9px]',
};

const isTextLink = (v: HvButtonVariant) => v.startsWith('link');
const isInternal = (href: string) => href.startsWith('/') && !href.startsWith('//');

/**
 * README "Buttons". Text-link variants drop the box sizing. Internal hrefs go
 * through next-intl's Link so /ja routes keep their prefix (the legacy
 * marketing Button rendered a plain <a>, which lost the locale).
 */
export function HvButton(props: Props) {
  const { children, variant = 'amber', size = 'md', arrow = false, className, ...rest } = props;
  const textLink = isTextLink(variant);

  const classes = cn(
    'inline-flex items-center justify-center gap-2 font-semibold',
    'transition-[transform,background-color,color,box-shadow] duration-[250ms] ease-hv',
    'focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-hv-amber focus-visible:ring-offset-2',
    'disabled:opacity-60 disabled:cursor-not-allowed disabled:hover:translate-y-0 disabled:hover:shadow-none',
    textLink ? 'min-h-[44px] text-[16px]' : sizeClasses[size],
    variantClasses[variant],
    className,
  );

  const content = (
    <>
      {children}
      {arrow && <span aria-hidden>→</span>}
    </>
  );

  if ('href' in rest && typeof rest.href === 'string') {
    const { href, ...anchorRest } = rest as LinkProps;
    if (isInternal(href)) {
      return (
        <Link href={href} className={classes} {...anchorRest}>
          {content}
        </Link>
      );
    }
    return (
      <a href={href} className={classes} {...anchorRest}>
        {content}
      </a>
    );
  }

  const { type, ...buttonRest } = rest as ButtonHTMLAttributes<HTMLButtonElement>;
  return (
    <button {...buttonRest} type={type ?? 'button'} className={classes}>
      {content}
    </button>
  );
}
