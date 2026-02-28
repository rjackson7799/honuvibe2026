'use client';

import { useTranslations } from 'next-intl';
import Image from 'next/image';
import { Section } from '@/components/layout/section';
import { Container } from '@/components/layout/container';
import { Overline } from '@/components/ui';

export function HonuHubAbout() {
  const t = useTranslations('honuhub_page.about');

  return (
    <Section className="relative z-[1]">
      <Container>
        <div className="grid grid-cols-1 items-center gap-10 md:grid-cols-2 md:gap-16">
          {/* Photo */}
          <div className="relative aspect-[4/3] overflow-hidden rounded-xl">
            <Image
              src="/images/honu_hub.jpg"
              alt="HonuHub Waikiki interior"
              fill
              className="object-cover"
              sizes="(max-width: 768px) 100vw, 440px"
            />
          </div>

          {/* Text */}
          <div className="flex flex-col gap-4">
            <Overline>{t('overline')}</Overline>
            <h2 className="font-serif text-h2 text-fg-primary">{t('heading')}</h2>
            <p className="text-base text-fg-secondary leading-relaxed">{t('description')}</p>
            <p className="text-base text-fg-secondary leading-relaxed">{t('description_2')}</p>
          </div>
        </div>
      </Container>
    </Section>
  );
}
