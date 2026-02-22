'use client';

import { cn } from '@/lib/utils';
import { useEffect, useRef } from 'react';

type SectionProps = {
  children: React.ReactNode;
  id?: string;
  className?: string;
  noReveal?: boolean;
};

export function Section({ children, id, className, noReveal = false }: SectionProps) {
  const ref = useRef<HTMLElement>(null);

  useEffect(() => {
    if (noReveal) return;
    const el = ref.current;
    if (!el) return;

    const prefersReducedMotion = window.matchMedia('(prefers-reduced-motion: reduce)').matches;
    if (prefersReducedMotion) {
      el.classList.add('visible');
      return;
    }

    const observer = new IntersectionObserver(
      ([entry]) => {
        if (entry.isIntersecting) {
          el.classList.add('visible');
          observer.unobserve(el);
        }
      },
      { threshold: 0.08 },
    );

    observer.observe(el);
    return () => observer.disconnect();
  }, [noReveal]);

  return (
    <section
      ref={ref}
      id={id}
      className={cn(
        'py-section-mobile md:py-section',
        !noReveal && 'reveal',
        className,
      )}
    >
      {children}
    </section>
  );
}
