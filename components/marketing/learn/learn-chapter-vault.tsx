import { useTranslations } from 'next-intl';
import { Check } from 'lucide-react';
import { Button, Container, Section } from '@/components/marketing/primitives';
import { cn } from '@/lib/utils';
import type { VaultContentItem } from '@/lib/vault/types';
import { LearnVaultSample } from './learn-vault-sample';
import { LearnVaultPreview } from './learn-vault-preview';

type LearnChapterVaultProps = {
  locale: string;
  vaultSample?: VaultContentItem[];
  vaultTotalCount?: number;
};

export function LearnChapterVault({
  locale,
  vaultSample = [],
  vaultTotalCount = 0,
}: LearnChapterVaultProps) {
  const t = useTranslations('learn.chapter_vault');

  return (
    <Section variant="canvas" id="vault" className="learn-chapter scroll-mt-24">
      <Container>
        <ChapterHeader number={t('number')} title={t('title')} />

        <p
          className="mt-6 max-w-[640px] font-serif italic leading-[1.3] tracking-[-0.01em] text-[var(--m-ink-primary)]"
          style={{ fontSize: 'clamp(22px, 2.4vw, 30px)' }}
        >
          {t('intro')}
        </p>

        <div className="mx-auto mt-14 grid max-w-[1120px] items-start gap-6 md:grid-cols-3">
          <PricingCard
            title={t('community.title')}
            subtitle={t('community.subtitle')}
            tagline={t('community.tagline')}
            bestFor={t('community.best_for')}
            price={t('community.price')}
            priceUnit={t('community.price_unit')}
            priceNote={t('community.price_note')}
            bullets={[
              t('community.bullet_1'),
              t('community.bullet_2'),
              t('community.bullet_3'),
              t('community.bullet_4'),
            ]}
            cta={t('community.cta')}
            // Plain anchor (no next/link) — /api/stripe/subscribe is side-effectful
            // (creates Stripe Customer + Checkout Session). next/link would prefetch
            // and create ghost sessions on hover/viewport.
            ctaHref={`/api/stripe/subscribe?tier=community${locale === 'ja' ? '&locale=ja' : ''}`}
          />
          <PricingCard
            recommended
            recommendedLabel={t('recommended_label')}
            includesLabel={t('includes_label')}
            title={t('vault.title')}
            subtitle={t('vault.subtitle')}
            tagline={t('vault.tagline')}
            bestFor={t('vault.best_for')}
            price={t('vault.price')}
            priceUnit={t('vault.price_unit')}
            priceNote={t('vault.price_note')}
            bullets={[
              t('vault.bullet_1', { count: vaultTotalCount }),
              t('vault.bullet_2'),
              t('vault.bullet_3'),
              t('vault.bullet_4'),
            ]}
            cta={t('vault.cta')}
            // Plain anchor (no next/link) — /api/stripe/subscribe is side-effectful
            // (creates Stripe Customer + Checkout Session). next/link would prefetch
            // and create ghost sessions on hover/viewport.
            ctaHref={`/api/stripe/subscribe?tier=vault${locale === 'ja' ? '&locale=ja' : ''}`}
          />
          <PricingCard
            variant="coral"
            title={t('cohorts.title')}
            subtitle={t('cohorts.subtitle')}
            tagline={t('cohorts.tagline')}
            bestFor={t('cohorts.best_for')}
            price={t('cohorts.price')}
            priceUnit={t('cohorts.price_unit')}
            priceNote={t('cohorts.price_note')}
            bullets={[
              t('cohorts.bullet_1'),
              t('cohorts.bullet_2'),
              t('cohorts.bullet_3'),
            ]}
            cta={t('cohorts.cta')}
            // In-page anchor to the live-cohort catalog below — cohorts enroll
            // per-course, not via the subscription checkout.
            ctaHref="#courses"
          />
        </div>

        <LearnVaultPreview
          items={vaultSample}
          totalCount={vaultTotalCount}
          locale={locale}
        />

        <LearnVaultSample />
      </Container>
    </Section>
  );
}

type PricingCardProps = {
  recommended?: boolean;
  recommendedLabel?: string;
  includesLabel?: string;
  variant?: 'teal' | 'coral';
  title: string;
  subtitle: string;
  tagline: string;
  bestFor: string;
  price: string;
  priceUnit: string;
  priceNote: string;
  bullets: string[];
  cta: string;
  ctaHref: string;
};

function PricingCard({
  recommended,
  recommendedLabel,
  includesLabel,
  variant = 'teal',
  title,
  subtitle,
  tagline,
  bestFor,
  price,
  priceUnit,
  priceNote,
  bullets,
  cta,
  ctaHref,
}: PricingCardProps) {
  const accent = variant === 'coral' ? 'var(--m-accent-coral)' : 'var(--m-accent-teal)';
  return (
    <article
      className={cn(
        'relative flex flex-col rounded-2xl bg-[var(--m-white)] p-8',
        recommended
          ? 'border-[1.5px] border-[var(--m-accent-teal)] shadow-[0_10px_40px_rgba(15,169,160,0.12)]'
          : 'border border-[var(--m-border-soft)] shadow-[var(--m-shadow-xs)]',
      )}
    >
      {recommended && recommendedLabel && (
        <span className="absolute -top-3 left-1/2 -translate-x-1/2 whitespace-nowrap rounded-full bg-[var(--m-accent-teal)] px-4 py-1 text-[11px] font-bold uppercase tracking-[0.08em] text-white">
          ★ {recommendedLabel}
        </span>
      )}

      <h3 className="text-[24px] font-bold leading-tight tracking-[-0.01em] text-[var(--m-ink-primary)]">
        {title}
      </h3>
      <p className="mt-1 text-[14px] italic text-[var(--m-ink-secondary)]">
        {subtitle}
      </p>

      <p
        className="mt-6 font-serif italic leading-[1.3] tracking-[-0.005em] text-[var(--m-ink-primary)]"
        style={{ fontSize: 'clamp(18px, 1.8vw, 22px)' }}
      >
        {tagline}
      </p>

      <div className="mt-6 flex items-baseline gap-1.5">
        <span className="text-[44px] font-bold leading-none tracking-[-0.02em] text-[var(--m-ink-primary)]">
          {price}
        </span>
        <span className="text-[16px] font-medium text-[var(--m-ink-secondary)]">
          {priceUnit}
        </span>
      </div>
      <p className="mt-2 text-[13px] text-[var(--m-ink-secondary)]">
        {priceNote}
      </p>

      <p
        className="mt-3 text-[12.5px] font-semibold leading-snug"
        style={{ color: accent }}
      >
        {bestFor}
      </p>

      <div className="my-6 border-t border-[var(--m-border-soft)]" />

      {recommended && includesLabel && (
        <div className="mb-5 flex items-center gap-2.5 rounded-[10px] border border-[var(--m-accent-teal)]/30 bg-[var(--m-accent-teal-soft)] px-4 py-3">
          <Check
            size={16}
            strokeWidth={2.5}
            className="shrink-0 text-[var(--m-accent-teal)]"
          />
          <span className="text-[13px] font-bold uppercase tracking-[0.06em] text-[var(--m-accent-teal)]">
            {includesLabel}
          </span>
        </div>
      )}

      <ul className="list-none space-y-3 p-0">
        {bullets.map((line) => (
          <li
            key={line}
            className="flex items-start gap-3 text-[14.5px] leading-[1.55] text-[var(--m-ink-secondary)]"
          >
            <Check
              size={15}
              strokeWidth={2}
              className="mt-1 shrink-0"
              style={{ color: accent }}
            />
            <span>{line}</span>
          </li>
        ))}
      </ul>

      <div className="mt-auto pt-7">
        <Button
          href={ctaHref}
          variant={variant === 'coral' ? 'primary-coral' : 'primary-teal'}
          withArrow
          className="w-full"
        >
          {cta}
        </Button>
      </div>
    </article>
  );
}

function ChapterHeader({
  number,
  title,
}: {
  number: string;
  title: string;
}) {
  return (
    <div className="flex flex-wrap items-end gap-6">
      <span
        className="font-serif leading-none text-[var(--m-accent-teal)]/30"
        style={{
          fontSize: 'clamp(96px, 12vw, 160px)',
          letterSpacing: '-0.04em',
        }}
        aria-hidden
      >
        {number}
      </span>
      <div className="flex-1 min-w-0">
        <h2
          className="font-bold leading-[1.05] tracking-[-0.02em] text-[var(--m-ink-primary)]"
          style={{ fontSize: 'clamp(36px, 4.5vw, 56px)' }}
        >
          {title}
        </h2>
      </div>
    </div>
  );
}
