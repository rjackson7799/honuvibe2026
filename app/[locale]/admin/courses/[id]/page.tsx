import { setRequestLocale } from 'next-intl/server';
import { notFound } from 'next/navigation';
import { getAdminCourseById, getEnrolledStudents } from '@/lib/courses/queries';
import { getActiveInstructorOptions } from '@/lib/instructors/queries';
import { createClient } from '@/lib/supabase/server';
import { AdminCourseDetail } from '@/components/admin/AdminCourseDetail';
import { AdminProposalActions } from '@/components/admin/AdminProposalActions';

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

  const enrolledStudents = await getEnrolledStudents(course.id);

  let proposerName: string | null = null;
  if (course.proposed_by_instructor_id) {
    const supabase = await createClient();
    const { data } = await supabase
      .from('instructor_profiles')
      .select('display_name')
      .eq('id', course.proposed_by_instructor_id)
      .maybeSingle();
    proposerName = data?.display_name ?? null;
  }

  const showProposalBanner =
    course.status === 'proposal' || course.status === 'rejected';

  return (
    <div className="space-y-6">
      {showProposalBanner && (
        <AdminProposalActions
          courseId={course.id}
          status={course.status as 'proposal' | 'rejected'}
          reviewNotes={course.proposal_review_notes}
          proposedByDisplayName={proposerName}
          submittedAt={course.proposal_submitted_at}
        />
      )}
      <AdminCourseDetail
        course={course}
        instructors={instructors}
        enrolledStudents={enrolledStudents}
      />
    </div>
  );
}
