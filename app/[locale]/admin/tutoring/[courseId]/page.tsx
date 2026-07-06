import { setRequestLocale } from 'next-intl/server';
import { notFound } from 'next/navigation';
import Link from 'next/link';
import { ChevronLeft } from 'lucide-react';
import {
  getTutoringCourse,
  getReportsForCourse,
  getPatternsForStudent,
} from '@/lib/tutoring/queries';
import { TutoringCourseDashboard } from '@/components/admin/TutoringCourseDashboard';

type Props = {
  params: Promise<{ locale: string; courseId: string }>;
};

export const metadata = {
  title: '1v1 Engagement — Admin',
};

export const dynamic = 'force-dynamic';

export default async function AdminTutoringCoursePage({ params }: Props) {
  const { locale, courseId } = await params;
  setRequestLocale(locale);

  const course = await getTutoringCourse(courseId);
  if (!course) notFound();

  const [reports, patterns] = await Promise.all([
    getReportsForCourse(courseId),
    course.student ? getPatternsForStudent(courseId, course.student.id) : Promise.resolve([]),
  ]);

  return (
    <div className="max-w-[1100px] space-y-6">
      <Link
        href="/admin/tutoring"
        className="inline-flex items-center gap-1 text-[13px] text-fg-tertiary hover:text-accent-teal"
      >
        <ChevronLeft size={15} /> All 1v1 sessions
      </Link>

      <TutoringCourseDashboard
        course={{
          id: course.id,
          titleEn: course.title_en,
          student: course.student
            ? {
                id: course.student.id,
                name: course.student.full_name,
                email: course.student.email,
              }
            : null,
        }}
        initialReports={reports}
        patterns={patterns}
      />
    </div>
  );
}
