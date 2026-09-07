import { setRequestLocale } from 'next-intl/server';
import { AuthGuard } from '@/components/auth/AuthGuard';
import { StudentDashboardLayout } from '@/components/learn/StudentDashboardLayout';

export default async function PlansLayout({ children, params }: { children: React.ReactNode; params: Promise<{ locale: string }> }) {
  const { locale } = await params;
  setRequestLocale(locale);
  return <AuthGuard locale={locale}><StudentDashboardLayout>{children}</StudentDashboardLayout></AuthGuard>;
}
