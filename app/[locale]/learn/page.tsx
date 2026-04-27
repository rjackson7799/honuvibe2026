import { setRequestLocale, getTranslations } from 'next-intl/server';
import { MarketingShell } from '@/components/marketing/shell';
import { MarketingNav } from '@/components/marketing/nav/marketing-nav';
import { MarketingFooter } from '@/components/marketing/footer/marketing-footer';
import { MarketingNewsletter } from '@/components/marketing/newsletter/marketing-newsletter';
import {
  LearnHero,
  LearnThreePaths,
  LearnVaultMoment,
  LearnCoursesCatalog,
  LearnPrivateCohorts,
  LearnComparisonTable,
} from '@/components/marketing/learn';
import { getPublishedCourses } from '@/lib/courses/queries';

type Props = {
  params: Promise<{ locale: string }>;
};

export async function generateMetadata({ params }: Props) {
  const { locale } = await params;
  const t = await getTranslations({ locale, namespace: 'learn.meta' });

  return {
    title: t('title'),
    description: t('description'),
  };
}

export default async function LearnPage({ params }: Props) {
  const { locale } = await params;
  setRequestLocale(locale);

  const courses = await getPublishedCourses();

  return (
    <MarketingShell>
      <MarketingNav />
      <main>
        <LearnHero />
        <LearnThreePaths />
        <LearnVaultMoment />
        <LearnCoursesCatalog courses={courses} locale={locale} />
        <LearnPrivateCohorts />
        <LearnComparisonTable />
      </main>
      <MarketingNewsletter />
      <MarketingFooter />
    </MarketingShell>
  );
}
