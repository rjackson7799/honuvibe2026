'use client';

import { useTranslations } from 'next-intl';
import { Section } from '@/components/layout/section';
import { Container } from '@/components/layout/container';
import { Overline } from '@/components/ui';
import { Mail } from 'lucide-react';
import { MessageBeaconBackground } from '@/components/ocean/message-beacon-background';

export function ContactHero() {
  const t = useTranslations('contact_page.hero');

  return (
    <Section noReveal className="relative overflow-hidden !pb-8">
      {/* Animated ocean / starry sky background */}
      <MessageBeaconBackground />

      <Container>
        <div className="relative flex flex-col items-center text-center">
          <Overline className="mb-4">{t('overline')}</Overline>
          <h1 className="font-serif text-h1 text-fg-primary mb-4">{t('heading')}</h1>
          <p className="max-w-[540px] text-base md:text-lg text-fg-secondary leading-relaxed mb-6">
            {t('sub')}
          </p>

          {/* Email badge */}
          <div className="inline-flex items-center gap-2 rounded-full border border-accent-teal/30 bg-accent-teal-subtle px-4 py-2">
            <Mail size={16} className="text-accent-teal" />
            <span className="text-sm font-medium text-accent-teal">
              hello@honuvibe.ai
            </span>
          </div>
        </div>
      </Container>
    </Section>
  );
}
