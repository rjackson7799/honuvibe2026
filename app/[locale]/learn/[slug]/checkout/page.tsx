import { redirect, notFound } from 'next/navigation';
import { setRequestLocale } from 'next-intl/server';
import { createClient } from '@/lib/supabase/server';
import { getCourseWithCurriculum } from '@/lib/courses/queries';
import { checkEnrollment } from '@/lib/enrollments/queries';
import { Container } from '@/components/layout/container';
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
    <div className="min-h-screen bg-bg-primary">
      <Container size="wide" className="py-12 md:py-16">
        <div className="flex flex-col md:flex-row gap-10 md:gap-16 items-start">
          {/* Left: Course summary */}
          <div className="w-full md:max-w-sm lg:max-w-md shrink-0">
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

          {/* Right: Stripe Embedded Checkout */}
          <div className="w-full flex-1">
            <EmbeddedCheckoutForm courseId={course.id} locale={locale} />
          </div>
        </div>
      </Container>
    </div>
  );
}
