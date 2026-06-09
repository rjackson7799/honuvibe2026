'use client';

import { useEffect } from 'react';
import { usePathname } from 'next/navigation';

/**
 * Plays a fade-up on `.reveal` elements as they enter the viewport.
 * Elements are visible by default (CSS) — this only *animates* them, so
 * content can never be trapped hidden (print, reduced-motion, no-JS).
 * Re-scans on route change since the Studio root layout persists.
 */
export function StudioReveal() {
  const pathname = usePathname();

  useEffect(() => {
    if (typeof window === 'undefined' || !('IntersectionObserver' in window)) return;
    if (window.matchMedia('(prefers-reduced-motion: reduce)').matches) return;

    const play = (el: HTMLElement, delay: number) => {
      if (el.dataset.played) return;
      el.dataset.played = '1';
      el.animate(
        [
          { opacity: 0, transform: 'translateY(18px)' },
          { opacity: 1, transform: 'none' },
        ],
        { duration: 620, easing: 'cubic-bezier(.2,.6,.2,1)', delay, fill: 'none' },
      );
    };

    const io = new IntersectionObserver(
      (entries) => {
        for (const e of entries) {
          if (!e.isIntersecting) continue;
          const t = e.target as HTMLElement;
          const sibs = Array.from(t.parentElement?.children ?? []).filter((c) =>
            c.classList.contains('reveal'),
          );
          play(t, Math.min(sibs.indexOf(t), 3) * 70);
          io.unobserve(t);
        }
      },
      { threshold: 0.08, rootMargin: '0px 0px -32px 0px' },
    );

    document.querySelectorAll<HTMLElement>('.studio .reveal').forEach((el) => io.observe(el));
    return () => io.disconnect();
  }, [pathname]);

  return null;
}
