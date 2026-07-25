import Image from 'next/image';
import type { ReactNode } from 'react';
import { safeAccentColor } from '@/lib/partners/contrast';

export type JoinPartnerBrand = {
  slug: string;
  name: string;
  logoUrl: string | null;
  primaryColor: string | null;
};

type JoinShellProps = {
  /** Null renders the neutral HonuVibe shell (invalid code / invalid invite). */
  partner: JoinPartnerBrand | null;
  overline: string;
  title: string;
  body?: string | null;
  children?: ReactNode;
};

/**
 * Partner-branded card that every /join entry page renders into.
 *
 * The partner accent is only applied when it clears WCAG AA non-text contrast
 * on BOTH themes (see lib/partners/contrast.ts); otherwise the card falls back
 * to the HonuVibe teal token, so a partner can never ship an unreadable page.
 */
export function JoinShell({ partner, overline, title, body, children }: JoinShellProps) {
  const accent = safeAccentColor(partner?.primaryColor) ?? 'var(--accent-teal)';

  return (
    <main className="flex min-h-screen items-center justify-center bg-bg-primary px-5 py-16 sm:px-6">
      <div className="w-full max-w-[600px]">
        <div
          className="rounded-xl border border-border-default bg-bg-secondary p-6 sm:p-8"
          style={{ borderTopColor: accent, borderTopWidth: '3px' }}
        >
          {partner?.logoUrl && (
            <Image
              src={partner.logoUrl}
              alt={partner.name}
              width={160}
              height={48}
              className="mb-6 h-12 w-auto object-contain object-left"
            />
          )}

          <p
            className="font-mono text-[11px] uppercase tracking-[0.18em]"
            style={{ color: accent }}
          >
            {overline}
          </p>

          <h1 className="mt-3 font-serif text-[clamp(26px,4vw,34px)] leading-tight text-fg-primary">
            {title}
          </h1>

          {body && (
            <p className="mt-4 text-[15px] leading-[1.7] text-fg-secondary">{body}</p>
          )}

          {children && <div className="mt-6 space-y-4">{children}</div>}
        </div>

        <p className="mt-4 text-center text-xs text-fg-tertiary">
          HonuVibe.AI
        </p>
      </div>
    </main>
  );
}
