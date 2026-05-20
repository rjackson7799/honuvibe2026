'use client';

import { useCallback, useEffect, useState } from 'react';
import { useTranslations } from 'next-intl';
import { ChevronLeft, ChevronRight } from 'lucide-react';
import {
  Button,
  Container,
  LogoLockup,
  Section,
} from '@/components/marketing/primitives';
import { cn } from '@/lib/utils';

const PARTNERS = ['vertice', 'partner_b', 'partner_c'] as const;

export function ComadeLockupHero() {
  const t = useTranslations('partnerships.comade.lockup_hero');
  const [active, setActive] = useState(0);
  const total = PARTNERS.length;

  const goTo = useCallback(
    (i: number) => {
      const next = ((i % total) + total) % total;
      setActive(next);
    },
    [total],
  );

  useEffect(() => {
    const id = window.setInterval(() => {
      setActive((a) => (a + 1) % total);
    }, 6000);
    return () => window.clearInterval(id);
  }, [total]);

  const current = PARTNERS[active];
  const partnerColor = t(`partners.${current}.color`);
  const partnerName = t(`partners.${current}.display_name`);
  const partnerSector = t(`partners.${current}.sector`);
  const pad = (n: number) => String(n).padStart(2, '0');

  return (
    <Section variant="navy" spacing="hero">
      <Container>
        {/* Issue meta strip */}
        <div className="mb-14 flex flex-wrap items-center justify-between gap-3 border-y border-white/10 py-3 font-mono text-[10.5px] uppercase tracking-[0.18em] text-white/55">
          <span>{t('meta_left')}</span>
          <span className="text-[var(--m-accent-teal)]">{t('meta_center')}</span>
          <span>{t('meta_right')}</span>
        </div>

        {/* Lockup */}
        <div className="relative flex flex-col items-center gap-8 py-10 md:py-16">
          <p className="font-mono text-[11.5px] uppercase tracking-[0.18em] text-[var(--m-accent-teal)]">
            {t('overline')}
          </p>

          <LogoLockup
            left={partnerName}
            right="HonuVibe.AI"
            size="xl"
            theme="navy"
            partnerColor={partnerColor}
          />

          <p className="font-mono text-[10.5px] uppercase tracking-[0.16em] text-white/55">
            {partnerSector}
          </p>

          {/* Tagline */}
          <p className="mt-6 max-w-[42ch] text-center font-serif italic text-[20px] leading-[1.45] text-white/90 md:text-[24px]">
            {t('tagline')}
          </p>

          {/* CTAs */}
          <div className="mt-6 flex flex-wrap items-center justify-center gap-3">
            <Button href="#feature" variant="primary-teal" size="md" withArrow>
              {t('cta_primary')}
            </Button>
            <Button
              href="/partnerships/apply"
              variant="outline-teal"
              size="md"
              className="!border-white/30 !text-white hover:!bg-white/10"
            >
              {t('cta_secondary')}
            </Button>
          </div>
        </div>

        {/* Cycler controls */}
        <div className="mt-10 grid items-center gap-6 border-t border-white/10 pt-6 md:grid-cols-[auto_1fr_auto]">
          <div className="flex items-center gap-3 font-mono text-[11.5px] uppercase tracking-[0.16em] text-white/70">
            <span className="text-[var(--m-accent-teal)]">{t('cycler_label')}</span>
            <span className="text-white/30">·</span>
            <span className="text-white">{pad(active + 1)}</span>
            <span className="text-white/30">/</span>
            <span>{pad(total)}</span>
          </div>

          <ProgressBar total={total} active={active} onSelect={goTo} />

          <div className="flex items-center gap-2 justify-self-end">
            <button
              type="button"
              onClick={() => goTo(active - 1)}
              aria-label={t('prev_label')}
              className="grid h-9 w-9 place-items-center rounded-full border border-white/20 text-white/80 transition-colors hover:border-white/40 hover:text-white"
            >
              <ChevronLeft size={16} strokeWidth={2} />
            </button>
            <button
              type="button"
              onClick={() => goTo(active + 1)}
              aria-label={t('next_label')}
              className="grid h-9 w-9 place-items-center rounded-full border border-white/20 text-white/80 transition-colors hover:border-white/40 hover:text-white"
            >
              <ChevronRight size={16} strokeWidth={2} />
            </button>
          </div>
        </div>
      </Container>
    </Section>
  );
}

function ProgressBar({
  total,
  active,
  onSelect,
}: {
  total: number;
  active: number;
  onSelect: (i: number) => void;
}) {
  return (
    <div className="flex items-center gap-2">
      {Array.from({ length: total }).map((_, i) => {
        const isActive = i === active;
        return (
          <button
            key={i}
            type="button"
            onClick={() => onSelect(i)}
            aria-label={`Partner ${i + 1}`}
            aria-current={isActive}
            className="group h-1.5 flex-1 overflow-hidden rounded-full bg-white/10 transition-colors hover:bg-white/15"
          >
            <span
              className={cn(
                'block h-full origin-left rounded-full bg-[var(--m-accent-teal)] transition-transform duration-500',
                isActive ? 'scale-x-100' : 'scale-x-0',
              )}
            />
          </button>
        );
      })}
    </div>
  );
}

