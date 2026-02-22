'use client';

import { useTranslations } from 'next-intl';
import { Section } from '@/components/layout/section';
import { Container } from '@/components/layout/container';
import { Overline, Button } from '@/components/ui';
import { Link } from '@/i18n/navigation';
import { ArrowRight } from 'lucide-react';

export function AboutWork() {
  const t = useTranslations('about_page.work');

  return (
    <Section>
      <Container size="narrow">
        <div className="text-center flex flex-col items-center gap-4">
          <Overline>{t('overline')}</Overline>
          <h2 className="font-serif text-h2 text-fg-primary">{t('heading')}</h2>
          <p className="text-base text-fg-secondary leading-relaxed max-w-[480px]">
            {t('description')}
          </p>
          <div className="mt-2">
            <Link href="/apply">
              <Button variant="gold" size="lg" icon={ArrowRight} iconPosition="right">
                {t('cta')}
              </Button>
            </Link>
          </div>
        </div>
      </Container>
    </Section>
  );
}
