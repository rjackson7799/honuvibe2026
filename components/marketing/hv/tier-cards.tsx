import type { ReactNode } from 'react';
import { cn } from '@/lib/utils';
import { HvButton } from './button';

export type TierPrice = {
  /** "$99", "$1,500", "Free", "Quoted", "Rev share" */
  amount: string;
  /** Text before the amount, e.g. "from". */
  prefix?: string;
  /** Text after the amount, e.g. "/ month", "/ seat / month". */
  unit?: string;
};

export type TierCardProps = {
  name: string;
  tagline?: string;
  price: TierPrice;
  features: readonly string[];
  /**
   * `href` renders a link. `onClick` is a function prop, so a caller that
   * passes it must itself be a Client Component (Server Components cannot
   * pass functions across the boundary).
   */
  cta: { label: string; href?: string; onClick?: () => void };
  /** Popular tier: green-900 fill, amber checks, amber button, badge. */
  popular?: boolean;
  /** Badge text for the popular tier ("Most projects", "Most partners"). */
  badge?: string;
  /** README `showPrices`: hides the price row. */
  showPrice?: boolean;
  /** Extra content under the price (e.g. "No card needed"). */
  note?: ReactNode;
  /** Stagger for the reveal orchestrator. */
  revealDelay?: number;
  className?: string;
};

/** README "Pricing / tier cards". */
export function HvTierCard({
  name,
  tagline,
  price,
  features,
  cta,
  popular = false,
  badge,
  showPrice = true,
  note,
  revealDelay,
  className,
}: TierCardProps) {
  const sub = popular ? 'text-hv-green-200' : 'text-hv-ink-500';
  const body = popular ? 'text-hv-green-200' : 'text-hv-ink-700';
  const check = popular ? 'text-hv-amber' : 'text-hv-green-600';

  return (
    <div
      data-reveal
      data-reveal-delay={revealDelay}
      data-popular={popular ? 'true' : 'false'}
      className={cn(
        'flex flex-col gap-4 rounded-[16px] p-7 transition-[transform,box-shadow] duration-300 ease-hv hover:-translate-y-[3px] hover:shadow-hv-panel',
        popular ? 'bg-hv-green-900 text-hv-sand-100' : 'border border-hv-sand-300 bg-hv-sand-50 text-hv-green-900',
        className,
      )}
    >
      <div>
        <div className="flex items-center justify-between gap-2.5">
          <h3 className="font-hv-display text-[24px] font-bold tracking-[-0.02em]">{name}</h3>
          {popular && badge && (
            <span className="rounded-[6px] bg-hv-amber px-[9px] py-[5px] text-[11px] font-bold uppercase tracking-[0.08em] text-hv-green-900">
              {badge}
            </span>
          )}
        </div>
        {tagline && <p className={cn('mt-1 text-[14.5px]', sub)}>{tagline}</p>}
      </div>

      {showPrice && (
        <div className="flex flex-wrap items-baseline gap-2">
          {price.prefix && <span className={cn('text-[15px]', sub)}>{price.prefix}</span>}
          <span className="font-hv-display text-[46px] font-bold leading-none tracking-[-0.04em]">{price.amount}</span>
          {price.unit && <span className={cn('text-[15.5px]', sub)}>{price.unit}</span>}
        </div>
      )}
      {note && <div className={cn('text-[14px]', sub)}>{note}</div>}

      <ul className="grid gap-2.5">
        {features.map((f) => (
          <li key={f} className={cn('flex gap-2.5 text-[15px] leading-[1.5]', body)}>
            <span aria-hidden className={cn('font-bold', check)}>
              ✓
            </span>
            <span>{f}</span>
          </li>
        ))}
      </ul>

      <div className="mt-auto pt-2">
        {cta.href ? (
          <HvButton href={cta.href} variant={popular ? 'amber' : 'dark'} size="hero" arrow className="w-full" onClick={cta.onClick}>
            {cta.label}
          </HvButton>
        ) : (
          <HvButton variant={popular ? 'amber' : 'dark'} size="hero" arrow className="w-full" onClick={cta.onClick}>
            {cta.label}
          </HvButton>
        )}
      </div>
    </div>
  );
}

type TierGridProps = { children: ReactNode; className?: string };

/** Three-up grid that collapses automatically (README "Spacing and layout"). */
export function HvTierGrid({ children, className }: TierGridProps) {
  return (
    <div className={cn('grid items-stretch gap-5 [grid-template-columns:repeat(auto-fit,minmax(min(100%,300px),1fr))]', className)}>
      {children}
    </div>
  );
}
