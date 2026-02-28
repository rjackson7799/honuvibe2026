'use client';

import { motion, useReducedMotion } from 'motion/react';

/* ── Types ── */

interface Spark {
  id: number;
  top: number;
  width: number;
  duration: number;
  delay: number;
  direction: 1 | -1;
  opacity: number;
}

/* ── Seeded pseudo-random to avoid hydration mismatch ── */

function seededRandom(seed: number): () => number {
  let s = seed;
  return () => {
    s = (s * 16807 + 0) % 2147483647;
    return (s - 1) / 2147483646;
  };
}

function generateSparks(count: number): Spark[] {
  const rand = seededRandom(314);
  return Array.from({ length: count }, (_, i) => ({
    id: i,
    top: rand() * 90 + 5,
    width: rand() * 4 + 12, // 12-16vw
    duration: rand() * 2 + 2, // 2-4s
    delay: rand() * 25, // spread over 25s
    direction: (rand() > 0.5 ? 1 : -1) as 1 | -1,
    opacity: rand() * 0.15 + 0.15, // 0.15-0.3
  }));
}

/* ── Pre-generate for SSR determinism ── */

const SPARKS = generateSparks(7);
const ECHO_COUNT = 4;
const ECHO_DURATION = 16;
const ECHO_STAGGER = 4;

/* ── Component ── */

export function AbyssalEchoBackground() {
  const reducedMotion = useReducedMotion();

  return (
    <div
      className="absolute inset-0 z-0 overflow-hidden"
      aria-hidden="true"
    >
      {/* Layer 1: Base abyssal gradient */}
      <div className="absolute inset-0 bg-[radial-gradient(ellipse_at_center,var(--bg-secondary),var(--bg-primary)_70%)]" />

      {/* Layer 2: Deep current orbs */}
      {reducedMotion ? (
        <>
          <div className="absolute -top-[20%] -left-[10%] h-[80vw] w-[80vw] rounded-full bg-glow-teal opacity-40 blur-[150px] mix-blend-screen pointer-events-none" />
          <div className="absolute -bottom-[20%] -right-[10%] h-[70vw] w-[70vw] rounded-full bg-glow-gold opacity-20 blur-[150px] mix-blend-screen pointer-events-none" />
        </>
      ) : (
        <>
          <motion.div
            className="absolute -top-[20%] -left-[10%] h-[80vw] w-[80vw] rounded-full bg-glow-teal opacity-40 blur-[150px] mix-blend-screen pointer-events-none"
            animate={{
              x: ['0vw', '10vw', '-5vw', '0vw'],
              y: ['0vh', '5vh', '10vh', '0vh'],
              scale: [1, 1.1, 0.9, 1],
            }}
            transition={{
              duration: 30,
              repeat: Infinity,
              ease: 'easeInOut',
            }}
          />
          <motion.div
            className="absolute -bottom-[20%] -right-[10%] h-[70vw] w-[70vw] rounded-full bg-glow-gold opacity-20 blur-[150px] mix-blend-screen pointer-events-none"
            animate={{
              x: ['0vw', '-10vw', '5vw', '0vw'],
              y: ['0vh', '-10vh', '-5vh', '0vh'],
              scale: [1, 1.2, 0.8, 1],
            }}
            transition={{
              duration: 35,
              repeat: Infinity,
              ease: 'easeInOut',
              delay: 5,
            }}
          />
        </>
      )}

      {/* Layer 3: Sonar echo rings */}
      {!reducedMotion && (
        <div className="absolute inset-0 flex items-center justify-center pointer-events-none">
          {Array.from({ length: ECHO_COUNT }, (_, i) => (
            <motion.div
              key={`echo-${i}`}
              className="absolute rounded-full border border-accent-teal/10"
              initial={{ width: 0, height: 0, opacity: 0.3 }}
              animate={{ width: '150vw', height: '150vw', opacity: 0 }}
              transition={{
                duration: ECHO_DURATION,
                repeat: Infinity,
                ease: 'linear',
                delay: i * ECHO_STAGGER,
              }}
            />
          ))}
        </div>
      )}

      {/* Layer 4: Data sparks (bioluminescent) */}
      {!reducedMotion && (
        <div className="absolute inset-0 pointer-events-none">
          {SPARKS.map((spark) => (
            <motion.div
              key={`spark-${spark.id}`}
              className="absolute h-px bg-gradient-to-r from-transparent via-accent-teal/60 to-transparent blur-[0.5px]"
              style={{
                top: `${spark.top}%`,
                width: `${spark.width}vw`,
                opacity: spark.opacity,
                left: spark.direction === 1 ? '-20vw' : '120vw',
              }}
              animate={{
                left: spark.direction === 1 ? '120vw' : '-20vw',
              }}
              transition={{
                duration: spark.duration,
                repeat: Infinity,
                ease: 'linear',
                delay: spark.delay,
              }}
            />
          ))}
        </div>
      )}

      {/* Layer 5: Noise texture overlay */}
      <div
        className="absolute inset-0 opacity-[0.03] mix-blend-overlay pointer-events-none"
        style={{
          backgroundImage: `url("data:image/svg+xml,%3Csvg viewBox='0 0 200 200' xmlns='http://www.w3.org/2000/svg'%3E%3Cfilter id='n'%3E%3CfeTurbulence type='fractalNoise' baseFrequency='0.015' numOctaves='3' stitchTiles='stitch'/%3E%3C/filter%3E%3Crect width='100%25' height='100%25' filter='url(%23n)'/%3E%3C/svg%3E")`,
          backgroundRepeat: 'repeat',
        }}
      />

      {/* Layer 6: Vignette */}
      <div className="absolute inset-0 bg-[radial-gradient(circle_at_center,transparent_0%,var(--bg-primary)_100%)] opacity-80 pointer-events-none" />
    </div>
  );
}
