import { setRequestLocale } from 'next-intl/server';
import { LegalPage } from '@/components/sections/legal/legal-page';

type Props = {
  params: Promise<{ locale: string }>;
};

const sectionKeys = ['what', 'types', 'third_party', 'control', 'changes', 'contact'];

export default async function CookiesPage({ params }: Props) {
  const { locale } = await params;
  setRequestLocale(locale);

  return <LegalPage namespace="cookies_page" sectionKeys={sectionKeys} />;
}
