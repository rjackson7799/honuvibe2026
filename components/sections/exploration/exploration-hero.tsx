'use client';

import { useState } from 'react';
import { useTranslations } from 'next-intl';
import { Section } from '@/components/layout/section';
import { Container } from '@/components/layout/container';
import { Button, Overline, Modal } from '@/components/ui';
import { Briefcase } from 'lucide-react';
import { ExplorationLeadForm } from './exploration-lead-form';

export function ExplorationHero() {
  const t = useTranslations('exploration_page');
  const [modalOpen, setModalOpen] = useState(false);

  return (
    <Section noReveal className="relative overflow-hidden">
      {/* Background gradient — matches HonuHub hero */}
      <div className="absolute inset-0 bg-gradient-to-br from-accent-teal/10 via-bg-primary to-accent-gold/5" />

      {/* Glow orbs */}
      <div className="glow-orb absolute -top-20 right-1/4 h-[300px] w-[300px] bg-glow-teal" />
      <div className="glow-orb absolute bottom-0 left-[16%] h-[200px] w-[200px] bg-glow-gold" />

      <Container>
        <div className="relative flex flex-col items-center text-center">
          <Overline className="mb-4 block">{t('hero.overline')}</Overline>
          <h1 className="font-serif text-display text-fg-primary mb-4">
            <span className="text-shimmer">{t('hero.heading')}</span>
          </h1>
          <p className="max-w-[560px] mx-auto text-base md:text-lg text-fg-secondary leading-relaxed mb-8">
            {t('hero.sub')}
          </p>

          <Button
            variant="primary"
            size="lg"
            icon={Briefcase}
            iconPosition="left"
            onClick={() => setModalOpen(true)}
          >
            {t('hero.cta')}
          </Button>
        </div>
      </Container>

      <Modal
        open={modalOpen}
        onClose={() => setModalOpen(false)}
        size="sm"
        title={t('lead_form.heading')}
      >
        <ExplorationLeadForm onSuccess={() => setModalOpen(false)} />
      </Modal>
    </Section>
  );
}
