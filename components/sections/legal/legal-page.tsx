'use client';

import { useTranslations } from 'next-intl';
import { Container } from '@/components/layout/container';

type LegalPageProps = {
  namespace: 'privacy_page' | 'terms_page' | 'cookies_page';
  sectionKeys: string[];
};

export function LegalPage({ namespace, sectionKeys }: LegalPageProps) {
  const t = useTranslations(namespace);

  return (
    <div className="py-12 md:py-20">
      <Container size="narrow">
        <h1 className="font-serif text-h1 text-fg-primary mb-2">{t('heading')}</h1>
        <p className="text-sm text-fg-tertiary mb-8">{t('last_updated')}</p>
        <p className="text-base text-fg-secondary leading-relaxed mb-10">{t('intro')}</p>

        <div className="flex flex-col gap-8">
          {sectionKeys.map((key) => (
            <section key={key}>
              <h2 className="font-serif text-h3 text-fg-primary mb-3">
                {t(`sections.${key}.title`)}
              </h2>
              <p className="text-base text-fg-secondary leading-relaxed">
                {t(`sections.${key}.content`)}
              </p>
            </section>
          ))}
        </div>
      </Container>
    </div>
  );
}
