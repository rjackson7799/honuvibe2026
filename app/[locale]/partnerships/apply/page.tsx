import { setRequestLocale, getTranslations } from 'next-intl/server';
import { MarketingShell } from '@/components/marketing/shell';
import { MarketingNav } from '@/components/marketing/nav/marketing-nav';
import { MarketingFooter } from '@/components/marketing/footer/marketing-footer';
import { MarketingNewsletter } from '@/components/marketing/newsletter/marketing-newsletter';
import { PartnershipsApplicationForm } from '@/components/marketing/partnerships';
import { Container, Section } from '@/components/marketing/primitives';
import { ArrowLeft } from 'lucide-react';

type Props = {
  params: Promise<{ locale: string }>;
  searchParams: Promise<{ type?: string }>;
};

const ENGAGEMENT_TYPES = new Set(['cohort', 'project', 'consulting']);

export async function generateMetadata({ params }: Props) {
  const { locale } = await params;
  const t = await getTranslations({ locale, namespace: 'partnerships.meta' });
  return {
    title: `Apply — ${t('title')}`,
    description: t('description'),
  };
}

export default async function PartnershipsApplyPage({ params, searchParams }: Props) {
  const { locale } = await params;
  const { type } = await searchParams;
  setRequestLocale(locale);

  const engagement = type && ENGAGEMENT_TYPES.has(type) ? type : null;
  const t = await getTranslations({ locale, namespace: 'partnerships.apply' });

  return (
    <MarketingShell>
      <MarketingNav />
      <main>
        <Section variant="navy" spacing="hero">
          <Container>
            <a
              href="/partnerships"
              className="mb-8 inline-flex items-center gap-2 font-mono text-[11px] uppercase tracking-[0.16em] text-white/70 transition-colors hover:text-white"
            >
              <ArrowLeft size={13} strokeWidth={2} />
              {t('back_link')}
            </a>
            <p className="font-mono text-[10.5px] uppercase tracking-[0.18em] text-[var(--m-accent-teal)]">
              {t('overline')}
            </p>
            <h1
              className="mt-3 font-serif italic leading-[0.95] tracking-[-0.02em] text-white"
              style={{ fontSize: 'clamp(56px, 8vw, 104px)' }}
            >
              {t('headline')}
            </h1>
            <p className="mt-6 max-w-[58ch] text-[17px] leading-[1.7] text-white/85">
              {t('lede')}
            </p>
            {engagement && (
              <div className="mt-8 inline-flex items-center gap-2 rounded-full border border-[var(--m-accent-teal)] bg-[rgba(15,169,160,0.12)] px-4 py-2">
                <span className="font-mono text-[10.5px] uppercase tracking-[0.14em] text-[var(--m-accent-teal)]">
                  {t('overline')}
                </span>
                <span className="text-[14px] font-semibold text-white">
                  {t(`type_label_${engagement}`)}
                </span>
              </div>
            )}
          </Container>
        </Section>
        <PartnershipsApplicationForm />
      </main>
      <MarketingNewsletter />
      <MarketingFooter />
    </MarketingShell>
  );
}
