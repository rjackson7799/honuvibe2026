import { useTranslations } from 'next-intl';
import type { ReactNode } from 'react';
import {
  Container,
  Overline,
  Section,
  SectionHeading,
} from '@/components/marketing/primitives';
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

export function LearnCoursesCatalog({ courses, locale, partners, ownerSlug }: Props) {
  const t = useTranslations('learn.courses_catalog');

  // Pre-render PartnerBadge for each course that has a partner.
  // We do this here (Server Component) because PartnerBadge uses useTranslations
  // and cannot be imported directly from the 'use client' catalog client.
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

  return (
    <Section variant="sand" id="catalog">
      <Container>
        <div className="mb-12">
          <Overline tone="teal" className="mb-3">{t('overline')}</Overline>
          <div className="flex flex-wrap items-end justify-between gap-4">
            <div>
              <SectionHeading className="mb-2">{t('heading')}</SectionHeading>
              <p className="text-[16px] text-[var(--m-ink-secondary)]">{t('subhead')}</p>
            </div>
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
      </Container>
    </Section>
  );
}
