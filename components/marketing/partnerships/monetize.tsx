import { useTranslations } from 'next-intl';
import { Wheat } from 'lucide-react';
import { Container, Section } from '@/components/marketing/primitives';

const MODELS = ['share', 'license', 'sponsor'] as const;

export function PartnershipsMonetize() {
  const t = useTranslations('partnerships.monetize');

  return (
    <Section variant="navy" spacing="default">
      <Container>
        {/* Header */}
        <div className="mb-12 max-w-[62ch] md:mb-14">
          <p className="font-mono text-[10.5px] uppercase tracking-[0.18em] text-[var(--m-accent-teal)]">
            {t('overline')}
          </p>
          <h2
            className="mt-4 font-serif italic leading-[1] tracking-[-0.02em] text-white"
            style={{ fontSize: 'clamp(34px, 4.6vw, 60px)' }}
          >
            {t('heading')}
          </h2>
          <p className="mt-5 text-[16.5px] leading-[1.7] text-white/80">{t('lede')}</p>
        </div>

        {/* Revenue models */}
        <div className="grid gap-6 md:grid-cols-3 md:gap-7">
          {MODELS.map((k, i) => (
            <div
              key={k}
              className="flex flex-col rounded-[16px] border border-white/10 bg-white/[0.03] p-7"
            >
              <div className="flex items-center justify-between">
                <span
                  className="font-serif italic leading-none text-[var(--m-accent-gold)]"
                  style={{ fontSize: 'clamp(40px, 4vw, 54px)' }}
                >
                  {String(i + 1).padStart(2, '0')}
                </span>
                <Wheat
                  size={20}
                  strokeWidth={1.75}
                  className="text-[var(--m-accent-gold)]"
                  aria-hidden
                />
              </div>
              <h3 className="mt-6 text-[19px] font-bold leading-snug tracking-[-0.01em] text-white">
                {t(`model_${k}_title`)}
              </h3>
              <p className="mt-2.5 text-[15px] leading-[1.6] text-white/75">
                {t(`model_${k}_body`)}
              </p>
            </div>
          ))}
        </div>

        <p className="mt-10 border-t border-white/10 pt-6 font-mono text-[11px] uppercase tracking-[0.16em] text-white/50">
          {t('footnote')}
        </p>
      </Container>
    </Section>
  );
}
