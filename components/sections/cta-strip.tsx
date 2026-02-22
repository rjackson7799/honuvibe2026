'use client';

import { Section } from '@/components/layout/section';
import { Container } from '@/components/layout/container';
import { Button } from '@/components/ui';

type CtaStripProps = {
  heading: string;
  sub?: string;
  ctaText: string;
  ctaHref: string;
  external?: boolean;
  variant?: 'primary' | 'gold';
};

export function CtaStrip({ heading, sub, ctaText, ctaHref, external = false, variant = 'primary' }: CtaStripProps) {
  return (
    <Section>
      <Container size="narrow">
        <div className="text-center flex flex-col items-center gap-4">
          <h2 className="font-serif text-h2 text-fg-primary">{heading}</h2>
          {sub && <p className="text-base text-fg-secondary leading-relaxed max-w-[480px]">{sub}</p>}
          <div className="mt-2">
            <Button
              variant={variant}
              size="lg"
              href={ctaHref}
              {...(external && { target: '_blank', rel: 'noopener noreferrer' })}
            >
              {ctaText}
            </Button>
          </div>
        </div>
      </Container>
    </Section>
  );
}
