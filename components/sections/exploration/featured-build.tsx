'use client';

import { useTranslations } from 'next-intl';
import { useState, useEffect, useRef, useCallback } from 'react';
import Image from 'next/image';
import { Section } from '@/components/layout/section';
import { Container } from '@/components/layout/container';
import { Overline, Tag } from '@/components/ui';
import { ChevronLeft, ChevronRight } from 'lucide-react';

const SLIDE_COUNT = 3;
const AUTO_ROTATE_MS = 5000;
const RESUME_DELAY_MS = 10000;

const slides = [
  { src: '/projects/kwame-brathwaite/screenshot-1.svg', altKey: 'slide_alt_1' },
  { src: '/projects/kwame-brathwaite/screenshot-2.svg', altKey: 'slide_alt_2' },
  { src: '/projects/kwame-brathwaite/screenshot-3.svg', altKey: 'slide_alt_3' },
];

const statKeys = ['stat_1', 'stat_2', 'stat_3'] as const;

export function FeaturedBuild() {
  const t = useTranslations('exploration_page.featured_build');
  const [active, setActive] = useState(0);
  const [paused, setPaused] = useState(false);
  const intervalRef = useRef<ReturnType<typeof setInterval> | null>(null);
  const resumeRef = useRef<ReturnType<typeof setTimeout> | null>(null);
  const prefersReducedMotion = useRef(false);

  useEffect(() => {
    prefersReducedMotion.current = window.matchMedia('(prefers-reduced-motion: reduce)').matches;
  }, []);

  useEffect(() => {
    if (paused || prefersReducedMotion.current) return;
    intervalRef.current = setInterval(() => {
      setActive((prev) => (prev + 1) % SLIDE_COUNT);
    }, AUTO_ROTATE_MS);
    return () => {
      if (intervalRef.current) clearInterval(intervalRef.current);
    };
  }, [paused]);

  const goToSlide = useCallback((index: number) => {
    setActive(index);
    setPaused(true);
    if (resumeRef.current) clearTimeout(resumeRef.current);
    resumeRef.current = setTimeout(() => setPaused(false), RESUME_DELAY_MS);
  }, []);

  const prev = useCallback(() => goToSlide((active - 1 + SLIDE_COUNT) % SLIDE_COUNT), [active, goToSlide]);
  const next = useCallback(() => goToSlide((active + 1) % SLIDE_COUNT), [active, goToSlide]);

  const tags = t('tags').split(',');

  return (
    <Section>
      <Container size="wide">
        <div className="grid grid-cols-1 items-center gap-10 md:grid-cols-2 md:gap-16">
          {/* Carousel */}
          <div
            className="relative aspect-[16/10] overflow-hidden rounded-xl bg-bg-secondary"
            aria-label={t('carousel_label')}
            aria-roledescription="carousel"
            onMouseEnter={() => setPaused(true)}
            onMouseLeave={() => setPaused(false)}
          >
            {slides.map((slide, i) => (
              <div
                key={i}
                role="tabpanel"
                aria-hidden={i !== active}
                className="absolute inset-0 transition-opacity duration-[var(--duration-slow)] ease-[var(--ease-out)]"
                style={{ opacity: i === active ? 1 : 0, zIndex: i === active ? 10 : 0 }}
              >
                <Image
                  src={slide.src}
                  alt={t(slide.altKey)}
                  fill
                  className="object-cover"
                  sizes="(max-width: 768px) 100vw, 50vw"
                  priority={i === 0}
                />
              </div>
            ))}

            {/* Chevron navigation */}
            <button
              onClick={prev}
              className="absolute left-3 top-1/2 z-20 flex h-9 w-9 -translate-y-1/2 items-center justify-center rounded-full bg-bg-primary/60 text-fg-secondary backdrop-blur-sm transition-colors hover:bg-bg-primary/80 hover:text-fg-primary"
              aria-label="Previous slide"
            >
              <ChevronLeft size={18} />
            </button>
            <button
              onClick={next}
              className="absolute right-3 top-1/2 z-20 flex h-9 w-9 -translate-y-1/2 items-center justify-center rounded-full bg-bg-primary/60 text-fg-secondary backdrop-blur-sm transition-colors hover:bg-bg-primary/80 hover:text-fg-primary"
              aria-label="Next slide"
            >
              <ChevronRight size={18} />
            </button>

            {/* Dot indicators */}
            <div className="absolute bottom-3 left-1/2 z-20 flex -translate-x-1/2 gap-2" role="tablist">
              {slides.map((_, i) => (
                <button
                  key={i}
                  role="tab"
                  aria-selected={i === active}
                  aria-label={`Slide ${i + 1}`}
                  onClick={() => goToSlide(i)}
                  className="h-2 w-2 rounded-full transition-all duration-[var(--duration-normal)]"
                  style={{
                    backgroundColor: i === active ? 'var(--accent-teal)' : 'var(--border-primary)',
                    transform: i === active ? 'scale(1.25)' : 'scale(1)',
                  }}
                />
              ))}
            </div>
          </div>

          {/* Project details */}
          <div>
            <Overline className="mb-3">{t('overline')}</Overline>
            <div className="mb-2 flex items-center gap-3">
              <h2 className="font-serif text-h2 font-normal text-fg-primary">{t('heading')}</h2>
              <span className="inline-flex items-center gap-1.5 rounded-full border border-accent-teal/30 bg-accent-teal/10 px-2.5 py-0.5 text-xs font-medium text-accent-teal">
                <span className="h-1.5 w-1.5 animate-pulse rounded-full bg-accent-teal" />
                {t('status')}
              </span>
            </div>
            <p className="mb-4 text-base text-fg-secondary leading-relaxed">{t('sub')}</p>

            <div className="mb-4 rounded-lg border border-border-default bg-bg-secondary/50 p-4">
              <p className="text-xs font-semibold uppercase tracking-[0.18em] text-accent-gold mb-2">
                {t('challenge_label')}
              </p>
              <p className="text-sm text-fg-secondary leading-relaxed">{t('problem')}</p>
            </div>

            <p className="mb-5 text-sm text-fg-secondary leading-relaxed">{t('description')}</p>

            <p className="mb-5 text-sm font-medium text-accent-gold leading-relaxed">{t('outcome')}</p>

            {/* Stats */}
            <div className="mb-5 grid grid-cols-3 gap-4">
              {statKeys.map((key) => (
                <div key={key} className="text-center">
                  <p className="font-serif text-lg text-fg-primary">{t(`outcome_stats.${key}.value`)}</p>
                  <p className="text-xs text-fg-tertiary">{t(`outcome_stats.${key}.label`)}</p>
                </div>
              ))}
            </div>

            {/* Tags */}
            <div className="flex flex-wrap gap-1.5">
              {tags.map((tag) => (
                <Tag key={tag}>{tag.trim()}</Tag>
              ))}
            </div>
          </div>
        </div>
      </Container>
    </Section>
  );
}
