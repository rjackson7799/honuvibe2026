import { useTranslations } from 'next-intl';
import { Check, Lock } from 'lucide-react';
import {
  BrowserFrame,
  Button,
  Container,
  Section,
} from '@/components/marketing/primitives';
import { cn } from '@/lib/utils';

export function HomeHero() {
  const t = useTranslations('home.hero');

  return (
    <Section variant="canvas" spacing="hero" className="pb-20 md:pb-24">
      <Container>
        <div className="grid items-center gap-10 lg:grid-cols-2 lg:gap-16">
          <div>
            <div className="mb-6 inline-flex items-center gap-2">
              <span className="text-[11.5px] font-bold uppercase tracking-[0.09em] text-[var(--m-ink-secondary)]">
                {t('eyebrow_label')}
              </span>
              <span className="inline-block h-1 w-1 rounded-full bg-[var(--m-accent-coral)]" />
              <span className="text-[11.5px] font-bold uppercase tracking-[0.09em] text-[var(--m-accent-coral)]">
                {t('eyebrow_lang')}
              </span>
            </div>

            <h1
              className="mb-6 font-bold leading-[1.08] tracking-[-0.025em] text-[var(--m-ink-primary)]"
              style={{ fontSize: 'clamp(42px, 5.5vw, 66px)' }}
            >
              {t('headline_line_1')}
              <br />
              {t('headline_line_2')}
              <br />
              <span className="text-[var(--m-accent-teal)]">
                {t('headline_line_3')}
              </span>
            </h1>

            <p className="mb-10 max-w-[480px] text-[18px] leading-[1.65] text-[var(--m-ink-secondary)]">
              {t('subhead')}
            </p>

            <div className="flex flex-wrap gap-3.5">
              <Button href="/learn" variant="primary-teal" withArrow>
                {t('cta_primary')}
              </Button>
              <Button href="/partnerships" variant="outline-teal">
                {t('cta_secondary')}
              </Button>
            </div>

            <div className="mt-10 flex items-center gap-4">
              <div className="flex">
                {['#a8d8d4', '#8eccc7', '#74bfba', '#5ab3ad'].map((c, i) => (
                  <span
                    key={c}
                    style={{ background: c, marginLeft: i > 0 ? -10 : 0 }}
                    className="h-8 w-8 rounded-full border-2 border-[var(--m-canvas)]"
                    aria-hidden
                  />
                ))}
              </div>
              <span className="text-[13.5px] text-[var(--m-ink-tertiary)]">
                {t.rich('social_proof', {
                  count: (chunks) => (
                    <strong className="text-[var(--m-ink-primary)]">{chunks}</strong>
                  ),
                })}
              </span>
            </div>
          </div>

          <HeroVaultMockup />
        </div>
      </Container>
    </Section>
  );
}

function HeroVaultMockup() {
  const t = useTranslations('home.hero');

  const topics = [
    { label: t('vault_topic_1'), state: 'done' as const },
    { label: t('vault_topic_2'), state: 'done' as const },
    { label: t('vault_topic_3'), state: 'active' as const },
    { label: t('vault_topic_4'), state: 'idle' as const },
    { label: t('vault_topic_5'), state: 'idle' as const },
    { label: t('vault_topic_6'), state: 'idle' as const },
  ];

  const lessons = [
    {
      title: t('lesson_1_title'),
      desc: t('lesson_1_desc'),
      time: t('lesson_1_time'),
      state: 'done' as const,
    },
    {
      title: t('lesson_2_title'),
      desc: t('lesson_2_desc'),
      time: t('lesson_2_time'),
      state: 'done' as const,
    },
    {
      title: t('lesson_3_title'),
      desc: t('lesson_3_desc'),
      time: t('lesson_3_time'),
      state: 'active' as const,
    },
    {
      title: t('lesson_4_title'),
      desc: t('lesson_4_desc'),
      time: t('lesson_4_time'),
      state: 'locked' as const,
    },
  ];

  return (
    <div className="relative">
      <BrowserFrame url="vault.honuvibe.ai" secure height={430}>
        <div className="flex h-full bg-[var(--m-canvas)]">
          {/* Sidebar */}
          <aside className="w-[176px] shrink-0 border-r border-[var(--m-border-soft)] bg-[var(--m-white)] p-3 py-5">
            <div className="mb-5 flex items-center gap-1.5 px-1">
              <span className="text-[var(--m-accent-teal)]">
                <svg width="18" height="18" viewBox="0 0 18 18" fill="none">
                  <rect x="2" y="4" width="14" height="10" rx="1.5" fill="none" stroke="currentColor" strokeWidth="1.4" />
                  <circle cx="9" cy="9" r="2.5" fill="none" stroke="currentColor" strokeWidth="1.3" />
                </svg>
              </span>
              <span className="text-[13px] font-bold tracking-[-0.01em] text-[var(--m-ink-primary)]">
                {t('vault_brand')}
              </span>
            </div>
            <p className="mb-2 px-1 text-[9.5px] font-bold uppercase tracking-[0.08em] text-[var(--m-ink-tertiary)]">
              {t('vault_library_label')}
            </p>
            {topics.map((item) => (
              <div
                key={item.label}
                className={cn(
                  'mb-0.5 flex items-center gap-2 rounded-[7px] px-2 py-1.5',
                  item.state === 'active' && 'bg-[var(--m-accent-teal-soft)]',
                )}
              >
                <span
                  className={cn(
                    'h-1.5 w-1.5 shrink-0 rounded-full',
                    item.state === 'done' && 'bg-[var(--m-accent-teal)] opacity-70',
                    item.state === 'active' && 'bg-[var(--m-accent-teal)]',
                    item.state === 'idle' && 'bg-[rgba(26,43,51,0.15)]',
                  )}
                />
                <span
                  className={cn(
                    'text-[12px] leading-[1.35]',
                    item.state === 'active'
                      ? 'font-semibold text-[var(--m-accent-teal)]'
                      : 'text-[var(--m-ink-secondary)]',
                  )}
                >
                  {item.label}
                </span>
              </div>
            ))}
            <div className="mt-5 border-t border-[var(--m-border-soft)] px-2 pt-3">
              <div className="mb-1.5 flex justify-between">
                <span className="text-[10px] font-medium text-[var(--m-ink-tertiary)]">
                  {t('vault_progress_label')}
                </span>
                <span className="text-[10px] font-bold text-[var(--m-accent-teal)]">33%</span>
              </div>
              <div className="h-1 rounded-[2px] bg-[rgba(26,43,51,0.08)]">
                <div className="h-full w-1/3 rounded-[2px] bg-[var(--m-accent-teal)]" />
              </div>
            </div>
          </aside>

          {/* Main */}
          <div className="flex-1 overflow-hidden p-5">
            <div className="mb-4 flex items-center justify-between">
              <div>
                <h3 className="text-[15px] font-bold text-[var(--m-ink-primary)]">
                  {t('vault_chapter_title')}
                </h3>
                <p className="text-[11px] text-[var(--m-ink-tertiary)]">
                  {t('vault_chapter_meta')}
                </p>
              </div>
              <span className="rounded-full bg-[var(--m-accent-teal-soft)] px-2.5 py-0.5 text-[11px] font-semibold text-[var(--m-accent-teal)]">
                {t('vault_status')}
              </span>
            </div>

            {lessons.map((lesson) => (
              <div
                key={lesson.title}
                className={cn(
                  'mb-2 flex items-start gap-3 rounded-[10px] px-3.5 py-3',
                  'border-[1.5px]',
                  lesson.state === 'active' &&
                    'bg-[var(--m-white)] border-[var(--m-accent-teal)] shadow-[var(--m-shadow-sm)]',
                  lesson.state === 'done' &&
                    'bg-[rgba(15,169,160,0.04)] border-[var(--m-border-soft)]',
                  lesson.state === 'locked' && 'bg-transparent border-[var(--m-border-soft)]',
                )}
              >
                <span
                  className={cn(
                    'mt-0.5 flex h-7 w-7 shrink-0 items-center justify-center rounded-full',
                    lesson.state === 'done' && 'bg-[var(--m-accent-teal)] text-white',
                    lesson.state === 'active' && 'bg-[var(--m-accent-teal-soft)]',
                    lesson.state === 'locked' && 'bg-[rgba(26,43,51,0.07)]',
                  )}
                >
                  {lesson.state === 'done' && <Check size={12} strokeWidth={2.5} />}
                  {lesson.state === 'active' && (
                    <span className="h-2 w-2 rounded-full bg-[var(--m-accent-teal)]" />
                  )}
                  {lesson.state === 'locked' && (
                    <Lock size={10} className="text-[rgba(26,43,51,0.3)]" />
                  )}
                </span>
                <div className="min-w-0 flex-1">
                  <div className="mb-0.5 flex items-baseline justify-between">
                    <p
                      className={cn(
                        'text-[12.5px] font-semibold',
                        lesson.state === 'locked'
                          ? 'text-[var(--m-ink-tertiary)]'
                          : 'text-[var(--m-ink-primary)]',
                      )}
                    >
                      {lesson.title}
                    </p>
                    <span className="ml-2 shrink-0 text-[10.5px] text-[var(--m-ink-tertiary)]">
                      {lesson.time}
                    </span>
                  </div>
                  <p
                    className={cn(
                      'text-[11px] leading-[1.5]',
                      lesson.state === 'locked'
                        ? 'text-[var(--m-ink-tertiary)]'
                        : 'text-[var(--m-ink-secondary)]',
                    )}
                  >
                    {lesson.desc}
                  </p>
                </div>
              </div>
            ))}
          </div>
        </div>
      </BrowserFrame>
    </div>
  );
}
