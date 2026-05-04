'use client';

import { useTranslations } from 'next-intl';
import { Section } from '@/components/marketing/primitives/section';
import { Container } from '@/components/marketing/primitives/container';
import { SectionHeading } from '@/components/marketing/primitives/section-heading';
import { EnrollButton } from './EnrollButton';

type CourseDetailFinalCtaProps = {
  courseId: string;
  courseSlug: string;
  isLoggedIn: boolean;
  isEnrolled: boolean;
  isFull: boolean;
  isInProgress: boolean;
  priceUsd: number | null;
  priceJpy: number | null;
};

export function CourseDetailFinalCta(props: CourseDetailFinalCtaProps) {
  const t = useTranslations('learn');

  return (
    <Section variant="sand" spacing="default">
      <Container>
        <div className="mx-auto flex max-w-[640px] flex-col items-center gap-4 text-center">
          <SectionHeading>{t('final_cta_heading')}</SectionHeading>
          <p className="text-[16px] leading-[1.65] text-[var(--m-ink-secondary)]">
            {t('final_cta_sub')}
          </p>
          <div className="mt-2">
            <EnrollButton
              courseId={props.courseId}
              courseSlug={props.courseSlug}
              isLoggedIn={props.isLoggedIn}
              isEnrolled={props.isEnrolled}
              isFull={props.isFull}
              isInProgress={props.isInProgress}
              priceUsd={props.priceUsd}
              priceJpy={props.priceJpy}
              variant="primary"
              size="lg"
            />
          </div>
        </div>
      </Container>
    </Section>
  );
}
