'use client';

import { useTranslations } from 'next-intl';
import { Section } from '@/components/layout/section';
import { Container } from '@/components/layout/container';
import { Overline } from '@/components/ui';
import { Mail } from 'lucide-react';

export function ContactHero() {
  const t = useTranslations('contact_page.hero');

  return (
    <Section noReveal className="relative overflow-hidden">
      {/* Background gradient — matches HonuHub hero */}
      <div className="absolute inset-0 bg-gradient-to-br from-accent-teal/10 via-bg-primary to-accent-gold/5" />

      {/* Glow orbs */}
      <div className="glow-orb absolute -top-20 right-1/4 h-[300px] w-[300px] bg-glow-teal" />
      <div className="glow-orb absolute bottom-0 left-[16%] h-[200px] w-[200px] bg-glow-gold" />

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
