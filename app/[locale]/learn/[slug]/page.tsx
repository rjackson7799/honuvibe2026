import { cache } from 'react';
import type { Metadata } from 'next';
import { getTranslations, setRequestLocale } from 'next-intl/server';
import { notFound } from 'next/navigation';
import { createClient } from '@/lib/supabase/server';
import { getCourseWithCurriculum } from '@/lib/courses/queries';
import { hasCourseAccess } from '@/lib/enrollments/queries';
import { getPageQuotes } from '@/lib/proof/page-quotes';
import { buildCourseDetailView } from '@/lib/learn/course-detail';
import { resolveCourseCta } from '@/lib/learn/course-cta';
import { MarketingShell } from '@/components/marketing/shell';
import { MarketingNav } from '@/components/marketing/nav/marketing-nav';
import { MarketingFooter } from '@/components/marketing/footer/marketing-footer';
import { MarketingNewsletter } from '@/components/marketing/newsletter/marketing-newsletter';
import { HvReveal } from '@/components/marketing/hv';
import {
  CourseClosing,
  CourseCurriculum,
  CourseFaq,
  CourseHero,
  CourseInstructors,
  CourseOutcomes,
  CourseOverview,
  CourseSubnav,
  CourseSyllabus,
  courseCtaLabel,
  type CurriculumOpen,
} from '@/components/marketing/course';

// The design's tweakable props (docs/design_2026_green/pages/03 Course - AI Essentials.dc.html).
const SHOW_SUBNAV = true;
const CURRICULUM_OPEN: CurriculumOpen = 'first';
const ANIMATE_HERO = true;
const SCROLL_REVEAL = true;

type Props = {
  params: Promise<{ locale: string; slug: string }>;
};

// One course read per request, shared by generateMetadata and the page.
const loadCourse = cache(getCourseWithCurriculum);

export async function generateMetadata({ params }: Props): Promise<Metadata> {
  const { locale, slug } = await params;
  const course = await loadCourse(slug);
  if (!course) return { title: 'Course Not Found' };

  const ja = locale === 'ja';
  const path = `/learn/${course.slug}`;
  return {
    title: ja && course.title_jp ? course.title_jp : course.title_en,
    description: (ja && course.description_jp) || course.description_en || undefined,
    alternates: {
      canonical: ja ? `/ja${path}` : path,
      languages: { en: path, ja: `/ja${path}` },
    },
    // Unlisted courses stay reachable by link but are never indexed.
    ...(course.is_private ? { robots: { index: false, follow: false } } : {}),
  };
}

/**
 * Course detail (redesign Unit 2b). Dynamic on purpose (plan D1): the CTA and
 * price card follow the viewer's access. Reads go through the cookie client,
 * so course_catalog nulls paid fields per viewer, and every section receives
 * only the whitelisted view model (lib/learn/course-detail.ts).
 */
export default async function CourseDetailPage({ params }: Props) {
  const { locale: rawLocale, slug } = await params;
  setRequestLocale(rawLocale);
  const locale = rawLocale === 'ja' ? 'ja' : 'en';

  const course = await loadCourse(slug);
  if (!course) notFound();

  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();

  const [access, quotes, t] = await Promise.all([
    user ? hasCourseAccess(user.id, course) : Promise.resolve(null),
    getPageQuotes(locale),
    getTranslations({ locale, namespace: 'course_detail' }),
  ]);

  const now = new Date();
  const view = buildCourseDetailView(course, locale, now);
  const cta = resolveCourseCta({
    slug: course.slug,
    locale,
    signedIn: !!user,
    accessSource: access?.source ?? null,
    now,
    course: {
      course_type: course.course_type,
      status: course.status,
      vault_included: course.vault_included === true,
      start_date: course.start_date,
      max_enrollment: course.max_enrollment,
      current_enrollment: course.current_enrollment,
      price_usd: course.price_usd,
      price_jpy: course.price_jpy,
    },
  });
  const ctaLabel = courseCtaLabel(cta, view, locale, t);

  const everyModuleHasTask = view.modules.length > 0 && view.modules.every((m) => m.task);
  const curriculumHeading = t(everyModuleHasTask ? 'curriculum.title_with_tasks' : 'curriculum.title', {
    n: view.modules.length,
  });
  const curriculumSub =
    view.formatKind === 'one_on_one'
      ? null
      : t(view.formatKind === 'live_cohort' ? 'curriculum.sub_cohort' : 'curriculum.sub_self_paced');

  const hasOverview = view.audience.length > 0 || !!view.prerequisites || view.tools.length > 0;
  const sections = [
    hasOverview && { id: 'overview', label: t('subnav.overview') },
    view.outcomes.length > 0 && { id: 'outcomes', label: t('subnav.outcomes') },
    view.modules.length > 0 && { id: 'curriculum', label: t('subnav.curriculum') },
    view.instructors.length > 0 && { id: 'instructors', label: t('subnav.instructors') },
    view.syllabusLocales.length > 0 && { id: 'syllabus', label: t('subnav.syllabus') },
    { id: 'faq', label: t('subnav.faq') },
  ].filter((s): s is { id: string; label: string } => Boolean(s));

  return (
    <MarketingShell theme="hv">
      <MarketingNav cta={cta.navCta ?? undefined} />
      <main>
        <CourseHero view={view} cta={cta} ctaLabel={ctaLabel} />
        {SHOW_SUBNAV && <CourseSubnav sections={sections} />}
        <CourseOverview view={view} />
        <CourseOutcomes outcomes={view.outcomes} />
        <CourseCurriculum
          modules={view.modules}
          curriculumOpen={CURRICULUM_OPEN}
          heading={curriculumHeading}
          sub={curriculumSub}
          showStage={locale === 'en'}
        />
        <CourseInstructors instructors={view.instructors} language={view.language} />
        <CourseSyllabus courseId={view.id} locales={view.syllabusLocales} />
        <CourseFaq view={view} cta={cta} quotes={quotes} />
        <CourseClosing view={view} cta={cta} ctaLabel={ctaLabel} />
      </main>
      <MarketingNewsletter source="course" />
      <MarketingFooter />
      <HvReveal animateHero={ANIMATE_HERO} scrollReveal={SCROLL_REVEAL} />
    </MarketingShell>
  );
}
