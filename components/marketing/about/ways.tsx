import { useTranslations } from 'next-intl';
import { ArrowRight, ArrowUpRight } from 'lucide-react';
import { Container, Section } from '@/components/marketing/primitives';
import { STUDIO_URL } from '@/lib/constants/urls';

export function AboutWays() {
  const t = useTranslations('about.ways');

  return (
    <Section id="ways" variant="canvas" spacing="default">
      <Container>
        {/* Chapter header */}
        <div className="mb-10 flex flex-wrap items-end justify-between gap-3 border-b border-[var(--m-border-soft)] pb-5">
          <p className="font-mono text-[11.5px] uppercase tracking-[0.18em] text-[var(--m-accent-teal)]">
            {t('chapter_overline')}
          </p>
          <p className="font-mono text-[10.5px] uppercase tracking-[0.16em] text-[var(--m-ink-tertiary)]">
            {t('chapter_meta_right')}
          </p>
        </div>

        <h2
          className="max-w-[14ch] font-serif leading-[0.98] tracking-[-0.02em] text-[var(--m-ink-primary)]"
          style={{ fontSize: 'clamp(36px, 4.6vw, 60px)' }}
        >
          {t('headline_1')}
          <br />
          {t('headline_2')}
          <span className="text-[var(--m-accent-teal)]">.</span>
        </h2>

        {/* Academy / Studio split */}
        <div className="mt-12 grid grid-cols-1 gap-6 md:mt-16 md:grid-cols-2 md:gap-8">
          {/* Academy — we teach */}
          <article className="flex flex-col border-t-2 border-[var(--m-accent-teal)] bg-[var(--m-white)] px-7 py-8 shadow-[var(--m-shadow-xs)] md:px-10 md:py-10">
            <p className="font-mono text-[10.5px] uppercase tracking-[0.18em] text-[var(--m-accent-teal)]">
              {t('academy_label')}
            </p>
            <p className="mt-4 font-serif text-[clamp(24px,2.8vw,32px)] leading-[1.1] text-[var(--m-ink-primary)]">
              {t('academy_tagline')}
              <span className="text-[var(--m-accent-teal)]">.</span>
            </p>
            <p className="mt-4 flex-1 text-[15px] leading-[1.72] text-[var(--m-ink-secondary)]">
              {t('academy_body')}
            </p>
            <a
              href="/learn"
              className="mt-6 inline-flex items-center gap-2 text-[15px] font-bold text-[var(--m-accent-teal)] transition-opacity hover:opacity-80"
            >
              {t('academy_cta')}
              <ArrowRight size={15} strokeWidth={2} />
            </a>
          </article>

          {/* Studio — we build */}
          <article className="flex flex-col border-t-2 border-[var(--m-accent-coral)] bg-[var(--m-white)] px-7 py-8 shadow-[var(--m-shadow-xs)] md:px-10 md:py-10">
            <p className="font-mono text-[10.5px] uppercase tracking-[0.18em] text-[var(--m-accent-coral)]">
              {t('studio_label')}
            </p>
            <p className="mt-4 font-serif text-[clamp(24px,2.8vw,32px)] leading-[1.1] text-[var(--m-ink-primary)]">
              {t('studio_tagline')}
              <span className="text-[var(--m-accent-coral)]">.</span>
            </p>
            <p className="mt-4 flex-1 text-[15px] leading-[1.72] text-[var(--m-ink-secondary)]">
              {t('studio_body')}
            </p>
            <a
              href={STUDIO_URL}
              target="_blank"
              rel="noopener noreferrer"
              className="mt-6 inline-flex items-center gap-2 text-[15px] font-bold text-[var(--m-accent-coral)] transition-opacity hover:opacity-80"
            >
              {t('studio_cta')}
              <ArrowUpRight size={15} strokeWidth={2} />
            </a>
          </article>
        </div>
      </Container>
    </Section>
  );
}
