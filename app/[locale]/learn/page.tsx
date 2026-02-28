import { Suspense } from 'react';
import { setRequestLocale } from 'next-intl/server';
import { getTranslations } from 'next-intl/server';
import { getPublishedCourses } from '@/lib/courses/queries';
import { Container } from '@/components/layout/container';
import { Section } from '@/components/layout/section';
import { Overline } from '@/components/ui/overline';
import { CourseCard } from '@/components/learn/CourseCard';
import { LevelFilter } from '@/components/learn/LevelFilter';
import { LearnPathCards } from '@/components/learn/LearnPathCards';
import { FloatingTechBg } from '@/components/ui/floating-tech-bg';

type Props = {
  params: Promise<{ locale: string }>;
  searchParams: Promise<{ level?: string }>;
};

export async function generateMetadata({ params }: Props) {
  const { locale } = await params;
  const t = await getTranslations({ locale, namespace: 'learn' });

  return {
    title: t('catalog_title'),
    description: t('catalog_subtitle'),
  };
}

export default async function LearnPage({ params, searchParams }: Props) {
  const { locale } = await params;
  const { level } = await searchParams;
  setRequestLocale(locale);

  const t = await getTranslations({ locale, namespace: 'learn' });
  const allCourses = await getPublishedCourses();

  // Filter by level if specified
  const courses = level && level !== 'all'
    ? allCourses.filter((c) => c.level === level)
    : allCourses;

  return (
    <>
      {/* Hero */}
      <div className="relative overflow-hidden">
        {/* Background gradient — matches HonuHub hero */}
        <div className="absolute inset-0 bg-gradient-to-br from-accent-teal/10 via-bg-primary to-accent-gold/5" />

        {/* Glow orbs */}
        <div className="absolute inset-0 z-0 pointer-events-none overflow-hidden" aria-hidden="true">
          <div
            className="glow-orb"
            style={{
              width: '400px',
              height: '400px',
              top: '-5%',
              right: '-3%',
              background: 'var(--glow-teal)',
              opacity: 0.18,
            }}
          />
          <div
            className="glow-orb"
            style={{
              width: '350px',
              height: '350px',
              bottom: '20%',
              left: '-5%',
              background: 'var(--glow-gold)',
              opacity: 0.14,
              animationDelay: '-4s',
            }}
          />
        </div>

        {/* Floating tech icons — spans entire hero + path cards area */}
        <FloatingTechBg iconSize={44} className="z-[1]" />

        {/* Hero text area */}
        <div className="relative">
          <Container className="relative z-10">
            <div className="py-16 md:py-24 text-center">
              <Overline className="mb-4 block">{t('catalog_overline')}</Overline>
              <h1 className="font-serif text-h1 text-fg-primary mb-4">
                {t('catalog_title')}
              </h1>
              <p className="max-w-[560px] mx-auto text-base md:text-lg text-fg-secondary leading-relaxed">
                {t('catalog_subtitle')}
              </p>
            </div>
          </Container>
        </div>

        {/* 3 Ways to Learn */}
        <div className="relative z-10">
          <LearnPathCards />
        </div>

        {/* Bottom fade */}
        <div className="absolute bottom-0 left-0 right-0 h-40 z-[2] bg-gradient-to-t from-[var(--bg-primary)] to-transparent" />
      </div>

      {/* Filters + Grid */}
      <Section noReveal id="courses" className="!pt-0">
        <Container className="max-w-[1100px]">
          {/* Level Filter */}
          <div className="mb-6">
            <Suspense fallback={null}>
              <LevelFilter />
            </Suspense>
          </div>

          {/* Course count */}
          <p className="text-sm text-fg-tertiary mb-6">
            {t('showing_courses', { count: courses.length })}
          </p>

          {/* Course Grid */}
          {courses.length === 0 ? (
            <p className="text-center text-fg-tertiary py-16">
              {t('no_courses')}
            </p>
          ) : (
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
              {courses.map((course) => (
                <CourseCard key={course.id} course={course} />
              ))}
            </div>
          )}
        </Container>
      </Section>
    </>
  );
}
