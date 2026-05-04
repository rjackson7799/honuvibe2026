import Image from 'next/image';
import { useTranslations } from 'next-intl';
import { Link } from '@/i18n/navigation';
import {
  Card,
  Container,
  Overline,
  Section,
  SectionHeading,
} from '@/components/marketing/primitives';

type SecondaryKey = 'curriculum' | 'cobranded' | 'live';

type SecondaryCard = {
  key: SecondaryKey;
  imageSrc: string;
};

const SECONDARY_CARDS: ReadonlyArray<SecondaryCard> = [
  { key: 'curriculum', imageSrc: '/images/partnerships/partnership-curriculum.png' },
  { key: 'cobranded', imageSrc: '/images/partnerships/partnership-cobrand.png' },
  { key: 'live', imageSrc: '/images/partnerships/partnership-ondemand.png' },
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

        {/* Hero card — A New Revenue Stream */}
        <div
          className="grid grid-cols-1 items-center gap-8 rounded-[20px] border border-[var(--m-border-teal)] bg-[var(--m-seafoam-faint)] p-8 shadow-[var(--m-shadow-sm)] md:grid-cols-[40%_1fr] md:gap-12 md:px-14 md:py-12"
        >
          <div className="flex justify-center md:justify-start">
            <Image
              src="/images/partnerships/partnership-revenue.png"
              alt={t('cards.monetize_alt')}
              width={360}
              height={360}
              priority
              className="h-auto w-full max-w-[280px] md:max-w-[360px]"
            />
          </div>
          <div>
            {/* MIZUHO_REVIEW: confirm "最も差別化された価値" eyebrow phrasing for JP */}
            <span className="mb-4 inline-flex items-center rounded-full bg-[var(--m-accent-coral-soft)] px-3 py-1 text-[11px] font-semibold uppercase tracking-[0.14em] text-[var(--m-accent-coral)]">
              {t('overline_most_differentiated')}
            </span>
            <h3 className="text-[20px] font-bold tracking-[-0.01em] text-[var(--m-ink-primary)] md:text-[22px]">
              {t('cards.monetize_title')}
            </h3>
            <p className="mt-3 text-[15px] leading-[1.72] text-[var(--m-ink-secondary)]">
              {t('cards.monetize_body')}
            </p>
            <p className="mt-4 border-l-2 border-[var(--m-accent-teal)] pl-3 text-[13px] italic leading-relaxed text-[var(--m-ink-tertiary)]">
              {t('cards.monetize_proof')}
            </p>
          </div>
        </div>

        {/* Secondary 3-column row */}
        <div className="mt-5 grid grid-cols-1 gap-5 md:grid-cols-3">
          {SECONDARY_CARDS.map(({ key, imageSrc }) => (
            <Card key={key} interactive className="p-7 md:p-8">
              <Image
                src={imageSrc}
                alt={t(`cards.${key}_alt`)}
                width={88}
                height={88}
                className="mb-6 h-[88px] w-[88px] object-contain"
              />
              <h3 className="mb-2.5 text-[18px] font-bold tracking-[-0.01em] text-[var(--m-ink-primary)]">
                {t(`cards.${key}_title`)}
              </h3>
              <p className="text-[15px] leading-[1.72] text-[var(--m-ink-secondary)]">
                {t(`cards.${key}_body`)}
              </p>
              <p className="mt-4 border-l-2 border-[var(--m-accent-teal)] pl-3 text-[13px] italic leading-relaxed text-[var(--m-ink-tertiary)]">
                {t(`cards.${key}_proof`)}
              </p>
            </Card>
          ))}
        </div>

        <div className="mt-16 flex flex-col items-center text-center">
          <p className="mb-3 text-[14px] text-[var(--m-ink-secondary)]">
            {t('cta.lead')}
          </p>
          <Link
            href="#apply"
            className="inline-flex items-center justify-center rounded-full bg-[var(--m-accent-teal)] px-6 py-3 text-[15px] font-semibold text-white shadow-[var(--m-shadow-teal-sm)] transition-colors hover:bg-[var(--m-accent-teal-dark)]"
          >
            {t('cta.button')} →
          </Link>
          <Link
            href="/partners/vertice-society"
            className="mt-3 text-[13px] text-[var(--m-accent-teal)] hover:underline"
          >
            {t('cta.case_study')} →
          </Link>
        </div>
      </Container>
    </Section>
  );
}
