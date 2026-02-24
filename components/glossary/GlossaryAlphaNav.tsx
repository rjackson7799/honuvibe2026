'use client';

import { useState, useEffect } from 'react';
import { cn } from '@/lib/utils';

const LETTERS = 'ABCDEFGHIJKLMNOPQRSTUVWXYZ'.split('');

type GlossaryAlphaNavProps = {
  activeLetters: Set<string>;
};

export function GlossaryAlphaNav({ activeLetters }: GlossaryAlphaNavProps) {
  const [activeLetter, setActiveLetter] = useState<string | null>(null);

  useEffect(() => {
    const observers: IntersectionObserver[] = [];
    LETTERS.forEach((letter) => {
      const el = document.getElementById(`letter-${letter.toLowerCase()}`);
      if (!el) return;
      const obs = new IntersectionObserver(
        ([entry]) => {
          if (entry.isIntersecting) setActiveLetter(letter);
        },
        { threshold: 0.5, rootMargin: '-10% 0px -80% 0px' },
      );
      obs.observe(el);
      observers.push(obs);
    });
    return () => observers.forEach((o) => o.disconnect());
  }, []);

  const handleClick = (letter: string) => {
    const el = document.getElementById(`letter-${letter.toLowerCase()}`);
    if (!el) return;
    el.scrollIntoView({ behavior: 'smooth', block: 'start' });
  };

  return (
    <div
      className={cn(
        'hidden md:flex',
        'sticky top-[64px] z-40',
        'gap-1 justify-center py-3',
        'bg-bg-primary border-b border-border-secondary',
      )}
    >
      {LETTERS.map((letter) => {
        const hasTerms = activeLetters.has(letter);
        const isActive = activeLetter === letter;
        return (
          <button
            key={letter}
            onClick={() => hasTerms && handleClick(letter)}
            disabled={!hasTerms}
            aria-label={`Jump to terms starting with ${letter}`}
            className={cn(
              'w-8 h-8 flex items-center justify-center rounded',
              'text-sm font-mono',
              'transition-colors duration-[var(--duration-fast)]',
              isActive && hasTerms
                ? 'text-accent-teal bg-accent-teal/10'
                : hasTerms
                  ? 'text-fg-secondary hover:text-fg-primary hover:bg-bg-tertiary cursor-pointer'
                  : 'text-fg-muted cursor-default',
            )}
          >
            {letter}
          </button>
        );
      })}
    </div>
  );
}
