import { useTranslations } from 'next-intl';
import {
  Container,
  Overline,
  Section,
  SectionHeading,
} from '@/components/marketing/primitives';
import type { Course } from '@/lib/courses/types';
import { LearnCoursesCatalogClient } from './courses-catalog-client';

type Props = {
  courses: Course[];
  locale: string;
};

export function LearnCoursesCatalog({ courses, locale }: Props) {
  const t = useTranslations('learn.courses_catalog');

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

        <LearnCoursesCatalogClient courses={courses} locale={locale} />
      </Container>
    </Section>
  );
}
