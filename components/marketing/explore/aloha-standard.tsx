import { useTranslations } from 'next-intl';
import { ArrowRight } from 'lucide-react';
import {
  Container,
  Overline,
  Section,
  SectionHeading,
} from '@/components/marketing/primitives';

export function ExploreAlohaStandard() {
  const t = useTranslations('explore.aloha_standard');

  return (
    <Section variant="canvas">
      <Container>
        <div className="grid items-center gap-12 md:grid-cols-2 md:gap-20">
          {/* Visual */}
          <div
            className="relative h-[320px] overflow-hidden rounded-[20px] md:h-[360px]"
            style={{
              background:
                'linear-gradient(135deg, #e8d8c0 0%, #d4c4a8 50%, #c0b090 100%)',
            }}
            aria-hidden
          >
            <div className="absolute inset-0 flex items-center justify-center">
              <div className="relative h-[200px] w-[200px]">
                <span
                  className="absolute h-20 w-20 rounded-full"
                  style={{
                    left: 60,
                    top: 70,
                    background: 'rgba(15,169,160,0.4)',
                  }}
                />
                <span
                  className="absolute h-20 w-20 rounded-full"
                  style={{
                    left: 100,
                    top: 50,
                    background: 'rgba(232,118,90,0.35)',
                  }}
                />
                <span
                  className="absolute h-20 w-20 rounded-full"
                  style={{
                    left: 140,
                    top: 70,
                    background: 'rgba(26,43,51,0.2)',
                  }}
                />
                <span
                  className="absolute text-[32px]"
                  style={{ left: 80, top: 100, width: 40, textAlign: 'center' }}
                >
                  🐢
                </span>
              </div>
            </div>
            <div className="absolute inset-x-6 bottom-6 rounded-[10px] bg-white/85 px-4 py-3">
              <p className="text-[13px] font-semibold text-[var(--m-ink-primary)]">
                {t('caption_title')}
              </p>
              <p className="mt-0.5 text-[12px] text-[var(--m-ink-tertiary)]">
                {t('caption_body')}
              </p>
            </div>
          </div>

          {/* Text */}
          <div>
            <Overline tone="coral" className="mb-3.5">
              {t('overline')}
            </Overline>
            <SectionHeading className="mb-4">{t('headline')}</SectionHeading>
            <p className="mb-8 text-[16.5px] leading-[1.75] text-[var(--m-ink-secondary)]">
              {t('body')}
            </p>
            <a
              href="/contact"
              className="inline-flex items-center gap-1.5 border-b border-[rgba(15,169,160,0.3)] pb-0.5 text-[14.5px] font-semibold text-[var(--m-accent-teal)] transition-opacity hover:opacity-80"
            >
              {t('cta')}
              <ArrowRight size={16} strokeWidth={2} />
            </a>
          </div>
        </div>
      </Container>
    </Section>
  );
}
