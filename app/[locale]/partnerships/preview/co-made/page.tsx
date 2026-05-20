import { setRequestLocale, getTranslations } from 'next-intl/server';
import { MarketingShell } from '@/components/marketing/shell';
import { MarketingNav } from '@/components/marketing/nav/marketing-nav';
import { MarketingFooter } from '@/components/marketing/footer/marketing-footer';
import { MarketingNewsletter } from '@/components/marketing/newsletter/marketing-newsletter';
import {
  ComadeLockupHero,
  ComadeFeatureCase,
  ComadeThreeWays,
  ComadeDuetQuotes,
  ComadeCurrentlyMaking,
  ComadeLetsMakeSomething,
} from '@/components/marketing/partnerships/comade';

type Props = {
  params: Promise<{ locale: string }>;
};

export async function generateMetadata({ params }: Props) {
  const { locale } = await params;
  const t = await getTranslations({ locale, namespace: 'partnerships.meta' });
  return {
    title: `Co-Made preview — ${t('title')}`,
    description: t('description'),
    robots: { index: false, follow: false },
  };
}

export default async function PartnershipsComadePreview({ params }: Props) {
  const { locale } = await params;
  setRequestLocale(locale);

  return (
    <MarketingShell>
      <MarketingNav />
      <main>
        <PreviewBanner />
        <ComadeLockupHero />
        <ComadeFeatureCase />
        <ComadeThreeWays />
        <ComadeDuetQuotes />
        <ComadeCurrentlyMaking />
        <ComadeLetsMakeSomething />
      </main>
      <MarketingNewsletter />
      <MarketingFooter />
    </MarketingShell>
  );
}

function PreviewBanner() {
  return (
    <div className="border-b border-[var(--m-accent-coral)]/40 bg-[rgba(232,118,90,0.08)] py-2 text-center">
      <p className="font-mono text-[10.5px] uppercase tracking-[0.18em] text-[var(--m-accent-coral)]">
        Preview · Co-Made variant · Not the live partnerships page
      </p>
    </div>
  );
}
