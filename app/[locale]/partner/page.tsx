import { setRequestLocale, getTranslations } from 'next-intl/server';
import { MarketingShell } from '@/components/marketing/shell';
import { MarketingNav } from '@/components/marketing/nav/marketing-nav';
import { MarketingFooter } from '@/components/marketing/footer/marketing-footer';
import { MarketingNewsletter } from '@/components/marketing/newsletter/marketing-newsletter';
import {
  PartnershipsEditorialHero,
  PartnershipsGrowingCycle,
  PartnershipsCohortChapter,
  PartnershipsMonetize,
  PartnershipsMembersTeachers,
  PartnershipsStudioRouter,
  PartnershipsMethodTable,
  PartnershipsNextChapter,
  PartnershipsApplicationForm,
} from '@/components/marketing/partnerships';

type Props = {
  params: Promise<{ locale: string }>;
};

export async function generateMetadata({ params }: Props) {
  const { locale } = await params;
  const t = await getTranslations({ locale, namespace: 'partnerships.meta' });
  return {
    title: t('title'),
    description: t('description'),
  };
}

/**
 * Interim public Partner page (redesign Unit 0B): the former /partnerships
 * content under the new green chrome, so the Learn · Build · Partner nav
 * resolves. /partnerships, /partnerships/apply and /organizations redirect
 * here; the enquiry form sits at #apply. Unit 4 rebuilds this page.
 * (The authenticated partner portal moved to /portal.)
 */
export default async function PartnerPage({ params }: Props) {
  const { locale } = await params;
  setRequestLocale(locale);

  return (
    <MarketingShell>
      <MarketingNav cta="talk_to_us" />
      <main>
        <PartnershipsEditorialHero />
        <PartnershipsGrowingCycle />
        <PartnershipsCohortChapter />
        <PartnershipsMonetize />
        <PartnershipsMembersTeachers />
        <PartnershipsStudioRouter />
        <PartnershipsMethodTable />
        <PartnershipsNextChapter />
        <PartnershipsApplicationForm />
      </main>
      <MarketingNewsletter source="partner" />
      <MarketingFooter />
    </MarketingShell>
  );
}
