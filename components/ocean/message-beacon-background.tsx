'use client';

import { motion, useReducedMotion } from 'motion/react';
import { useEffect, useMemo, useState } from 'react';

/* ── Types ── */

interface Star {
  id: number;
  left: number;
  top: number;
  size: number;
  baseOpacity: number;
  twinkleDuration: number;
}

interface Bottle {
  id: number;
  top: number;
  driftDuration: number;
  driftDelay: number;
  bobDuration: number;
  scale: number;
  color: 'teal' | 'gold';
}

/* ── Seeded pseudo-random to avoid hydration mismatch ── */

function seededRandom(seed: number): () => number {
  let s = seed;
  return () => {
    s = (s * 16807 + 0) % 2147483647;
    return (s - 1) / 2147483646;
  };
}

function generateStars(count: number): Star[] {
  const rand = seededRandom(271);
  return Array.from({ length: count }, (_, i) => ({
    id: i,
    left: rand() * 100,
    top: rand() * 42, // Top 42% = the "sky"
    size: rand() * 2 + 1,
    baseOpacity: rand() * 0.4 + 0.1,
    twinkleDuration: rand() * 3 + 2,
  }));
}

function generateBottles(count: number): Bottle[] {
  const rand = seededRandom(314);
  return Array.from({ length: count }, (_, i) => ({
    id: i,
    top: rand() * 35 + 52, // Between 52-87% = the "ocean"
    driftDuration: rand() * 15 + 25, // 25-40s per traverse
    driftDelay: rand() * -40, // Start at different phases
    bobDuration: rand() * 2 + 3, // 3-5s per bob
    scale: rand() * 0.4 + 0.6, // 0.6-1.0 = depth variation
    color: rand() > 0.5 ? 'teal' as const : 'gold' as const,
  }));
}

/* ── Component ── */

export function MessageBeaconBackground() {
  const reducedMotion = useReducedMotion();
  const [isMobile, setIsMobile] = useState(false);

  useEffect(() => {
    const update = () => setIsMobile(window.innerWidth < 768);
    update();
    window.addEventListener('resize', update);
    return () => window.removeEventListener('resize', update);
  }, []);

  /* ── Generate elements (deterministic, SSR-safe) ── */

  const stars = useMemo(() => generateStars(isMobile ? 20 : 40), [isMobile]);
  const bottles = useMemo(() => generateBottles(isMobile ? 3 : 6), [isMobile]);

  /* ── Reduced motion: static scene ── */

  if (reducedMotion) {
    return (
      <div className="absolute inset-0 z-0 overflow-hidden" aria-hidden="true">
        {/* Sky-to-ocean gradient */}
        <div className="absolute inset-0 bg-gradient-to-b from-[var(--bg-primary)] via-[var(--bg-secondary)] to-[var(--bg-primary)]" />
        {/* Horizon glow */}
        <div className="absolute top-[45%] left-0 right-0 h-[2px] bg-gradient-to-r from-transparent via-[var(--accent-teal)]/20 to-transparent" />
        {/* A few static stars */}
        {stars.slice(0, 8).map((star) => (
          <div
            key={`s-star-${star.id}`}
            className="absolute rounded-full bg-white"
            style={{
              left: `${star.left}%`,
              top: `${star.top}%`,
              width: star.size,
              height: star.size,
              opacity: star.baseOpacity,
            }}
          />
        ))}
        {/* Bottom fade for smooth section transition */}
        <div
          className="absolute inset-x-0 bottom-0 h-[150px] pointer-events-none"
          style={{ background: 'linear-gradient(to bottom, transparent, var(--bg-primary))', zIndex: 10 }}
        />
        {/* Vignette */}
        <div className="absolute inset-0 bg-[radial-gradient(circle_at_center,transparent_15%,rgba(0,0,0,0.7)_100%)] pointer-events-none" />
      </div>
    );
  }

  return (
    <div className="absolute inset-0 z-0 overflow-hidden" aria-hidden="true">
      {/* 1. Base sky-to-ocean gradient */}
      <div className="absolute inset-0 bg-gradient-to-b from-[var(--bg-primary)] via-[var(--bg-secondary)] to-[var(--bg-primary)]" />

      {/* 2. Star field */}
      {stars.map((star) => (
        <motion.div
          key={`star-${star.id}`}
          className="absolute rounded-full bg-white will-change-[opacity]"
          style={{
            left: `${star.left}%`,
            top: `${star.top}%`,
            width: star.size,
            height: star.size,
          }}
          animate={{
            opacity: [star.baseOpacity, star.baseOpacity * 2.5, star.baseOpacity],
          }}
          transition={{
            duration: star.twinkleDuration,
            repeat: Infinity,
            ease: 'easeInOut',
          }}
        />
      ))}

      {/* 3. Hōkūleʻa guiding star */}
      <motion.div
        className="absolute top-[12%] left-1/2 -translate-x-1/2 w-2.5 h-2.5 bg-white rounded-full shadow-[0_0_20px_6px_rgba(255,255,255,0.35)] will-change-[transform,opacity]"
        animate={{ opacity: [0.6, 1, 0.6], scale: [1, 1.3, 1] }}
        transition={{ duration: 4, repeat: Infinity, ease: 'easeInOut' }}
      />
      {/* Star reflection shimmer on the water */}
      <motion.div
        className="absolute top-[45%] left-1/2 -translate-x-1/2 w-[1px] h-28 bg-gradient-to-b from-white/20 via-white/8 to-transparent blur-[3px] will-change-[opacity]"
        animate={{ opacity: [0.15, 0.4, 0.15] }}
        transition={{ duration: 4, repeat: Infinity, ease: 'easeInOut' }}
      />

      {/* 4. Horizon glow */}
      <div className="absolute top-[43%] left-0 right-0 h-[8%] bg-[var(--accent-teal)]/[0.06] blur-[40px]" />
      <div className="absolute top-[45%] left-1/2 -translate-x-1/2 w-[70%] h-[2px] bg-gradient-to-r from-transparent via-[var(--accent-teal)]/25 to-transparent blur-[1px]" />

      {/* 5. Message bottles drifting across the ocean */}
      {bottles.map((bottle) => (
        <motion.div
          key={`bottle-${bottle.id}`}
          className="absolute pointer-events-none will-change-transform"
          style={{
            top: `${bottle.top}%`,
            scale: bottle.scale,
            zIndex: Math.floor(bottle.scale * 10),
          }}
          initial={{ left: '-8%' }}
          animate={{ left: '108%' }}
          transition={{
            duration: bottle.driftDuration,
            repeat: Infinity,
            ease: 'linear',
            delay: bottle.driftDelay,
          }}
        >
          {/* Bobbing motion */}
          <motion.div
            animate={{ y: [-8, 8, -8] }}
            transition={{
              duration: bottle.bobDuration,
              repeat: Infinity,
              ease: 'easeInOut',
            }}
            className="relative flex items-center justify-center"
          >
            {/* Glass capsule */}
            <div className="w-6 h-2.5 rounded-full border border-white/10 bg-white/[0.05] backdrop-blur-[2px] shadow-[inset_0_0_8px_rgba(255,255,255,0.08)] flex items-center justify-center overflow-hidden">
              {/* Inner spark */}
              <div
                className={`w-2 h-2 rounded-full blur-[1px] ${
                  bottle.color === 'teal'
                    ? 'bg-[var(--accent-teal)] shadow-[0_0_12px_rgba(var(--accent-teal-rgb,45,212,191),0.7)]'
                    : 'bg-[var(--accent-gold)] shadow-[0_0_12px_rgba(var(--accent-gold-rgb,196,167,92),0.7)]'
                }`}
              />
            </div>

            {/* Water ripple beneath */}
            <motion.div
              className="absolute -bottom-1.5 w-8 h-1 rounded-full border border-white/[0.04]"
              animate={{ scaleX: [1, 1.4, 1], opacity: [0.3, 0, 0.3] }}
              transition={{
                duration: bottle.bobDuration,
                repeat: Infinity,
                ease: 'easeInOut',
              }}
            />
          </motion.div>
        </motion.div>
      ))}

      {/* 6. Caustic noise overlay on ocean half */}
      <div
        className="absolute top-[45%] bottom-0 left-0 right-0 opacity-[0.04] mix-blend-overlay pointer-events-none"
        style={{
          backgroundImage: `url("data:image/svg+xml,%3Csvg viewBox='0 0 200 200' xmlns='http://www.w3.org/2000/svg'%3E%3Cfilter id='noiseFilter'%3E%3CfeTurbulence type='fractalNoise' baseFrequency='0.02' numOctaves='3' stitchTiles='stitch'/%3E%3C/filter%3E%3Crect width='100%25' height='100%25' filter='url(%23noiseFilter)'/%3E%3C/svg%3E")`,
          backgroundRepeat: 'repeat',
        }}
      />

      {/* 7. Bottom fade for smooth section transition */}
      <div
        className="absolute inset-x-0 bottom-0 h-[150px] pointer-events-none"
        style={{ background: 'linear-gradient(to bottom, transparent, var(--bg-primary))', zIndex: 10 }}
      />

      {/* 8. Vignette */}
      <div className="absolute inset-0 bg-[radial-gradient(circle_at_center,transparent_15%,rgba(0,0,0,0.7)_100%)] pointer-events-none" />
    </div>
  );
}
