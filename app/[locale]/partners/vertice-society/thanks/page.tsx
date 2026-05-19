import type { Metadata } from 'next';
import { setRequestLocale } from 'next-intl/server';
import { MarketingShell } from '@/components/marketing/shell';
import { MarketingNav } from '@/components/marketing/nav/marketing-nav';
import { inter, instrumentSerif, notoJP } from '../fonts';
import { ThanksContent } from './thanks-content';

export const metadata: Metadata = {
  title: 'Thanks — Vertice Society × HonuVibe.AI',
  description: 'Your purchase is confirmed.',
  robots: { index: false, follow: false },
};

type Props = {
  params: Promise<{ locale: string }>;
  searchParams: Promise<{ tier?: string; session_id?: string }>;
};

export default async function VerticeThanksPage({ params, searchParams }: Props) {
  const { locale } = await params;
  const { tier, session_id } = await searchParams;
  setRequestLocale(locale);

  const safeTier =
    tier === 'community' || tier === 'vault' || tier === 'cohort' ? tier : null;
  const isJP = locale === 'ja';

  return (
    <div className={`${inter.variable} ${notoJP.variable} ${instrumentSerif.variable}`}>
      <MarketingShell>
        <MarketingNav showGetStarted />
        <ThanksContent
          tier={safeTier}
          sessionId={session_id ?? null}
          isJP={isJP}
        />
      </MarketingShell>
    </div>
  );
}
