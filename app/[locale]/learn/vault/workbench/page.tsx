import { setRequestLocale, getTranslations } from 'next-intl/server';
import { FlaskConical } from 'lucide-react';
import { createClient } from '@/lib/supabase/server';
import { checkVaultAccess } from '@/lib/vault/access';
import { getPublishedScenarios } from '@/lib/workbench/queries';
import { WorkbenchScenarioGrid } from '@/components/workbench/WorkbenchScenarioGrid';
import { VaultPremiumGate } from '@/components/vault/VaultPremiumGate';

type Props = {
  params: Promise<{ locale: string }>;
};

export async function generateMetadata({ params }: Props) {
  const { locale } = await params;
  const baseUrl = process.env.NEXT_PUBLIC_SITE_URL || 'https://honuvibe.ai';
  return {
    title:
      locale === 'ja'
        ? 'Apply-It ワークベンチ — HonuVibe'
        : 'Apply-It Workbench — HonuVibe',
    description:
      locale === 'ja'
        ? '実際のシナリオでプロンプトを練習し、ルーブリックに基づくフィードバックを受け取りましょう。'
        : 'Practice prompting on real scenarios and get rubric-scored feedback.',
    alternates: {
      canonical: `${baseUrl}/learn/vault/workbench`,
      languages: {
        en: `${baseUrl}/learn/vault/workbench`,
        ja: `${baseUrl}/ja/learn/vault/workbench`,
      },
    },
  };
}

export default async function WorkbenchLibraryPage({ params }: Props) {
  const { locale } = await params;
  setRequestLocale(locale);

  const t = await getTranslations('workbench');
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();

  let hasAccess = false;
  if (user) {
    const access = await checkVaultAccess(user.id);
    hasAccess = access.hasAccess;
  }

  function Header() {
    return (
      <div className="flex items-start gap-3 min-w-0">
        <div className="w-10 h-10 rounded-[10px] bg-[color:var(--accent-teal-subtle)] text-[color:var(--accent-teal)] flex items-center justify-center shrink-0">
          <FlaskConical size={18} />
        </div>
        <div className="min-w-0">
          <h1 className="text-[clamp(20px,2.4vw,24px)] font-bold text-fg-primary tracking-[-0.02em] mb-1">
            {t('page_title')}
          </h1>
          <p className="text-[14px] text-fg-tertiary">{t('page_subtitle')}</p>
        </div>
      </div>
    );
  }

  if (!hasAccess) {
    return (
      <div className="space-y-6 max-w-[1100px] mx-auto">
        <Header />
        <VaultPremiumGate />
      </div>
    );
  }

  const scenarios = await getPublishedScenarios();

  return (
    <div className="space-y-6 max-w-[1100px] mx-auto">
      <Header />
      <WorkbenchScenarioGrid scenarios={scenarios} />
    </div>
  );
}
