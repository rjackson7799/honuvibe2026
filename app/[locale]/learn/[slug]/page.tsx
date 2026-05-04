import { setRequestLocale } from 'next-intl/server';
import { getTranslations } from 'next-intl/server';
import { notFound } from 'next/navigation';
import { createClient } from '@/lib/supabase/server';
import { getCourseWithCurriculum } from '@/lib/courses/queries';
import { getFreeSessionIds } from '@/lib/courses/utils';
import { checkEnrollment } from '@/lib/enrollments/queries';
import { MarketingShell } from '@/components/marketing/shell';
import { MarketingNav } from '@/components/marketing/nav/marketing-nav';
import { MarketingFooter } from '@/components/marketing/footer/marketing-footer';
import { MarketingNewsletter } from '@/components/marketing/newsletter/marketing-newsletter';
import { Section } from '@/components/marketing/primitives/section';
import { Container } from '@/components/marketing/primitives/container';
import { Overline } from '@/components/marketing/primitives/overline';
import { SectionHeading } from '@/components/marketing/primitives/section-heading';
import { CourseDetailHero } from '@/components/learn/CourseDetailHero';
import { LearningOutcomes } from '@/components/learn/LearningOutcomes';
import { ToolsBadges } from '@/components/learn/ToolsBadges';
import { HowItWorks } from '@/components/learn/HowItWorks';
import { CurriculumAccordion } from '@/components/learn/CurriculumAccordion';
import { BonusSessionsSection } from '@/components/learn/BonusSessionsSection';
import { StickyEnrollSidebar } from '@/components/learn/StickyEnrollSidebar';
import { StickyEnrollBar } from '@/components/learn/StickyEnrollBar';
import { InstructorCard } from '@/components/learn/InstructorCard';
import { CourseDetailFinalCta } from '@/components/learn/CourseDetailFinalCta';

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

  // Compute which sessions are free previews
  const freeSessionIds = getFreeSessionIds(course.free_preview_count, course.weeks);

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

  const isInProgress =
    (course.start_date ? new Date(course.start_date) <= new Date() : false) ||
    course.status === 'in-progress';

  const isRecordedOnly = !course.live_sessions_count;

  const languageLabel =
    course.language === 'both'
      ? t('lang_both')
      : course.language === 'ja'
        ? t('lang_ja')
        : t('lang_en');

  const formatLabel = course.format ?? null;
  const levelLabel = course.level ? t(course.level) : null;

  const statsParts: string[] = [];
  if (course.total_weeks) statsParts.push(t('weeks', { count: course.total_weeks }));
  if (course.live_sessions_count)
    statsParts.push(t('live_sessions', { count: course.live_sessions_count }));
  if (course.recorded_lessons_count)
    statsParts.push(t('recorded_lessons', { count: course.recorded_lessons_count }));
  if (course.max_enrollment)
    statsParts.push(`${t('cohort_size')}: ${course.max_enrollment}`);

  const hasWhoIsFor = !!(course.who_is_for_en || course.who_is_for_jp);
  const hasPrerequisites = !!(course.prerequisites_en || course.prerequisites_jp);
  const hasInstructors =
    (course.instructors ?? []).length > 0 ||
    !!course.instructor ||
    !!course.instructor_name;
  const hasLogistics = !!(
    course.schedule_notes_en ||
    course.schedule_notes_jp ||
    course.cancellation_policy_en ||
    course.cancellation_policy_jp
  );
  const hasMaterials = !!(course.materials_summary_en || course.materials_summary_jp);

  return (
    <MarketingShell>
      <MarketingNav />
      <main className="pb-24 md:pb-0">
        {/* Hero */}
        <CourseDetailHero
          title={title}
          jpTitle={jpTitle}
          description={description}
          level={course.level}
          levelLabel={levelLabel}
          formatLabel={formatLabel}
          languageLabel={languageLabel}
          heroImageUrl={course.hero_image_url}
          thumbnailUrl={course.thumbnail_url}
          tags={course.tags}
          locale={locale}
          breadcrumbLabel={t('breadcrumb_learn')}
          slug={slug}
          statsParts={statsParts}
        />

        {/* Body — sticky sidebar wraps the full body */}
        <Section variant="canvas" spacing="default">
          <Container>
            <div className="md:grid md:grid-cols-[minmax(0,1fr)_288px] md:gap-12">
              <div className="min-w-0 space-y-16">
                {/* Outcomes + Tools */}
                <div className="grid gap-10 md:grid-cols-2 md:gap-12">
                  <LearningOutcomes
                    outcomes={
                      locale === 'ja' && course.learning_outcomes_jp?.length
                        ? course.learning_outcomes_jp
                        : course.learning_outcomes_en
                    }
                  />
                  <ToolsBadges tools={course.tools_covered} />
                </div>

                {/* How It Works */}
                <HowItWorks
                  communityMonths={course.community_duration_months}
                  isRecordedOnly={isRecordedOnly}
                />

                {/* Curriculum */}
                <CurriculumAccordion
                  weeks={course.weeks}
                  isEnrolled={isEnrolled}
                  isLoggedIn={!!user}
                  freeSessionIds={Array.from(freeSessionIds)}
                />

                {/* Bonus Sessions */}
                {course.bonusSessions && course.bonusSessions.length > 0 && (
                  <BonusSessionsSection
                    sessions={course.bonusSessions}
                    isEnrolled={isEnrolled}
                  />
                )}

                {/* Who is this for + Prerequisites */}
                {(hasWhoIsFor || hasPrerequisites) && (
                  <div className="grid gap-10 md:grid-cols-2 md:gap-12">
                    {hasWhoIsFor && (
                      <div>
                        <SectionHeading size="h3" className="mb-4">
                          {t('who_is_for')}
                        </SectionHeading>
                        <ul className="space-y-2">
                          {(
                            (locale === 'ja' && course.who_is_for_jp
                              ? course.who_is_for_jp
                              : course.who_is_for_en) ?? []
                          ).map((item, i) => (
                            <li
                              key={i}
                              className="text-[var(--m-ink-secondary)] flex gap-2"
                            >
                              <span className="text-[var(--m-accent-teal)] mt-1">•</span>
                              <span>{item}</span>
                            </li>
                          ))}
                        </ul>
                      </div>
                    )}

                    {hasPrerequisites && (
                      <div>
                        <SectionHeading size="h3" className="mb-4">
                          {t('prerequisites')}
                        </SectionHeading>
                        <p className="text-[var(--m-ink-secondary)] leading-relaxed">
                          {locale === 'ja' && course.prerequisites_jp
                            ? course.prerequisites_jp
                            : course.prerequisites_en}
                        </p>
                      </div>
                    )}
                  </div>
                )}

                {/* Instructors */}
                {hasInstructors && (
                  <div>
                    <SectionHeading size="h2" className="mb-6">
                      {(course.instructors ?? []).length > 1
                        ? t('instructors')
                        : t('instructor')}
                    </SectionHeading>
                    {(course.instructors ?? []).length > 0 ? (
                      <div className="space-y-4">
                        {course.instructors.map((ci) => (
                          <div key={ci.id}>
                            {(course.instructors ?? []).length > 1 && (
                              <Overline className="mb-2">
                                {ci.role === 'lead'
                                  ? t('lead_instructor')
                                  : ci.role === 'guest'
                                    ? t('guest_instructor')
                                    : ''}
                              </Overline>
                            )}
                            <InstructorCard
                              instructor={ci.instructor}
                              fallbackName={null}
                              locale={locale}
                            />
                          </div>
                        ))}
                      </div>
                    ) : (
                      <InstructorCard
                        instructor={course.instructor ?? null}
                        fallbackName={course.instructor_name}
                        locale={locale}
                      />
                    )}
                  </div>
                )}

                {/* Logistics + Materials */}
                {(hasLogistics || hasMaterials) && (
                  <div className="space-y-12">
                    {hasLogistics && (
                      <div>
                        <SectionHeading size="h3" className="mb-4">
                          {t('logistics')}
                        </SectionHeading>
                        <div className="bg-[var(--m-white)] border border-[var(--m-border-default)] rounded-[var(--m-radius-lg)] p-6 shadow-[var(--m-shadow-xs)] space-y-4 text-sm">
                          {(course.schedule_notes_en || course.schedule_notes_jp) && (
                            <div className="flex gap-4">
                              <span className="font-bold text-[var(--m-ink-primary)] w-28 shrink-0">
                                {t('schedule')}
                              </span>
                              <span className="text-[var(--m-ink-secondary)] leading-relaxed">
                                {locale === 'ja' && course.schedule_notes_jp
                                  ? course.schedule_notes_jp
                                  : course.schedule_notes_en}
                              </span>
                            </div>
                          )}
                          {(course.cancellation_policy_en || course.cancellation_policy_jp) && (
                            <div className="flex gap-4">
                              <span className="font-bold text-[var(--m-ink-primary)] w-28 shrink-0">
                                {t('cancellation_policy')}
                              </span>
                              <span className="text-[var(--m-ink-secondary)] leading-relaxed">
                                {locale === 'ja' && course.cancellation_policy_jp
                                  ? course.cancellation_policy_jp
                                  : course.cancellation_policy_en}
                              </span>
                            </div>
                          )}
                        </div>
                      </div>
                    )}

                    {hasMaterials && (
                      <div>
                        <SectionHeading size="h3" className="mb-4">
                          {t('materials')}
                        </SectionHeading>
                        <div className="bg-[var(--m-white)] border border-[var(--m-border-default)] rounded-[var(--m-radius-lg)] shadow-[var(--m-shadow-xs)] overflow-hidden">
                          <div className="overflow-x-auto">
                            <table className="w-full text-sm">
                              <thead>
                                <tr className="border-b border-[var(--m-border-soft)]">
                                  <th className="text-left py-3 px-5 text-[11.5px] font-bold uppercase tracking-[0.06em] text-[var(--m-ink-tertiary)]">
                                    {t('material_name')}
                                  </th>
                                  <th className="text-left py-3 px-5 text-[11.5px] font-bold uppercase tracking-[0.06em] text-[var(--m-ink-tertiary)]">
                                    {t('material_language')}
                                  </th>
                                  <th className="text-left py-3 px-5 text-[11.5px] font-bold uppercase tracking-[0.06em] text-[var(--m-ink-tertiary)]">
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
                                ).map((m, i, arr) => (
                                  <tr
                                    key={i}
                                    className={
                                      i < arr.length - 1
                                        ? 'border-b border-[var(--m-border-soft)]'
                                        : ''
                                    }
                                  >
                                    <td className="py-3 px-5 text-[var(--m-ink-primary)] font-medium">
                                      {m.material}
                                    </td>
                                    <td className="py-3 px-5 text-[var(--m-ink-secondary)]">
                                      {m.language}
                                    </td>
                                    <td className="py-3 px-5 text-[var(--m-ink-secondary)]">
                                      {m.provided_with}
                                    </td>
                                  </tr>
                                ))}
                              </tbody>
                            </table>
                          </div>
                        </div>
                      </div>
                    )}
                  </div>
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
                freePreviewCount={course.free_preview_count}
                isRecordedOnly={isRecordedOnly}
              />
            </div>
          </Container>
        </Section>

        {/* Final CTA */}
        <CourseDetailFinalCta
          courseId={course.id}
          courseSlug={course.slug}
          isLoggedIn={!!user}
          isEnrolled={isEnrolled}
          isFull={isFull}
          isInProgress={isInProgress}
          priceUsd={course.price_usd}
          priceJpy={course.price_jpy}
        />
      </main>
      <MarketingNewsletter />
      <MarketingFooter />

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
        isInProgress={isInProgress}
      />
    </MarketingShell>
  );
}
