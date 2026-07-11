import { setRequestLocale } from 'next-intl/server';
import { notFound } from 'next/navigation';
import Link from 'next/link';
import { ChevronLeft } from 'lucide-react';
import {
  getTutoringCourse,
  getReportsForCourse,
  getPatternsForStudent,
} from '@/lib/tutoring/queries';
import { getActiveInstructorOptions, getInstructorsForCourse } from '@/lib/instructors/queries';
import { TutoringCourseDashboard } from '@/components/admin/TutoringCourseDashboard';
import { TutoringTeacherControl } from '@/components/admin/TutoringTeacherControl';

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

  const [reports, patterns, teacherOptions, courseInstructors] = await Promise.all([
    getReportsForCourse(courseId),
    course.student ? getPatternsForStudent(courseId, course.student.id) : Promise.resolve([]),
    getActiveInstructorOptions(),
    getInstructorsForCourse(courseId),
  ]);

  const lead = courseInstructors.find((ci) => ci.role === 'lead') ?? courseInstructors[0] ?? null;

  return (
    <div className="max-w-[1100px] space-y-6">
      <Link
        href="/admin/tutoring"
        className="inline-flex items-center gap-1 text-[13px] text-fg-tertiary hover:text-accent-teal"
      >
        <ChevronLeft size={15} /> All 1v1 sessions
      </Link>

      <TutoringTeacherControl
        courseId={course.id}
        current={
          lead ? { profileId: lead.instructor_id, name: lead.instructor.display_name } : null
        }
        options={teacherOptions.map((o) => ({ id: o.id, name: o.display_name }))}
      />

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
