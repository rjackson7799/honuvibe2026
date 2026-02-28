import { getTranslations } from 'next-intl/server';
import { Button } from '@/components/ui/button';
import { Link } from '@/i18n/navigation';
import { HeroBackground, ScrollHint } from './hero-background';

interface CardTranslations {
  course_title: string;
  course_modules: string;
  progress: string;
  lesson_1: string;
  lesson_2: string;
  lesson_3: string;
  achievement_label: string;
  achievement_title: string;
  achievement_desc: string;
}

function HeroFloatingCards({ cards }: { cards: CardTranslations }) {
  return (
    <div className="relative hidden lg:flex items-center justify-center h-[420px] overflow-hidden">
      {/* Primary card — course preview */}
      <div
        className="glass-card absolute rounded-xl p-6 w-[320px]"
        style={{
          animation: 'floatCard 6s ease-in-out infinite',
          right: '5%',
          top: '10%',
        }}
      >
        {/* Accent top border glow */}
        <div className="absolute top-0 left-6 right-6 h-[2px] rounded-full bg-gradient-to-r from-transparent via-accent-teal to-transparent" />

        <div className="flex items-center gap-3 mb-4">
          <div className="h-10 w-10 rounded-lg bg-accent-teal-subtle flex items-center justify-center shadow-[0_0_12px_var(--glow-teal)]">
            <span className="text-accent-teal text-lg font-semibold">AI</span>
          </div>
          <div>
            <p className="text-sm font-medium text-fg-primary">{cards.course_title}</p>
            <p className="text-xs text-fg-tertiary">{cards.course_modules}</p>
          </div>
        </div>

        {/* Progress bar */}
        <div className="mb-3">
          <div className="flex justify-between text-xs text-fg-tertiary mb-1">
            <span>{cards.progress}</span>
            <span>67%</span>
          </div>
          <div className="h-1.5 rounded-full bg-bg-tertiary overflow-hidden">
            <div className="h-full w-[67%] rounded-full bg-gradient-to-r from-accent-teal to-accent-gold" />
          </div>
        </div>

        {/* Lesson list */}
        <div className="space-y-2">
          <div className="flex items-center gap-2 text-xs text-fg-secondary">
            <div className="h-4 w-4 rounded-full bg-accent-teal/20 flex items-center justify-center">
              <div className="h-1.5 w-1.5 rounded-full bg-accent-teal" />
            </div>
            <span>{cards.lesson_1}</span>
          </div>
          <div className="flex items-center gap-2 text-xs text-fg-secondary">
            <div className="h-4 w-4 rounded-full bg-accent-teal/20 flex items-center justify-center">
              <div className="h-1.5 w-1.5 rounded-full bg-accent-teal" />
            </div>
            <span>{cards.lesson_2}</span>
          </div>
          <div className="flex items-center gap-2 text-xs text-fg-tertiary">
            <div className="h-4 w-4 rounded-full bg-bg-tertiary" />
            <span>{cards.lesson_3}</span>
          </div>
        </div>
      </div>

      {/* Secondary card — achievement, overlapping */}
      <div
        className="glass-card absolute rounded-xl p-5 w-[220px]"
        style={{
          animation: 'floatCardSecondary 7s ease-in-out infinite',
          left: '5%',
          bottom: '5%',
        }}
      >
        <div className="absolute top-0 left-4 right-4 h-[2px] rounded-full bg-gradient-to-r from-transparent via-accent-gold to-transparent" />
        <p className="text-[11px] font-semibold uppercase tracking-[0.18em] text-accent-gold mb-3">{cards.achievement_label}</p>
        <p className="text-2xl font-serif text-fg-primary">{cards.achievement_title}</p>
        <p className="text-xs text-fg-tertiary mt-1">{cards.achievement_desc}</p>
      </div>
    </div>
  );
}

export async function HeroSection() {
  const t = await getTranslations('hero');

  return (
    <section className="dark-zone relative flex min-h-[100svh] items-center overflow-hidden -mt-14 md:-mt-16">
      <HeroBackground />

      {/* Glow orbs — above canvas, below content (reduced intensity for new ray background) */}
      <div className="absolute inset-0 z-[2] pointer-events-none overflow-hidden" aria-hidden="true">
        <div
          className="glow-orb"
          style={{ width: '500px', height: '500px', top: '-10%', right: '-5%', background: 'var(--glow-teal)', opacity: 0.6 }}
        />
        <div
          className="glow-orb"
          style={{ width: '350px', height: '350px', bottom: '10%', left: '-8%', background: 'var(--glow-gold)', animationDelay: '-4s', opacity: 0.5 }}
        />
        <div
          className="glow-orb"
          style={{ width: '400px', height: '400px', top: '30%', right: '10%', background: 'var(--glow-purple)', animationDelay: '-8s', opacity: 0.4 }}
        />
      </div>

      {/* Content — split layout */}
      <div className="relative z-10 mx-auto w-full max-w-[1100px] px-5 md:px-6">
        <div className="grid grid-cols-1 items-center gap-8 lg:grid-cols-2 lg:gap-12">
          {/* Left: Text */}
          <div className="flex flex-col items-center text-center lg:items-start lg:text-left">
            <h1 className="font-serif text-display leading-[1.05] tracking-tight">
              <span className="block text-fg-primary">{t('headline_en')}</span>
              <span className="text-shimmer block">{t('headline_vibe')}</span>
              <span className="block text-fg-primary">{t('headline_en_2')}</span>
            </h1>

            <p className="mt-4 text-base md:text-lg text-fg-secondary tracking-[0.04em]">
              {t('headline_jp')}
            </p>

            <p className="mt-6 max-w-[480px] text-base md:text-lg text-fg-secondary leading-relaxed">
              {t('sub')}
            </p>

            <div className="mt-10 flex flex-col gap-3 sm:flex-row sm:gap-4">
              <Link href="/learn">
                <Button variant="gradient" size="lg">
                  {t('cta_primary')}
                </Button>
              </Link>
              <Button
                variant="ghost"
                size="lg"
                href="https://www.skool.com/honuvibe"
                target="_blank"
                rel="noopener noreferrer"
              >
                {t('cta_secondary')}
              </Button>
            </div>
          </div>

          {/* Right: Floating UI cards */}
          <HeroFloatingCards cards={{
            course_title: t('cards.course_title'),
            course_modules: t('cards.course_modules'),
            progress: t('cards.progress'),
            lesson_1: t('cards.lesson_1'),
            lesson_2: t('cards.lesson_2'),
            lesson_3: t('cards.lesson_3'),
            achievement_label: t('cards.achievement_label'),
            achievement_title: t('cards.achievement_title'),
            achievement_desc: t('cards.achievement_desc'),
          }} />
        </div>
      </div>

      <ScrollHint label={t('scroll_hint')} />
    </section>
  );
}
