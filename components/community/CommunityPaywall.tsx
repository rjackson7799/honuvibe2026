'use client';

import { useEffect } from 'react';
import Link from 'next/link';
import { usePathname } from 'next/navigation';
import { useLocale, useTranslations } from 'next-intl';
import { Users, Sparkles, Check } from 'lucide-react';
import {
  trackCommunityPaywallCtaClicked,
  trackCommunityPaywallViewed,
} from '@/lib/analytics';

export function CommunityPaywall() {
  const t = useTranslations('community');
  const tTiers = useTranslations('learn.chapter_vault');
  const locale = useLocale();
  const pathname = usePathname();

  useEffect(() => {
    trackCommunityPaywallViewed({ referrer_path: pathname ?? '' });
  }, [pathname]);

  const localeSuffix = locale === 'ja' ? '&locale=ja' : '';
  const communityBullets = t.raw('paywall_inline.community_bullets') as string[];
  const vaultBullets = t.raw('paywall_inline.vault_bullets') as string[];

  return (
    <div className="max-w-[640px] mx-auto py-12">
      <div className="text-center mb-10">
        <div className="w-16 h-16 mx-auto mb-4 rounded-full bg-[color:var(--accent-teal-subtle)] text-[color:var(--accent-teal)] flex items-center justify-center">
          <Users size={28} />
        </div>
        <h1 className="text-[clamp(24px,3vw,32px)] font-bold text-fg-primary tracking-[-0.02em] mb-2">
          {t('paywall_title')}
        </h1>
        <p className="text-fg-secondary text-base">{t('paywall_subtitle')}</p>
      </div>

      <div className="grid gap-4 md:grid-cols-2">
        <TierCard
          icon={<Users size={20} />}
          title={t('paywall_cta_community').replace('Subscribe — ', '')}
          price={tTiers('community.price')}
          priceUnit={tTiers('community.price_unit')}
          priceNote={tTiers('community.price_note')}
          bullets={communityBullets}
          cta={tTiers('community.cta')}
          href={`/api/stripe/subscribe?tier=community${localeSuffix}`}
          onClick={() => trackCommunityPaywallCtaClicked({ cta: 'community_tier' })}
          accent={false}
        />
        <TierCard
          icon={<Sparkles size={20} />}
          title={t('paywall_cta_vault').replace('Subscribe — ', '')}
          price={tTiers('vault.price')}
          priceUnit={tTiers('vault.price_unit')}
          priceNote={tTiers('vault.price_note')}
          bullets={vaultBullets}
          cta={tTiers('vault.cta')}
          href={`/api/stripe/subscribe?tier=vault${localeSuffix}`}
          onClick={() => trackCommunityPaywallCtaClicked({ cta: 'vault_tier' })}
          accent
        />
      </div>

      <p className="mt-8 text-center text-sm text-fg-secondary">
        {t('paywall_inline.browse_courses_hint')}{' '}
        <Link
          href="/learn"
          onClick={() => trackCommunityPaywallCtaClicked({ cta: 'courses' })}
          className="text-[color:var(--accent-teal)] font-semibold hover:underline"
        >
          {t('paywall_cta_courses')} →
        </Link>
      </p>
    </div>
  );
}

type TierCardProps = {
  icon: React.ReactNode;
  title: string;
  price: string;
  priceUnit: string;
  priceNote: string;
  bullets: string[];
  cta: string;
  href: string;
  onClick: () => void;
  accent: boolean;
};

function TierCard({
  icon,
  title,
  price,
  priceUnit,
  priceNote,
  bullets,
  cta,
  href,
  onClick,
  accent,
}: TierCardProps) {
  return (
    <article
      className={
        accent
          ? 'rounded-[14px] border-[1.5px] border-[color:var(--accent-teal)] bg-bg-primary p-5 shadow-sm'
          : 'rounded-[14px] border border-border-default bg-bg-primary p-5'
      }
    >
      <div className="flex items-center gap-2 text-[color:var(--accent-teal)]">
        {icon}
        <h2 className="text-lg font-bold text-fg-primary">{title}</h2>
      </div>
      <div className="mt-3 flex items-baseline gap-1">
        <span className="text-[32px] font-bold tracking-[-0.02em] text-fg-primary">
          {price}
        </span>
        <span className="text-sm text-fg-secondary">{priceUnit}</span>
      </div>
      <p className="mt-1 text-[12.5px] text-fg-secondary">{priceNote}</p>

      <ul className="mt-4 space-y-2">
        {bullets.map((b) => (
          <li
            key={b}
            className="flex items-start gap-2 text-[13.5px] leading-snug text-fg-secondary"
          >
            <Check
              size={14}
              strokeWidth={2.5}
              className="mt-[3px] shrink-0 text-[color:var(--accent-teal)]"
            />
            <span>{b}</span>
          </li>
        ))}
      </ul>

      {/* Plain <a>, NOT next/link — /api/stripe/subscribe is side-effectful
          (creates Stripe Customer + Checkout Session). next/link would prefetch
          and create ghost sessions on hover/viewport. */}
      <a
        href={href}
        onClick={onClick}
        className={
          accent
            ? 'mt-5 flex items-center justify-center gap-2 rounded-[10px] bg-[color:var(--accent-teal)] px-4 py-3 text-sm font-semibold text-white hover:bg-[color:var(--accent-teal-hover)] transition-colors'
            : 'mt-5 flex items-center justify-center gap-2 rounded-[10px] border border-border-default bg-bg-secondary px-4 py-3 text-sm font-semibold text-fg-primary hover:border-border-hover transition-colors'
        }
      >
        {cta} <span aria-hidden>→</span>
      </a>
    </article>
  );
}
