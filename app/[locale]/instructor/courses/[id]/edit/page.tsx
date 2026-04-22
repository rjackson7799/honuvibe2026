import { setRequestLocale } from 'next-intl/server';
import { notFound } from 'next/navigation';
import Link from 'next/link';
import { ArrowLeft } from 'lucide-react';
import { InstructorPortalLayout } from '@/components/instructor-portal/InstructorPortalLayout';
import { InstructorCourseProposalForm } from '@/components/instructor-portal/InstructorCourseProposalForm';
import {
  resolveInstructorScope,
  getMyProposalById,
} from '@/lib/instructor-portal/queries';

type Props = {
  params: Promise<{ locale: string; id: string }>;
};

export const metadata = {
  title: 'Edit proposal — Instructor',
};

export default async function EditProposalPage({ params }: Props) {
  const { locale, id } = await params;
  setRequestLocale(locale);

  const scope = await resolveInstructorScope(locale);
  const course = await getMyProposalById(id, scope.instructorProfileId);

  if (!course) notFound();
  if (course.status !== 'proposal') {
    return (
      <InstructorPortalLayout displayName={scope.displayName}>
        <div className="max-w-[720px] space-y-4">
          <Link
            href="/instructor/courses"
            className="inline-flex items-center gap-1 text-sm text-fg-tertiary hover:text-accent-teal"
          >
            <ArrowLeft size={14} /> Back to my courses
          </Link>
          <header>
            <h1 className="font-serif text-3xl text-fg-primary">{course.title_en}</h1>
            <p className="mt-2 text-sm text-fg-tertiary">
              This course is in <span className="font-medium text-fg-secondary">{course.status}</span>{' '}
              status — it can no longer be edited as a proposal. Reach out to an admin if you need
              changes.
            </p>
          </header>
          {course.proposal_review_notes && (
            <div className="rounded-lg border border-red-500/20 bg-red-500/5 p-3 text-sm text-red-300">
              <p className="text-xs uppercase tracking-wider text-red-400 mb-1">Reviewer notes</p>
              {course.proposal_review_notes}
            </div>
          )}
        </div>
      </InstructorPortalLayout>
    );
  }

  return (
    <InstructorPortalLayout displayName={scope.displayName}>
      <div className="max-w-[720px] space-y-6">
        <Link
          href="/instructor/courses"
          className="inline-flex items-center gap-1 text-sm text-fg-tertiary hover:text-accent-teal"
        >
          <ArrowLeft size={14} /> Back to my courses
        </Link>

        <header>
          <h1 className="font-serif text-3xl text-fg-primary">Edit proposal</h1>
          <p className="mt-1 text-sm text-fg-tertiary">
            Tweak your pitch — changes are reviewed by an admin before approval.
          </p>
        </header>

        <InstructorCourseProposalForm mode="edit" course={course} />
      </div>
    </InstructorPortalLayout>
  );
}
