import { setRequestLocale } from 'next-intl/server';
import { getAllPaths } from '@/lib/paths/queries';
import { AdminPathsList } from '@/components/admin/AdminPathsList';

type Props = {
  params: Promise<{ locale: string }>;
};

export const metadata = {
  title: 'Study Paths — Admin',
};

export default async function AdminPathsPage({ params }: Props) {
  const { locale } = await params;
  setRequestLocale(locale);

  const paths = await getAllPaths(200, 0);

  return (
    <div className="space-y-6 max-w-[1100px]">
      <h1 className="text-2xl font-serif text-fg-primary">Study Paths</h1>
      <AdminPathsList paths={paths} />
    </div>
  );
}
