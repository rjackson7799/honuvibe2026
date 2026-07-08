import { useTranslations } from 'next-intl';
import { ArrowRight } from 'lucide-react';
import { Container, Section } from '@/components/marketing/primitives';
import { STUDIO_URL } from '@/lib/constants/urls';

/**
 * Slim router band sitting where the Project + Consulting chapters used to be:
 * partnerships is now organizational learning only, so build/advisory
 * inquiries hand off to HonuVibe Studio. Static, server-rendered.
 */
export function PartnershipsStudioRouter() {
  const t = useTranslations('partnerships.studio_router');

  return (
    <Section variant="sand" spacing="tight">
      <Container>
        <a
          href={STUDIO_URL}
          target="_blank"
          rel="noopener noreferrer"
          className="group flex flex-col gap-4 rounded-[16px] border border-[var(--m-border-default)] bg-[var(--m-white)] p-6 transition-all hover:-translate-y-0.5 hover:border-[var(--m-border-strong)] hover:shadow-[0_8px_24px_rgba(26,43,51,0.06)] md:flex-row md:items-center md:justify-between md:p-8"
        >
          <div>
            <p className="font-mono text-[10.5px] uppercase tracking-[0.18em] text-[var(--m-accent-teal)]">
              {t('overline')}
            </p>
            <p className="mt-2 font-serif text-[clamp(22px,2.6vw,30px)] font-normal leading-[1.2] text-[var(--m-ink-primary)]">
              {t('heading')}
            </p>
            <p className="mt-2 max-w-[58ch] text-[15px] leading-[1.6] text-[var(--m-ink-secondary)]">
              {t('body')}
            </p>
          </div>
          <span className="inline-flex shrink-0 items-center gap-1.5 text-[15px] font-bold text-[var(--m-accent-teal)]">
            {t('cta')}
            <ArrowRight
              size={15}
              className="transition-transform group-hover:translate-x-0.5"
            />
          </span>
        </a>
      </Container>
    </Section>
  );
}
