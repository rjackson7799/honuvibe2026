import { setRequestLocale, getTranslations } from 'next-intl/server';
import { MarketingShell } from '@/components/marketing/shell';
import { MarketingNav } from '@/components/marketing/nav/marketing-nav';
import { MarketingFooter } from '@/components/marketing/footer/marketing-footer';
import { MarketingNewsletter } from '@/components/marketing/newsletter/marketing-newsletter';
import {
  HvBreadcrumb,
  HvButton,
  HvContainer,
  HvEyebrow,
  HvHeading,
  HvPill,
  HvRotatingWord,
} from '@/components/marketing/hv';
import { STUDIO_URL } from '@/lib/constants/urls';

type Props = {
  params: Promise<{ locale: string }>;
};

export async function generateMetadata({ params }: Props) {
  const { locale } = await params;
  const t = await getTranslations({ locale, namespace: 'build_holding' });
  return {
    title: t('meta_title'),
    description: t('meta_description'),
  };
}

/**
 * Holding /build page (redesign Unit 0B): the design's Build hero plus a
 * hand-off to the existing Studio brief, so the Learn · Build · Partner nav and
 * footer resolve. Prices wait for the Studio pricing re-key (B4); Unit 3
 * replaces this page with the full Build design.
 */
export default async function BuildPage({ params }: Props) {
  const { locale } = await params;
  setRequestLocale(locale);
  const t = await getTranslations({ locale, namespace: 'build_holding' });
  const rotator = t.raw('rotator') as string[];
  const chips = t.raw('chips') as string[];
  const briefHref = `${STUDIO_URL}/contact`;

  return (
    <MarketingShell theme="hv">
      <MarketingNav cta="start_project" />
      <main>
        <section className="bg-hv-green-900 pb-[60px] pt-[108px] text-hv-sand-100">
          <HvContainer className="grid items-center gap-11 [grid-template-columns:repeat(auto-fit,minmax(min(100%,460px),1fr))]">
            <div>
              <HvBreadcrumb
                tone="dark"
                ariaLabel={t('breadcrumb_label')}
                items={[{ label: t('breadcrumb_home'), href: '/' }, { label: t('breadcrumb_current') }]}
              />
              <HvHeading level="h1-lg" className="mt-[18px]">
                {t('headline')}
              </HvHeading>
              <p className="mt-4 min-h-[2.4em] font-hv-display text-[clamp(20px,2.2vw,28px)] font-semibold leading-[1.2] tracking-[-0.02em] text-hv-green-200">
                {t('rotator_prefix')} <HvRotatingWord items={rotator} interval={4800} />
              </p>
              <p className="mt-3 max-w-[50ch] text-[17px] leading-[1.6] text-hv-green-200">{t('lead')}</p>
              <div className="mt-7 flex flex-wrap gap-3">
                <HvButton href={briefHref} variant="amber" size="hero" arrow>
                  {t('cta_brief')}
                </HvButton>
                <HvButton href={`${STUDIO_URL}/work`} variant="outline-dark" size="hero">
                  {t('cta_work')}
                </HvButton>
              </div>
              <div className="mt-[18px] flex flex-wrap items-center gap-2">
                <HvEyebrow tone="amber" dot className="mr-1">
                  {t('we_build')}
                </HvEyebrow>
                {chips.map((chip) => (
                  <HvPill key={chip} tone="outline-dark">
                    {chip}
                  </HvPill>
                ))}
              </div>
            </div>

            <div
              id="brief"
              className="scroll-mt-[96px] rounded-[16px] bg-hv-sand-100 p-7 text-hv-ink shadow-hv-panel md:p-9"
            >
              <HvEyebrow>{t('brief_eyebrow')}</HvEyebrow>
              <HvHeading level="panel" className="mt-3 text-hv-green-900">
                {t('brief_heading')}
              </HvHeading>
              <p className="mt-3 max-w-[44ch] text-[16px] leading-[1.6] text-hv-ink-700">{t('brief_body')}</p>
              <HvButton href={briefHref} variant="dark" size="md" arrow className="mt-6">
                {t('brief_cta')}
              </HvButton>
            </div>
          </HvContainer>
        </section>
      </main>
      <MarketingNewsletter source="build" />
      <MarketingFooter />
    </MarketingShell>
  );
}
