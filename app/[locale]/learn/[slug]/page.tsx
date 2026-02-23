import { setRequestLocale } from 'next-intl/server';
import { getTranslations } from 'next-intl/server';
import { notFound } from 'next/navigation';
import { createClient } from '@/lib/supabase/server';
import { getCourseWithCurriculum } from '@/lib/courses/queries';
import { checkEnrollment } from '@/lib/enrollments/queries';
import { Container } from '@/components/layout/container';
import { Section } from '@/components/layout/section';
import { CourseDetailHero } from '@/components/learn/CourseDetailHero';
import { LearningOutcomes } from '@/components/learn/LearningOutcomes';
import { ToolsBadges } from '@/components/learn/ToolsBadges';
import { HowItWorks } from '@/components/learn/HowItWorks';
import { CurriculumAccordion } from '@/components/learn/CurriculumAccordion';
import { StickyEnrollSidebar } from '@/components/learn/StickyEnrollSidebar';
import { StickyEnrollBar } from '@/components/learn/StickyEnrollBar';
import { Divider } from '@/components/ui/divider';

type Props = {
  params: Promise<{ locale: string; slug: string }>;
};

export async function generateMetadata({ params }: Props) {
  const { locale, slug } = await params;
  const course = await getCourseWithCurriculum(slug);

  if (!course) return { title: 'Course Not Found' };

  const title =
    locale === 'ja' && course.title_jp ? course.title_jp : course.title_en;

  return {
    title,
    description:
      locale === 'ja' && course.description_jp
        ? course.description_jp
        : course.description_en,
  };
}

export default async function CourseDetailPage({ params }: Props) {
  const { locale, slug } = await params;
  setRequestLocale(locale);

  const course = await getCourseWithCurriculum(slug);
  if (!course) notFound();

  const t = await getTranslations({ locale, namespace: 'learn' });

  // Check auth + enrollment status
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();

  let isEnrolled = false;
  if (user) {
    const enrollment = await checkEnrollment(user.id, slug);
    isEnrolled = enrollment.is_enrolled;
  }

  const title =
    locale === 'ja' && course.title_jp ? course.title_jp : course.title_en;
  const jpTitle = course.title_jp;
  const description =
    locale === 'ja' && course.description_jp
      ? course.description_jp
      : course.description_en;

  const isFull =
    !!course.max_enrollment &&
    course.current_enrollment >= course.max_enrollment;

  const overlineParts = [
    course.level ? t(course.level) : null,
    course.format,
    course.language === 'both'
      ? 'EN (JP Materials)'
      : course.language?.toUpperCase(),
  ].filter(Boolean) as string[];

  return (
    <>
      {/* Hero Header */}
      <CourseDetailHero
        title={title}
        jpTitle={jpTitle}
        description={description}
        overlineParts={overlineParts}
        heroImageUrl={course.hero_image_url}
        thumbnailUrl={course.thumbnail_url}
        tags={course.tags}
        locale={locale}
        breadcrumbLabel={t('breadcrumb_learn')}
      />

      {/* Course Content */}
      <Section noReveal className="!pt-8">
        <Container className="max-w-[1100px]">
          <div className="flex gap-8">
            {/* Main Content */}
            <div className="flex-1 min-w-0">
              {/* Stats strip */}
              <div className="flex flex-wrap gap-4 text-sm text-fg-tertiary">
                {course.total_weeks && (
                  <span>{t('weeks', { count: course.total_weeks })}</span>
                )}
                {course.live_sessions_count && (
                  <span>
                    {t('live_sessions', {
                      count: course.live_sessions_count,
                    })}
                  </span>
                )}
                {course.recorded_lessons_count && (
                  <span>
                    {t('recorded_lessons', {
                      count: course.recorded_lessons_count,
                    })}
                  </span>
                )}
                {course.max_enrollment && (
                  <span>
                    {t('cohort_size')}: {course.max_enrollment}
                  </span>
                )}
              </div>

              <Divider className="my-8" />

              {/* What You'll Master */}
              <LearningOutcomes
                outcomesEn={course.learning_outcomes_en}
                outcomesJp={course.learning_outcomes_jp}
              />

              <Divider className="my-8" />

              {/* Tools */}
              <ToolsBadges tools={course.tools_covered} />

              <Divider className="my-8" />

              {/* How It Works */}
              <HowItWorks
                communityMonths={course.community_duration_months}
              />

              <Divider className="my-8" />

              {/* Curriculum */}
              <CurriculumAccordion weeks={course.weeks} />

              <Divider className="my-8" />

              {/* Who is this for */}
              {(course.who_is_for_en || course.who_is_for_jp) && (
                <>
                  <h2 className="text-xl font-serif text-fg-primary mb-4">
                    {t('who_is_for')}
                  </h2>
                  <ul className="space-y-2">
                    {(
                      (locale === 'ja' && course.who_is_for_jp
                        ? course.who_is_for_jp
                        : course.who_is_for_en) ?? []
                    ).map((item, i) => (
                      <li
                        key={i}
                        className="text-fg-secondary flex gap-2"
                      >
                        <span className="text-accent-teal">•</span>
                        {item}
                      </li>
                    ))}
                  </ul>
                  <Divider className="my-8" />
                </>
              )}

              {/* Prerequisites */}
              {(course.prerequisites_en || course.prerequisites_jp) && (
                <>
                  <h2 className="text-xl font-serif text-fg-primary mb-4">
                    {t('prerequisites')}
                  </h2>
                  <p className="text-fg-secondary">
                    {locale === 'ja' && course.prerequisites_jp
                      ? course.prerequisites_jp
                      : course.prerequisites_en}
                  </p>
                  <Divider className="my-8" />
                </>
              )}

              {/* Instructor */}
              {course.instructor_name && (
                <>
                  <h2 className="text-xl font-serif text-fg-primary mb-4">
                    {t('instructor')}
                  </h2>
                  <div className="flex items-center gap-4">
                    <div className="w-16 h-16 rounded-full bg-bg-tertiary" />
                    <div>
                      <p className="font-medium text-fg-primary">
                        {course.instructor_name}
                      </p>
                      <a
                        href={locale === 'ja' ? '/ja/about' : '/about'}
                        className="text-sm text-accent-teal hover:underline"
                      >
                        {t('read_more_instructor', {
                          name: course.instructor_name,
                        })}
                      </a>
                    </div>
                  </div>
                  <Divider className="my-8" />
                </>
              )}

              {/* Logistics */}
              {(course.schedule_notes_en || course.cancellation_policy_en) && (
                <>
                  <h2 className="text-xl font-serif text-fg-primary mb-4">
                    {t('logistics')}
                  </h2>
                  <div className="space-y-3 text-sm">
                    {course.schedule_notes_en && (
                      <div className="flex gap-3">
                        <span className="font-medium text-fg-primary w-24 shrink-0">
                          {t('schedule')}
                        </span>
                        <span className="text-fg-secondary">
                          {locale === 'ja' && course.schedule_notes_jp
                            ? course.schedule_notes_jp
                            : course.schedule_notes_en}
                        </span>
                      </div>
                    )}
                    {course.cancellation_policy_en && (
                      <div className="flex gap-3">
                        <span className="font-medium text-fg-primary w-24 shrink-0">
                          {t('cancellation_policy')}
                        </span>
                        <span className="text-fg-secondary">
                          {locale === 'ja' &&
                          course.cancellation_policy_jp
                            ? course.cancellation_policy_jp
                            : course.cancellation_policy_en}
                        </span>
                      </div>
                    )}
                  </div>
                  <Divider className="my-8" />
                </>
              )}

              {/* Materials */}
              {course.materials_summary_en && (
                <>
                  <h2 className="text-xl font-serif text-fg-primary mb-4">
                    {t('materials')}
                  </h2>
                  <div className="overflow-x-auto">
                    <table className="w-full text-sm">
                      <thead>
                        <tr className="border-b border-border-default">
                          <th className="text-left py-2 text-fg-tertiary font-medium">
                            {t('material_name')}
                          </th>
                          <th className="text-left py-2 text-fg-tertiary font-medium">
                            {t('material_language')}
                          </th>
                          <th className="text-left py-2 text-fg-tertiary font-medium">
                            {t('material_included')}
                          </th>
                        </tr>
                      </thead>
                      <tbody>
                        {(
                          (locale === 'ja' && course.materials_summary_jp
                            ? course.materials_summary_jp
                            : course.materials_summary_en) as {
                            material: string;
                            language: string;
                            provided_with: string;
                          }[]
                        ).map((m, i) => (
                          <tr
                            key={i}
                            className="border-b border-border-default"
                          >
                            <td className="py-2 text-fg-primary">
                              {m.material}
                            </td>
                            <td className="py-2 text-fg-secondary">
                              {m.language}
                            </td>
                            <td className="py-2 text-fg-secondary">
                              {m.provided_with}
                            </td>
                          </tr>
                        ))}
                      </tbody>
                    </table>
                  </div>
                </>
              )}
            </div>

            {/* Sticky Sidebar (Desktop) */}
            <StickyEnrollSidebar
              title={title}
              courseId={course.id}
              courseSlug={course.slug}
              priceUsd={course.price_usd}
              priceJpy={course.price_jpy}
              startDate={course.start_date}
              currentEnrollment={course.current_enrollment}
              maxEnrollment={course.max_enrollment}
              status={course.status}
              isLoggedIn={!!user}
              isEnrolled={isEnrolled}
              thumbnailUrl={course.thumbnail_url}
            />
          </div>
        </Container>
      </Section>

      {/* Sticky Mobile Bar */}
      <StickyEnrollBar
        title={title}
        courseId={course.id}
        courseSlug={course.slug}
        priceUsd={course.price_usd}
        priceJpy={course.price_jpy}
        isLoggedIn={!!user}
        isEnrolled={isEnrolled}
        isFull={isFull}
      />
    </>
  );
}
