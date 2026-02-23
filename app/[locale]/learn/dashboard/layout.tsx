import { setRequestLocale } from 'next-intl/server';
import { AuthGuard } from '@/components/auth/AuthGuard';

type Props = {
  children: React.ReactNode;
  params: Promise<{ locale: string }>;
};

export default async function DashboardLayout({ children, params }: Props) {
  const { locale } = await params;
  setRequestLocale(locale);

  return (
    <AuthGuard locale={locale}>
      {children}
    </AuthGuard>
  );
}
