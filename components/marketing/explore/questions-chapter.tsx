import { useTranslations } from 'next-intl';
import { Plus } from 'lucide-react';
import { Container, Section } from '@/components/marketing/primitives';

const QUESTIONS = ['q_1', 'q_2', 'q_3', 'q_4', 'q_5'] as const;

export function ExploreQuestions() {
  const t = useTranslations('explore.questions');

  return (
    <Section variant="canvas" spacing="default">
      <Container>
        {/* Chapter header */}
        <div className="mb-12 flex flex-wrap items-end justify-between gap-4 border-b border-[var(--m-border-soft)] pb-6">
          <h2
            className="font-serif italic leading-[0.95] tracking-[-0.02em] text-[var(--m-ink-primary)]"
            style={{ fontSize: 'clamp(52px, 7.5vw, 96px)' }}
          >
            {t('headline')}
            <span className="text-[var(--m-accent-teal)]">.</span>
          </h2>
          <p className="font-mono text-[11.5px] uppercase tracking-[0.16em] text-[var(--m-ink-tertiary)]">
            {t('chapter_label')}
          </p>
        </div>

        <ul className="divide-y divide-[var(--m-border-soft)] border-b border-[var(--m-border-soft)]">
          {QUESTIONS.map((key, i) => (
            <li key={key}>
              <details className="group">
                <summary className="grid cursor-pointer list-none grid-cols-[60px_1fr_24px] items-start gap-4 py-6 transition-colors hover:bg-[rgba(15,169,160,0.04)]">
                  <span className="font-mono text-[11px] uppercase tracking-[0.14em] text-[var(--m-ink-tertiary)]">
                    {t('note_label', { n: String(i + 1).padStart(2, '0') })}
                  </span>
                  <span className="text-[16.5px] font-bold tracking-[-0.005em] text-[var(--m-ink-primary)]">
                    {t(`${key}_q`)}
                  </span>
                  <Plus
                    size={18}
                    strokeWidth={2}
                    className="mt-0.5 justify-self-end text-[var(--m-ink-tertiary)] transition-transform duration-200 group-open:rotate-45"
                    aria-hidden
                  />
                </summary>
                <div className="grid grid-cols-[60px_1fr_24px] gap-4 pb-7">
                  <span aria-hidden />
                  <p className="max-w-[680px] text-[14.5px] leading-[1.75] text-[var(--m-ink-secondary)]">
                    {t(`${key}_a`)}
                  </p>
                </div>
              </details>
            </li>
          ))}
        </ul>
      </Container>
    </Section>
  );
}
