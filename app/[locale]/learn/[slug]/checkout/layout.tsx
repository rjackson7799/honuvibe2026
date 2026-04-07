import { setRequestLocale } from 'next-intl/server';
import { StudentDashboardLayout } from '@/components/learn/StudentDashboardLayout';

type Props = {
  children: React.ReactNode;
  params: Promise<{ locale: string }>;
};

export default async function CheckoutLayout({ children, params }: Props) {
  const { locale } = await params;
  setRequestLocale(locale);

  return (
    <StudentDashboardLayout>
      {children}
    </StudentDashboardLayout>
  );
}
