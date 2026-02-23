import { setRequestLocale } from 'next-intl/server';
import { getTranslations } from 'next-intl/server';
import { redirect, notFound } from 'next/navigation';
import { createClient } from '@/lib/supabase/server';
import { getCourseWithCurriculum } from '@/lib/courses/queries';
import { checkEnrollment } from '@/lib/enrollments/queries';
import { Container } from '@/components/layout/container';
import { Section } from '@/components/layout/section';
import { CourseHub } from '@/components/learn/CourseHub';

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

  // Check enrollment
  const enrollmentCheck = await checkEnrollment(user.id, slug);
  if (!enrollmentCheck.is_enrolled) {
    const prefix = locale === 'ja' ? '/ja' : '';
    redirect(`${prefix}/learn/${slug}`);
  }

  // Fetch course with full curriculum
  const course = await getCourseWithCurriculum(slug);
  if (!course) notFound();

  return (
    <Section>
      <Container>
        <CourseHub course={course} locale={locale} />
      </Container>
    </Section>
  );
}
