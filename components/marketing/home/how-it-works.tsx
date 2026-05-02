import { useTranslations } from 'next-intl';
import { Container, Overline, Section } from '@/components/marketing/primitives';

export function HomeHowItWorks() {
  const t = useTranslations('home.how_it_works');

  const steps = [1, 2, 3].map((n) => ({
    numeral: String(n).padStart(2, '0'),
    title: t(`card_${n}_title` as 'card_1_title'),
    body: t(`card_${n}_body` as 'card_1_body'),
  }));

  return (
    <Section variant="sand">
      <Container>
        <Overline tone="caption" className="mb-12 text-center">
          {t('overline')}
        </Overline>
        <div className="grid gap-16 md:grid-cols-3 md:gap-12 lg:gap-16">
          {steps.map(({ numeral, title, body }) => (
            <div key={numeral} className="flex flex-col">
              <p
                className="font-serif font-normal leading-none tracking-[-0.02em] text-[var(--m-accent-teal)] opacity-40"
                style={{ fontSize: 'clamp(64px, 9vw, 112px)' }}
              >
                {numeral}
              </p>
              <span
                aria-hidden="true"
                className="mt-6 block h-px w-10 bg-[var(--m-accent-teal)]"
              />
              <h3 className="mt-6 font-serif text-[32px] font-normal leading-tight tracking-[-0.015em] text-[var(--m-ink-primary)] md:text-[40px]">
                {title}
              </h3>
              <p className="mt-4 max-w-[34ch] text-[15.5px] leading-[1.7] text-[var(--m-ink-secondary)]">
                {body}
              </p>
            </div>
          ))}
        </div>
      </Container>
    </Section>
  );
}
