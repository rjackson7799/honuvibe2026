'use client';

import { useTranslations } from 'next-intl';
import { Section } from '@/components/layout/section';
import { Container } from '@/components/layout/container';
import { SectionHeading, Card, Button } from '@/components/ui';
import { Quote } from 'lucide-react';

const testimonialKeys = ['one', 'two', 'three'] as const;

export function SocialProof() {
  const t = useTranslations('social_proof');

  return (
    <Section id="social-proof">
      <Container size="wide">
        <SectionHeading
          overline={t('overline')}
          heading={t('heading')}
          centered
        />

        <div className="mt-12 grid grid-cols-1 gap-6 md:grid-cols-3">
          {testimonialKeys.map((key) => (
            <Card key={key} variant="glass" hover padding="lg" className="flex flex-col">
              <Quote size={24} className="text-accent-teal/40 mb-4 drop-shadow-[0_0_6px_var(--glow-teal)]" />
              <p className="text-sm text-fg-secondary leading-relaxed mb-6 flex-1">
                &ldquo;{t(`testimonials.${key}.quote`)}&rdquo;
              </p>
              <div className="border-t border-border-default pt-4">
                <p className="text-sm font-medium text-fg-primary">
                  {t(`testimonials.${key}.name`)}
                </p>
                <p className="text-xs text-fg-tertiary mt-0.5">
                  {t(`testimonials.${key}.role`)}
                </p>
              </div>
            </Card>
          ))}
        </div>

        <div className="mt-10 flex justify-center">
          <Button
            variant="gold"
            href="https://www.skool.com/honuvibe"
            target="_blank"
            rel="noopener noreferrer"
          >
            {t('cta')}
          </Button>
        </div>
      </Container>
    </Section>
  );
}
