'use client';

import { OceanCanvas } from '@/components/ocean/ocean-canvas';
import { useScrollProgress } from '@/hooks/use-scroll-progress';
import { ChevronDown } from 'lucide-react';

export function HeroBackground() {
  const scrollProgress = useScrollProgress();

  return (
    <>
      <OceanCanvas scrollProgress={scrollProgress} className="z-0" />
      <div className="absolute inset-0 z-[1] bg-gradient-to-b from-transparent via-transparent to-bg-primary/70" />
    </>
  );
}

export function ScrollHint({ label }: { label: string }) {
  return (
    <div className="absolute bottom-8 left-1/2 z-10 -translate-x-1/2 flex flex-col items-center gap-2">
      <span className="text-[11px] font-medium uppercase tracking-[0.18em] text-fg-tertiary">
        {label}
      </span>
      <ChevronDown
        size={18}
        className="text-fg-tertiary"
        style={{ animation: 'float 3s ease-in-out infinite' }}
      />
    </div>
  );
}
