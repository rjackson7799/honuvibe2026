import { setRequestLocale } from 'next-intl/server';
import { PartnerGuard } from '@/components/auth/PartnerGuard';

type Props = {
  children: React.ReactNode;
  params: Promise<{ locale: string }>;
};

export const metadata = {
  title: 'Partner Portal — HonuVibe.AI',
  robots: { index: false, follow: false },
};

export default async function PartnerRootLayout({ children, params }: Props) {
  const { locale } = await params;
  setRequestLocale(locale);

  return <PartnerGuard locale={locale}>{children}</PartnerGuard>;
}
