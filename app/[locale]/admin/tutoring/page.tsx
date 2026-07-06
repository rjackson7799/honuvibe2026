import { setRequestLocale } from 'next-intl/server';
import Link from 'next/link';
import { ChevronRight } from 'lucide-react';
import { list1v1Courses } from '@/lib/tutoring/queries';
import { NewTutoringEngagement } from '@/components/admin/NewTutoringEngagement';

type Props = {
  params: Promise<{ locale: string }>;
};

export const metadata = {
  title: '1v1 Sessions — Admin',
};

export const dynamic = 'force-dynamic';

function fmtDate(d: string | null): string {
  if (!d) return '—';
  return new Date(`${d}T00:00:00`).toLocaleDateString('en-US', { dateStyle: 'medium' });
}

export default async function AdminTutoringPage({ params }: Props) {
  const { locale } = await params;
  setRequestLocale(locale);

  const courses = await list1v1Courses();

  return (
    <div className="max-w-[1100px] space-y-6">
      <div className="flex flex-wrap items-start justify-between gap-3">
        <div className="space-y-1">
          <h1 className="text-[clamp(22px,2.5vw,28px)] font-bold tracking-[-0.02em] text-fg-primary">
            1v1 Sessions
          </h1>
          <p className="text-sm text-fg-tertiary">
            Private tutoring engagements. Paste a session transcript to generate a diagnostic
            report, review and edit it, then publish it to the student&apos;s dashboard.
          </p>
        </div>
        {courses.length > 0 && <NewTutoringEngagement />}
      </div>

      {courses.length === 0 ? (
        <div className="space-y-4 rounded-xl border border-dashed border-border-default px-6 py-8 text-center">
          <p className="text-sm text-fg-tertiary">
            No 1v1 engagements yet. Create one below, then enroll the student at{' '}
            <code className="text-fg-secondary">/admin/students/new</code> — it appears here once
            they&apos;re enrolled.
          </p>
          <div className="flex justify-center">
            <NewTutoringEngagement />
          </div>
        </div>
      ) : (
        <div className="overflow-hidden rounded-xl border border-border-default bg-bg-secondary">
          <table className="w-full text-sm">
            <thead>
              <tr className="text-left text-[12px] uppercase tracking-[0.04em] text-fg-tertiary">
                <th className="px-4 py-3 font-semibold">Engagement</th>
                <th className="px-4 py-3 font-semibold">Student</th>
                <th className="px-4 py-3 font-semibold">Reports</th>
                <th className="px-4 py-3 font-semibold">Last session</th>
                <th className="px-4 py-3 font-semibold sr-only">Open</th>
              </tr>
            </thead>
            <tbody>
              {courses.map((c) => (
                <tr key={c.courseId} className="border-t border-border-default">
                  <td className="px-4 py-3">
                    <Link
                      href={`/admin/tutoring/${c.courseId}`}
                      className="font-medium text-fg-primary hover:text-accent-teal"
                    >
                      {c.titleEn}
                    </Link>
                  </td>
                  <td className="px-4 py-3 text-fg-secondary">
                    {c.studentName ?? c.studentEmail ?? (
                      <span className="text-fg-tertiary">No active enrollee</span>
                    )}
                  </td>
                  <td className="px-4 py-3 tabular-nums text-fg-secondary">{c.reportCount}</td>
                  <td className="px-4 py-3 text-fg-secondary">{fmtDate(c.lastSessionDate)}</td>
                  <td className="px-4 py-3 text-right">
                    <Link
                      href={`/admin/tutoring/${c.courseId}`}
                      className="inline-flex items-center text-fg-tertiary hover:text-accent-teal"
                      aria-label="Open engagement"
                    >
                      <ChevronRight size={18} />
                    </Link>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}
    </div>
  );
}
