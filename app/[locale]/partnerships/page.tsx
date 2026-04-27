import { setRequestLocale, getTranslations } from 'next-intl/server';
import { MarketingShell } from '@/components/marketing/shell';
import { MarketingNav } from '@/components/marketing/nav/marketing-nav';
import { MarketingFooter } from '@/components/marketing/footer/marketing-footer';
import { MarketingNewsletter } from '@/components/marketing/newsletter/marketing-newsletter';
import {
  PartnershipsHero,
  PartnershipsWhatYouGet,
  PartnershipsHowItWorks,
  PartnershipsCurrentPartners,
  PartnershipsWhoIsItFor,
  PartnershipsPricing,
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

export default async function PartnershipsPage({ params }: Props) {
  const { locale } = await params;
  setRequestLocale(locale);

  return (
    <MarketingShell>
      <MarketingNav />
      <main>
        <PartnershipsHero />
        <PartnershipsWhatYouGet />
        <PartnershipsHowItWorks />
        <PartnershipsCurrentPartners />
        <PartnershipsWhoIsItFor />
        <PartnershipsPricing />
        <PartnershipsApplicationForm />
      </main>
      <MarketingNewsletter />
      <MarketingFooter />
    </MarketingShell>
  );
}
