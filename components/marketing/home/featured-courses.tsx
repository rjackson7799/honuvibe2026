import { useTranslations } from 'next-intl';
import { ArrowRight } from 'lucide-react';
import {
  Card,
  Container,
  Section,
  SectionHeading,
} from '@/components/marketing/primitives';

type CourseKey = 1 | 2 | 3;

export function HomeFeaturedCourses() {
  const t = useTranslations('home.featured_courses');

  const courses = ([1, 2, 3] as CourseKey[]).map((n) => ({
    n,
    title: t(`course_${n}_title` as 'course_1_title'),
    level: t(`course_${n}_level` as 'course_1_level'),
    duration: t(`course_${n}_duration` as 'course_1_duration'),
    lang: t(`course_${n}_lang` as 'course_1_lang'),
    body: t(`course_${n}_body` as 'course_1_body'),
    cta: t(`course_${n}_cta` as 'course_1_cta'),
    track: n === 3,
  }));

  return (
    <Section variant="canvas">
      <Container>
        <div className="mb-12 flex flex-wrap items-end justify-between gap-4">
          <SectionHeading>{t('heading')}</SectionHeading>
          <a
            href="/learn"
            className="inline-flex items-center gap-1.5 text-[14.5px] font-semibold text-[var(--m-accent-teal)] transition-opacity hover:opacity-80"
          >
            {t('see_all')}
            <ArrowRight size={16} strokeWidth={2} />
          </a>
        </div>

        <div className="grid gap-6 md:grid-cols-3">
          {courses.map((course) => (
            <Card
              key={course.n}
              interactive
              className="relative flex flex-col overflow-hidden p-7"
            >
              {course.track && (
                <span className="absolute right-0 top-0 rounded-bl-[10px] bg-[var(--m-accent-coral)] px-3.5 py-1 text-[10.5px] font-bold tracking-[0.05em] text-white">
                  {t('track_ribbon')}
                </span>
              )}
              <div className="mb-5 flex flex-wrap gap-2">
                {[course.level, course.duration, course.lang].map((tag) => (
                  <span
                    key={tag}
                    className="rounded-full bg-[var(--m-accent-coral-soft)] px-2.5 py-1 text-[11.5px] font-semibold text-[var(--m-accent-coral)]"
                  >
                    {tag}
                  </span>
                ))}
              </div>
              <h3 className="mb-3 text-[22px] font-bold tracking-[-0.01em] text-[var(--m-ink-primary)]">
                {course.title}
              </h3>
              <p className="mb-7 flex-1 text-[14.5px] leading-[1.65] text-[var(--m-ink-secondary)]">
                {course.body}
              </p>
              <a
                href="/learn"
                className="inline-flex items-center gap-1.5 text-[14.5px] font-bold text-[var(--m-accent-teal)] transition-opacity hover:opacity-80"
              >
                {course.cta}
                <ArrowRight size={16} strokeWidth={2} />
              </a>
            </Card>
          ))}
        </div>
      </Container>
    </Section>
  );
}
