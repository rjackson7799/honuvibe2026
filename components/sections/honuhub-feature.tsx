'use client';

import Image from 'next/image';
import { useTranslations } from 'next-intl';
import { Section } from '@/components/layout/section';
import { Container } from '@/components/layout/container';
import { Overline, Button } from '@/components/ui';
import { Link } from '@/i18n/navigation';

export function HonuHubFeature() {
  const t = useTranslations('honuhub_feature');

  return (
    <Section id="honuhub">
      <Container>
        <div className="grid grid-cols-1 items-center gap-10 md:grid-cols-2 md:gap-16">
          {/* HonuHub photo */}
          <div className="relative aspect-[4/3] overflow-hidden rounded-xl">
            <Image
              src="/images/honu_hub.jpg"
              alt="HonuHub Waikiki learning space"
              fill
              className="object-cover"
              sizes="(max-width: 768px) 100vw, 50vw"
            />
            <div className="absolute inset-0 bg-gradient-to-t from-bg-primary/40 to-transparent rounded-xl" />
          </div>

          {/* Text content */}
          <div className="flex flex-col gap-4">
            <Overline>{t('overline')}</Overline>
            <h2 className="font-serif text-h2 text-fg-primary">{t('heading')}</h2>
            <p className="text-base text-fg-secondary leading-relaxed">
              {t('description')}
            </p>
            <div className="mt-2">
              <Link href="/honuhub">
                <Button variant="gradient">{t('cta')}</Button>
              </Link>
            </div>
          </div>
        </div>
      </Container>
    </Section>
  );
}
