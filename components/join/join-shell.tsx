import Image from 'next/image';
import type { ReactNode } from 'react';
import { getLocale } from 'next-intl/server';
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
 * on BOTH the dark and light surfaces (see lib/partners/contrast.ts); otherwise
 * the card falls back to the HonuVibe teal token, so a partner can never ship
 * an unreadable page. Since this card is now light-only (below), that check is
 * stricter than this surface needs — a dark brand colour that reads fine on
 * white still falls back to teal. Conservative, never unreadable. Once Unit 2
 * lands `safeAccentColorOn(value, surfaces)`, switch this call to the
 * learn-zone surfaces so dark-branded partners keep their colour here too.
 *
 * Chrome: `data-shell="marketing" learn-zone` mirrors /learn/auth — the surface
 * a joiner lands on seconds later. Without it this page fell through to the
 * retired dark `:root` palette while every other surface renders light. The
 * legacy global Nav and HonuCompanion are suppressed for /join in
 * components/layout/conditional-nav.tsx and components/ocean/honu-companion.tsx.
 */
export async function JoinShell({ partner, overline, title, body, children }: JoinShellProps) {
  const accent = safeAccentColor(partner?.primaryColor) ?? 'var(--accent-teal)';
  const locale = await getLocale();

  // DM Serif Display carries no Japanese glyphs, so `font-serif` renders a JP
  // heading in two fonts — Latin in DM Serif, kana/kanji in whatever serif the
  // OS falls back to. CLAUDE.md's JP rule: use a Noto Sans JP weight contrast
  // instead of the editorial serif.
  const headingFont =
    locale === 'ja'
      ? 'font-[family-name:var(--font-noto-sans-jp)] font-medium tracking-[0.02em]'
      : 'font-serif';

  return (
    <main
      data-shell="marketing"
      className="learn-zone flex min-h-screen items-center justify-center bg-bg-primary px-5 py-16 sm:px-6"
    >
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

          <h1
            className={`mt-3 ${headingFont} text-[clamp(26px,4vw,34px)] leading-tight text-fg-primary`}
          >
            {title}
          </h1>

          {body && (
            <p
              className={`mt-4 text-[15px] leading-[1.7] text-fg-secondary${
                locale === 'ja' ? ' tracking-[0.03em]' : ''
              }`}
            >
              {body}
            </p>
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
