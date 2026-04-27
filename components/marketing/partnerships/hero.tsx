import { useTranslations } from 'next-intl';
import { ArrowRight } from 'lucide-react';
import { Container, Overline, Section } from '@/components/marketing/primitives';

export function PartnershipsHero() {
  const t = useTranslations('partnerships.hero');

  return (
    <Section variant="canvas" spacing="hero" className="pb-16 md:pb-20">
      <Container>
        <div className="max-w-[620px]">
          <Overline tone="coral" className="mb-5 inline-block">
            {t('overline')}
          </Overline>
          <h1
            className="mb-6 font-bold leading-[1.08] tracking-[-0.028em] text-[var(--m-ink-primary)]"
            style={{ fontSize: 'clamp(40px, 5vw, 64px)' }}
          >
            {t('headline_line_1')}
            <br />
            <span className="text-[var(--m-accent-teal)]">
              {t('headline_line_2')}
            </span>
          </h1>
          <p className="mb-10 max-w-[540px] text-[18.5px] leading-[1.72] text-[var(--m-ink-secondary)]">
            {t('subhead')}
          </p>
          <a
            href="#apply"
            className="inline-flex items-center gap-2 rounded-[10px] bg-[var(--m-accent-coral)] px-8 py-4 text-[16px] font-bold text-white shadow-[var(--m-shadow-coral-sm)] transition-all duration-200 hover:-translate-y-px hover:bg-[var(--m-accent-coral-dark)] hover:shadow-[var(--m-shadow-coral-md)] focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[var(--m-accent-coral)] focus-visible:ring-offset-2 focus-visible:ring-offset-[var(--m-canvas)]"
          >
            {t('cta')}
            <ArrowRight size={16} strokeWidth={2} />
          </a>
        </div>
      </Container>
    </Section>
  );
}
