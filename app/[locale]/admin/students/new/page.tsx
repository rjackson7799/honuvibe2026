import { setRequestLocale } from 'next-intl/server';
import { getActiveCourses } from '@/lib/admin/queries';
import { AddStudentFlow } from '@/components/admin/AddStudentFlow';

type Props = {
  params: Promise<{ locale: string }>;
};

export const metadata = {
  title: 'Add Student — Admin',
};

export default async function AddStudentPage({ params }: Props) {
  const { locale } = await params;
  setRequestLocale(locale);

  const activeCourses = await getActiveCourses();

  return (
    <div className="space-y-6 max-w-[1100px]">
      <AddStudentFlow activeCourses={activeCourses} />
    </div>
  );
}
