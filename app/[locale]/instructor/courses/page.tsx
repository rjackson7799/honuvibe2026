import { setRequestLocale } from 'next-intl/server';
import Link from 'next/link';
import { PlusCircle } from 'lucide-react';
import { InstructorPortalLayout } from '@/components/instructor-portal/InstructorPortalLayout';
import { InstructorCourseList } from '@/components/instructor-portal/InstructorCourseList';
import {
  resolveInstructorScope,
  getMyInstructorCourses,
} from '@/lib/instructor-portal/queries';

type Props = {
  params: Promise<{ locale: string }>;
};

export const metadata = {
  title: 'My Courses — Instructor',
};

export default async function InstructorCoursesPage({ params }: Props) {
  const { locale } = await params;
  setRequestLocale(locale);

  const scope = await resolveInstructorScope(locale);
  const courses = await getMyInstructorCourses(scope.instructorProfileId);

  return (
    <InstructorPortalLayout displayName={scope.displayName}>
      <div className="max-w-[1100px] space-y-6">
        <div className="flex items-center justify-between flex-wrap gap-3">
          <div>
            <h1 className="font-serif text-3xl text-fg-primary">My courses</h1>
            <p className="mt-1 text-sm text-fg-tertiary">
              Propose new courses, track approval, and view your published catalog.
            </p>
          </div>
          <Link
            href="/instructor/courses/new"
            className="flex items-center gap-2 px-4 py-2 bg-accent-teal text-white rounded-lg text-sm font-medium hover:bg-accent-teal/90 transition-colors"
          >
            <PlusCircle size={16} />
            Propose a course
          </Link>
        </div>

        <InstructorCourseList courses={courses} />
      </div>
    </InstructorPortalLayout>
  );
}
