'use client';

import { useTranslations } from 'next-intl';
import { useState, useEffect, useRef, useCallback } from 'react';
import Image from 'next/image';
import { Section } from '@/components/layout/section';
import { Container } from '@/components/layout/container';
import { SectionHeading, Tag, Button, Overline } from '@/components/ui';
import { Link } from '@/i18n/navigation';
import { ArrowRight, ChevronLeft, ChevronRight } from 'lucide-react';

const SLIDE_COUNT = 3;
const AUTO_ROTATE_MS = 5000;
const RESUME_DELAY_MS = 10000;

const slides = [
  { src: '/projects/kwame-brathwaite/KB_1.jpg', altKey: 'slide_alt_1' },
  { src: '/projects/kwame-brathwaite/KB_2.jpg', altKey: 'slide_alt_2' },
  { src: '/projects/kwame-brathwaite/KB_3.jpg', altKey: 'slide_alt_3' },
];

export function ExplorationPreview() {
  const t = useTranslations('exploration');
  const f = useTranslations('exploration.featured');

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

  const tags = f('tags').split(',');
  const isLive = f('status') === 'Live' || f('status') === '公開中';

  return (
    <Section id="exploration">
      <Container>
        <SectionHeading
          overline={t('overline')}
          heading={t('heading')}
          sub={t('sub')}
          centered
        />

        <div className="mx-auto mt-12 max-w-2xl">
          <div className="overflow-hidden rounded-xl border border-border-default bg-bg-secondary/30">
            {/* Carousel */}
            <div
              className="relative aspect-[16/10] overflow-hidden bg-bg-secondary"
              aria-label={f('carousel_label')}
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
                    alt={f(slide.altKey)}
                    fill
                    className="object-cover"
                    sizes="(max-width: 768px) 100vw, 672px"
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

            {/* Project info */}
            <div className="p-6">
              <Overline className="mb-3">{f('overline')}</Overline>
              <div className="mb-2 flex items-center gap-3">
                <h3 className="font-serif text-h3 font-normal text-fg-primary">{f('heading')}</h3>
                <span className="inline-flex items-center gap-1.5 rounded-full border border-accent-teal/30 bg-accent-teal/10 px-2.5 py-0.5 text-xs font-medium text-accent-teal">
                  <span
                    className={`h-1.5 w-1.5 rounded-full bg-accent-teal ${isLive ? '' : 'animate-pulse'}`}
                  />
                  {f('status')}
                </span>
              </div>
              <p className="mb-4 text-sm text-fg-secondary leading-relaxed">{f('tagline')}</p>
              <div className="flex flex-wrap gap-2">
                {tags.map((tag) => (
                  <Tag key={tag}>{tag.trim()}</Tag>
                ))}
              </div>
            </div>
          </div>
        </div>

        <div className="mt-10 flex justify-center">
          <Link href="/explore">
            <Button variant="ghost" icon={ArrowRight} iconPosition="right">
              {t('cta')}
            </Button>
          </Link>
        </div>
      </Container>
    </Section>
  );
}
