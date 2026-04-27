import { useTranslations } from 'next-intl';
import { Compass, Wrench, ArrowRight } from 'lucide-react';
import {
  Card,
  Container,
  Overline,
  Section,
} from '@/components/marketing/primitives';

const cardIcons = [Compass, Wrench, ArrowRight] as const;

export function HomeHowItWorks() {
  const t = useTranslations('home.how_it_works');

  const cards = [1, 2, 3].map((n, i) => ({
    Icon: cardIcons[i],
    title: t(`card_${n}_title` as 'card_1_title'),
    body: t(`card_${n}_body` as 'card_1_body'),
  }));

  return (
    <Section variant="sand">
      <Container>
        <Overline tone="caption" className="mb-12 text-center">
          {t('overline')}
        </Overline>
        <div className="grid gap-7 md:grid-cols-3">
          {cards.map(({ Icon, title, body }) => (
            <Card
              key={title}
              interactive
              className="px-9 py-10"
            >
              <div className="mb-6 flex h-12 w-12 items-center justify-center rounded-[12px] bg-[var(--m-accent-teal-soft)] text-[var(--m-accent-teal)]">
                <Icon size={26} strokeWidth={1.5} />
              </div>
              <h3 className="mb-3 text-[21px] font-bold tracking-[-0.015em] text-[var(--m-ink-primary)]">
                {title}
              </h3>
              <p className="text-[15.5px] leading-[1.7] text-[var(--m-ink-secondary)]">
                {body}
              </p>
            </Card>
          ))}
        </div>
      </Container>
    </Section>
  );
}
