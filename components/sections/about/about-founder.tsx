'use client';

import { useTranslations } from 'next-intl';
import Image from 'next/image';
import { Section } from '@/components/layout/section';
import { Container } from '@/components/layout/container';
import { Overline } from '@/components/ui';
import { MapPin } from 'lucide-react';

export function AboutFounder() {
  const t = useTranslations('about_page.founder');

  return (
    <Section>
      <Container>
        <div className="grid grid-cols-1 items-center gap-10 md:grid-cols-2 md:gap-16">
          {/* Photo */}
          <div className="relative mx-auto aspect-[3/4] max-w-[400px] overflow-hidden rounded-xl md:mx-0">
            <Image
              src="/images/partners/instructors/ryan.webp"
              alt={t('heading')}
              fill
              className="object-cover"
            />
          </div>

          {/* Bio */}
          <div className="flex flex-col gap-4 text-center md:text-left">
            <Overline>{t('overline')}</Overline>
            <h2 className="font-serif text-h2 text-fg-primary">{t('heading')}</h2>
            <p className="text-lg font-medium text-accent-teal">{t('role')}</p>
            <div className="flex items-center justify-center gap-2 text-sm text-fg-tertiary md:justify-start">
              <MapPin size={16} />
              <span>{t('location')}</span>
            </div>
            <p className="text-base leading-relaxed text-fg-secondary">{t('bio_p1')}</p>
            <p className="text-base leading-relaxed text-fg-secondary">{t('bio_p2')}</p>
            <p className="text-base leading-relaxed text-fg-secondary">{t('bio_p3')}</p>

            {/* Education */}
            <div className="mt-2 pt-4 border-t border-border-secondary/50">
              <p className="text-xs font-semibold text-accent-teal uppercase tracking-wider mb-2">
                {t('education_title')}
              </p>
              <p className="text-sm text-fg-secondary leading-snug">
                {t('education_1')}
              </p>
              <p className="text-sm text-fg-secondary leading-snug mt-1">
                {t('education_2')}
              </p>
            </div>
          </div>
        </div>
      </Container>
    </Section>
  );
}
