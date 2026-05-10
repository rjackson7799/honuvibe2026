import type { Metadata } from 'next';
import { setRequestLocale } from 'next-intl/server';
import { VerticeLanding } from '@/components/partners/vertice/VerticeLanding';
import { inter, instrumentSerif, notoJP } from './fonts';

type Props = {
  params: Promise<{ locale: string }>;
};

export async function generateMetadata({ params }: Props): Promise<Metadata> {
  const { locale } = await params;
  const isJP = locale === 'ja';

  const title = 'AI Essentials — Vertice Society × HonuVibe.AI';
  const description = isJP
    ? 'Vertice Society限定の30時間以上のAI実践プログラム。Vault・ライブコホート・コミュニティの3つのプランから選べます。'
    : 'A 30+ hour practical AI program exclusively for Vertice Society members. Three tiers: Community, Vault, and Live Cohort.';

  return {
    title,
    description,
    robots: { index: true, follow: true },
    openGraph: {
      title,
      description,
    },
  };
}

export default async function VerticeSocietyPage({ params }: Props) {
  const { locale } = await params;
  setRequestLocale(locale);

  return (
    <div className={`${inter.variable} ${notoJP.variable} ${instrumentSerif.variable}`}>
      <VerticeLanding locale={locale} />
    </div>
  );
}
