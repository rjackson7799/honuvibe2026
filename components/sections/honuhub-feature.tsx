'use client';

import { useTranslations } from 'next-intl';
import { Section } from '@/components/layout/section';
import { Container } from '@/components/layout/container';
import { Overline, Button } from '@/components/ui';
import { Link } from '@/i18n/navigation';
import { MapPin } from 'lucide-react';

export function HonuHubFeature() {
  const t = useTranslations('honuhub_feature');

  return (
    <Section id="honuhub">
      <Container>
        <div className="grid grid-cols-1 items-center gap-10 md:grid-cols-2 md:gap-16">
          {/* Photo placeholder */}
          <div className="relative aspect-[4/3] overflow-hidden rounded-xl">
            <div className="absolute inset-0 glass-card rounded-xl" />
            <div className="absolute inset-0 bg-gradient-to-br from-accent-teal/10 via-transparent to-accent-gold/5 rounded-xl" />
            {/* Glow orb behind card */}
            <div
              className="glow-orb absolute -z-10"
              style={{ width: '300px', height: '300px', top: '-20%', right: '-15%', background: 'var(--glow-teal)' }}
              aria-hidden="true"
            />
            <div className="absolute inset-0 flex flex-col items-center justify-center gap-3 z-10">
              <MapPin size={32} className="text-accent-teal/60" />
              <span className="text-sm font-medium text-fg-tertiary tracking-wide">
                Waikiki, Honolulu
              </span>
            </div>
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
