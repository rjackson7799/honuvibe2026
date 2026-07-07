import { useTranslations } from 'next-intl';
import { Handshake } from 'lucide-react';
import { Button, Container, Section } from '@/components/marketing/primitives';

export function LearnChapterCohorts() {
  const t = useTranslations('learn.chapter_cohorts');

  return (
    <Section
      variant="canvas"
      id="cohorts"
      spacing="tight"
      className="learn-chapter scroll-mt-24"
    >
      <Container>
        <article className="flex flex-col items-start gap-7 rounded-2xl border border-dashed border-[var(--m-accent-teal)] bg-[var(--m-accent-teal-soft)] p-8 md:flex-row md:items-center md:justify-between md:gap-10 md:p-10">
          <div className="max-w-[620px]">
            <div className="mb-4 flex items-center gap-3">
              <span className="inline-flex h-10 w-10 items-center justify-center rounded-full bg-[var(--m-white)] text-[var(--m-accent-teal)]">
                <Handshake size={20} strokeWidth={2} />
              </span>
              <span className="text-[10.5px] font-bold uppercase tracking-[0.12em] text-[var(--m-accent-teal)]">
                {t('apply_next_label')}
              </span>
            </div>
            <h2 className="mb-3 text-[26px] font-bold leading-tight tracking-[-0.01em] text-[var(--m-ink-primary)] md:text-[30px]">
              {t('apply_next_heading')}
            </h2>
            <p className="text-[15px] leading-[1.65] text-[var(--m-ink-secondary)]">
              {t('apply_next_body')}
            </p>
          </div>
          <div className="shrink-0">
            <Button href="/partnerships" variant="primary-teal" withArrow>
              {t('apply_next_cta')}
            </Button>
          </div>
        </article>
      </Container>
    </Section>
  );
}
