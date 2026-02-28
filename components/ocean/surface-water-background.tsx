'use client';

import { motion, useMotionValue, useSpring, useTransform, useReducedMotion } from 'motion/react';
import { useEffect, useMemo, useState } from 'react';

/* ── Types ── */

interface Ray {
  id: number;
  left: number;
  width: number;
  angle: number;
  duration: number;
  delay: number;
  opacity: number;
}

interface Bubble {
  id: number;
  left: number;
  size: number;
  duration: number;
  delay: number;
  depth: number; // 0 = foreground, 1 = background
}

/* ── Seeded pseudo-random to avoid hydration mismatch ── */

function seededRandom(seed: number): () => number {
  let s = seed;
  return () => {
    s = (s * 16807 + 0) % 2147483647;
    return (s - 1) / 2147483646;
  };
}

function generateRays(count: number): Ray[] {
  const rand = seededRandom(42);
  return Array.from({ length: count }, (_, i) => ({
    id: i,
    left: rand() * 120 - 10,
    width: rand() * 18 + 8,
    angle: rand() * 40 - 20,
    duration: rand() * 10 + 12, // faster oscillation (12–22s vs 20–35s)
    delay: rand() * -20,
    opacity: rand() * 0.04 + 0.01,
  }));
}

function generateBubbles(count: number): Bubble[] {
  const rand = seededRandom(137);
  return Array.from({ length: count }, (_, i) => ({
    id: i,
    left: rand() * 100,
    size: rand() * 8 + 2,
    duration: rand() * 20 + 15,
    delay: rand() * -40,
    depth: rand(),
  }));
}

/* ── Component ── */

export function SurfaceWaterBackground() {
  const reducedMotion = useReducedMotion();
  const [isMobile, setIsMobile] = useState(false);
  const [windowSize, setWindowSize] = useState({ width: 1000, height: 800 });

  useEffect(() => {
    const update = () => {
      setWindowSize({ width: window.innerWidth, height: window.innerHeight });
      setIsMobile(window.innerWidth < 768);
    };
    update();
    window.addEventListener('resize', update);
    return () => window.removeEventListener('resize', update);
  }, []);

  /* ── Mouse parallax (desktop only) ── */

  const mouseX = useMotionValue(windowSize.width / 2);
  const mouseY = useMotionValue(windowSize.height / 2);

  const springX = useSpring(mouseX, { stiffness: 15, damping: 40 });
  const springY = useSpring(mouseY, { stiffness: 15, damping: 40 });

  const parallaxXRays = useTransform(springX, [0, windowSize.width], [15, -15]);
  const parallaxYRays = useTransform(springY, [0, windowSize.height], [8, -8]);

  const parallaxXBgBubbles = useTransform(springX, [0, windowSize.width], [10, -10]);
  const parallaxYBgBubbles = useTransform(springY, [0, windowSize.height], [10, -10]);

  const parallaxXFgBubbles = useTransform(springX, [0, windowSize.width], [20, -20]);
  const parallaxYFgBubbles = useTransform(springY, [0, windowSize.height], [20, -20]);

  useEffect(() => {
    if (isMobile || reducedMotion) return;
    const handleMouseMove = (e: MouseEvent) => {
      mouseX.set(e.clientX);
      mouseY.set(e.clientY);
    };
    window.addEventListener('mousemove', handleMouseMove);
    return () => window.removeEventListener('mousemove', handleMouseMove);
  }, [mouseX, mouseY, isMobile, reducedMotion]);

  /* ── Generate elements (deterministic, SSR-safe) ── */

  const rays = useMemo(() => generateRays(isMobile ? 5 : 10), [isMobile]);
  const allBubbles = useMemo(() => generateBubbles(25), []);
  const bgBubbles = useMemo(() => allBubbles.filter(b => b.depth > 0.5).slice(0, isMobile ? 6 : 12), [allBubbles, isMobile]);
  const fgBubbles = useMemo(() => allBubbles.filter(b => b.depth <= 0.5).slice(0, isMobile ? 4 : 10), [allBubbles, isMobile]);

  /* ── Reduced motion: static scene ── */

  if (reducedMotion) {
    return (
      <div className="absolute inset-0 z-0 overflow-hidden" aria-hidden="true">
        <div className="absolute inset-0 bg-gradient-to-b from-[var(--ocean-ray-surface,#082a35)] via-[var(--ocean-ray-mid,#030e1a)] to-[var(--ocean-ray-deep,#010308)]" />
        <div className="absolute top-[-20%] left-[-10%] right-[-10%] h-[50%] bg-[var(--accent-teal)]/10 blur-[120px] rounded-[100%]" />
      </div>
    );
  }

  return (
    <div className="absolute inset-0 z-0 overflow-hidden" aria-hidden="true">
      {/* 1. Base gradient */}
      <div className="absolute inset-0 bg-gradient-to-b from-[var(--ocean-ray-surface,#082a35)] via-[var(--ocean-ray-mid,#030e1a)] to-[var(--ocean-ray-deep,#010308)]" />

      {/* 2. Surface light glows */}
      <div className="absolute top-[-20%] left-[-10%] right-[-10%] h-[50%] bg-[var(--accent-teal)]/10 blur-[120px] rounded-[100%]" />
      <div className="absolute top-[-30%] left-[20%] right-[20%] h-[50%] bg-[#b4c58b]/8 blur-[150px] rounded-[100%]" />

      {/* 3. Center sun spot */}
      <motion.div
        className="absolute top-[-15%] left-1/2 w-[60vw] h-[35vw] bg-white/[0.04] blur-[100px] rounded-full mix-blend-screen pointer-events-none"
        style={{
          translateX: '-50%',
          x: isMobile ? 0 : parallaxXRays,
        }}
      />

      {/* 4. God rays */}
      <motion.div
        className="absolute inset-0 pointer-events-none"
        style={isMobile ? undefined : { x: parallaxXRays, y: parallaxYRays }}
      >
        {rays.map((ray) => (
          <motion.div
            key={`ray-${ray.id}`}
            className="absolute top-[-10%] origin-top mix-blend-screen pointer-events-none will-change-[transform,opacity]"
            style={{
              left: `${ray.left}%`,
              width: `${ray.width}vw`,
              height: '130vh',
              background: `linear-gradient(to bottom, rgba(255,255,255,0.6) 0%, rgba(94,170,168,0.4) 25%, rgba(94,170,168,0.1) 50%, transparent 100%)`,
              clipPath: 'polygon(30% 0%, 70% 0%, 100% 100%, 0% 100%)',
              transform: `rotate(${ray.angle}deg)`,
            }}
            animate={{
              rotate: [ray.angle - 4, ray.angle + 4, ray.angle - 4],
              opacity: [ray.opacity, ray.opacity * 2, ray.opacity],
            }}
            transition={{
              duration: ray.duration,
              repeat: Infinity,
              ease: 'easeInOut',
              delay: ray.delay,
            }}
          />
        ))}
      </motion.div>

      {/* 5. Background bubbles (blurry, slow) */}
      <motion.div
        className="absolute inset-0 pointer-events-none"
        style={isMobile ? undefined : { x: parallaxXBgBubbles, y: parallaxYBgBubbles }}
      >
        {bgBubbles.map((bubble) => (
          <motion.div
            key={`bg-b-${bubble.id}`}
            className="absolute rounded-full bg-[var(--accent-teal)]/10 blur-[3px] will-change-transform"
            style={{
              left: `${bubble.left}%`,
              width: bubble.size * 0.5,
              height: bubble.size * 0.5,
              bottom: '-10%',
            }}
            animate={{
              y: ['0vh', '-120vh'],
              x: ['0px', '20px', '-15px', '10px', '0px'],
            }}
            transition={{
              y: { duration: bubble.duration * 1.5, repeat: Infinity, ease: 'linear', delay: bubble.delay },
              x: { duration: bubble.duration * 0.8, repeat: Infinity, ease: 'easeInOut', delay: bubble.delay },
            }}
          />
        ))}
      </motion.div>

      {/* 6. Foreground bubbles (translucent, no backdrop-blur) */}
      <motion.div
        className="absolute inset-0 pointer-events-none"
        style={isMobile ? undefined : { x: parallaxXFgBubbles, y: parallaxYFgBubbles }}
      >
        {fgBubbles.map((bubble) => (
          <motion.div
            key={`fg-b-${bubble.id}`}
            className="absolute rounded-full border border-white/10 bg-white/5 will-change-transform"
            style={{
              left: `${bubble.left}%`,
              width: bubble.size,
              height: bubble.size,
              bottom: '-10%',
            }}
            animate={{
              y: ['0vh', '-120vh'],
              x: ['0px', '30px', '-20px', '15px', '0px'],
            }}
            transition={{
              y: { duration: bubble.duration, repeat: Infinity, ease: 'linear', delay: bubble.delay },
              x: { duration: bubble.duration * 0.6, repeat: Infinity, ease: 'easeInOut', delay: bubble.delay },
            }}
          >
            {/* Highlight dot */}
            <div className="absolute top-[15%] left-[15%] w-[25%] h-[25%] bg-white/40 rounded-full blur-[0.5px]" />
          </motion.div>
        ))}
      </motion.div>

      {/* 7. Caustic noise overlay */}
      <div
        className="absolute inset-0 opacity-[0.04] mix-blend-overlay pointer-events-none"
        style={{
          backgroundImage: `url("data:image/svg+xml,%3Csvg viewBox='0 0 200 200' xmlns='http://www.w3.org/2000/svg'%3E%3Cfilter id='noiseFilter'%3E%3CfeTurbulence type='fractalNoise' baseFrequency='0.01' numOctaves='2' stitchTiles='stitch'/%3E%3C/filter%3E%3Crect width='100%25' height='100%25' filter='url(%23noiseFilter)'/%3E%3C/svg%3E")`,
          backgroundRepeat: 'repeat',
        }}
      />

      {/* 8. Vignette */}
      <div className="absolute inset-0 bg-[radial-gradient(circle_at_center,transparent_15%,rgba(0,0,0,0.7)_100%)] pointer-events-none" />
    </div>
  );
}
