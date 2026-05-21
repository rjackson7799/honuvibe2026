import { useTranslations } from 'next-intl';
import { ArrowRight } from 'lucide-react';
import { Container, Section } from '@/components/marketing/primitives';

const PARAGRAPH_KEYS = ['p1', 'p2', 'p3'] as const;

export function AboutOriginStory() {
  const t = useTranslations('about.origin_story');

  return (
    <Section id="origin" variant="canvas" spacing="default" className="relative overflow-hidden">
      {/* Background watermark numeral */}
      <span
        aria-hidden
        className="pointer-events-none absolute -right-4 -top-12 select-none font-serif italic leading-none text-[var(--m-accent-teal)] opacity-[0.06] md:right-8 md:top-0"
        style={{ fontSize: 'clamp(220px, 32vw, 480px)' }}
      >
        01
      </span>

      <Container>
        {/* Chapter header */}
        <div className="relative mb-10 flex flex-wrap items-end justify-between gap-3 border-b border-[var(--m-border-soft)] pb-5">
          <p className="font-mono text-[11.5px] uppercase tracking-[0.18em] text-[var(--m-accent-teal)]">
            {t('chapter_overline')}
          </p>
          <p className="font-mono text-[10.5px] uppercase tracking-[0.16em] text-[var(--m-ink-tertiary)]">
            {t('chapter_meta_right')}
          </p>
        </div>

        <div className="relative">
          {/* Headline + chapter number */}
          <div className="flex items-start gap-6">
            <span
              className="font-serif italic leading-none text-[var(--m-accent-teal)]"
              style={{ fontSize: 'clamp(56px, 7vw, 88px)' }}
            >
              01
            </span>
            <h2
              className="font-serif italic leading-[0.96] tracking-[-0.02em] text-[var(--m-ink-primary)]"
              style={{ fontSize: 'clamp(40px, 5.2vw, 68px)' }}
            >
              {t('headline_1')}
              <br />
              {t('headline_2')}
              <span className="text-[var(--m-accent-teal)]">.</span>
            </h2>
          </div>

          {/* Paragraphs */}
          <div className="mt-9 flex flex-col gap-5">
            {PARAGRAPH_KEYS.map((k) => (
              <p
                key={k}
                className="max-w-[62ch] text-[17px] leading-[1.78] text-[var(--m-ink-secondary)]"
              >
                {t(k)}
              </p>
            ))}
          </div>

          <a
            href="/explore"
            className="mt-10 inline-flex items-center gap-2 text-[15.5px] font-bold text-[var(--m-accent-teal)] transition-opacity hover:opacity-80"
          >
            {t('cta_label')}
            <ArrowRight size={15} strokeWidth={2} />
          </a>
        </div>
      </Container>
    </Section>
  );
}
