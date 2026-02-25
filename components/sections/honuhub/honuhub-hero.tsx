'use client';

import { useState } from 'react';
import { useTranslations } from 'next-intl';
import { Section } from '@/components/layout/section';
import { Container } from '@/components/layout/container';
import { Button, Overline, Modal } from '@/components/ui';
import { MapPin, Bell } from 'lucide-react';
import { HonuHubNotifyForm } from './honuhub-notify-form';

export function HonuHubHero() {
  const t = useTranslations('honuhub_page.hero');
  const [modalOpen, setModalOpen] = useState(false);

  return (
    <Section noReveal className="relative overflow-hidden">
      {/* Background gradient — covers full section including padding */}
      <div className="absolute inset-0 bg-gradient-to-br from-accent-teal/10 via-bg-primary to-accent-gold/5" />

      {/* Glow orbs */}
      <div className="glow-orb absolute -top-20 right-1/4 h-[300px] w-[300px] bg-glow-teal" />
      <div className="glow-orb absolute bottom-0 left-[16%] h-[200px] w-[200px] bg-glow-gold" />

      <Container>
        <div className="relative flex flex-col items-center text-center">
          <Overline className="mb-4">{t('overline')}</Overline>
          <h1 className="font-serif text-h1 text-fg-primary mb-4">{t('heading')}</h1>
          <p className="max-w-[540px] text-base md:text-lg text-fg-secondary leading-relaxed mb-4">
            {t('sub')}
          </p>

          {/* Opening date badge */}
          <div className="inline-flex items-center gap-2 rounded-full border border-accent-teal/30 bg-accent-teal-subtle px-4 py-2 mb-4">
            <span className="h-2 w-2 rounded-full bg-accent-gold animate-pulse" />
            <span className="text-sm font-medium text-accent-teal">
              {t('opening_badge')}
            </span>
          </div>

          <div className="flex items-center gap-2 text-fg-tertiary text-sm mb-8">
            <MapPin size={16} />
            <span>{t('location')}</span>
          </div>

          <Button variant="primary" size="lg" icon={Bell} iconPosition="left" onClick={() => setModalOpen(true)}>
            {t('cta')}
          </Button>
        </div>
      </Container>

      <Modal
        open={modalOpen}
        onClose={() => setModalOpen(false)}
        size="sm"
        title={t('notify_modal.heading')}
      >
        <HonuHubNotifyForm onSuccess={() => setModalOpen(false)} />
      </Modal>
    </Section>
  );
}
