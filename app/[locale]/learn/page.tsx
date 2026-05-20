import { setRequestLocale, getTranslations } from 'next-intl/server';
import { MarketingShell } from '@/components/marketing/shell';
import { MarketingNav } from '@/components/marketing/nav/marketing-nav';
import { MarketingFooter } from '@/components/marketing/footer/marketing-footer';
import { MarketingNewsletter } from '@/components/marketing/newsletter/marketing-newsletter';
import {
  LearnHero,
  LearnPartnerStrip,
  LearnChapterVault,
  LearnChapterCourses,
  LearnChapterCohorts,
  LearnComparisonDark,
  LearnFAQ,
  LearnStartTonight,
} from '@/components/marketing/learn';
import {
  getPublishedCoursesWithPartners,
  getActivePublicPartners,
} from '@/lib/courses/queries';

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

  const [courses, partners] = await Promise.all([
    getPublishedCoursesWithPartners(ownerSlug),
    getActivePublicPartners(),
  ]);

  return (
    <MarketingShell>
      <MarketingNav />
      <main>
        <LearnHero locale={locale} />
        <LearnPartnerStrip />
        <LearnChapterVault />
        <LearnChapterCourses
          courses={courses}
          locale={locale}
          partners={partners}
          ownerSlug={ownerSlug}
        />
        <LearnChapterCohorts />
        <LearnComparisonDark />
        <LearnFAQ />
        <LearnStartTonight />
      </main>
      <MarketingNewsletter />
      <MarketingFooter />
    </MarketingShell>
  );
}
