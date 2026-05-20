import { useTranslations } from 'next-intl';
import { ArrowRight } from 'lucide-react';
import { Container, Section } from '@/components/marketing/primitives';

const CADENCE = ['intensive', 'engagement', 'voice'] as const;
const OUTCOMES = ['audit', 'workflow', 'enablement'] as const;
const ARTIFACT_LINES = [
  '$ honuvibe audit --org "Acme Group"',
  '→ scanning workflows ........... 14',
  '→ AI surface candidates ....... 06',
  '→ rollout risks flagged ....... 02',
  '→ generating roadmap.md',
] as const;

export function PartnershipsConsultingChapter() {
  const t = useTranslations('partnerships.consulting');

  return (
    <Section id="consulting" variant="canvas" spacing="default">
      <Container>
        <div className="mb-10 flex flex-wrap items-end justify-between gap-3 border-b border-[var(--m-border-soft)] pb-5">
          <p className="font-mono text-[11.5px] uppercase tracking-[0.18em] text-[var(--m-accent-teal)]">
            {t('overline')}
          </p>
          <p className="font-mono text-[10.5px] uppercase tracking-[0.16em] text-[var(--m-ink-tertiary)]">
            {t('meta_right')}
          </p>
        </div>

        <div className="grid gap-12 md:grid-cols-[1.1fr_1fr] md:gap-16">
          {/* Left: headline + body */}
          <div>
            <div className="flex items-start gap-6">
              <span
                className="font-serif italic leading-none text-[var(--m-accent-teal)]"
                style={{ fontSize: 'clamp(56px, 7vw, 88px)' }}
              >
                03
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

            <p className="mt-8 max-w-[58ch] text-[16.5px] leading-[1.7] text-[var(--m-ink-secondary)]">
              {t('lede')}
            </p>

            <div className="mt-10 grid grid-cols-1 gap-5 border-t border-[var(--m-border-soft)] pt-7 sm:grid-cols-3">
              {CADENCE.map((k) => (
                <div key={k}>
                  <p className="font-mono text-[10.5px] uppercase tracking-[0.14em] text-[var(--m-ink-tertiary)]">
                    {t(`cadence_${k}_label`)}
                  </p>
                  <p className="mt-1.5 text-[15px] font-bold leading-snug text-[var(--m-ink-primary)]">
                    {t(`cadence_${k}_value`)}
                  </p>
                </div>
              ))}
            </div>

            <ul className="mt-8 flex flex-col gap-3.5">
              {OUTCOMES.map((k) => (
                <li
                  key={k}
                  className="flex items-start gap-3 text-[15.5px] leading-[1.55] text-[var(--m-ink-secondary)]"
                >
                  <span
                    className="mt-2 h-1.5 w-1.5 shrink-0 rounded-full bg-[var(--m-accent-teal)]"
                    aria-hidden
                  />
                  <span>
                    <span className="font-semibold text-[var(--m-ink-primary)]">
                      {t(`outcome_${k}_title`)}
                    </span>{' '}
                    — {t(`outcome_${k}_body`)}
                  </span>
                </li>
              ))}
            </ul>

            <blockquote className="mt-10 border-l-2 border-[var(--m-accent-teal)] pl-5">
              <p className="font-serif italic text-[18px] leading-[1.55] text-[var(--m-ink-primary)]">
                &ldquo;{t('quote')}&rdquo;
              </p>
              <footer className="mt-3 font-mono text-[10.5px] uppercase tracking-[0.14em] text-[var(--m-ink-tertiary)]">
                {t('quote_attr')}
              </footer>
            </blockquote>

            <a
              href="/partnerships/apply?type=consulting"
              className="mt-10 inline-flex items-center gap-2 text-[15.5px] font-bold text-[var(--m-accent-teal)] transition-opacity hover:opacity-80"
            >
              {t('cta')}
              <ArrowRight size={15} strokeWidth={2} />
            </a>
          </div>

          {/* Right: artifact preview tile */}
          <aside className="self-start">
            <div className="overflow-hidden rounded-[14px] border border-[var(--m-ink-primary)] bg-[var(--m-ink-primary)] shadow-[var(--m-shadow-lg)]">
              <div className="flex items-center justify-between border-b border-white/10 px-4 py-2.5">
                <div className="flex items-center gap-1.5">
                  <span className="h-2 w-2 rounded-full bg-white/20" />
                  <span className="h-2 w-2 rounded-full bg-white/20" />
                  <span className="h-2 w-2 rounded-full bg-white/20" />
                </div>
                <p className="font-mono text-[10px] uppercase tracking-[0.14em] text-white/55">
                  {t('artifact_label')}
                </p>
              </div>
              <pre className="px-5 py-5 font-mono text-[12.5px] leading-[1.7] text-white/85">
                {ARTIFACT_LINES.map((line) => (
                  <div key={line}>
                    {line.startsWith('$') ? (
                      <span className="text-[var(--m-accent-teal)]">{line}</span>
                    ) : (
                      <span>{line}</span>
                    )}
                  </div>
                ))}
                <div className="mt-2 flex items-center gap-1.5 text-white/70">
                  <span className="inline-block h-2.5 w-1.5 animate-pulse bg-[var(--m-accent-teal)]" />
                  <span className="text-white/40">{t('artifact_caret')}</span>
                </div>
              </pre>
            </div>

            <p className="mt-5 px-1 font-mono text-[11px] uppercase leading-[1.6] tracking-[0.14em] text-[var(--m-ink-tertiary)]">
              {t('artifact_caption')}
            </p>
          </aside>
        </div>
      </Container>
    </Section>
  );
}
