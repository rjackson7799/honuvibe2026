import { useTranslations } from 'next-intl';
import { Check, Play } from 'lucide-react';
import {
  BrowserFrame,
  Button,
  Container,
  Overline,
  Section,
  SectionHeading,
} from '@/components/marketing/primitives';

export function LearnVaultMoment() {
  const t = useTranslations('learn.vault_moment');

  const features = [t('feature_1'), t('feature_2'), t('feature_3'), t('feature_4'), t('feature_5')];

  return (
    <Section variant="canvas">
      <Container>
        <div className="grid items-center gap-12 lg:grid-cols-[1.1fr_0.9fr] lg:gap-16">
          <div>
            <BrowserFrame
              url="vault.honuvibe.ai/lesson/context-and-memory"
              secure
              height="auto"
            >
              <VaultLessonMockup />
            </BrowserFrame>
          </div>

          <div>
            <Overline tone="teal" className="mb-3.5">{t('overline')}</Overline>
            <SectionHeading className="mb-4">{t('heading')}</SectionHeading>
            <p className="mb-8 text-[16px] leading-[1.7] text-[var(--m-ink-secondary)]">
              {t('body')}
            </p>
            <ul className="mb-9 list-none p-0">
              {features.map((f) => (
                <li
                  key={f}
                  className="mb-3.5 flex items-start gap-2.5 text-[15px] leading-[1.5] text-[var(--m-ink-secondary)]"
                >
                  <Check
                    size={15}
                    strokeWidth={2}
                    className="mt-1 shrink-0 text-[var(--m-accent-teal)]"
                  />
                  <span>{f}</span>
                </li>
              ))}
            </ul>
            <div className="border-t border-[var(--m-border-default)] pt-7">
              <p className="mb-0.5 text-[13px] text-[var(--m-ink-tertiary)] line-through">
                {t('price_old')}
              </p>
              <p className="mb-1 text-[32px] font-bold leading-none tracking-[-0.02em] text-[var(--m-ink-primary)]">
                {t('price_new')}
                <span className="text-[16px] font-medium text-[var(--m-ink-secondary)]">
                  {t('price_period')}
                </span>
              </p>
              <p className="mb-5 text-[13px] font-semibold text-[var(--m-accent-teal)]">
                {t('price_caption')}
              </p>
              <Button href="/learn#vault" variant="primary-teal" withArrow>
                {t('cta')}
              </Button>
            </div>
          </div>
        </div>
      </Container>
    </Section>
  );
}

function VaultLessonMockup() {
  const t = useTranslations('learn.vault_moment');

  return (
    <div className="bg-[var(--m-canvas)] p-6">
      <p className="mb-4 text-[11.5px] text-[var(--m-ink-tertiary)]">
        {t('mockup_breadcrumb_root')}
        <span className="mx-1.5">›</span>
        <span className="font-medium text-[var(--m-accent-teal)]">
          {t('mockup_breadcrumb_current')}
        </span>
      </p>

      <div
        className="relative mb-5 flex h-[200px] items-center justify-center overflow-hidden rounded-[10px]"
        style={{ background: 'linear-gradient(160deg, #1e3a4a 0%, #0d2530 100%)' }}
      >
        <button
          type="button"
          className="relative z-10 flex items-center justify-center rounded-full border-[1.5px] border-white/30 bg-white/15"
          style={{ width: 52, height: 52 }}
          aria-label="Play"
        >
          <Play size={18} fill="white" stroke="none" />
        </button>
        <div className="absolute inset-x-4 bottom-3 flex items-center gap-2.5">
          <span className="text-[10.5px] text-white/70">3:21</span>
          <div className="h-[3px] flex-1 rounded-[2px] bg-white/20">
            <div className="h-full w-[42%] rounded-[2px] bg-[var(--m-accent-teal)]" />
          </div>
          <span className="text-[10.5px] text-white/50">7:58</span>
        </div>
        <div className="absolute right-3 top-3 rounded-[6px] bg-white/15 px-2.5 py-0.5 text-[11px] font-semibold text-white">
          {t('mockup_lang_toggle')}
        </div>
      </div>

      <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
        <div>
          <p className="mb-2.5 text-[11px] font-bold uppercase tracking-[0.06em] text-[var(--m-ink-tertiary)]">
            {t('mockup_transcript_label')}
          </p>
          {[
            { time: '3:21', text: t('mockup_transcript_1') },
            { time: '3:28', text: t('mockup_transcript_2') },
            { time: '3:35', text: t('mockup_transcript_3') },
          ].map((line) => (
            <div key={line.time} className="mb-1.5 flex items-start gap-2">
              <span className="mt-0.5 shrink-0 text-[10px] font-semibold text-[var(--m-accent-teal)]">
                {line.time}
              </span>
              <p className="text-[12px] leading-[1.5] text-[var(--m-ink-secondary)]">
                {line.text}
              </p>
            </div>
          ))}
        </div>

        <div className="rounded-[10px] border border-[rgba(15,169,160,0.12)] bg-[rgba(15,169,160,0.05)] p-4">
          <p className="mb-2.5 text-[11px] font-bold uppercase tracking-[0.06em] text-[var(--m-accent-teal)]">
            {t('mockup_lesson_label')}
          </p>
          {[t('mockup_lesson_1'), t('mockup_lesson_2'), t('mockup_lesson_3')].map((item) => (
            <div key={item} className="mb-2 flex items-start gap-2">
              <Check
                size={13}
                strokeWidth={2}
                className="mt-0.5 shrink-0 text-[var(--m-accent-teal)]"
              />
              <p className="text-[12px] leading-[1.4] text-[var(--m-ink-primary)]">{item}</p>
            </div>
          ))}
        </div>
      </div>
    </div>
  );
}
