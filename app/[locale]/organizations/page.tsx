import { setRequestLocale, getTranslations } from 'next-intl/server';
import { Check } from 'lucide-react';
import { MarketingShell } from '@/components/marketing/shell';
import { MarketingNav } from '@/components/marketing/nav/marketing-nav';
import { MarketingFooter } from '@/components/marketing/footer/marketing-footer';
import { MarketingNewsletter } from '@/components/marketing/newsletter/marketing-newsletter';
import { Section, Container } from '@/components/marketing/primitives';
import { Button } from '@/components/marketing/primitives/button';
import { OrganizationsForm } from '@/components/marketing/organizations/organizations-form';

type Props = {
  params: Promise<{ locale: string }>;
};

export async function generateMetadata({ params }: Props) {
  const { locale } = await params;
  const t = await getTranslations({ locale, namespace: 'organizations.meta' });
  return { title: t('title'), description: t('description') };
}

export default async function OrganizationsPage({ params }: Props) {
  const { locale } = await params;
  setRequestLocale(locale);
  const t = await getTranslations('organizations');

  const audienceBullets = t.raw('audience.bullets') as string[];
  const deliveryPoints = t.raw('delivery.points') as string[];

  return (
    <MarketingShell>
      <MarketingNav />
      <main>
        {/* Hero — editorial voice for a narrative B2B page */}
        <Section className="pt-16 md:pt-24">
          <Container>
            <div className="max-w-[760px]">
              <p className="mb-4 text-[11px] font-semibold uppercase tracking-[0.18em] text-[var(--m-accent-teal)]">
                {t('hero.overline')}
              </p>
              <h1 className="font-serif text-[clamp(34px,5vw,56px)] font-normal italic leading-[1.04] text-[var(--m-ink-primary)]">
                {t('hero.headline')}
              </h1>
              <p className="mt-6 text-[18px] leading-[1.65] text-[var(--m-ink-secondary)]">
                {t('hero.subhead')}
              </p>
              <div className="mt-8">
                <Button href="#inquiry" variant="primary-teal" withArrow>
                  {t('hero.cta')}
                </Button>
              </div>
            </div>
          </Container>
        </Section>

        {/* Who it's for */}
        <Section variant="sand">
          <Container>
            <h2 className="mb-8 font-serif text-[clamp(24px,3vw,34px)] font-normal text-[var(--m-ink-primary)]">
              {t('audience.heading')}
            </h2>
            <ul className="grid gap-4 sm:grid-cols-2">
              {audienceBullets.map((b) => (
                <li key={b} className="flex items-start gap-3">
                  <Check size={20} className="mt-0.5 shrink-0 text-[var(--m-accent-teal)]" />
                  <span className="text-[16px] leading-[1.6] text-[var(--m-ink-secondary)]">{b}</span>
                </li>
              ))}
            </ul>
          </Container>
        </Section>

        {/* What teams get */}
        <Section>
          <Container>
            <div className="max-w-[720px]">
              <h2 className="mb-4 font-serif text-[clamp(24px,3vw,34px)] font-normal text-[var(--m-ink-primary)]">
                {t('delivery.heading')}
              </h2>
              <p className="mb-8 text-[17px] leading-[1.65] text-[var(--m-ink-secondary)]">
                {t('delivery.body')}
              </p>
            </div>
            <ul className="grid gap-4 md:grid-cols-2">
              {deliveryPoints.map((p) => (
                <li
                  key={p}
                  className="rounded-[14px] border border-[var(--m-border)] bg-[var(--m-white)] p-5 text-[15.5px] leading-[1.55] text-[var(--m-ink-secondary)]"
                >
                  {p}
                </li>
              ))}
            </ul>
          </Container>
        </Section>

        {/* Proof callout */}
        <Section variant="sand">
          <Container>
            <div className="mx-auto max-w-[680px] text-center">
              <h2 className="mb-3 font-serif text-[clamp(22px,2.6vw,30px)] font-normal text-[var(--m-ink-primary)]">
                {t('proof.heading')}
              </h2>
              <p className="mb-6 text-[16.5px] leading-[1.65] text-[var(--m-ink-secondary)]">
                {t('proof.body')}
              </p>
              <Button href="/partnerships" variant="outline-teal">
                {t('proof.cta')}
              </Button>
            </div>
          </Container>
        </Section>

        {/* Inquiry form */}
        <Section id="inquiry">
          <Container>
            <div className="mx-auto max-w-[640px]">
              <h2 className="mb-2 font-serif text-[clamp(24px,3vw,34px)] font-normal text-[var(--m-ink-primary)]">
                {t('form.heading')}
              </h2>
              <p className="mb-8 text-[16px] leading-[1.6] text-[var(--m-ink-secondary)]">
                {t('form.subhead')}
              </p>
              <OrganizationsForm />
              <p className="mt-6 text-[13.5px] text-[var(--m-ink-tertiary)]">
                {t('form.helper_pre')}{' '}
                <a href="/learn" className="font-semibold text-[var(--m-accent-teal)] hover:underline">
                  {t('form.helper_link')}
                </a>
              </p>
            </div>
          </Container>
        </Section>
      </main>
      <MarketingNewsletter />
      <MarketingFooter />
    </MarketingShell>
  );
}
