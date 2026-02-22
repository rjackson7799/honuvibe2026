import { setRequestLocale } from 'next-intl/server';
import { ApplyHero } from '@/components/sections/apply/apply-hero';
import { ApplicationForm } from '@/components/sections/apply/application-form';

type Props = {
  params: Promise<{ locale: string }>;
};

export default async function ApplyPage({ params }: Props) {
  const { locale } = await params;
  setRequestLocale(locale);

  return (
    <>
      <ApplyHero />
      <ApplicationForm />
    </>
  );
}
