import Image from 'next/image';
import { useTranslations } from 'next-intl';
import {
  Container,
  Overline,
  Section,
  SectionHeading,
} from '@/components/marketing/primitives';

const PARAGRAPH_KEYS = ['p1', 'p2', 'p3'] as const;

export function AboutOriginStory() {
  const t = useTranslations('about.origin_story');

  return (
    <Section variant="canvas">
      <Container>
        <div className="grid items-start gap-12 md:grid-cols-[5fr_7fr] md:gap-20">
          {/* Photo column */}
          <div className="relative">
            <div
              className="relative h-[400px] w-full overflow-hidden rounded-[16px] border border-[var(--m-border-soft)] md:h-[480px]"
              style={{
                background:
                  'linear-gradient(155deg, #d4c4a0 0%, #c0a87a 40%, #a89060 100%)',
              }}
            >
              <Image
                src="/images/partners/instructors/ryan.webp"
                alt={t('photo_alt')}
                fill
                sizes="(max-width: 768px) 100vw, 40vw"
                className="object-cover"
                priority={false}
              />
            </div>
            <div className="absolute -bottom-6 right-2 max-w-[220px] rounded-[14px] border border-[var(--m-border-soft)] bg-[var(--m-white)] p-5 shadow-[var(--m-shadow-lg)] md:-right-6">
              <p className="mb-2 text-[11px] font-bold uppercase tracking-[0.06em] text-[var(--m-accent-teal)]">
                {t('badge_name')}
              </p>
              <p className="text-[12px] leading-[1.5] text-[var(--m-ink-secondary)]">
                {t('badge_credential_1')}
                <br />
                {t('badge_credential_2')}
              </p>
            </div>
          </div>

          {/* Text column */}
          <div className="pt-2">
            <Overline tone="teal" className="mb-4">
              {t('overline')}
            </Overline>
            <SectionHeading className="mb-9">
              {t('headline_line_1')}
              <br />
              {t('headline_line_2')}
            </SectionHeading>
            <div className="flex flex-col gap-5">
              {PARAGRAPH_KEYS.map((k) => (
                <p
                  key={k}
                  className="text-[16px] leading-[1.78] text-[var(--m-ink-secondary)]"
                >
                  {t(k)}
                </p>
              ))}
            </div>
            <div className="mt-10 flex w-fit items-center gap-3 rounded-[10px] border border-[rgba(15,169,160,0.12)] bg-[rgba(15,169,160,0.05)] px-5 py-4">
              <span className="text-[18px]" aria-hidden>
                🌺
              </span>
              <span className="text-[13.5px] font-medium text-[var(--m-ink-secondary)]">
                {t('location_marker')}
              </span>
            </div>
          </div>
        </div>
      </Container>
    </Section>
  );
}
