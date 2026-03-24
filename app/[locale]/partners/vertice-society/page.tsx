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
    title: 'AI Essentials — Vertice Society × HonuVibe.AI',
    description: isJP
      ? 'Vertice Societyメンバー限定の5週間AI教育プログラム。未来へのはじめの一歩。'
      : 'A 5-week AI education program exclusively for Vertice Society members. Your first steps into the future.',
    robots: {
      index: false,
      follow: false,
    },
    openGraph: {
      title: 'AI Essentials — Vertice Society × HonuVibe.AI',
      description: 'A 5-week beginner AI program for Vertice Society members. Powered by HonuVibe.AI.',
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
