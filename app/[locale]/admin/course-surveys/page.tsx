import { setRequestLocale } from 'next-intl/server';
import Link from 'next/link';
import { ChevronRight } from 'lucide-react';
import { getCourseSurveyStatuses } from '@/lib/survey/course-surveys';

type Props = {
  params: Promise<{ locale: string }>;
};

export const metadata = {
  title: 'Course Surveys — Admin',
};

export const dynamic = 'force-dynamic';

export default async function AdminCourseSurveysPage({ params }: Props) {
  const { locale } = await params;
  setRequestLocale(locale);

  const statuses = await getCourseSurveyStatuses();

  return (
    <div className="max-w-[1100px] space-y-6">
      <div className="space-y-1">
        <h1 className="text-[clamp(22px,2.5vw,28px)] font-bold tracking-[-0.02em] text-fg-primary">
          Course Surveys
        </h1>
        <p className="text-sm text-fg-tertiary">
          Build a pre-course survey for each course and assign it to enrolled students. An AI
          summary of responses is emailed to the course instructor(s).
        </p>
      </div>

      {statuses.length === 0 ? (
        <p className="rounded-xl border border-dashed border-border-default py-8 text-center text-sm text-fg-tertiary">
          No active courses.
        </p>
      ) : (
        <div className="overflow-hidden rounded-xl border border-border-default bg-bg-secondary">
          <table className="w-full text-sm">
            <thead>
              <tr className="text-left text-[12px] uppercase tracking-[0.04em] text-fg-tertiary">
                <th className="px-4 py-3 font-semibold">Course</th>
                <th className="px-4 py-3 font-semibold">Status</th>
                <th className="px-4 py-3 font-semibold">Questions</th>
                <th className="px-4 py-3 font-semibold">Responses</th>
                <th className="px-4 py-3 font-semibold sr-only">Open</th>
              </tr>
            </thead>
            <tbody>
              {statuses.map((s) => {
                const label = !s.surveyId ? 'None' : s.isActive ? 'Active' : 'Inactive';
                const style = !s.surveyId
                  ? 'bg-bg-tertiary text-fg-tertiary'
                  : s.isActive
                    ? 'bg-accent-teal/10 text-accent-teal'
                    : 'bg-amber-500/10 text-amber-600';
                return (
                  <tr key={s.courseId} className="border-t border-border-default">
                    <td className="px-4 py-3">
                      <Link
                        href={`/admin/course-surveys/${s.courseId}`}
                        className="font-medium text-fg-primary hover:text-accent-teal"
                      >
                        {s.courseTitle}
                      </Link>
                    </td>
                    <td className="px-4 py-3">
                      <span
                        className={`inline-block rounded-full px-2 py-0.5 text-[12px] font-medium ${style}`}
                      >
                        {label}
                      </span>
                    </td>
                    <td className="px-4 py-3 tabular-nums text-fg-secondary">{s.questionCount}</td>
                    <td className="px-4 py-3 tabular-nums text-fg-secondary">{s.responseCount}</td>
                    <td className="px-4 py-3 text-right">
                      <Link
                        href={`/admin/course-surveys/${s.courseId}`}
                        className="inline-flex items-center text-fg-tertiary hover:text-accent-teal"
                        aria-label="Open builder"
                      >
                        <ChevronRight size={18} />
                      </Link>
                    </td>
                  </tr>
                );
              })}
            </tbody>
          </table>
        </div>
      )}
    </div>
  );
}
