'use client';

import { useTranslations } from 'next-intl';
import { Section } from '@/components/layout/section';
import { Container } from '@/components/layout/container';
import { ArrowRight } from 'lucide-react';
import { trackEvent } from '@/lib/analytics';

export function AdvisoryLink() {
  const t = useTranslations('build_page');

  return (
    <Section className="!py-8 md:!py-12">
      <Container size="narrow">
        <div className="text-center">
          <p className="text-sm text-fg-tertiary mb-2">
            {t('advisory_link')}
          </p>
          <a
            href="/apply"
            className="inline-flex items-center gap-1.5 text-sm font-medium text-accent-teal hover:underline transition-colors duration-[var(--duration-fast)]"
            onClick={() => trackEvent('build_advisory_click')}
          >
            {t('advisory_cta')}
            <ArrowRight size={14} />
          </a>
        </div>
      </Container>
    </Section>
  );
}
