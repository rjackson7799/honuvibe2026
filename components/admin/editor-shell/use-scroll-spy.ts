'use client';

import { useEffect, useRef, useState } from 'react';

/**
 * Scroll spy over a fixed set of section element ids. A section is "active"
 * when it crosses the upper-middle band of the viewport; reaching the bottom
 * of the page activates the last section (which may never reach the band).
 * `scrollTo` pins the clicked section briefly so smooth scrolling past
 * intermediate sections doesn't flicker the highlight.
 */
export function useScrollSpy(ids: readonly string[]) {
  const [activeId, setActiveId] = useState<string>(ids[0] ?? '');
  const pinnedUntil = useRef(0);
  const idsKey = ids.join('|');

  useEffect(() => {
    const sectionIds = idsKey.split('|').filter(Boolean);
    const elements = sectionIds
      .map((id) => document.getElementById(id))
      .filter((el): el is HTMLElement => el !== null);
    if (elements.length === 0) return;

    const observer = new IntersectionObserver(
      (entries) => {
        if (Date.now() < pinnedUntil.current) return;
        const visible = entries.filter((e) => e.isIntersecting);
        if (visible.length === 0) return;
        const topmost = visible.reduce((a, b) =>
          a.boundingClientRect.top <= b.boundingClientRect.top ? a : b,
        );
        setActiveId(topmost.target.id);
      },
      // Active band: 35%–45% from the top of the viewport.
      { rootMargin: '-35% 0px -55% 0px' },
    );
    elements.forEach((el) => observer.observe(el));

    const handleScroll = () => {
      if (Date.now() < pinnedUntil.current) return;
      const atBottom =
        window.innerHeight + window.scrollY >=
        document.documentElement.scrollHeight - 4;
      if (atBottom) setActiveId(sectionIds[sectionIds.length - 1]);
    };
    window.addEventListener('scroll', handleScroll, { passive: true });

    return () => {
      observer.disconnect();
      window.removeEventListener('scroll', handleScroll);
    };
  }, [idsKey]);

  function scrollTo(id: string) {
    pinnedUntil.current = Date.now() + 700;
    setActiveId(id);
    const reduceMotion = window.matchMedia(
      '(prefers-reduced-motion: reduce)',
    ).matches;
    document.getElementById(id)?.scrollIntoView({
      behavior: reduceMotion ? 'auto' : 'smooth',
      block: 'start',
    });
  }

  return { activeId, scrollTo };
}
