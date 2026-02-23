import { setRequestLocale } from 'next-intl/server';
import { getTranslations } from 'next-intl/server';
import { redirect } from 'next/navigation';
import { createClient } from '@/lib/supabase/server';
import { getUserEnrollments } from '@/lib/enrollments/queries';
import { getPublishedCourses } from '@/lib/courses/queries';
import { Container } from '@/components/layout/container';
import { Section } from '@/components/layout/section';
import { SectionHeading } from '@/components/ui/section-heading';
import { DashboardCourseCard } from '@/components/learn/DashboardCourseCard';
import { CourseCard } from '@/components/learn/CourseCard';

type Props = {
  params: Promise<{ locale: string }>;
  searchParams: Promise<{ enrolled?: string }>;
};

export async function generateMetadata({ params }: Props) {
  const { locale } = await params;
  const t = await getTranslations({ locale, namespace: 'learn' });

  return {
    title: t('your_courses'),
  };
}

export default async function DashboardPage({ params, searchParams }: Props) {
  const { locale } = await params;
  const sp = await searchParams;
  setRequestLocale(locale);

  const supabase = await createClient();
  const { data: { user } } = await supabase.auth.getUser();

  if (!user) {
    const prefix = locale === 'ja' ? '/ja' : '';
    redirect(`${prefix}/learn/auth`);
  }

  const t = await getTranslations({ locale, namespace: 'learn' });

  // Get user profile for display name
  const { data: profile } = await supabase
    .from('users')
    .select('full_name')
    .eq('id', user.id)
    .single();

  const enrollments = await getUserEnrollments(user.id);
  const allCourses = await getPublishedCourses();

  // Filter out already-enrolled courses for the "explore more" section
  const enrolledCourseIds = new Set(enrollments.map((e) => e.course_id));
  const exploreCourses = allCourses.filter((c) => !enrolledCourseIds.has(c.id));

  const displayName = profile?.full_name ?? user.email?.split('@')[0] ?? '';

  return (
    <>
      <Section>
        <Container>
          {/* Welcome + enrolled success toast */}
          <div className="mb-8">
            <h1 className="text-2xl font-serif text-fg-primary">
              {t('welcome_back', { name: displayName })}
            </h1>
            {sp.enrolled === 'true' && (
              <div className="mt-4 bg-accent-teal/10 border border-accent-teal/30 rounded-lg px-4 py-3">
                <p className="text-sm text-accent-teal font-medium">
                  {t('enrolled_success')}
                </p>
              </div>
            )}
          </div>

          {/* Enrolled Courses */}
          {enrollments.length > 0 ? (
            <div className="space-y-4">
              <h2 className="text-lg font-serif text-fg-primary">
                {t('your_courses')}
              </h2>
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                {enrollments.map((enrollment) => (
                  <DashboardCourseCard
                    key={enrollment.id}
                    enrollment={enrollment}
                  />
                ))}
              </div>
            </div>
          ) : (
            <div className="text-center py-16">
              <p className="text-fg-tertiary mb-4">{t('no_courses')}</p>
            </div>
          )}

          {/* Explore More */}
          {exploreCourses.length > 0 && (
            <div className="mt-16">
              <SectionHeading
                heading={t('explore_more')}
                centered
              />
              <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6 max-w-[1100px] mx-auto mt-8">
                {exploreCourses.map((course) => (
                  <CourseCard key={course.id} course={course} />
                ))}
              </div>
            </div>
          )}
        </Container>
      </Section>
    </>
  );
}
