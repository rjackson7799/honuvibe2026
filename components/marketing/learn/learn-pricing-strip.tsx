import { useLocale, useTranslations } from 'next-intl';
import { HvButton, HvCtaBand, HvSection } from '@/components/marketing/hv';
import { apiHrefForLocale, NAV_CTA_HREF } from '@/components/marketing/nav/nav-cta';

type Props = {
  /** The free feature lesson, or /signup when there is none. */
  freeHref: string;
  /** Picks the amber label: "Try a free lesson" vs "Get started free". */
  hasFreeLesson: boolean;
};

/** Closing band: the design's amber CTA plus "Join the Vault" (D7). */
export function LearnPricingStrip({ freeHref, hasFreeLesson }: Props) {
  const t = useTranslations('learn_catalog.pricing');
  const locale = useLocale();

  return (
    <HvSection id="pricing" spacing="tight">
      <HvCtaBand
        title={t('title')}
        body={t('body')}
        actions={
          <>
            <HvButton href={freeHref} variant="amber" size="md" arrow>
              {hasFreeLesson ? t('cta_free') : t('cta_signup')}
            </HvButton>
            <HvButton href={apiHrefForLocale(NAV_CTA_HREF.join_vault, locale)} variant="outline" size="md">
              {t('cta_vault')}
            </HvButton>
          </>
        }
      />
    </HvSection>
  );
}
