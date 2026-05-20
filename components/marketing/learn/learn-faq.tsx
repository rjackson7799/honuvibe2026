import { useTranslations } from 'next-intl';
import { Container, Section } from '@/components/marketing/primitives';

const QUESTIONS = [
  { q: 'q_1', a: 'a_1' },
  { q: 'q_2', a: 'a_2' },
  { q: 'q_3', a: 'a_3' },
  { q: 'q_4', a: 'a_4' },
  { q: 'q_5', a: 'a_5' },
  { q: 'q_6', a: 'a_6' },
] as const;

export function LearnFAQ() {
  const t = useTranslations('learn.faq');

  return (
    <Section variant="canvas">
      <Container>
        <div className="grid gap-12 lg:grid-cols-12 lg:gap-16">
          <div className="lg:col-span-5">
            <h2
              className="font-serif italic leading-[1.1] tracking-[-0.015em] text-[var(--m-ink-primary)]"
              style={{ fontSize: 'clamp(32px, 4vw, 48px)' }}
            >
              {t('heading')}
            </h2>
            <div className="mt-7 border-t border-[var(--m-border-default)] pt-6">
              <p className="text-[14.5px] leading-[1.7] text-[var(--m-ink-secondary)]">
                {t('contact_line')}
              </p>
            </div>
          </div>

          <div className="lg:col-span-7">
            <dl className="space-y-9">
              {QUESTIONS.map(({ q, a }) => (
                <div key={q} className="border-b border-[var(--m-border-soft)] pb-7 last:border-b-0">
                  <dt className="text-[16.5px] font-bold tracking-[-0.005em] text-[var(--m-ink-primary)]">
                    {t(q)}
                  </dt>
                  <dd className="mt-3 text-[14.5px] leading-[1.75] text-[var(--m-ink-secondary)]">
                    {t(a)}
                  </dd>
                </div>
              ))}
            </dl>
          </div>
        </div>
      </Container>
    </Section>
  );
}
