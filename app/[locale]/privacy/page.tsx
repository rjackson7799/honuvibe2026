import { setRequestLocale } from 'next-intl/server';
import { LegalPage } from '@/components/sections/legal/legal-page';

type Props = {
  params: Promise<{ locale: string }>;
};

const sectionKeys = ['collection', 'usage', 'sharing', 'cookies', 'security', 'rights', 'international', 'changes', 'contact'];

export default async function PrivacyPage({ params }: Props) {
  const { locale } = await params;
  setRequestLocale(locale);

  return <LegalPage namespace="privacy_page" sectionKeys={sectionKeys} />;
}
