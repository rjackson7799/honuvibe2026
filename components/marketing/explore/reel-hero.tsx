'use client';

import { useCallback, useEffect, useRef, useState } from 'react';
import Image from 'next/image';
import { useTranslations } from 'next-intl';
import { ArrowRight, ChevronLeft, ChevronRight, Play } from 'lucide-react';
import {
  BrowserFrame,
  Container,
  Section,
} from '@/components/marketing/primitives';
import { REEL_PROJECTS } from '@/lib/explore/projects';
import { cn } from '@/lib/utils';

const STATUS_COLOR = {
  live: 'bg-[rgba(15,169,160,0.16)] text-[var(--m-accent-teal)]',
  in_progress: 'bg-[rgba(232,118,90,0.16)] text-[var(--m-accent-coral)]',
  confidential: 'bg-white/10 text-white/70',
} as const;

export function ExploreReelHero() {
  const t = useTranslations('explore.reel_hero');
  const projects = REEL_PROJECTS;
  const total = projects.length;
  const [active, setActive] = useState(0);

  const goTo = useCallback(
    (i: number) => {
      const next = ((i % total) + total) % total;
      setActive(next);
    },
    [total],
  );

  useEffect(() => {
    function onKey(e: KeyboardEvent) {
      if (e.key === 'ArrowLeft') goTo(active - 1);
      if (e.key === 'ArrowRight') goTo(active + 1);
    }
    window.addEventListener('keydown', onKey);
    return () => window.removeEventListener('keydown', onKey);
  }, [active, goTo]);

  const current = projects[active];
  const pad = (n: number) => String(n).padStart(2, '0');

  return (
    <Section variant="navy" spacing="flush" className="relative overflow-hidden pt-10 md:pt-14">
      {/* Film-strip sprocket border, top */}
      <FilmStrip className="mb-8 md:mb-10" />

      <Container>
        {/* Status bar: NOW PLAYING · index · name | progress | frame counter + arrows */}
        <div className="mb-10 grid items-center gap-6 md:grid-cols-[auto_1fr_auto]">
          <div className="flex items-center gap-3 font-mono text-[12px] uppercase tracking-[0.16em] text-white/80">
            <Play size={11} fill="currentColor" className="text-[var(--m-accent-teal)]" aria-hidden />
            <span className="text-[var(--m-accent-teal)]">{t('now_playing_label')}</span>
            <span className="text-white/30">·</span>
            <span className="text-white">{pad(active + 1)}</span>
            <span className="text-white/30">·</span>
            <span className="font-sans normal-case tracking-normal text-white">{current.url}</span>
          </div>

          <ProgressBar total={total} active={active} onSelect={goTo} />

          <div className="flex items-center gap-4 justify-self-end font-mono text-[12px] tracking-[0.12em] text-white/70">
            <span>
              <span className="text-white">{pad(active + 1)}</span>
              <span className="mx-1 text-white/30">/</span>
              <span>{pad(total)}</span>
            </span>
            <div className="flex gap-2">
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
        </div>

        {/* The frame */}
        <div className="relative">
          {/* Huge ghost numeral */}
          <span
            aria-hidden
            className="pointer-events-none absolute -top-6 right-2 select-none font-serif italic leading-none text-white/[0.06] md:right-6 md:-top-10"
            style={{ fontSize: 'clamp(140px, 18vw, 240px)' }}
          >
            {pad(active + 1)}
          </span>

          <div className="grid items-start gap-10 md:grid-cols-[1.1fr_1fr] md:gap-14 lg:gap-20">
            {/* Browser frame side */}
            <div className="relative">
              <span className="absolute -top-3 left-4 z-10 rounded-md bg-[var(--m-accent-teal)] px-3 py-1.5 font-mono text-[10.5px] font-bold uppercase tracking-[0.16em] text-[var(--m-ink-primary)]">
                {t('scene_label', { n: pad(active + 1) })}
              </span>
              <BrowserFrame url={current.url} height="auto" className="bg-[var(--m-white)]">
                <div className="relative aspect-[16/11] w-full bg-[var(--m-white)]">
                  <Image
                    src={current.image}
                    alt={current.imageAlt}
                    fill
                    sizes="(min-width: 768px) 55vw, 100vw"
                    className="object-cover object-top"
                    priority={active === 0}
                  />
                </div>
              </BrowserFrame>
            </div>

            {/* Copy side */}
            <ProjectCopy
              t={t}
              projectKey={current.key}
              active={active}
              total={total}
              statusTone={current.status}
            />
          </div>
        </div>

        {/* Footer rail: industry / stack */}
        <div className="mt-10 grid gap-6 border-t border-white/10 pt-6 font-mono text-[11.5px] uppercase tracking-[0.14em] text-white/60 md:grid-cols-[auto_1fr_auto]">
          <span>
            <span className="text-white/40">{t('industry_label')}</span>{' '}
            <span className="text-white">{current.industry}</span>
          </span>
          <span className="md:text-center">
            <span className="text-white/40">{t('stack_label')}</span>{' '}
            <span className="text-white">{current.stack.join(' · ')}</span>
          </span>
          {current.liveUrl && (
            <a
              href={current.liveUrl}
              target="_blank"
              rel="noopener noreferrer"
              className="inline-flex items-center gap-1.5 justify-self-start text-[var(--m-accent-teal)] transition-opacity hover:opacity-80 md:justify-self-end"
            >
              {t('visit_label')}
              <ArrowRight size={13} strokeWidth={2} />
            </a>
          )}
          {!current.liveUrl && (
            <span className="text-white/30 md:justify-self-end">{t('no_link_label')}</span>
          )}
        </div>
      </Container>

      <FilmStrip className="mt-12 md:mt-16" />

      {/* hidden compile-time ref to ensure tone tokens stay tree-shake safe */}
      <span className={cn('hidden', STATUS_COLOR[current.status])} aria-hidden />
    </Section>
  );
}

function ProjectCopy({
  t,
  projectKey,
  active,
  total,
  statusTone,
}: {
  t: (key: string, vars?: Record<string, string | number>) => string;
  projectKey: string;
  active: number;
  total: number;
  statusTone: 'live' | 'in_progress' | 'confidential';
}) {
  const pad = (n: number) => String(n).padStart(2, '0');
  const p = (suffix: string) => t(`projects.${projectKey}.${suffix}`);

  return (
    <div className="flex flex-col">
      <div className="mb-4 flex items-center gap-3 font-mono text-[11.5px] uppercase tracking-[0.16em]">
        <span className="text-[var(--m-accent-teal)]">
          {t('frame_label', { current: pad(active + 1), total: pad(total) })}
        </span>
        <span
          className={cn(
            'inline-flex items-center gap-1.5 rounded-full px-2.5 py-1 text-[10.5px] font-bold tracking-[0.12em]',
            STATUS_COLOR[statusTone],
          )}
        >
          <span className="h-1.5 w-1.5 rounded-full bg-current" aria-hidden />
          {t(`status_${statusTone}`)}
        </span>
      </div>

      <h2
        className="font-serif italic leading-[1.02] tracking-[-0.015em] text-white"
        style={{ fontSize: 'clamp(36px, 4.8vw, 60px)' }}
      >
        {p('name')}
      </h2>

      <p className="mt-5 text-[17px] leading-[1.55] text-white/85">{p('subhead')}</p>

      <blockquote className="mt-6 border-l-2 border-[var(--m-accent-teal)] pl-5 font-serif italic text-[17.5px] leading-[1.55] text-white/90">
        &ldquo;{p('quote')}&rdquo;
      </blockquote>

      <div className="mt-8 grid grid-cols-3 gap-5 border-t border-white/10 pt-6">
        {[1, 2, 3].map((n) => (
          <div key={n}>
            <p className="font-serif text-[26px] leading-none tracking-[-0.02em] text-[var(--m-accent-teal)]">
              {p(`stat_${n}_value`)}
            </p>
            <p className="mt-2 text-[13.5px] font-semibold leading-snug text-white">
              {p(`stat_${n}_label`)}
            </p>
            <p className="mt-1 text-[12px] leading-snug text-white/55">
              {p(`stat_${n}_caption`)}
            </p>
          </div>
        ))}
      </div>
    </div>
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
            aria-label={`Frame ${i + 1}`}
            aria-current={isActive}
            className="group h-2 flex-1 overflow-hidden rounded-full bg-white/10 transition-colors hover:bg-white/15"
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

function FilmStrip({ className }: { className?: string }) {
  return (
    <div
      aria-hidden
      className={cn(
        'h-5 w-full bg-[var(--m-ink-primary)]',
        // sprocket holes: repeating-radial dot pattern in two rows
        '[background-image:radial-gradient(circle_at_center,rgba(255,255,255,0.18)_2.5px,transparent_3px)]',
        '[background-size:32px_20px]',
        '[background-repeat:repeat-x]',
        '[background-position:0_50%]',
        'border-y border-white/5',
        className,
      )}
    />
  );
}
