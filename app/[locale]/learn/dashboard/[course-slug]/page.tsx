import { setRequestLocale } from 'next-intl/server';
import { getTranslations } from 'next-intl/server';
import { redirect, notFound } from 'next/navigation';
import { createClient } from '@/lib/supabase/server';
import { getCourseWithCurriculum } from '@/lib/courses/queries';
import { hasCourseAccess } from '@/lib/enrollments/queries';
import { getCourseCompletion } from '@/lib/progress/queries';
import { getPublishedReportsForStudent } from '@/lib/tutoring/queries';
import { CourseHub } from '@/components/learn/CourseHub';
import type { SessionReport } from '@/lib/tutoring/types';

type Props = {
  params: Promise<{ locale: string; 'course-slug': string }>;
};

export async function generateMetadata({ params }: Props) {
  const { locale, 'course-slug': slug } = await params;
  const t = await getTranslations({ locale, namespace: 'learn' });
  const course = await getCourseWithCurriculum(slug);

  const title = course
    ? locale === 'ja' && course.title_jp
      ? course.title_jp
      : course.title_en
    : t('your_courses');

  return { title };
}

export default async function CourseHubPage({ params }: Props) {
  const { locale, 'course-slug': slug } = await params;
  setRequestLocale(locale);

  const supabase = await createClient();
  const { data: { user } } = await supabase.auth.getUser();

  if (!user) {
    const prefix = locale === 'ja' ? '/ja' : '';
    redirect(`${prefix}/learn/auth`);
  }

  // Fetch course first — 404 before enrollment check
  const course = await getCourseWithCurriculum(slug);
  if (!course) notFound();

  // An enrollment, or the Vault on a Vault-included course (B3).
  const access = await hasCourseAccess(user.id, course);

  // Real completion data — only meaningful for learners with course access.
  let completedSessionIds: string[] = [];
  let completedAssignmentIds: string[] = [];
  let percent = 0;
  if (access.hasAccess) {
    const completion = await getCourseCompletion(user.id, course.id);
    completedSessionIds = Array.from(completion.completedSessionIds);
    completedAssignmentIds = Array.from(completion.completedAssignmentIds);
    percent = completion.percent;
  }

  // Published 1v1 session reports (RLS restricts to the caller's own published rows).
  // 1v1 is enrollment-only; the Vault never includes it.
  let sessionReports: SessionReport[] = [];
  if (course.course_type === '1v1' && access.source === 'enrollment') {
    sessionReports = await getPublishedReportsForStudent(course.id, user.id);
  }

  return (
    <CourseHub
      course={course}
      locale={locale}
      isEnrolled={access.hasAccess}
      completedSessionIds={completedSessionIds}
      completedAssignmentIds={completedAssignmentIds}
      percent={percent}
      sessionReports={sessionReports}
    />
  );
}
