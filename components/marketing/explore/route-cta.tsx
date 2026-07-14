import { useTranslations } from 'next-intl';
import { ArrowUpRight } from 'lucide-react';
import { Container, Section } from '@/components/marketing/primitives';
import { STUDIO_URL } from '@/lib/constants/urls';

/**
 * Mid-page Studio nudge — sits after "The route" so the Build-with-Us handoff
 * isn't only at the very bottom. Whole card links to HonuVibe Studio (new tab),
 * matching the partnerships studio-router pattern, styled for the ocean surface.
 */
export function ExploreRouteCta() {
  const t = useTranslations('explore.route_cta');

  return (
    <Section variant="canvas" spacing="tight">
      <Container>
        <a
          href={STUDIO_URL}
          target="_blank"
          rel="noopener noreferrer"
          className="group flex flex-col gap-5 rounded-[16px] border border-[var(--m-accent-teal)]/30 bg-[rgba(15,169,160,0.06)] p-6 transition-all hover:-translate-y-0.5 hover:border-[var(--m-accent-teal)]/60 hover:bg-[rgba(15,169,160,0.1)] md:flex-row md:items-center md:justify-between md:p-8"
        >
          <div>
            <p className="font-mono text-[10.5px] uppercase tracking-[0.18em] text-[var(--m-accent-teal)]">
              {t('overline')}
            </p>
            <p className="mt-2.5 max-w-[42ch] font-serif text-[clamp(22px,2.8vw,30px)] leading-[1.2] text-white">
              {t('heading')}
            </p>
            <p className="mt-2.5 max-w-[58ch] text-[15px] leading-[1.6] text-white/70">
              {t('body')}
            </p>
          </div>
          <span className="inline-flex shrink-0 items-center gap-1.5 text-[15px] font-bold text-[var(--m-accent-teal)]">
            {t('cta')}
            <ArrowUpRight
              size={16}
              strokeWidth={2}
              className="transition-transform group-hover:translate-x-0.5 group-hover:-translate-y-0.5"
            />
          </span>
        </a>
      </Container>
    </Section>
  );
}
