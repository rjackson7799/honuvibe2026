import { cn } from '@/lib/utils';
import { type LucideIcon } from 'lucide-react';

type ButtonVariant = 'primary' | 'ghost' | 'gold';
type ButtonSize = 'sm' | 'md' | 'lg';

type ButtonProps = {
  variant?: ButtonVariant;
  size?: ButtonSize;
  fullWidth?: boolean;
  icon?: LucideIcon;
  iconPosition?: 'left' | 'right';
  children: React.ReactNode;
  className?: string;
  disabled?: boolean;
} & (
  | ({ href: string } & React.AnchorHTMLAttributes<HTMLAnchorElement>)
  | ({ href?: never } & React.ButtonHTMLAttributes<HTMLButtonElement>)
);

const variantStyles: Record<ButtonVariant, string> = {
  primary:
    'bg-accent-teal text-white hover:bg-accent-teal-hover shadow-sm',
  ghost:
    'bg-transparent text-fg-primary border border-border-default hover:border-border-hover hover:bg-bg-tertiary',
  gold:
    'bg-accent-gold text-white hover:bg-accent-gold-hover shadow-sm',
};

const sizeStyles: Record<ButtonSize, string> = {
  sm: 'h-9 px-4 text-sm gap-1.5',
  md: 'h-11 px-6 text-base gap-2',
  lg: 'h-12 px-8 text-base gap-2',
};

export function Button({
  variant = 'primary',
  size = 'md',
  fullWidth = false,
  icon: Icon,
  iconPosition = 'left',
  children,
  className,
  ...props
}: ButtonProps) {
  const classes = cn(
    'inline-flex items-center justify-center rounded font-medium',
    'transition-colors duration-[var(--duration-normal)]',
    'focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-accent-teal',
    'disabled:opacity-50 disabled:pointer-events-none',
    'min-h-[44px]',
    variantStyles[variant],
    sizeStyles[size],
    fullWidth && 'w-full',
    className,
  );

  const content = (
    <>
      {Icon && iconPosition === 'left' && <Icon size={size === 'sm' ? 16 : 18} />}
      {children}
      {Icon && iconPosition === 'right' && <Icon size={size === 'sm' ? 16 : 18} />}
    </>
  );

  if ('href' in props && props.href) {
    const { href, ...anchorProps } = props as { href: string } & React.AnchorHTMLAttributes<HTMLAnchorElement>;
    return (
      <a href={href} className={classes} {...anchorProps}>
        {content}
      </a>
    );
  }

  const buttonProps = props as React.ButtonHTMLAttributes<HTMLButtonElement>;
  return (
    <button className={classes} {...buttonProps}>
      {content}
    </button>
  );
}
