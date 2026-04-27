import { useTranslations } from 'next-intl';
import { Container, Overline, Section } from '@/components/marketing/primitives';

const VALUE_KEYS = [
  'generously',
  'no_hard_sell',
  'pro_bono',
  'celebrate',
] as const;

export function AboutAlohaStandard() {
  const t = useTranslations('about.aloha_standard');

  return (
    <Section variant="canvas">
      <Container>
        {/* Header — large editorial split */}
        <div className="mb-14 grid gap-12 border-b border-[var(--m-border-soft)] pb-14 md:mb-18 md:grid-cols-2 md:items-end md:gap-20 md:pb-16">
          <div>
            <Overline tone="coral" className="mb-4">
              {t('overline')}
            </Overline>
            <h2
              className="font-bold leading-[1.0] tracking-[-0.03em] text-[var(--m-ink-primary)]"
              style={{ fontSize: 'clamp(40px, 5vw, 66px)' }}
            >
              {t('headline_line_1')}
              <br />
              {t('headline_line_2')}
            </h2>
          </div>
          <div className="md:pb-1">
            <p className="border-l-[3px] border-[var(--m-accent-coral)] pl-6 text-[18px] leading-[1.72] text-[var(--m-ink-secondary)]">
              {t('lede')}
            </p>
          </div>
        </div>

        {/* Values — large numbered list, not cards */}
        <div className="flex flex-col">
          {VALUE_KEYS.map((key, i) => (
            <ValueRow
              key={key}
              index={i + 1}
              title={t(`${key}_title`)}
              body={t(`${key}_body`)}
            />
          ))}
        </div>
      </Container>
    </Section>
  );
}

function ValueRow({
  index,
  title,
  body,
}: {
  index: number;
  title: string;
  body: string;
}) {
  return (
    <div className="group grid grid-cols-[40px_1fr] items-start gap-6 border-b border-[var(--m-border-soft)] py-7 transition-all duration-200 last:border-b-0 hover:bg-[rgba(15,169,160,0.025)] md:grid-cols-[64px_1fr_2fr] md:items-center md:gap-12 md:py-9">
      <span
        className="font-bold leading-none tracking-[-0.02em] text-[rgba(26,43,51,0.18)] transition-colors group-hover:text-[var(--m-accent-teal)]"
        style={{
          fontSize: 'clamp(20px, 2.5vw, 28px)',
          fontVariantNumeric: 'tabular-nums',
        }}
      >
        0{index}
      </span>
      <h3
        className="font-bold leading-[1.3] tracking-[-0.01em] text-[var(--m-ink-primary)]"
        style={{ fontSize: 'clamp(16px, 1.5vw, 18px)' }}
      >
        {title}
      </h3>
      <p className="col-span-2 text-[15px] leading-[1.72] text-[var(--m-ink-secondary)] md:col-span-1">
        {body}
      </p>
    </div>
  );
}
