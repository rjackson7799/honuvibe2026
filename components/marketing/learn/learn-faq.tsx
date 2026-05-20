import { useTranslations } from 'next-intl';
import { Container, Section } from '@/components/marketing/primitives';

const QUESTIONS = [
  { q: 'q_1', qJp: 'q_1_jp', a: 'a_1' },
  { q: 'q_2', qJp: 'q_2_jp', a: 'a_2' },
  { q: 'q_3', qJp: 'q_3_jp', a: 'a_3' },
  { q: 'q_4', qJp: 'q_4_jp', a: 'a_4' },
  { q: 'q_5', qJp: 'q_5_jp', a: 'a_5' },
  { q: 'q_6', qJp: 'q_6_jp', a: 'a_6' },
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
            <p className="mt-3 text-[18px] text-[var(--m-ink-tertiary)]">
              {t('heading_jp')}
            </p>
            <div className="mt-7 border-t border-[var(--m-border-default)] pt-6">
              <p className="text-[14.5px] leading-[1.7] text-[var(--m-ink-secondary)]">
                {t('contact_line')}
              </p>
              <p className="mt-1.5 text-[14px] leading-[1.7] text-[var(--m-ink-tertiary)]">
                {t('contact_line_jp')}
              </p>
            </div>
          </div>

          <div className="lg:col-span-7">
            <dl className="space-y-9">
              {QUESTIONS.map(({ q, qJp, a }) => (
                <div key={q} className="border-b border-[var(--m-border-soft)] pb-7 last:border-b-0">
                  <dt>
                    <p className="text-[16.5px] font-bold tracking-[-0.005em] text-[var(--m-ink-primary)]">
                      {t(q)}
                    </p>
                    <p className="mt-1 text-[14px] text-[var(--m-ink-tertiary)]">
                      {t(qJp)}
                    </p>
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
