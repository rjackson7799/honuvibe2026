import { useTranslations } from 'next-intl';
import { BrainCircuit, Globe, Archive } from 'lucide-react';
import {
  Container,
  Section,
} from '@/components/marketing/primitives';

const cardIcons = [BrainCircuit, Globe, Archive] as const;

export function HomeValueProps() {
  const t = useTranslations('home.value_props');

  return (
    <Section variant="canvas">
      <Container>
        <div className="grid gap-12 md:grid-cols-3">
          {([1, 2, 3] as const).map((n, i) => {
            const Icon = cardIcons[i];
            const title = t(`card_${n}_title` as 'card_1_title');
            const body = t(`card_${n}_body` as 'card_1_body');
            const isCard2 = n === 2;
            const isCard3 = n === 3;
            return (
              <div key={n}>
                <div className="mb-5 flex h-14 w-14 items-center justify-center rounded-[14px] bg-[var(--m-accent-teal-soft)] text-[var(--m-accent-teal)]">
                  <Icon size={28} strokeWidth={1.6} />
                </div>
                <h3 className="mb-2.5 text-[20px] font-bold tracking-[-0.01em] text-[var(--m-ink-primary)]">
                  {title}
                  {isCard2 && (
                    <span className="ml-2 inline-block rounded-[4px] bg-[var(--m-accent-teal-soft)] px-1.5 py-0.5 text-[12px] font-bold text-[var(--m-accent-teal)]">
                      {t('card_2_jp_badge')}
                    </span>
                  )}
                </h3>
                <p className="text-[15.5px] leading-[1.65] text-[var(--m-ink-secondary)]">
                  {body}
                </p>
                {isCard3 && (
                  <span className="mt-3.5 inline-block rounded-full bg-[var(--m-accent-coral-soft)] px-3 py-1 text-[12px] font-semibold text-[var(--m-accent-coral)]">
                    {t('card_3_tag')}
                  </span>
                )}
              </div>
            );
          })}
        </div>
      </Container>
    </Section>
  );
}
