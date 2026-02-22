'use client';

import { useTranslations } from 'next-intl';
import { OceanCanvas } from '@/components/ocean/ocean-canvas';
import { useScrollProgress } from '@/hooks/use-scroll-progress';
import { Button } from '@/components/ui';
import { Link } from '@/i18n/navigation';
import { ChevronDown } from 'lucide-react';

export function HeroSection() {
  const t = useTranslations('hero');
  const scrollProgress = useScrollProgress();

  return (
    <section className="relative flex min-h-[100svh] items-center justify-center overflow-hidden -mt-14 md:-mt-16">
      {/* Ocean Canvas Background */}
      <OceanCanvas scrollProgress={scrollProgress} className="z-0" />

      {/* Gradient overlay for text readability */}
      <div className="absolute inset-0 z-[1] bg-gradient-to-b from-transparent via-transparent to-bg-primary/80" />

      {/* Content */}
      <div className="relative z-10 flex flex-col items-center px-5 text-center">
        {/* English headline */}
        <h1 className="font-serif text-display leading-[1.05] tracking-tight">
          <span className="block text-fg-primary">{t('headline_en')}</span>
          <span className="text-shimmer block">{t('headline_vibe')}</span>
          <span className="block text-fg-primary">{t('headline_en_2')}</span>
        </h1>

        {/* Japanese subline — always visible */}
        <p className="mt-4 text-base md:text-lg text-fg-secondary tracking-[0.04em]">
          {t('headline_jp')}
        </p>

        {/* Tagline */}
        <p className="mt-6 max-w-[480px] text-base md:text-lg text-fg-secondary leading-relaxed">
          {t('sub')}
        </p>

        {/* CTAs */}
        <div className="mt-10 flex flex-col gap-3 sm:flex-row sm:gap-4">
          <Link href="/learn">
            <Button variant="primary" size="lg">
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

      {/* Scroll hint */}
      <div className="absolute bottom-8 left-1/2 z-10 -translate-x-1/2 flex flex-col items-center gap-2">
        <span className="text-[11px] font-medium uppercase tracking-[0.18em] text-fg-tertiary">
          {t('scroll_hint')}
        </span>
        <ChevronDown
          size={18}
          className="text-fg-tertiary"
          style={{ animation: 'float 3s ease-in-out infinite' }}
        />
      </div>
    </section>
  );
}
