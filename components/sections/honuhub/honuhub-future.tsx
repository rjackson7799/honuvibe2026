'use client';

import { useTranslations } from 'next-intl';
import { Section } from '@/components/layout/section';
import { Container } from '@/components/layout/container';
import { Button } from '@/components/ui';
import { Link } from '@/i18n/navigation';
import { Globe } from 'lucide-react';

export function HonuHubFuture() {
  const t = useTranslations('honuhub_page.future');

  return (
    <Section>
      <Container size="narrow">
        <div className="relative overflow-hidden rounded-2xl border border-accent-gold/20 bg-accent-gold-subtle p-8 md:p-12 text-center">
          <Globe size={32} className="mx-auto text-accent-gold/50 mb-4" />
          <h2 className="font-serif text-h3 text-fg-primary mb-3">{t('heading')}</h2>
          <p className="text-base text-fg-secondary leading-relaxed mb-6 max-w-[400px] mx-auto">
            {t('description')}
          </p>
          <Link href="/contact">
            <Button variant="gold">{t('cta')}</Button>
          </Link>
        </div>
      </Container>
    </Section>
  );
}
