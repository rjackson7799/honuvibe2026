import { useTranslations } from 'next-intl';
import {
  Card,
  Container,
  Section,
  SectionHeading,
} from '@/components/marketing/primitives';

export function HomeTestimonials() {
  const t = useTranslations('home.testimonials');

  const quotes = ([1, 2, 3] as const).map((n) => ({
    text: t(`quote_${n}_text` as 'quote_1_text'),
    name: t(`quote_${n}_name` as 'quote_1_name'),
    role: t(`quote_${n}_role` as 'quote_1_role'),
  }));

  return (
    <Section variant="sand">
      <Container>
        <SectionHeading className="mb-12 text-center">
          {t('heading')}
        </SectionHeading>
        <div className="grid gap-6 md:grid-cols-3">
          {quotes.map((quote) => (
            <Card key={quote.name} className="relative px-7 py-8">
              <span
                aria-hidden
                className="absolute right-6 top-5 font-serif text-[48px] leading-none text-[var(--m-accent-coral)] opacity-35"
              >
                &ldquo;
              </span>
              <p className="mb-6 text-[15.5px] italic leading-[1.7] text-[var(--m-ink-primary)]">
                &ldquo;{quote.text}&rdquo;
              </p>
              <p className="text-[14px] font-bold text-[var(--m-ink-primary)]">
                {quote.name}
              </p>
              <p className="mt-0.5 text-[12.5px] text-[var(--m-ink-tertiary)]">
                {quote.role}
              </p>
            </Card>
          ))}
        </div>
      </Container>
    </Section>
  );
}
