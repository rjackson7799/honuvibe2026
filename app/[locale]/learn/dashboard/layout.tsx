import { setRequestLocale } from 'next-intl/server';
import { AuthGuard } from '@/components/auth/AuthGuard';
import { StudentDashboardLayout } from '@/components/learn/StudentDashboardLayout';

type Props = {
  children: React.ReactNode;
  params: Promise<{ locale: string }>;
};

export default async function DashboardLayout({ children, params }: Props) {
  const { locale } = await params;
  setRequestLocale(locale);

  return (
    <AuthGuard locale={locale}>
      <StudentDashboardLayout>
        {children}
      </StudentDashboardLayout>
    </AuthGuard>
  );
}
