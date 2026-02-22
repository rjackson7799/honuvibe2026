import { setRequestLocale } from 'next-intl/server';
import { LegalPage } from '@/components/sections/legal/legal-page';

type Props = {
  params: Promise<{ locale: string }>;
};

const sectionKeys = ['use', 'accounts', 'payments', 'ip', 'disclaimer', 'limitation', 'termination', 'governing', 'contact'];

export default async function TermsPage({ params }: Props) {
  const { locale } = await params;
  setRequestLocale(locale);

  return <LegalPage namespace="terms_page" sectionKeys={sectionKeys} />;
}
