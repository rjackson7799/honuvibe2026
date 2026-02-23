import { setRequestLocale } from 'next-intl/server';
import { AdminGuard } from '@/components/auth/AdminGuard';
import { AdminLayout } from '@/components/admin/AdminLayout';

type Props = {
  children: React.ReactNode;
  params: Promise<{ locale: string }>;
};

export default async function AdminRootLayout({ children, params }: Props) {
  const { locale } = await params;
  setRequestLocale(locale);

  return (
    <AdminGuard locale={locale}>
      <AdminLayout>{children}</AdminLayout>
    </AdminGuard>
  );
}
