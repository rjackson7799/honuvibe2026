import { setRequestLocale } from 'next-intl/server';
import { getAdminCourses } from '@/lib/courses/queries';
import { StatusBadge } from '@/components/admin/StatusBadge';
import { AdminCourseList } from '@/components/admin/AdminCourseList';
import Link from 'next/link';
import { PlusCircle } from 'lucide-react';

type Props = {
  params: Promise<{ locale: string }>;
};

export const metadata = {
  title: 'Courses — Admin',
};

export default async function AdminCoursesPage({ params }: Props) {
  const { locale } = await params;
  setRequestLocale(locale);

  const courses = await getAdminCourses();

  return (
    <div className="space-y-6 max-w-[1100px]">
      <div className="flex items-center justify-between">
        <h1 className="text-2xl font-serif text-fg-primary">Courses</h1>
        <Link
          href="/admin/courses/upload"
          className="flex items-center gap-2 px-4 py-2 bg-accent-teal text-white rounded-lg text-sm font-medium hover:bg-accent-teal/90 transition-colors"
        >
          <PlusCircle size={16} />
          Create Course
        </Link>
      </div>

      <AdminCourseList courses={courses} />
    </div>
  );
}
