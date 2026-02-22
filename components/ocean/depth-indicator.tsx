'use client';

import { useScrollProgress } from '@/hooks/use-scroll-progress';

export function DepthIndicator() {
  const scrollProgress = useScrollProgress();

  return (
    <div
      className="fixed right-1 top-0 h-full w-[3px] z-[50] pointer-events-none"
      aria-hidden="true"
    >
      <div
        className="w-full origin-top transition-transform duration-100"
        style={{
          height: '100%',
          transform: `scaleY(${scrollProgress})`,
          background: 'linear-gradient(to bottom, var(--accent-teal), var(--accent-gold))',
        }}
      />
    </div>
  );
}
