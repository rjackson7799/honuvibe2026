import { useTranslations } from 'next-intl';
import { ArrowRight, Check, Mic, Video } from 'lucide-react';
import {
  BrowserFrame,
  Container,
  Overline,
  Section,
} from '@/components/marketing/primitives';
import { cn } from '@/lib/utils';

export function PartnershipsHero() {
  const t = useTranslations('partnerships.hero');

  return (
    <Section variant="canvas" spacing="hero" className="pb-16 md:pb-20">
      <Container>
        <div className="grid items-center gap-12 lg:grid-cols-[minmax(0,1fr)_minmax(0,560px)] lg:gap-14">
          <div className="max-w-[620px]">
            <Overline tone="coral" className="mb-5 inline-block">
              {t('overline')}
            </Overline>
            <h1
              className="mb-6 font-bold leading-[1.08] tracking-[-0.028em] text-[var(--m-ink-primary)]"
              style={{ fontSize: 'clamp(40px, 5vw, 64px)' }}
            >
              {t('headline_line_1')}
              <br />
              <span className="text-[var(--m-accent-teal)]">
                {t('headline_line_2')}
              </span>
            </h1>
            <p className="mb-10 max-w-[540px] text-[18.5px] leading-[1.72] text-[var(--m-ink-secondary)]">
              {t('subhead')}
            </p>
            <a
              href="#apply"
              className="inline-flex items-center gap-2 rounded-[10px] bg-[var(--m-accent-coral)] px-8 py-4 text-[16px] font-bold text-white shadow-[var(--m-shadow-coral-sm)] transition-all duration-200 hover:-translate-y-px hover:bg-[var(--m-accent-coral-dark)] hover:shadow-[var(--m-shadow-coral-md)] focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[var(--m-accent-coral)] focus-visible:ring-offset-2 focus-visible:ring-offset-[var(--m-canvas)]"
            >
              {t('cta')}
              <ArrowRight size={16} strokeWidth={2} />
            </a>
          </div>

          <PartnershipsHeroComposite />
        </div>
      </Container>
    </Section>
  );
}

function PartnershipsHeroComposite() {
  const t = useTranslations('partnerships.hero');

  return (
    <div
      role="img"
      aria-label={t('composite_alt')}
      className="relative mx-auto w-full max-w-[440px] lg:max-w-none"
    >
      {/* Mobile: stacked column. Desktop: layered absolute positioning */}
      <div className="flex flex-col gap-5 lg:block lg:h-[460px]">
        {/* Bottom card — bilingual slide */}
        <div
          aria-hidden
          className="lg:absolute lg:bottom-0 lg:left-0 lg:w-[300px] lg:rotate-[-3deg]"
        >
          <BilingualSlideCard />
        </div>

        {/* Middle card — live cohort session */}
        <div
          aria-hidden
          className="lg:absolute lg:bottom-[80px] lg:right-0 lg:w-[280px] lg:rotate-[2deg]"
        >
          <LiveSessionCard />
        </div>

        {/* Top card — LMS dashboard, animated */}
        <div
          aria-hidden
          className="lg:absolute lg:left-1/2 lg:top-0 lg:w-[400px] lg:-translate-x-1/2 lg:rotate-[-1deg] float-anim"
        >
          <LmsDashboardCard />
        </div>
      </div>
    </div>
  );
}

function LmsDashboardCard() {
  return (
    <BrowserFrame url="learn.honuvibe.ai/courses/ai-essentials" secure height={240}>
      <div className="flex h-full bg-[var(--m-canvas)]">
        <div className="flex-1 p-4">
          <div className="mb-3 flex items-center justify-between">
            <div>
              <p className="text-[10.5px] font-bold uppercase tracking-[0.08em] text-[var(--m-accent-teal)]">
                Bilingual Cohort
              </p>
              <h3 className="text-[14px] font-bold tracking-[-0.01em] text-[var(--m-ink-primary)]">
                AI Essentials — Week 3
              </h3>
            </div>
            <span className="rounded-full bg-[var(--m-accent-teal-soft)] px-2.5 py-0.5 text-[10.5px] font-semibold text-[var(--m-accent-teal)]">
              Live
            </span>
          </div>
          {[
            { title: 'Prompting Fundamentals', state: 'done' as const, lang: 'EN · 日本語' },
            { title: 'Working with ChatGPT', state: 'done' as const, lang: 'EN · 日本語' },
            { title: 'Building Custom GPTs', state: 'active' as const, lang: 'EN · 日本語' },
            { title: 'Automation Patterns', state: 'idle' as const, lang: 'EN · 日本語' },
          ].map((row) => (
            <div
              key={row.title}
              className={cn(
                'mb-1.5 flex items-center gap-2.5 rounded-[7px] border-[1.5px] px-2.5 py-2',
                row.state === 'active' &&
                  'border-[var(--m-accent-teal)] bg-[var(--m-white)]',
                row.state === 'done' &&
                  'border-[var(--m-border-soft)] bg-[rgba(15,169,160,0.04)]',
                row.state === 'idle' && 'border-[var(--m-border-soft)] bg-transparent',
              )}
            >
              <span
                className={cn(
                  'flex h-5 w-5 shrink-0 items-center justify-center rounded-full',
                  row.state === 'done' && 'bg-[var(--m-accent-teal)] text-white',
                  row.state === 'active' && 'bg-[var(--m-accent-teal-soft)]',
                  row.state === 'idle' && 'bg-[rgba(26,43,51,0.07)]',
                )}
              >
                {row.state === 'done' && <Check size={10} strokeWidth={2.5} />}
                {row.state === 'active' && (
                  <span className="h-1.5 w-1.5 rounded-full bg-[var(--m-accent-teal)]" />
                )}
              </span>
              <div className="min-w-0 flex-1">
                <p
                  className={cn(
                    'text-[11.5px] font-semibold leading-[1.3]',
                    row.state === 'idle'
                      ? 'text-[var(--m-ink-tertiary)]'
                      : 'text-[var(--m-ink-primary)]',
                  )}
                >
                  {row.title}
                </p>
                <p className="text-[9.5px] text-[var(--m-ink-tertiary)]">{row.lang}</p>
              </div>
            </div>
          ))}
        </div>
      </div>
    </BrowserFrame>
  );
}

function BilingualSlideCard() {
  return (
    <div className="overflow-hidden rounded-[14px] border border-[var(--m-border-soft)] bg-[var(--m-white)] shadow-[var(--m-shadow-lg)]">
      <div className="flex items-center justify-between border-b border-[var(--m-border-soft)] bg-[var(--m-sand)] px-3.5 py-2">
        <p className="text-[9.5px] font-bold uppercase tracking-[0.08em] text-[var(--m-ink-tertiary)]">
          Slide 14 / 32
        </p>
        <p className="text-[9.5px] font-semibold text-[var(--m-accent-teal)]">EN · 日本語</p>
      </div>
      <div className="grid grid-cols-2 gap-3 p-4">
        <div>
          <p className="mb-1 text-[9.5px] font-bold uppercase tracking-[0.08em] text-[var(--m-ink-tertiary)]">
            English
          </p>
          <p className="text-[12px] font-bold leading-[1.3] text-[var(--m-ink-primary)]">
            What makes a good prompt?
          </p>
          <ul className="mt-2 flex flex-col gap-1">
            {['Clear context', 'Concrete examples', 'Specific output format'].map(
              (line) => (
                <li
                  key={line}
                  className="flex items-start gap-1.5 text-[9.5px] text-[var(--m-ink-secondary)]"
                >
                  <span className="mt-[3px] h-1 w-1 shrink-0 rounded-full bg-[var(--m-accent-teal)]" />
                  {line}
                </li>
              ),
            )}
          </ul>
        </div>
        <div className="border-l border-[var(--m-border-soft)] pl-3">
          <p className="mb-1 text-[9.5px] font-bold uppercase tracking-[0.08em] text-[var(--m-ink-tertiary)]">
            日本語
          </p>
          <p className="text-[12px] font-bold leading-[1.3] text-[var(--m-ink-primary)]">
            良いプロンプトとは？
          </p>
          <ul className="mt-2 flex flex-col gap-1">
            {['明確な文脈', '具体的な例', '指定された出力形式'].map((line) => (
              <li
                key={line}
                className="flex items-start gap-1.5 text-[9.5px] text-[var(--m-ink-secondary)]"
              >
                <span className="mt-[3px] h-1 w-1 shrink-0 rounded-full bg-[var(--m-accent-teal)]" />
                {line}
              </li>
            ))}
          </ul>
        </div>
      </div>
    </div>
  );
}

function LiveSessionCard() {
  const tiles = [
    { initial: 'R', tone: 'teal' as const, label: 'Ryan' },
    { initial: '田', tone: 'coral' as const, label: 'Tanaka' },
    { initial: '鈴', tone: 'teal' as const, label: 'Suzuki' },
    { initial: 'M', tone: 'sand' as const, label: 'Maya' },
  ];
  const toneClass = (tone: 'teal' | 'coral' | 'sand') =>
    tone === 'teal'
      ? 'bg-[var(--m-accent-teal-soft)] text-[var(--m-accent-teal)]'
      : tone === 'coral'
      ? 'bg-[var(--m-accent-coral-soft)] text-[var(--m-accent-coral)]'
      : 'bg-[var(--m-sand)] text-[var(--m-ink-primary)]';

  return (
    <div className="overflow-hidden rounded-[14px] border border-[var(--m-border-soft)] bg-[var(--m-ink-primary)] text-white shadow-[var(--m-shadow-lg)]">
      <div className="flex items-center justify-between border-b border-white/10 px-3.5 py-2">
        <div className="flex items-center gap-1.5">
          <span className="h-1.5 w-1.5 animate-pulse rounded-full bg-[var(--m-accent-coral)]" />
          <p className="text-[10px] font-bold uppercase tracking-[0.1em] text-white/80">
            Live · 36:12
          </p>
        </div>
        <p className="text-[10px] font-medium text-white/55">Vertice × HonuVibe</p>
      </div>
      <div className="grid grid-cols-2 gap-1.5 p-2">
        {tiles.map((tile) => (
          <div
            key={tile.label}
            className={cn(
              'flex aspect-[4/3] items-center justify-center rounded-[8px] text-[15px] font-bold',
              toneClass(tile.tone),
            )}
            title={tile.label}
          >
            {tile.initial}
          </div>
        ))}
      </div>
      <div className="flex items-center justify-center gap-2 border-t border-white/10 px-3.5 py-2">
        <span className="flex h-6 w-6 items-center justify-center rounded-full bg-white/10">
          <Mic size={11} strokeWidth={2} className="text-white/85" />
        </span>
        <span className="flex h-6 w-6 items-center justify-center rounded-full bg-white/10">
          <Video size={11} strokeWidth={2} className="text-white/85" />
        </span>
        <span className="flex h-6 items-center rounded-full bg-[var(--m-accent-coral)] px-2.5 text-[9.5px] font-bold uppercase tracking-[0.08em] text-white">
          End
        </span>
      </div>
    </div>
  );
}
