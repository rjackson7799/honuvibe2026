import { useTranslations } from 'next-intl';
import { Mail } from 'lucide-react';
import { Container, Overline, Section } from '@/components/marketing/primitives';

const CONTACT_EMAIL = 'hello@honuvibe.ai';

export function ContactHero() {
  const t = useTranslations('contact.hero');

  return (
    <Section variant="canvas" spacing="hero" className="pb-12 md:pb-16">
      <Container>
        <div className="mx-auto max-w-[700px] text-center">
          <Overline tone="caption" className="mb-5 inline-block">
            {t('overline')}
          </Overline>
          <h1
            className="mb-5 font-bold leading-[1.08] tracking-[-0.03em] text-[var(--m-ink-primary)]"
            style={{ fontSize: 'clamp(40px, 5.5vw, 64px)' }}
          >
            {t('headline_line_1')}
            <br />
            {t('headline_line_2')}
          </h1>
          <p className="mx-auto mb-8 max-w-[480px] text-[18px] leading-[1.7] text-[var(--m-ink-secondary)]">
            {t('subhead')}
          </p>
          <a
            href={`mailto:${CONTACT_EMAIL}`}
            className="inline-flex items-center gap-2.5 rounded-full border border-[var(--m-border-default)] bg-[var(--m-white)] px-5 py-2.5 shadow-[var(--m-shadow-sm)] transition-all duration-200 hover:-translate-y-px hover:border-[var(--m-border-teal)] hover:bg-[rgba(15,169,160,0.06)] hover:shadow-[0_4px_16px_rgba(15,169,160,0.1)]"
          >
            <Mail size={16} strokeWidth={1.6} className="text-[var(--m-accent-teal)]" />
            <span className="text-[14.5px] font-semibold text-[var(--m-ink-primary)]">
              {CONTACT_EMAIL}
            </span>
          </a>
        </div>
      </Container>
    </Section>
  );
}
