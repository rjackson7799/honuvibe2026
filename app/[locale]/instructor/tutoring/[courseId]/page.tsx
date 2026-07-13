import { setRequestLocale } from 'next-intl/server';
import { notFound } from 'next/navigation';
import Link from 'next/link';
import { ChevronLeft } from 'lucide-react';
import { InstructorPortalLayout } from '@/components/instructor-portal/InstructorPortalLayout';
import { resolveInstructorScope } from '@/lib/instructor-portal/queries';
import { getTutoringAccess } from '@/lib/tutoring/auth';
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
  title: '1v1 Engagement — Instructor',
};

export const dynamic = 'force-dynamic';

export default async function InstructorTutoringCoursePage({ params }: Props) {
  const { locale, courseId } = await params;
  setRequestLocale(locale);

  const scope = await resolveInstructorScope(locale);

  // Defense in depth beyond RLS: scope.instructorProfileId is this caller's
  // own profile, but the requested courseId is attacker-controlled — confirm
  // this instructor is actually assigned before rendering anything.
  const access = await getTutoringAccess(courseId);
  if (!access.ok) notFound();

  const course = await getTutoringCourse(courseId);
  if (!course) notFound();

  const [reports, patterns] = await Promise.all([
    getReportsForCourse(courseId),
    course.student ? getPatternsForStudent(courseId, course.student.id) : Promise.resolve([]),
  ]);

  return (
    <InstructorPortalLayout displayName={scope.displayName}>
      <div className="max-w-[1100px] space-y-6">
        <Link
          href="/instructor/tutoring"
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
          basePath="/instructor/tutoring"
          allowEnroll={false}
        />
      </div>
    </InstructorPortalLayout>
  );
}
