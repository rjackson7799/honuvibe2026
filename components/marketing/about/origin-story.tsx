import Image from 'next/image';
import { useTranslations } from 'next-intl';
import { ArrowRight } from 'lucide-react';
import { Container, Section } from '@/components/marketing/primitives';

const PARAGRAPH_KEYS = ['p1', 'p2', 'p3'] as const;
const STAT_KEYS = ['1', '2', '3'] as const;

export function AboutOriginStory() {
  const t = useTranslations('about.origin_story');

  return (
    <Section id="origin" variant="canvas" spacing="default" className="relative overflow-hidden">
      {/* Background watermark numeral */}
      <span
        aria-hidden
        className="pointer-events-none absolute -right-4 -top-12 select-none font-serif italic leading-none text-[var(--m-accent-teal)] opacity-[0.06] md:right-8 md:top-0"
        style={{ fontSize: 'clamp(220px, 32vw, 480px)' }}
      >
        01
      </span>

      <Container>
        {/* Chapter header */}
        <div className="relative mb-10 flex flex-wrap items-end justify-between gap-3 border-b border-[var(--m-border-soft)] pb-5">
          <p className="font-mono text-[11.5px] uppercase tracking-[0.18em] text-[var(--m-accent-teal)]">
            {t('chapter_overline')}
          </p>
          <p className="font-mono text-[10.5px] uppercase tracking-[0.16em] text-[var(--m-ink-tertiary)]">
            {t('chapter_meta_right')}
          </p>
        </div>

        <div className="relative grid gap-12 md:grid-cols-[1fr_1.05fr] md:gap-16">
          {/* Left: headline + chapter number + paragraphs */}
          <div>
            <div className="flex items-start gap-6">
              <span
                className="font-serif italic leading-none text-[var(--m-accent-teal)]"
                style={{ fontSize: 'clamp(56px, 7vw, 88px)' }}
              >
                01
              </span>
              <h2
                className="font-serif italic leading-[0.96] tracking-[-0.02em] text-[var(--m-ink-primary)]"
                style={{ fontSize: 'clamp(40px, 5.2vw, 68px)' }}
              >
                {t('headline_1')}
                <br />
                {t('headline_2')}
                <span className="text-[var(--m-accent-teal)]">.</span>
              </h2>
            </div>

            <div className="mt-9 flex flex-col gap-5">
              {PARAGRAPH_KEYS.map((k) => (
                <p
                  key={k}
                  className="max-w-[58ch] text-[16px] leading-[1.78] text-[var(--m-ink-secondary)]"
                >
                  {t(k)}
                </p>
              ))}
            </div>

            <a
              href="/explore"
              className="mt-10 inline-flex items-center gap-2 text-[15.5px] font-bold text-[var(--m-accent-teal)] transition-opacity hover:opacity-80"
            >
              {t('cta_label')}
              <ArrowRight size={15} strokeWidth={2} />
            </a>
          </div>

          {/* Right: founder proof tile */}
          <aside className="self-start">
            <article className="overflow-hidden rounded-[16px] border border-[var(--m-border-soft)] bg-[var(--m-white)] shadow-[var(--m-shadow-lg)]">
              {/* Tile meta */}
              <div className="border-b border-[var(--m-border-soft)] bg-[var(--m-sand)] px-5 py-3">
                <p className="font-mono text-[10.5px] uppercase tracking-[0.14em] text-[var(--m-ink-tertiary)]">
                  {t('tile_header')}
                </p>
              </div>

              {/* Portrait */}
              <div
                className="relative h-[280px] w-full overflow-hidden md:h-[320px]"
                style={{
                  background:
                    'linear-gradient(155deg, #d4c4a0 0%, #c0a87a 40%, #a89060 100%)',
                }}
              >
                <Image
                  src="/images/partners/instructors/ryan.webp"
                  alt={t('tile_photo_alt')}
                  fill
                  sizes="(max-width: 768px) 100vw, 40vw"
                  className="object-cover object-[center_18%] scale-[0.94]"
                  priority={false}
                />
              </div>

              <div className="px-6 py-6">
                <p className="font-mono text-[10.5px] uppercase tracking-[0.14em] text-[var(--m-accent-teal)]">
                  {t('tile_role')}
                </p>
                <h3
                  className="mt-1.5 font-serif italic leading-[1.05] tracking-[-0.015em] text-[var(--m-ink-primary)]"
                  style={{ fontSize: 'clamp(28px, 3vw, 36px)' }}
                >
                  {t('tile_name')}
                </h3>
                <p className="mt-3 text-[13.5px] leading-[1.5] text-[var(--m-ink-secondary)]">
                  {t('tile_credential')}
                </p>

                {/* Mini stat row */}
                <div className="mt-6 grid grid-cols-3 gap-4 border-t border-[var(--m-border-soft)] pt-5">
                  {STAT_KEYS.map((k) => (
                    <div key={k}>
                      <p className="font-mono text-[10.5px] uppercase tracking-[0.14em] text-[var(--m-ink-tertiary)]">
                        {t(`tile_stat_${k}_label`)}
                      </p>
                      <p className="mt-1.5 text-[14px] font-bold leading-snug text-[var(--m-ink-primary)]">
                        {t(`tile_stat_${k}_value`)}
                      </p>
                    </div>
                  ))}
                </div>
              </div>
            </article>
          </aside>
        </div>
      </Container>
    </Section>
  );
}
