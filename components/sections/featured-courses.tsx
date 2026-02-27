import Image from 'next/image';
import { getTranslations, getLocale } from 'next-intl/server';
import { Section } from '@/components/layout/section';
import { Container } from '@/components/layout/container';
import { SectionHeading, Card, Tag, Button } from '@/components/ui';
import { Overline } from '@/components/ui/overline';
import { Link } from '@/i18n/navigation';
import { ArrowRight } from 'lucide-react';
import { getFeaturedCourses } from '@/lib/courses/queries';
import type { Course } from '@/lib/courses/types';

/* ── Translation-based fallback (when DB has no featured courses) ── */
const fallbackKeys = ['ai_foundations', 'micro_saas', 'ai_automation'] as const;

function FallbackCards({ t }: { t: Awaited<ReturnType<typeof getTranslations<'featured_courses'>>> }) {
  return (
    <>
      {fallbackKeys.map((key) => (
        <Card key={key} variant="glass" hover padding="lg" className="flex flex-col">
          <div className="mb-5 h-1 w-12 rounded-full accent-bar-teal" />
          <h3 className="font-serif text-h3 text-fg-primary mb-3">
            {t(`courses.${key}.title`)}
          </h3>
          <p className="text-sm text-fg-secondary leading-relaxed mb-5 flex-1">
            {t(`courses.${key}.description`)}
          </p>
          <div className="flex items-center gap-2 mb-5">
            <Tag>{t(`courses.${key}.level`)}</Tag>
            <Tag color="var(--accent-gold)">{t(`courses.${key}.language`)}</Tag>
          </div>
          <Button variant="ghost" size="sm" className="self-start">
            {t('enroll')}
          </Button>
        </Card>
      ))}
    </>
  );
}

/* ── DB-driven course card with thumbnail ── */
function FeaturedCourseCard({ course, locale, ctaLabel }: { course: Course; locale: string; ctaLabel: string }) {
  const title = locale === 'ja' && course.title_jp ? course.title_jp : course.title_en;
  const description = locale === 'ja' && course.description_jp ? course.description_jp : course.description_en;

  const overlineParts = [
    course.level ? course.level.charAt(0).toUpperCase() + course.level.slice(1) : null,
    course.total_weeks ? `${course.total_weeks} weeks` : null,
    course.language === 'both' ? 'EN/JP' : course.language?.toUpperCase(),
  ].filter(Boolean);

  return (
    <Link
      href={`/learn/${course.slug}`}
      className="group flex flex-col h-full rounded-lg bg-bg-secondary border border-border-default overflow-hidden transition-all duration-[var(--duration-normal)] hover:shadow-md hover:-translate-y-0.5 hover:border-border-hover"
    >
      {/* Thumbnail */}
      <div className="aspect-[16/9] bg-bg-tertiary overflow-hidden relative">
        {course.thumbnail_url ? (
          <Image
            src={course.thumbnail_url}
            alt={title}
            width={600}
            height={340}
            className="w-full h-full object-cover transition-transform duration-[var(--duration-slow)] group-hover:scale-105"
          />
        ) : (
          <div className="w-full h-full flex items-center justify-center text-fg-tertiary">
            <svg width="48" height="48" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1">
              <rect x="3" y="3" width="18" height="18" rx="2" />
              <path d="M3 15l4-4a2 2 0 0 1 2.8 0L15 16" />
              <path d="M14 14l1-1a2 2 0 0 1 2.8 0L21 16" />
            </svg>
          </div>
        )}
        {course.thumbnail_url && (
          <div className="absolute bottom-0 left-0 right-0 h-8 bg-gradient-to-t from-bg-secondary to-transparent" />
        )}
      </div>

      <div className="p-5 flex flex-col flex-1 gap-3">
        <Overline>{overlineParts.join(' · ')}</Overline>

        <h3 className="text-lg font-serif text-fg-primary leading-snug group-hover:text-accent-teal transition-colors duration-[var(--duration-fast)]">
          {title}
        </h3>

        {description && (
          <p className="text-sm text-fg-secondary line-clamp-2 flex-1">
            {description}
          </p>
        )}

        <Button
          variant="primary"
          size="sm"
          icon={ArrowRight}
          iconPosition="right"
          className="mt-auto"
        >
          {ctaLabel}
        </Button>
      </div>
    </Link>
  );
}

/* ── Main section ── */
export async function FeaturedCourses() {
  const t = await getTranslations('featured_courses');
  const locale = await getLocale();

  let courses: Course[] = [];
  try {
    courses = await getFeaturedCourses(3);
  } catch {
    // DB unavailable — fall back to translation-based cards
  }

  return (
    <Section id="courses">
      <Container size="wide">
        <SectionHeading
          overline={t('overline')}
          heading={t('heading')}
          sub={t('sub')}
          centered
        />

        <div className="mt-12 grid grid-cols-1 gap-6 md:grid-cols-3">
          {courses.length > 0 ? (
            courses.map((course) => (
              <FeaturedCourseCard
                key={course.id}
                course={course}
                locale={locale}
                ctaLabel={t('enroll')}
              />
            ))
          ) : (
            <FallbackCards t={t} />
          )}
        </div>

        <div className="mt-10 flex justify-center">
          <Link href="/learn" className="inline-flex items-center gap-2 text-sm font-medium text-accent-teal hover:text-accent-teal-hover transition-colors duration-[var(--duration-fast)]">
            {t('see_all')}
            <ArrowRight size={16} />
          </Link>
        </div>
      </Container>
    </Section>
  );
}
