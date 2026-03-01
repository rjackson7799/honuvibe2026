import type { Metadata } from 'next';
import { setRequestLocale } from 'next-intl/server';
import { VerticePageContent } from '@/components/partners/vertice-page-content';

type Props = {
  params: Promise<{ locale: string }>;
};

export async function generateMetadata({ params }: Props): Promise<Metadata> {
  const { locale } = await params;
  const isJP = locale === 'ja';

  return {
    title: 'AI Mastery — Vertice Society × HonuVibe.AI',
    description: isJP
      ? 'Vertice Societyメンバー限定の5週間AI教育プログラム。好奇心から自信へ。'
      : 'A 5-week AI education program exclusively for Vertice Society members. From curious to confident.',
    robots: {
      index: false,
      follow: false,
    },
    openGraph: {
      title: 'AI Mastery — From Curious to Confident',
      description: 'Vertice Society × HonuVibe.AI — Exclusive AI Education Program',
    },
  };
}

export default async function VerticeSocietyPage({ params }: Props) {
  const { locale } = await params;
  setRequestLocale(locale);

  return (
    <div className="light-zone">
      <VerticePageContent />
    </div>
  );
}
