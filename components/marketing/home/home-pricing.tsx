import { useLocale, useTranslations } from 'next-intl';
import { HvContainer, HvEyebrow, HvHeading, HvTierCard, HvTierGrid } from '@/components/marketing/hv';
import { apiHrefForLocale, NAV_CTA_HREF } from '@/components/marketing/nav/nav-cta';

type Props = {
  /** Design `showPrices`: hides the Vault's $99 (Community's "Free" always shows). */
  showPrices: boolean;
};

/** "Start free. Upgrade when you're ready.": Honu Community (free) and the Vault. */
export function HomePricing({ showPrices }: Props) {
  const t = useTranslations('home.pricing');
  const locale = useLocale();

  return (
    <section id="pricing" className="scroll-mt-[96px] pt-16 md:pt-20">
      <HvContainer>
        <div data-reveal className="flex flex-wrap items-end justify-between gap-5">
          <div>
            <HvEyebrow>{t('eyebrow')}</HvEyebrow>
            <HvHeading level="h2" className="mt-2.5 text-hv-green-900 [word-break:auto-phrase]">
              {t('heading')}
            </HvHeading>
          </div>
          <p className="max-w-[38ch] text-[16px] leading-[1.6] text-hv-ink-700">{t('note')}</p>
        </div>

        <HvTierGrid className="mt-7">
          <HvTierCard
            name={t('community.name')}
            tagline={t('community.tagline')}
            price={{ amount: t('community.price') }}
            features={t.raw('community.perks') as string[]}
            cta={{ label: t('community.cta'), href: NAV_CTA_HREF.get_started_free }}
            ctaVariant="amber"
          />
          <HvTierCard
            name={t('vault.name')}
            tagline={t('vault.tagline')}
            price={{ amount: t('vault.price'), unit: t('vault.unit') }}
            features={t.raw('vault.perks') as string[]}
            cta={{ label: t('vault.cta'), href: apiHrefForLocale(NAV_CTA_HREF.join_vault, locale) }}
            ctaVariant="outline-dark"
            popular
            showPrice={showPrices}
            revealDelay={120}
          />
        </HvTierGrid>
      </HvContainer>
    </section>
  );
}
