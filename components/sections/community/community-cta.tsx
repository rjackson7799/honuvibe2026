'use client';

import { useTranslations } from 'next-intl';
import { Section } from '@/components/layout/section';
import { Container } from '@/components/layout/container';
import { Button } from '@/components/ui';

export function CommunityCta() {
  const t = useTranslations('community_page.cta');

  return (
    <Section>
      <Container size="narrow">
        <div className="text-center flex flex-col items-center gap-4">
          <h2 className="font-serif text-h2 text-fg-primary">{t('heading')}</h2>
          <p className="text-base text-fg-secondary leading-relaxed">{t('sub')}</p>
          <div className="mt-2">
            <Button
              variant="gold"
              size="lg"
              href="https://www.skool.com/honuvibe"
              target="_blank"
              rel="noopener noreferrer"
            >
              {t('button')}
            </Button>
          </div>
        </div>
      </Container>
    </Section>
  );
}
