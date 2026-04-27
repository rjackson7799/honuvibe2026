import { useTranslations } from 'next-intl';
import { FileText, Globe, Handshake, PlayCircle, type LucideIcon } from 'lucide-react';
import {
  Card,
  Container,
  Overline,
  Section,
  SectionHeading,
} from '@/components/marketing/primitives';

type CardKey = 'curriculum' | 'bilingual' | 'cobranded' | 'live';

const CARDS: ReadonlyArray<{ key: CardKey; Icon: LucideIcon }> = [
  { key: 'curriculum', Icon: FileText },
  { key: 'bilingual', Icon: Globe },
  { key: 'cobranded', Icon: Handshake },
  { key: 'live', Icon: PlayCircle },
];

export function PartnershipsWhatYouGet() {
  const t = useTranslations('partnerships.what_you_get');

  return (
    <Section variant="canvas" spacing="flush" className="pb-20 md:pb-24">
      <Container>
        <div className="mb-12 max-w-[560px] md:mb-14">
          <Overline tone="teal" className="mb-3.5 inline-block">
            {t('overline')}
          </Overline>
          <SectionHeading>
            {t('headline_line_1')}
            <br />
            {t('headline_line_2')}
          </SectionHeading>
        </div>
        <div className="grid grid-cols-1 gap-5 md:grid-cols-2">
          {CARDS.map(({ key, Icon }) => (
            <Card key={key} interactive className="p-9">
              <div className="mb-5 flex h-11 w-11 items-center justify-center rounded-[10px] bg-[var(--m-accent-teal-soft)]">
                <Icon
                  size={22}
                  strokeWidth={1.5}
                  className="text-[var(--m-accent-teal)]"
                />
              </div>
              <h3 className="mb-2.5 text-[18px] font-bold tracking-[-0.01em] text-[var(--m-ink-primary)]">
                {t(`cards.${key}_title`)}
              </h3>
              <p className="text-[15px] leading-[1.72] text-[var(--m-ink-secondary)]">
                {t(`cards.${key}_body`)}
              </p>
            </Card>
          ))}
        </div>
      </Container>
    </Section>
  );
}
