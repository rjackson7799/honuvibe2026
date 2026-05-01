import { setRequestLocale } from 'next-intl/server';
import { getAdminCourses } from '@/lib/courses/queries';
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
      <div className="flex items-center justify-between gap-4 flex-wrap">
        <h1 className="text-[clamp(22px,2.5vw,28px)] font-bold text-fg-primary tracking-[-0.02em]">
          Courses
        </h1>
        <Link
          href="/admin/courses/upload"
          className="inline-flex items-center gap-2 h-10 px-4 rounded-[10px] bg-[color:var(--accent-teal)] hover:bg-[color:var(--accent-teal-hover)] text-white text-[13px] font-semibold shadow-sm hover:shadow-md transition-all"
        >
          <PlusCircle size={16} />
          Create Course
        </Link>
      </div>

      <AdminCourseList courses={courses} />
    </div>
  );
}
