import { setRequestLocale } from 'next-intl/server';
import { getTranslations } from 'next-intl/server';
import { redirect, notFound } from 'next/navigation';
import { createClient } from '@/lib/supabase/server';
import { getCourseWithCurriculum } from '@/lib/courses/queries';
import { checkEnrollment } from '@/lib/enrollments/queries';
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

  const enrollmentCheck = await checkEnrollment(user.id, slug);

  // Real completion data — only meaningful for enrolled/completed students.
  let completedSessionIds: string[] = [];
  let completedAssignmentIds: string[] = [];
  let percent = 0;
  if (enrollmentCheck.is_enrolled) {
    const completion = await getCourseCompletion(user.id, course.id);
    completedSessionIds = Array.from(completion.completedSessionIds);
    completedAssignmentIds = Array.from(completion.completedAssignmentIds);
    percent = completion.percent;
  }

  // Published 1v1 session reports (RLS restricts to the caller's own published rows).
  let sessionReports: SessionReport[] = [];
  if (course.course_type === '1v1' && enrollmentCheck.is_enrolled) {
    sessionReports = await getPublishedReportsForStudent(course.id, user.id);
  }

  return (
    <CourseHub
      course={course}
      locale={locale}
      isEnrolled={enrollmentCheck.is_enrolled}
      completedSessionIds={completedSessionIds}
      completedAssignmentIds={completedAssignmentIds}
      percent={percent}
      sessionReports={sessionReports}
    />
  );
}
