'use client';

import { useEffect } from 'react';
import { usePathname } from 'next/navigation';
import { prefersReducedMotion } from './use-reduced-motion';

const EASE = 'cubic-bezier(.2,.7,.2,1)';

type RevealProps = {
  /** README `animateHero`: stagger `[data-intro]` elements on mount. */
  animateHero?: boolean;
  /** README `scrollReveal`: fade-up `[data-reveal]` elements as they enter the viewport. */
  scrollReveal?: boolean;
};

function canAnimate(el: Element): el is HTMLElement {
  return el instanceof HTMLElement && typeof el.animate === 'function';
}

/**
 * One orchestrator per hv page, rendered once (returns null). Sections stay
 * Server Components and simply mark elements:
 *   data-intro                  hero intro: fade-up 16px / 750ms, 80ms start + 90ms stagger
 *   data-reveal                 scroll reveal: fade-up 24px / 800ms when ~10% into view
 *   data-reveal-delay="120"     extra delay in ms
 *   data-line (inside reveal)   a rule that grows scaleX 0→1 after the parent reveals
 * Elements are visible by default; this only animates them, so nothing is
 * trapped hidden for print, reduced motion, or no-JS. Reduced motion: no-op.
 */
export function HvReveal({ animateHero = true, scrollReveal = true }: RevealProps) {
  const pathname = usePathname();

  useEffect(() => {
    if (typeof window === 'undefined' || prefersReducedMotion()) return;
    // Scan the whole document: the nav, footer and newsletter band carry their
    // own data-shell="hv" wrappers during the cutover, so "the first hv shell"
    // is not the page.
    const root = document;

    if (animateHero) {
      root.querySelectorAll<HTMLElement>('[data-intro]').forEach((el, i) => {
        if (el.dataset.played || !canAnimate(el)) return;
        el.dataset.played = '1';
        el.animate(
          [
            { opacity: 0, transform: 'translateY(16px)' },
            { opacity: 1, transform: 'none' },
          ],
          { duration: 750, delay: 80 + i * 90, easing: EASE, fill: 'backwards' },
        );
      });
    }

    if (!scrollReveal || !('IntersectionObserver' in window)) return;

    const play = (el: HTMLElement) => {
      if (el.dataset.played) return;
      el.dataset.played = '1';
      const delay = Number(el.dataset.revealDelay ?? 0) || 0;
      if (canAnimate(el)) {
        el.animate(
          [
            { opacity: 0, transform: 'translateY(24px)' },
            { opacity: 1, transform: 'none' },
          ],
          { duration: 800, delay, easing: EASE, fill: 'backwards' },
        );
      }
      el.querySelectorAll<HTMLElement>('[data-line]').forEach((line) => {
        if (!canAnimate(line)) return;
        line.animate([{ transform: 'scaleX(0)' }, { transform: 'scaleX(1)' }], {
          duration: 1000,
          delay: delay + 150,
          easing: EASE,
          fill: 'backwards',
        });
      });
    };

    const io = new IntersectionObserver(
      (entries) => {
        for (const entry of entries) {
          if (!entry.isIntersecting) continue;
          play(entry.target as HTMLElement);
          io.unobserve(entry.target);
        }
      },
      { rootMargin: '0px 0px -10% 0px' },
    );

    root.querySelectorAll<HTMLElement>('[data-reveal]').forEach((el) => {
      // Already on screen at load: don't replay content the visitor can see.
      if (el.getBoundingClientRect().top < window.innerHeight * 0.9) {
        el.dataset.played = '1';
        return;
      }
      io.observe(el);
    });

    return () => io.disconnect();
  }, [pathname, animateHero, scrollReveal]);

  return null;
}
