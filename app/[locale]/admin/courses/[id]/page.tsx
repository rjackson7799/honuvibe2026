import { setRequestLocale } from 'next-intl/server';
import { notFound } from 'next/navigation';
import { getAdminCourseById } from '@/lib/courses/queries';
import { getActiveInstructorOptions } from '@/lib/instructors/queries';
import { AdminCourseDetail } from '@/components/admin/AdminCourseDetail';

type Props = {
  params: Promise<{ locale: string; id: string }>;
};

export async function generateMetadata({ params }: Props) {
  const { id } = await params;
  const course = await getAdminCourseById(id);
  return { title: course ? `${course.title_en} — Admin` : 'Course Not Found' };
}

export default async function AdminCourseDetailPage({ params }: Props) {
  const { locale, id } = await params;
  setRequestLocale(locale);

  const [course, instructors] = await Promise.all([
    getAdminCourseById(id),
    getActiveInstructorOptions(),
  ]);

  if (!course) notFound();

  return <AdminCourseDetail course={course} instructors={instructors} />;
}
