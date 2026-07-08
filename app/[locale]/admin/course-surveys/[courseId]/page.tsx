import { setRequestLocale } from 'next-intl/server';
import { notFound } from 'next/navigation';
import { createAdminClient } from '@/lib/supabase/server';
import {
  getCourseSurveyBundle,
  getCourseResponseCount,
  getCourseSummaryDelivery,
} from '@/lib/survey/course-surveys';
import { getCourseSummaryForSend } from '@/lib/survey/course-summary';
import { CourseSurveyBuilder } from '@/components/admin/course-survey/CourseSurveyBuilder';
import { CourseSummaryView } from '@/components/admin/course-survey/CourseSummaryView';
import { SendCourseSummaryButton } from '@/components/admin/course-survey/SendCourseSummaryButton';

type Props = {
  params: Promise<{ locale: string; courseId: string }>;
};

export const metadata = {
  title: 'Course Survey — Admin',
};

export const dynamic = 'force-dynamic';

function fmt(iso: string): string {
  return new Date(iso).toLocaleString('en-US', { dateStyle: 'medium', timeStyle: 'short' });
}

export default async function AdminCourseSurveyBuilderPage({ params }: Props) {
  const { locale, courseId } = await params;
  setRequestLocale(locale);

  const supabase = createAdminClient();
  const { data: course } = await supabase
    .from('courses')
    .select('id, title_en, title_jp')
    .eq('id', courseId)
    .maybeSingle();
  if (!course) notFound();

  const bundle = await getCourseSurveyBundle(courseId);
  const responseCount = bundle ? await getCourseResponseCount(bundle.survey.id) : 0;
  const hasResponses = responseCount > 0;

  const [summary, delivery] =
    bundle && hasResponses
      ? await Promise.all([
          getCourseSummaryForSend(bundle.survey.id),
          getCourseSummaryDelivery(bundle.survey.id),
        ])
      : [null, null];

  return (
    <div className="space-y-8">
      <CourseSurveyBuilder
        course={{ id: course.id, titleEn: course.title_en, titleJp: course.title_jp }}
        survey={bundle?.survey ?? null}
        settings={bundle?.settings ?? null}
        questions={bundle?.questions ?? []}
        hasResponses={hasResponses}
      />

      {bundle && hasResponses && (
        <section className="max-w-[860px] space-y-4 rounded-xl border border-border-default bg-bg-secondary p-5">
          <h2 className="text-[16px] font-semibold text-fg-primary">Responses & instructor summary</h2>

          <div className="flex flex-wrap items-center gap-3">
            <SendCourseSummaryButton surveyId={bundle.survey.id} courseId={course.id} />
            {delivery?.sentAt && (
              <span className="text-[12px] text-fg-tertiary">Last sent {fmt(delivery.sentAt)}</span>
            )}
            {delivery?.status === 'failed' && !delivery.sentAt && (
              <span className="text-[12px] text-red-600">Last send failed</span>
            )}
          </div>

          {summary ? (
            <CourseSummaryView
              responseCount={summary.responseCount}
              content={summary.content}
              stats={summary.stats}
            />
          ) : (
            <p className="text-[13px] text-fg-tertiary">
              {responseCount} response(s). The summary generates on the next submission, or when you
              send it to the instructor.
            </p>
          )}
        </section>
      )}
    </div>
  );
}
