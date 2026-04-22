import { setRequestLocale, getTranslations } from 'next-intl/server';
import type { Metadata } from 'next';
import { Container } from '@/components/layout/container';
import { Section } from '@/components/layout/section';
import { InstructorApplicationForm } from '@/components/forms/InstructorApplicationForm';

type Props = {
  params: Promise<{ locale: string }>;
};

export async function generateMetadata({ params }: Props): Promise<Metadata> {
  const { locale } = await params;
  const t = await getTranslations({ locale, namespace: 'instructor_apply' });

  return {
    title: t('meta_title'),
    description: t('meta_description'),
    alternates: {
      canonical: `https://honuvibe.ai${locale === 'ja' ? '/ja' : ''}/become-an-instructor`,
      languages: {
        en: 'https://honuvibe.ai/become-an-instructor',
        ja: 'https://honuvibe.ai/ja/become-an-instructor',
      },
    },
    openGraph: {
      title: t('meta_title'),
      description: t('meta_description'),
      url: `https://honuvibe.ai${locale === 'ja' ? '/ja' : ''}/become-an-instructor`,
      type: 'website',
    },
  };
}

export default async function BecomeAnInstructorPage({ params }: Props) {
  const { locale } = await params;
  setRequestLocale(locale);

  const t = await getTranslations({ locale, namespace: 'instructor_apply' });

  const whyItems = [
    { key: 'revenue' as const },
    { key: 'quality' as const },
    { key: 'support' as const },
    { key: 'community' as const },
  ];

  const processSteps = ['step1', 'step2', 'step3', 'step4'] as const;

  return (
    <>
      {/* Hero */}
      <div className="relative overflow-hidden">
        <div className="absolute inset-0 bg-gradient-to-br from-accent-teal/10 via-bg-primary to-accent-gold/5" />
        <div className="absolute inset-0 z-0 pointer-events-none overflow-hidden" aria-hidden="true">
          <div
            className="glow-orb"
            style={{
              width: '400px',
              height: '400px',
              top: '-5%',
              right: '-3%',
              background: 'var(--glow-teal)',
              opacity: 0.18,
            }}
          />
        </div>

        <Section className="relative z-10">
          <Container className="max-w-[880px] text-center space-y-5 py-12 md:py-20">
            <p className="text-xs uppercase tracking-[0.18em] text-accent-teal font-semibold">
              {t('hero_overline')}
            </p>
            <h1 className="text-4xl md:text-6xl font-serif text-fg-primary leading-tight">
              {t('hero_headline')}
            </h1>
            <p className="text-base md:text-lg text-fg-secondary max-w-2xl mx-auto leading-relaxed">
              {t('hero_sub')}
            </p>
            <div className="pt-2">
              <a
                href="#apply"
                className="inline-flex items-center gap-2 px-6 py-3 rounded-lg bg-accent-teal text-white font-medium hover:bg-accent-teal/90 transition-colors"
              >
                {t('form.submit')} →
              </a>
            </div>
          </Container>
        </Section>
      </div>

      {/* Why teach with us */}
      <Section>
        <Container className="max-w-[1100px] space-y-10">
          <div className="text-center space-y-2 max-w-xl mx-auto">
            <p className="text-xs uppercase tracking-[0.18em] text-accent-teal font-semibold">
              {t('why_overline')}
            </p>
            <h2 className="text-3xl md:text-4xl font-serif text-fg-primary">
              {t('why_heading')}
            </h2>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-5">
            {whyItems.map((item) => (
              <div
                key={item.key}
                className="rounded-xl border border-border-default bg-bg-secondary p-6 space-y-2 hover:border-accent-teal/40 transition-colors"
              >
                <h3 className="text-lg font-serif text-fg-primary">
                  {t(`why_items.${item.key}.title`)}
                </h3>
                <p className="text-sm text-fg-secondary leading-relaxed">
                  {t(`why_items.${item.key}.description`)}
                </p>
              </div>
            ))}
          </div>
        </Container>
      </Section>

      {/* Process */}
      <Section className="bg-bg-secondary/40">
        <Container className="max-w-[1100px] space-y-10">
          <div className="text-center space-y-2 max-w-xl mx-auto">
            <p className="text-xs uppercase tracking-[0.18em] text-accent-teal font-semibold">
              {t('process_overline')}
            </p>
            <h2 className="text-3xl md:text-4xl font-serif text-fg-primary">
              {t('process_heading')}
            </h2>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-5">
            {processSteps.map((step) => (
              <div key={step} className="space-y-2">
                <h3 className="text-base font-semibold text-accent-teal">
                  {t(`process_steps.${step}.title`)}
                </h3>
                <p className="text-sm text-fg-secondary leading-relaxed">
                  {t(`process_steps.${step}.description`)}
                </p>
              </div>
            ))}
          </div>
        </Container>
      </Section>

      {/* Form */}
      <Section id="apply">
        <Container className="max-w-[760px]">
          <InstructorApplicationForm />
        </Container>
      </Section>
    </>
  );
}
