import Image from 'next/image';
import type { ActivePartnerContext } from '@/lib/partners/active-partner';

type PartnerIdentityProps = {
  partner: Pick<ActivePartnerContext, 'name' | 'logoUrl' | 'accent'>;
  className?: string;
};

/**
 * Partner logo-or-monogram + name, over a short accent rule.
 *
 * Applies the accent DIRECTLY rather than reading `var(--accent-teal)`. This
 * renders in the dashboard header and on the welcome screen, both OUTSIDE the
 * PartnerHomeModule wrapper that re-points the teal tokens — inheriting there
 * would paint HonuVibe teal and silently drop the partner's colour.
 *
 * `accent` is already contrast-checked against the learn-zone surfaces by the
 * chokepoint, so null means "use the house token", not "unvalidated".
 */
export function PartnerIdentity({ partner, className = '' }: PartnerIdentityProps) {
  const accent = partner.accent ?? 'var(--accent-teal)';

  return (
    <div className={`flex items-center gap-2.5 ${className}`}>
      {partner.logoUrl ? (
        <Image
          src={partner.logoUrl}
          alt={partner.name}
          width={28}
          height={28}
          className="h-7 w-7 rounded-md object-contain"
        />
      ) : (
        <span
          aria-hidden="true"
          className="flex h-7 w-7 shrink-0 items-center justify-center rounded-md border text-[13px] font-bold"
          style={{ borderColor: accent, color: accent }}
        >
          {/* Array spread, not charAt — charAt splits a surrogate pair and would
              render a replacement character for a JP name starting with one. */}
          {[...partner.name][0] ?? '?'}
        </span>
      )}
      <span className="flex flex-col gap-1">
        <span className="text-[12.5px] font-semibold text-fg-secondary leading-none">
          {partner.name}
        </span>
        <span
          aria-hidden="true"
          className="block h-[2px] w-7 rounded-full"
          style={{ backgroundColor: accent }}
        />
      </span>
    </div>
  );
}
