import { setRequestLocale } from 'next-intl/server';
import { notFound } from 'next/navigation';
import Link from 'next/link';
import { ChevronLeft } from 'lucide-react';
import { getReportForAdmin, getTutoringCourse } from '@/lib/tutoring/queries';
import { SessionReportReviewPanel } from '@/components/admin/SessionReportReviewPanel';

type Props = {
  params: Promise<{ locale: string; courseId: string; reportId: string }>;
};

export const metadata = {
  title: 'Session Report — Admin',
};

export const dynamic = 'force-dynamic';

export default async function AdminSessionReportPage({ params }: Props) {
  const { locale, courseId, reportId } = await params;
  setRequestLocale(locale);

  const report = await getReportForAdmin(reportId);
  if (!report || report.course_id !== courseId) notFound();

  const course = await getTutoringCourse(courseId);

  return (
    <div className="max-w-[960px] space-y-6">
      <Link
        href={`/admin/tutoring/${courseId}`}
        className="inline-flex items-center gap-1 text-[13px] text-fg-tertiary hover:text-accent-teal"
      >
        <ChevronLeft size={15} /> {course?.title_en ?? 'Back to engagement'}
      </Link>

      <SessionReportReviewPanel
        courseId={courseId}
        studentName={course?.student?.full_name ?? null}
        report={{
          id: report.id,
          status: report.status,
          sessionDate: report.session_date,
          topic: report.topic,
          durationMinutes: report.duration_minutes,
          publishedAt: report.published_at,
          patternsAppliedAt: report.patterns_applied_at,
          instructorJson: report.private?.instructor_json ?? null,
          marginNotes: report.private?.margin_notes ?? null,
          generationError: report.private?.generation_error ?? null,
          hasTranscript: !!report.private?.transcript_ref,
          hasImages: (report.private?.source_image_refs?.length ?? 0) > 0,
          hasStudentJson: !!report.student_json,
        }}
      />
    </div>
  );
}
