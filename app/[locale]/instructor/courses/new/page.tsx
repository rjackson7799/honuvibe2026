import { setRequestLocale } from 'next-intl/server';
import Link from 'next/link';
import { ArrowLeft } from 'lucide-react';
import { InstructorPortalLayout } from '@/components/instructor-portal/InstructorPortalLayout';
import { InstructorCourseProposalForm } from '@/components/instructor-portal/InstructorCourseProposalForm';
import { resolveInstructorScope } from '@/lib/instructor-portal/queries';

type Props = {
  params: Promise<{ locale: string }>;
};

export const metadata = {
  title: 'Propose a course — Instructor',
};

export default async function NewProposalPage({ params }: Props) {
  const { locale } = await params;
  setRequestLocale(locale);

  const scope = await resolveInstructorScope(locale);

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
          <h1 className="font-serif text-3xl text-fg-primary">Propose a course</h1>
          <p className="mt-1 text-sm text-fg-tertiary">
            Share the pitch. An admin reviews proposals and, when approved, helps you scope
            the weekly schedule, sessions, and pricing.
          </p>
        </header>

        <InstructorCourseProposalForm mode="create" />
      </div>
    </InstructorPortalLayout>
  );
}
