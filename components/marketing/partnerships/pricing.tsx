import { useTranslations } from 'next-intl';
import { Check } from 'lucide-react';
import {
  Container,
  Overline,
  Section,
  SectionHeading,
} from '@/components/marketing/primitives';
import { cn } from '@/lib/utils';

type Tier = {
  key: 'starter' | 'full' | 'enterprise';
  highlight: boolean;
  ctaKey: 'cta_apply' | 'cta_enterprise';
};

const TIERS: ReadonlyArray<Tier> = [
  { key: 'starter', highlight: false, ctaKey: 'cta_apply' },
  { key: 'full', highlight: true, ctaKey: 'cta_apply' },
  { key: 'enterprise', highlight: false, ctaKey: 'cta_enterprise' },
];

export function PartnershipsPricing() {
  const t = useTranslations('partnerships.pricing');

  return (
    <Section variant="sand">
      <Container>
        <div className="mb-12 max-w-[480px] md:mb-14">
          <Overline tone="teal" className="mb-3.5 inline-block">
            {t('overline')}
          </Overline>
          <SectionHeading>{t('headline')}</SectionHeading>
        </div>
        <div className="mb-7 grid grid-cols-1 gap-5 md:grid-cols-3">
          {TIERS.map((tier) => (
            <PricingCard key={tier.key} tier={tier} />
          ))}
        </div>
        <p className="max-w-[600px] text-[13.5px] italic text-[var(--m-ink-tertiary)]">
          {t('footnote')}
        </p>
      </Container>
    </Section>
  );
}

function PricingCard({ tier }: { tier: Tier }) {
  const t = useTranslations('partnerships.pricing');
  const includesKeys = [
    `${tier.key}_includes_1`,
    `${tier.key}_includes_2`,
    `${tier.key}_includes_3`,
    `${tier.key}_includes_4`,
  ] as const;
  const isHighlight = tier.highlight;

  return (
    <div
      className={cn(
        'relative rounded-2xl px-8 py-9 transition-all duration-200',
        isHighlight
          ? 'bg-[var(--m-ink-primary)] text-white shadow-[0_16px_48px_rgba(26,43,51,0.2)] md:scale-[1.025]'
          : 'border border-[rgba(26,43,51,0.09)] bg-[var(--m-white)] shadow-[var(--m-shadow-xs)] hover:border-[var(--m-border-teal)] hover:shadow-[var(--m-shadow-md)]',
      )}
    >
      {isHighlight && (
        <div
          aria-hidden
          className="absolute inset-x-0 -top-px h-1 rounded-t-2xl bg-[var(--m-accent-teal)]"
        />
      )}
      <p
        className={cn(
          'mb-2.5 text-[11px] font-bold uppercase tracking-[0.08em]',
          isHighlight ? 'text-white/50' : 'text-[var(--m-ink-tertiary)]',
        )}
      >
        {t(`${tier.key}_name`)}
      </p>
      <p
        className={cn(
          'mb-6 text-[14px] leading-[1.6]',
          isHighlight ? 'text-white/65' : 'text-[var(--m-ink-secondary)]',
        )}
      >
        {t(`${tier.key}_desc`)}
      </p>
      <div className="mb-7">
        <span
          className={cn(
            'text-[11px]',
            isHighlight ? 'text-white/45' : 'text-[var(--m-ink-tertiary)]',
          )}
        >
          {t(`${tier.key}_price_note`)}&nbsp;
        </span>
        <span
          className={cn(
            'text-[38px] font-bold tracking-[-0.03em]',
            isHighlight ? 'text-white' : 'text-[var(--m-ink-primary)]',
          )}
        >
          {t(`${tier.key}_price`)}
        </span>
      </div>
      <ul
        className={cn(
          'mb-7 flex flex-col gap-2.5 border-t pt-5',
          isHighlight ? 'border-white/10' : 'border-[rgba(26,43,51,0.07)]',
        )}
      >
        {includesKeys.map((k) => (
          <li key={k} className="flex items-center gap-2.5">
            <span
              className={cn(
                'flex h-3.5 w-3.5 items-center justify-center rounded-full',
                isHighlight
                  ? 'bg-[rgba(15,169,160,0.3)]'
                  : 'bg-[rgba(15,169,160,0.12)]',
              )}
            >
              <Check
                size={10}
                strokeWidth={2.5}
                className="text-[var(--m-accent-teal)]"
              />
            </span>
            <span
              className={cn(
                'text-[13.5px]',
                isHighlight ? 'text-white/80' : 'text-[var(--m-ink-secondary)]',
              )}
            >
              {t(k)}
            </span>
          </li>
        ))}
      </ul>
      {tier.ctaKey === 'cta_apply' ? (
        <a
          href="#apply"
          className={cn(
            'block rounded-lg px-3 py-3.5 text-center text-[14.5px] font-bold transition-colors',
            isHighlight
              ? 'bg-[var(--m-accent-coral)] text-white hover:bg-[var(--m-accent-coral-dark)]'
              : 'bg-[var(--m-accent-teal)] text-white hover:bg-[var(--m-accent-teal-dark)]',
          )}
        >
          {t(tier.ctaKey)}
        </a>
      ) : (
        <a
          href="#apply"
          className="block rounded-lg border-[1.5px] border-[rgba(15,169,160,0.4)] px-3 py-3 text-center text-[14.5px] font-bold text-[var(--m-accent-teal)] transition-colors hover:bg-[var(--m-accent-teal-soft)]"
        >
          {t(tier.ctaKey)} →
        </a>
      )}
    </div>
  );
}
