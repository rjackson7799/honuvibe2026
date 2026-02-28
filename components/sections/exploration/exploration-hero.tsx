'use client';

import { useState } from 'react';
import { useTranslations } from 'next-intl';
import { Section } from '@/components/layout/section';
import { Container } from '@/components/layout/container';
import { Button, Overline, Modal } from '@/components/ui';
import { Briefcase } from 'lucide-react';
import { ExplorationLeadForm } from './exploration-lead-form';
import { LighthouseBackground } from './lighthouse-background';

export function ExplorationHero() {
  const t = useTranslations('exploration_page');
  const [modalOpen, setModalOpen] = useState(false);

  return (
    <Section noReveal className="relative overflow-hidden min-h-[70vh] !pb-8">
      <LighthouseBackground />

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
