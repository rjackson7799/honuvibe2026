'use client';

import { useTranslations } from 'next-intl';
import { Section } from '@/components/layout/section';
import { Container } from '@/components/layout/container';
import { Button } from '@/components/ui';
import { Link } from '@/i18n/navigation';

export function ExplorationCta() {
  const t = useTranslations('exploration_page.cta');

  return (
    <Section>
      <Container size="narrow">
        <div className="text-center flex flex-col items-center gap-4">
          <h2 className="font-serif text-h2 text-fg-primary">{t('heading')}</h2>
          <p className="text-base text-fg-secondary leading-relaxed max-w-[480px]">{t('sub')}</p>
          <div className="mt-2">
            <Link href="/contact">
              <Button variant="gold" size="lg">{t('button')}</Button>
            </Link>
          </div>
        </div>
      </Container>
    </Section>
  );
}
