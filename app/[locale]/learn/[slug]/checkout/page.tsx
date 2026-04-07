import { redirect, notFound } from 'next/navigation';
import { setRequestLocale } from 'next-intl/server';
import { createClient } from '@/lib/supabase/server';
import { getCourseWithCurriculum } from '@/lib/courses/queries';
import { checkEnrollment } from '@/lib/enrollments/queries';
import { CourseCheckoutSummary } from '@/components/learn/CourseCheckoutSummary';
import { EmbeddedCheckoutForm } from '@/components/learn/EmbeddedCheckoutForm';

type Props = {
  params: Promise<{ locale: string; slug: string }>;
};

export async function generateMetadata({ params }: Props) {
  const { locale, slug } = await params;
  const course = await getCourseWithCurriculum(slug);
  if (!course) return { title: 'Checkout' };
  const title =
    locale === 'ja' && course.title_jp ? course.title_jp : course.title_en;
  return { title: `Checkout · ${title}` };
}

export default async function CheckoutPage({ params }: Props) {
  const { locale, slug } = await params;
  setRequestLocale(locale);

  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();

  const prefix = locale === 'ja' ? '/ja' : '';

  // Auth guard — redirect to auth with return URL
  if (!user) {
    redirect(`${prefix}/learn/auth?redirect=${prefix}/learn/${slug}/checkout`);
  }

  const course = await getCourseWithCurriculum(slug);
  if (!course) notFound();

  // If already enrolled, send to dashboard
  const enrollment = await checkEnrollment(user.id, slug);
  if (enrollment.is_enrolled) {
    redirect(`${prefix}/learn/dashboard/${slug}`);
  }

  // If course is full or unpublished, send back
  const isFull =
    !!course.max_enrollment &&
    course.current_enrollment >= course.max_enrollment;
  if (!course.is_published || isFull) {
    redirect(`${prefix}/learn/${slug}`);
  }

  // Determine locale-specific values
  const isJapanese = locale === 'ja';
  const title = isJapanese && course.title_jp ? course.title_jp : course.title_en;
  const description =
    isJapanese && course.description_jp
      ? course.description_jp
      : course.description_en;

  // Format prices
  function formatUsd(cents: number) {
    return `$${(cents / 100).toLocaleString('en-US')}`;
  }
  function formatJpy(yen: number) {
    return `¥${yen.toLocaleString('ja-JP')}`;
  }

  const priceFormatted =
    isJapanese && course.price_jpy
      ? formatJpy(course.price_jpy)
      : course.price_usd
        ? formatUsd(course.price_usd)
        : null;

  const secondaryPriceFormatted =
    isJapanese && course.price_usd
      ? formatUsd(course.price_usd)
      : !isJapanese && course.price_jpy
        ? formatJpy(course.price_jpy)
        : null;

  // If no price configured, this isn't a paid course — redirect back
  if (!priceFormatted) {
    redirect(`${prefix}/learn/${slug}`);
  }

  // Start date
  const startDateFormatted = course.start_date
    ? new Date(course.start_date).toLocaleDateString(
        isJapanese ? 'ja-JP' : 'en-US',
        { month: 'long', day: 'numeric', year: 'numeric' },
      )
    : null;

  // Spots remaining
  const spotsRemaining =
    course.max_enrollment !== null
      ? course.max_enrollment - course.current_enrollment
      : null;

  // Overline
  const t_level: Record<string, string> = {
    beginner: 'Beginner',
    intermediate: 'Intermediate',
    advanced: 'Advanced',
  };
  const t_lang: Record<string, string> = {
    en: 'EN',
    ja: 'JP',
    both: 'EN (JP Materials)',
  };
  const overlineParts = [
    course.level ? t_level[course.level] : null,
    course.format,
    t_lang[course.language] ?? null,
  ].filter(Boolean) as string[];

  // Learning outcomes
  const outcomes =
    (isJapanese && course.learning_outcomes_jp?.length
      ? course.learning_outcomes_jp
      : course.learning_outcomes_en) ?? [];

  return (
    <div className="flex flex-col md:flex-row gap-8 md:gap-12 items-start">
      {/* Left: Course summary */}
      <div className="w-full md:max-w-sm shrink-0">
        <CourseCheckoutSummary
          title={title}
          description={description}
          overlineParts={overlineParts}
          thumbnailUrl={course.thumbnail_url}
          priceFormatted={priceFormatted}
          secondaryPriceFormatted={secondaryPriceFormatted}
          startDateFormatted={startDateFormatted}
          spotsRemaining={spotsRemaining}
          learningOutcomes={outcomes}
          instructor={course.instructor}
          locale={locale}
          courseSlug={slug}
        />
      </div>

      {/* Right: Stripe Embedded Checkout — framed in a HonuVibe card */}
      <div className="w-full flex-1 min-w-0">
        <div className="rounded-xl border border-border-default bg-bg-secondary overflow-hidden">
          {/* Card header */}
          <div className="px-5 py-4 border-b border-border-default flex items-center gap-2">
            <svg
              className="w-4 h-4 text-accent-teal shrink-0"
              fill="none"
              stroke="currentColor"
              viewBox="0 0 24 24"
              aria-hidden="true"
            >
              <path
                strokeLinecap="round"
                strokeLinejoin="round"
                strokeWidth={2}
                d="M12 15v2m-6 4h12a2 2 0 002-2v-6a2 2 0 00-2-2H6a2 2 0 00-2 2v6a2 2 0 002 2zm10-10V7a4 4 0 00-8 0v4h8z"
              />
            </svg>
            <span className="text-sm font-semibold text-fg-primary">Secure Checkout</span>
            <span className="ml-auto text-xs text-fg-tertiary">Powered by Stripe</span>
          </div>

          {/* Stripe iframe */}
          <div className="p-4 md:p-5">
            <EmbeddedCheckoutForm courseId={course.id} locale={locale} />
          </div>
        </div>
      </div>
    </div>
  );
}
