'use client';

import { useState, useEffect, useCallback, useRef, useMemo, type ReactNode } from 'react';
import { motion, useReducedMotion } from 'motion/react';
import { cn } from '@/lib/utils';

export type FloatingIconItem = {
  key: string;
  icon: ReactNode;
  color: string;
  label: string;
};

type FloatingIconsProps = {
  items: FloatingIconItem[];
  iconSize?: number;
  illuminateInterval?: number;
  maxActive?: number;
  className?: string;
};

function generatePositions(count: number) {
  const positions: { x: number; y: number; scale: number; driftX: number; driftY: number; duration: number }[] = [];

  const slots = [
    [8, 12], [30, 6], [55, 10], [78, 15], [93, 8],
    [12, 40], [38, 35], [62, 42], [85, 38],
    [5, 68], [28, 65], [52, 72], [80, 66],
    [18, 78], [48, 73], [72, 80],
  ];

  for (let i = 0; i < count; i++) {
    const slot = slots[i % slots.length];
    positions.push({
      x: slot[0],
      y: slot[1],
      scale: 0.8 + (((i * 7) % 5) / 10),
      driftX: 8 + ((i * 3) % 12),
      driftY: 10 + ((i * 5) % 15),
      duration: 5 + ((i * 1.3) % 4),
    });
  }

  return positions;
}

export function FloatingIcons({
  items,
  iconSize = 40,
  illuminateInterval = 3000,
  maxActive = 2,
  className,
}: FloatingIconsProps) {
  const prefersReducedMotion = useReducedMotion();
  const [activeQueue, setActiveQueue] = useState<number[]>([]);
  const intervalRef = useRef<ReturnType<typeof setInterval> | null>(null);

  const positions = useMemo(() => generatePositions(items.length), [items.length]);

  const pickRandom = useCallback(() => {
    setActiveQueue((prev) => {
      let next: number;
      do {
        next = Math.floor(Math.random() * items.length);
      } while (prev.includes(next) && items.length > maxActive);

      const updated = [...prev, next];
      // Keep only the most recent `maxActive` items
      if (updated.length > maxActive) {
        return updated.slice(updated.length - maxActive);
      }
      return updated;
    });
  }, [items.length, maxActive]);

  useEffect(() => {
    if (prefersReducedMotion) return;

    pickRandom();
    intervalRef.current = setInterval(pickRandom, illuminateInterval);
    return () => {
      if (intervalRef.current) clearInterval(intervalRef.current);
    };
  }, [prefersReducedMotion, pickRandom, illuminateInterval]);

  const activeSet = useMemo(() => new Set(activeQueue), [activeQueue]);

  return (
    <div
      className={cn('absolute inset-0 pointer-events-none overflow-hidden', className)}
      aria-hidden="true"
    >
      {items.map(({ key, icon, color, label }, i) => {
        const pos = positions[i];
        const isActive = activeSet.has(i);

        return (
          <motion.div
            key={key}
            className="absolute"
            style={{
              left: `${pos.x}%`,
              top: `${pos.y}%`,
              transform: `scale(${pos.scale})`,
            }}
            animate={
              prefersReducedMotion
                ? {}
                : {
                    x: [0, pos.driftX, -pos.driftX * 0.6, pos.driftX * 0.3, 0],
                    y: [0, -pos.driftY, pos.driftY * 0.4, -pos.driftY * 0.7, 0],
                  }
            }
            transition={{
              duration: pos.duration,
              repeat: Infinity,
              ease: 'easeInOut',
              delay: i * 0.4,
            }}
          >
            <div className="relative flex flex-col items-center">
              {/* Glow background */}
              <div
                className={`absolute rounded-full blur-3xl transition-opacity duration-700 ${
                  isActive ? 'opacity-40' : 'opacity-0'
                }`}
                style={{
                  backgroundColor: color,
                  width: iconSize * 3,
                  height: iconSize * 3,
                  top: '50%',
                  left: '50%',
                  transform: 'translate(-50%, -50%)',
                }}
              />

              {/* Icon */}
              <div
                className="relative z-10 transition-all duration-700"
                style={{
                  color: isActive ? color : 'var(--fg-muted)',
                  opacity: isActive ? 1 : 0.25,
                  filter: isActive ? `drop-shadow(0 0 20px ${color})` : 'none',
                }}
              >
                {icon}
              </div>

              {/* Label — shows on illuminate */}
              <span
                className={`mt-2 text-[10px] md:text-xs font-semibold tracking-[0.15em] uppercase whitespace-nowrap transition-all duration-700 ${
                  isActive ? 'opacity-100' : 'opacity-0'
                }`}
                style={{
                  color,
                  textShadow: `0 0 12px ${color}`,
                }}
              >
                {label}
              </span>
            </div>
          </motion.div>
        );
      })}
    </div>
  );
}
