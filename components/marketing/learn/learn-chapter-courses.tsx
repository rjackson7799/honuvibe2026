import { useTranslations } from 'next-intl';
import type { ReactNode } from 'react';
import { ArrowRight, BellRing } from 'lucide-react';
import { Container, Section } from '@/components/marketing/primitives';
import type { CourseWithPartner, PartnerSlim } from '@/lib/courses/types';
import {
  PartnerBadge,
  type PartnerBadgePartner,
} from '@/components/partners/PartnerBadge';
import { PartnerFilterChips } from '@/components/partners/PartnerFilterChips';
import { LearnCoursesCatalogClient } from './courses-catalog-client';

type Props = {
  courses: CourseWithPartner[];
  locale: string;
  partners: PartnerSlim[];
  ownerSlug: string | null;
};

export function LearnChapterCourses({ courses, locale, partners, ownerSlug }: Props) {
  const t = useTranslations('learn.chapter_courses');

  const badgeSlots: Record<string, ReactNode> = {};
  for (const course of courses) {
    if (course.partners) {
      badgeSlots[course.id] = (
        <PartnerBadge
          key={course.id}
          partner={course.partners as PartnerBadgePartner}
          locale={locale}
          variant="compact"
          className="mt-2"
        />
      );
    }
  }

  const placeholderCount = Math.max(0, 3 - courses.length);

  return (
    <Section variant="sand" id="courses" className="learn-chapter scroll-mt-24">
      <Container>
        <div className="mb-10 flex flex-wrap items-end gap-6">
          <span
            className="font-serif leading-none text-[var(--m-accent-teal)]/30"
            style={{
              fontSize: 'clamp(96px, 12vw, 160px)',
              letterSpacing: '-0.04em',
            }}
            aria-hidden
          >
            {t('number')}
          </span>
          <div className="flex-1 min-w-[260px]">
            <h2
              className="font-bold leading-[1.05] tracking-[-0.02em] text-[var(--m-ink-primary)]"
              style={{ fontSize: 'clamp(36px, 4.5vw, 56px)' }}
            >
              {t('title')}
            </h2>
            <p
              className="mt-5 max-w-[600px] font-serif italic leading-[1.3] tracking-[-0.01em] text-[var(--m-ink-primary)]"
              style={{ fontSize: 'clamp(20px, 2.2vw, 28px)' }}
            >
              {t('intro')}
            </p>
          </div>
        </div>

        {partners.length > 0 && (
          <div className="mb-8">
            <PartnerFilterChips
              partners={partners}
              selectedSlug={ownerSlug}
              basePath="/learn"
              locale={locale}
            />
          </div>
        )}

        <LearnCoursesCatalogClient
          courses={courses}
          locale={locale}
          badgeSlots={badgeSlots}
        />

        {placeholderCount > 0 && (
          <div className="mt-6 grid gap-6 md:grid-cols-2 lg:grid-cols-3">
            {Array.from({ length: placeholderCount }).map((_, i) => (
              <PlaceholderCard
                key={i}
                tag={t('placeholder_tag')}
                title={t('placeholder_title')}
                description={t('placeholder_description')}
                cta={t('placeholder_cta')}
              />
            ))}
          </div>
        )}

        <div className="mt-10 text-right">
          <a
            href="#courses"
            className="inline-flex items-center gap-1.5 text-[14.5px] font-semibold text-[var(--m-accent-teal)] transition-opacity hover:opacity-80"
          >
            {t('see_all')}
            <ArrowRight size={16} strokeWidth={2} />
          </a>
        </div>
      </Container>
    </Section>
  );
}

function PlaceholderCard({
  tag,
  title,
  description,
  cta,
}: {
  tag: string;
  title: string;
  description: string;
  cta: string;
}) {
  return (
    <div className="flex flex-col rounded-[14px] border border-dashed border-[var(--m-border-strong)] bg-[var(--m-white)]/60 p-7">
      <span className="mb-5 inline-flex w-fit items-center rounded-full bg-[var(--m-accent-teal-soft)] px-2.5 py-1 text-[11px] font-bold tracking-[0.06em] text-[var(--m-accent-teal)]">
        {tag}
      </span>
      <h3 className="mb-2.5 text-[20px] font-bold leading-tight tracking-[-0.01em] text-[var(--m-ink-primary)]">
        {title}
      </h3>
      <p className="mb-5 flex-1 text-[14px] leading-[1.6] text-[var(--m-ink-secondary)]">
        {description}
      </p>
      <a
        href="/#newsletter"
        className="inline-flex items-center gap-2 text-[14px] font-semibold text-[var(--m-accent-teal)] transition-opacity hover:opacity-80"
      >
        <BellRing size={15} strokeWidth={2} />
        {cta}
      </a>
    </div>
  );
}
