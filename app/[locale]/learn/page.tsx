import { setRequestLocale, getTranslations } from 'next-intl/server';
import { MarketingShell } from '@/components/marketing/shell';
import { MarketingNav } from '@/components/marketing/nav/marketing-nav';
import { MarketingFooter } from '@/components/marketing/footer/marketing-footer';
import { MarketingNewsletter } from '@/components/marketing/newsletter/marketing-newsletter';
import {
  LearnHero,
  LearnChapterVault,
  LearnChapterCourses,
  LearnChapterCohorts,
  LearnFAQ,
  LearnStartTonight,
} from '@/components/marketing/learn';
import { ProofBand } from '@/components/marketing/proof-band';
import {
  getPublishedCoursesWithPartners,
  getActivePublicPartners,
} from '@/lib/courses/queries';
import {
  getVaultRandomSample,
  getVaultContentTypeCounts,
} from '@/lib/vault/queries';

type Props = {
  params: Promise<{ locale: string }>;
  searchParams: Promise<Record<string, string | string[] | undefined>>;
};

export async function generateMetadata({ params }: Props) {
  const { locale } = await params;
  const t = await getTranslations({ locale, namespace: 'learn.meta' });

  return {
    title: t('title'),
    description: t('description'),
  };
}

export default async function LearnPage({ params, searchParams }: Props) {
  const { locale } = await params;
  setRequestLocale(locale);

  const sp = await searchParams;
  const ownerParam = sp.owner;
  const ownerSlug = typeof ownerParam === 'string' ? ownerParam : null;

  const [courses, partners, vaultSample, vaultCounts] = await Promise.all([
    getPublishedCoursesWithPartners(ownerSlug),
    getActivePublicPartners(),
    getVaultRandomSample(4),
    getVaultContentTypeCounts(),
  ]);

  return (
    <MarketingShell>
      <MarketingNav />
      <main>
        <LearnHero locale={locale} />
        <ProofBand vaultTotalCount={vaultCounts.total} />
        <LearnChapterVault
          locale={locale}
          vaultSample={vaultSample}
          vaultTotalCount={vaultCounts.total}
        />
        <LearnChapterCourses
          courses={courses}
          locale={locale}
          partners={partners}
          ownerSlug={ownerSlug}
        />
        <LearnChapterCohorts />
        <LearnFAQ />
        <LearnStartTonight />
      </main>
      <MarketingNewsletter />
      <MarketingFooter />
    </MarketingShell>
  );
}
