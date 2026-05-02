import Image from 'next/image';
import { useTranslations } from 'next-intl';
import {
  ArrowRight,
  BrainCircuit,
  Calendar,
  Globe,
  Rocket,
  Sprout,
  type LucideIcon,
} from 'lucide-react';
import {
  Card,
  Container,
  Section,
  SectionHeading,
} from '@/components/marketing/primitives';
import { BadgePill } from '@/components/ui/badge-pill';

type CourseKey = 1 | 2 | 3;

type CourseConfig = {
  n: CourseKey;
  levelIcon: LucideIcon;
  image: { src: string; alt: string };
  track: boolean;
};

const courseConfig: readonly CourseConfig[] = [
  {
    n: 1,
    levelIcon: Sprout,
    image: {
      src: '/courses/ai-essentials/Card_AIEssentials.jpg',
      alt: 'AI Essentials course header',
    },
    track: false,
  },
  {
    n: 2,
    levelIcon: BrainCircuit,
    image: {
      src: '/courses/ai-mastery/Card_AIMastery.jpg',
      alt: 'AI Mastery course header',
    },
    track: false,
  },
  {
    n: 3,
    levelIcon: Rocket,
    image: {
      src: '/courses/builder-track/Card_BuilderTrack.jpg',
      alt: 'Builder Track course header',
    },
    track: true,
  },
] as const;

export function HomeFeaturedCourses() {
  const t = useTranslations('home.featured_courses');

  const courses = courseConfig.map((c) => ({
    ...c,
    title: t(`course_${c.n}_title` as 'course_1_title'),
    level: t(`course_${c.n}_level` as 'course_1_level'),
    duration: t(`course_${c.n}_duration` as 'course_1_duration'),
    lang: t(`course_${c.n}_lang` as 'course_1_lang'),
    body: t(`course_${c.n}_body` as 'course_1_body'),
    cta: t(`course_${c.n}_cta` as 'course_1_cta'),
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
          {courses.map((course) => {
            const LevelIcon = course.levelIcon;
            return (
              <Card
                key={course.n}
                interactive
                className="relative flex flex-col overflow-hidden p-0"
              >
                <div className="relative aspect-[16/10] overflow-hidden bg-[var(--m-sand)]">
                  <Image
                    src={course.image.src}
                    alt={course.image.alt}
                    fill
                    sizes="(min-width: 768px) 33vw, 100vw"
                    className="object-cover"
                  />
                  {course.track && (
                    <span className="absolute right-3 top-3 rounded-full bg-[var(--m-accent-coral)] px-3 py-1 text-[10.5px] font-bold tracking-[0.05em] text-white shadow-sm">
                      {t('track_ribbon')}
                    </span>
                  )}
                </div>

                <div className="flex flex-1 flex-col p-6">
                  <div className="mb-5 flex flex-wrap gap-2">
                    <BadgePill variant="teal" size="sm">
                      <LevelIcon size={13} strokeWidth={2} aria-hidden />
                      {course.level}
                    </BadgePill>
                    <BadgePill variant="gray" size="sm">
                      <Calendar size={13} strokeWidth={2} aria-hidden />
                      {course.duration}
                    </BadgePill>
                    <BadgePill variant="gray" size="sm">
                      <Globe size={13} strokeWidth={2} aria-hidden />
                      {course.lang}
                    </BadgePill>
                  </div>

                  <h3
                    className="mb-3 text-[26px] font-normal leading-[1.15] tracking-[-0.01em] text-[var(--m-ink-primary)]"
                    style={{ fontFamily: 'var(--font-serif)' }}
                  >
                    {course.title}
                  </h3>

                  <p className="mb-6 flex-1 text-[14.5px] leading-[1.65] text-[var(--m-ink-secondary)]">
                    {course.body}
                  </p>

                  <a
                    href="/learn"
                    className="inline-flex w-full items-center justify-center gap-2 rounded-xl bg-[var(--m-ink-primary)] px-5 py-3.5 text-[15px] font-semibold text-white transition-opacity hover:opacity-90 focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-[var(--m-accent-teal)]"
                  >
                    {course.cta}
                    <ArrowRight size={16} strokeWidth={2} />
                  </a>
                </div>
              </Card>
            );
          })}
        </div>
      </Container>
    </Section>
  );
}
