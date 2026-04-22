import { setRequestLocale } from 'next-intl/server';
import { InstructorGuard } from '@/components/auth/InstructorGuard';

type Props = {
  children: React.ReactNode;
  params: Promise<{ locale: string }>;
};

export const metadata = {
  title: 'Instructor Portal — HonuVibe.AI',
  robots: { index: false, follow: false },
};

export default async function InstructorRootLayout({ children, params }: Props) {
  const { locale } = await params;
  setRequestLocale(locale);

  return <InstructorGuard locale={locale}>{children}</InstructorGuard>;
}
