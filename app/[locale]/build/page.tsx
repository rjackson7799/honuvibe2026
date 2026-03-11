import { setRequestLocale } from 'next-intl/server';
import type { Metadata } from 'next';
import {
  BuildHero,
  TerritoryCards,
  TechLogoGrid,
  ClaudeWorkflowCallout,
  BuildProcessTimeline,
  EngagementCards,
  ProofStrip,
  InquirySection,
  AdvisoryLink,
} from '@/components/build';

type Props = {
  params: Promise<{ locale: string }>;
};

export async function generateMetadata({ params }: Props): Promise<Metadata> {
  const { locale } = await params;
  const isJP = locale === 'ja';

  return {
    title: isJP
      ? 'Build | HonuVibe.AI — アイデアから実現へ'
      : 'Build | HonuVibe.AI — From Idea to Launch',
    description: isJP
      ? 'ウェブサイト、SaaSツール、データベースアプリ、自動化 — HonuVibeと一緒にプロジェクトを実現しましょう。'
      : 'Websites, SaaS tools, database apps, and automations — work with HonuVibe to bring your project to life.',
    alternates: {
      canonical: `https://honuvibe.ai${isJP ? '/ja' : ''}/build`,
      languages: {
        en: 'https://honuvibe.ai/build',
        ja: 'https://honuvibe.ai/ja/build',
      },
    },
    openGraph: {
      title: 'Build with HonuVibe.AI',
      description: isJP
        ? 'アイデアから実現へ。HonuVibeの開発プロセスをご覧ください。'
        : 'From idea to launch. See how HonuVibe builds.',
      url: `https://honuvibe.ai${isJP ? '/ja' : ''}/build`,
      type: 'website',
    },
  };
}

export default async function BuildPage({ params }: Props) {
  const { locale } = await params;
  setRequestLocale(locale);

  return (
    <>
      <BuildHero />
      <TerritoryCards />
      <TechLogoGrid />
      <ClaudeWorkflowCallout />
      <BuildProcessTimeline />
      <EngagementCards />
      <ProofStrip />
      <InquirySection />
      <AdvisoryLink />
    </>
  );
}
