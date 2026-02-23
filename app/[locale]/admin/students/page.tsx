import { setRequestLocale } from 'next-intl/server';
import { getStudentList } from '@/lib/admin/queries';
import { AdminStudentList } from '@/components/admin/AdminStudentList';

type Props = {
  params: Promise<{ locale: string }>;
};

export const metadata = {
  title: 'Students — Admin',
};

export default async function AdminStudentsPage({ params }: Props) {
  const { locale } = await params;
  setRequestLocale(locale);

  const students = await getStudentList();

  return (
    <div className="space-y-6 max-w-[1100px]">
      <h1 className="text-2xl font-serif text-fg-primary">Students</h1>
      <AdminStudentList students={students} />
    </div>
  );
}
