import type { Metadata } from 'next';
import { setRequestLocale, getTranslations } from 'next-intl/server';
import { MarketingShell } from '@/components/marketing/shell';
import { MarketingNav } from '@/components/marketing/nav/marketing-nav';
import { MarketingFooter } from '@/components/marketing/footer/marketing-footer';
import { MarketingNewsletter } from '@/components/marketing/newsletter/marketing-newsletter';
import {
  SandboxHero,
  SandboxDemoGrid,
  SandboxMethodStrip,
} from '@/components/marketing/sandbox';

type Props = {
  params: Promise<{ locale: string }>;
};

export async function generateMetadata({ params }: Props): Promise<Metadata> {
  const { locale } = await params;
  const t = await getTranslations({ locale, namespace: 'sandbox.meta' });
  const baseUrl = process.env.NEXT_PUBLIC_SITE_URL || 'https://honuvibe.ai';
  const canonical =
    locale === 'ja' ? `${baseUrl}/ja/sandbox` : `${baseUrl}/sandbox`;

  return {
    title: t('title'),
    description: t('description'),
    alternates: {
      canonical,
      languages: {
        en: `${baseUrl}/sandbox`,
        ja: `${baseUrl}/ja/sandbox`,
      },
    },
    openGraph: {
      title: t('title'),
      description: t('description'),
      // Page-level openGraph replaces the locale layout's object wholesale
      // (shallow merge per field), so restate the default OG image.
      images: [{ url: '/api/og', width: 1200, height: 630 }],
    },
  };
}

export default async function SandboxPage({ params }: Props) {
  const { locale } = await params;
  setRequestLocale(locale);

  return (
    <MarketingShell>
      <MarketingNav />
      <main>
        <SandboxHero />
        <SandboxDemoGrid />
        <SandboxMethodStrip />
      </main>
      <MarketingNewsletter />
      <MarketingFooter />
    </MarketingShell>
  );
}
