'use client';

import { useTranslations } from 'next-intl';
import { Section } from '@/components/layout/section';
import { Container } from '@/components/layout/container';
import { SectionHeading } from '@/components/ui';
import { ApplicationForm } from '@/components/forms/ApplicationForm';

export function InquirySection() {
  const t = useTranslations('build_page.form');

  return (
    <Section id="inquire" className="bg-bg-secondary">
      <Container size="narrow">
        <SectionHeading
          overline={t('overline')}
          heading={t('headline')}
          sub={t('sub')}
          centered
          className="mb-10"
        />

        <ApplicationForm sourcePage="build" />
      </Container>
    </Section>
  );
}
