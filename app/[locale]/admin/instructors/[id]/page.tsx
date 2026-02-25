import { setRequestLocale } from 'next-intl/server';
import { notFound } from 'next/navigation';
import { getAdminInstructorById } from '@/lib/instructors/queries';
import { AdminInstructorDetail } from '@/components/admin/AdminInstructorDetail';
import { AddInstructorFlow } from '@/components/admin/AddInstructorFlow';

type Props = {
  params: Promise<{ locale: string; id: string }>;
};

export async function generateMetadata({ params }: Props) {
  const { id } = await params;
  if (id === 'new') return { title: 'Add Instructor — Admin' };
  const instructor = await getAdminInstructorById(id);
  return { title: instructor ? `${instructor.display_name} — Admin` : 'Instructor Not Found' };
}

export default async function AdminInstructorDetailPage({ params }: Props) {
  const { locale, id } = await params;
  setRequestLocale(locale);

  if (id === 'new') {
    return <AddInstructorFlow />;
  }

  const instructor = await getAdminInstructorById(id);
  if (!instructor) notFound();

  return <AdminInstructorDetail instructor={instructor} />;
}
