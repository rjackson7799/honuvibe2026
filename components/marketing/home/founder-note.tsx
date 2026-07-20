import { useTranslations } from 'next-intl';
import { ArrowRight } from 'lucide-react';
import {
  Container,
  Overline,
  PhotoPlaceholder,
  Section,
} from '@/components/marketing/primitives';

/**
 * A short, first-person founder note pairing a portrait with the "why" behind
 * HonuVibe. Portrait ships as a PhotoPlaceholder until a real photo is supplied
 * (asset dependency — flagged at ship time). No retired Aloha tagline.
 */
export function HomeFounderNote() {
  const t = useTranslations('home.founder');

  return (
    <Section variant="sand">
      <Container>
        <div className="grid items-center gap-10 md:grid-cols-[minmax(0,340px)_1fr] md:gap-14">
          <div className="mx-auto w-full max-w-[340px]">
            <PhotoPlaceholder
              label={t('portrait_label')}
              height={380}
              className="w-full"
            />
          </div>

          <div>
            <Overline tone="teal" className="mb-3.5">
              {t('overline')}
            </Overline>
            <h2
              className="mb-5 text-[clamp(26px,3.6vw,38px)] leading-[1.12] tracking-[-0.015em] text-[var(--m-ink-primary)]"
              style={{ fontFamily: 'var(--font-dm-serif)', fontWeight: 400 }}
            >
              {t('heading')}
            </h2>
            <div className="space-y-4 text-[16px] leading-[1.7] text-[var(--m-ink-secondary)]">
              <p>{t('body_1')}</p>
              <p>{t('body_2')}</p>
              <p>{t('body_3')}</p>
            </div>

            <p className="mt-6 text-[14.5px] font-semibold text-[var(--m-ink-primary)]">
              {t('signature')}
            </p>

            <ul role="list" className="mt-5 flex flex-wrap gap-2.5">
              {(['chip_1', 'chip_2', 'chip_3'] as const).map((key) => (
                <li
                  key={key}
                  className="inline-flex items-center rounded-full border border-[var(--m-border-default)] bg-[var(--m-white)] px-3.5 py-1.5 text-[12.5px] font-medium text-[var(--m-ink-secondary)]"
                >
                  {t(key)}
                </li>
              ))}
            </ul>

            <a
              href="/about"
              className="group mt-7 inline-flex items-center gap-1.5 text-[14.5px] font-semibold text-[var(--m-accent-teal)] transition-colors hover:text-[var(--m-accent-teal-dark)] focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[var(--m-accent-teal)] focus-visible:ring-offset-2 focus-visible:ring-offset-[var(--m-sand)] rounded-sm"
            >
              {t('cta')}
              <ArrowRight
                size={15}
                strokeWidth={2}
                className="transition-transform group-hover:translate-x-0.5"
              />
            </a>
          </div>
        </div>
      </Container>
    </Section>
  );
}
