'use client';

import { Section } from '@/components/layout/section';
import { Container } from '@/components/layout/container';
import { Button } from '@/components/ui';
import { ArrowRight } from 'lucide-react';

type Props = {
  headline: string;
  sub?: string;
  ctaLabel: string;
  ctaHref: string;
  onCtaClick?: () => void;
};

export function CTAStrip({ headline, sub, ctaLabel, ctaHref, onCtaClick }: Props) {
  return (
    <Section>
      <Container>
        <div className="flex flex-col items-center text-center gap-4">
          <h2 className="font-serif text-h3 text-fg-primary font-normal">{headline}</h2>
          {sub && (
            <p className="text-base text-fg-secondary">{sub}</p>
          )}
          <Button
            variant="primary"
            size="lg"
            icon={ArrowRight}
            iconPosition="right"
            href={ctaHref}
            onClick={onCtaClick}
          >
            {ctaLabel}
          </Button>
        </div>
      </Container>
    </Section>
  );
}
