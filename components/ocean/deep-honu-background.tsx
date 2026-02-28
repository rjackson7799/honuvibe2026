'use client';

import { motion, useMotionValue, useSpring, useTransform, useReducedMotion } from 'motion/react';
import { useEffect, useMemo, useState, useCallback } from 'react';

/* ── Types ── */

interface HonuSilhouette {
  id: number;
  x: number;
  y: number;
  scale: number;
  opacity: number;
  blur: number;
  rotation: number;
  driftDuration: number;
  driftDelay: number;
  swimDuration: number;
}

interface Particle {
  id: number;
  x: number;
  y: number;
  size: number;
  opacity: number;
  fallDuration: number;
  delay: number;
  driftX: number;
}

/* ── Seeded pseudo-random (SSR-safe, deterministic) ── */

function seededRandom(seed: number): () => number {
  let s = seed;
  return () => {
    s = (s * 16807 + 0) % 2147483647;
    return (s - 1) / 2147483646;
  };
}

function generateHonu(count: number): HonuSilhouette[] {
  const rand = seededRandom(808); // Hawaii area code
  const presets = [
    { scale: 3.5, opacity: 0.12, blur: 8 },   // closest – smaller, sharper
    { scale: 5.5, opacity: 0.06, blur: 18 },   // mid-depth
    { scale: 8, opacity: 0.03, blur: 30 },      // deepest – massive, ghostly
  ];
  return Array.from({ length: count }, (_, i) => {
    const preset = presets[i % presets.length];
    return {
      id: i,
      x: 15 + rand() * 70,
      y: 20 + rand() * 60,
      scale: preset.scale,
      opacity: preset.opacity,
      blur: preset.blur,
      rotation: rand() * 60 - 30,
      driftDuration: 40 + rand() * 30,
      driftDelay: rand() * -20,
      swimDuration: 10 + rand() * 8,
    };
  });
}

function generateParticles(count: number): Particle[] {
  const rand = seededRandom(322);
  return Array.from({ length: count }, (_, i) => ({
    id: i,
    x: rand() * 100,
    y: rand() * 100,
    size: rand() * 2 + 1,
    opacity: rand() * 0.25 + 0.05,
    fallDuration: 25 + rand() * 35,
    delay: rand() * -40,
    driftX: rand() * 40 - 20,
  }));
}

/* ── Honu SVG path (inline, no external dep) ── */

function HonuSVG({ size, color }: { size: number; color: string }) {
  return (
    <svg width={size} height={size} viewBox="0 0 32 32" fill="none" aria-hidden="true">
      <ellipse cx="16" cy="15" rx="9" ry="11" fill={color} opacity="0.9" />
      <path d="M16 6 L16 24" stroke={color} strokeWidth="0.3" opacity="0.15" />
      <path d="M9 12 L23 12" stroke={color} strokeWidth="0.3" opacity="0.15" />
      <path d="M9 18 L23 18" stroke={color} strokeWidth="0.3" opacity="0.15" />
      <ellipse cx="16" cy="4.5" rx="3" ry="2.5" fill={color} opacity="0.85" />
      <ellipse cx="6" cy="11" rx="4" ry="2" fill={color} opacity="0.7" transform="rotate(-30 6 11)" />
      <ellipse cx="26" cy="11" rx="4" ry="2" fill={color} opacity="0.7" transform="rotate(30 26 11)" />
      <ellipse cx="7" cy="21" rx="3.5" ry="1.5" fill={color} opacity="0.6" transform="rotate(20 7 21)" />
      <ellipse cx="25" cy="21" rx="3.5" ry="1.5" fill={color} opacity="0.6" transform="rotate(-20 25 21)" />
      <ellipse cx="16" cy="27" rx="2" ry="3" fill={color} opacity="0.6" />
    </svg>
  );
}

/* ── Component ── */

export function DeepHonuBackground() {
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

  /* ── Mouse tracking for spotlight ── */

  const mouseX = useMotionValue(windowSize.width / 2);
  const mouseY = useMotionValue(windowSize.height / 2);

  const spotlightX = useSpring(mouseX, { stiffness: 20, damping: 50 });
  const spotlightY = useSpring(mouseY, { stiffness: 20, damping: 50 });

  /* ── Auto-drift for mobile (figure-8 pattern) ── */

  useEffect(() => {
    if (!isMobile && !reducedMotion) {
      const handleMouseMove = (e: MouseEvent) => {
        mouseX.set(e.clientX);
        mouseY.set(e.clientY);
      };
      window.addEventListener('mousemove', handleMouseMove);
      return () => window.removeEventListener('mousemove', handleMouseMove);
    }

    if (isMobile && !reducedMotion) {
      let frame: number;
      let t = 0;
      const animate = () => {
        t += 0.003;
        const cx = windowSize.width * (0.35 + 0.3 * Math.sin(t));
        const cy = windowSize.height * (0.3 + 0.2 * Math.sin(t * 2));
        mouseX.set(cx);
        mouseY.set(cy);
        frame = requestAnimationFrame(animate);
      };
      frame = requestAnimationFrame(animate);
      return () => cancelAnimationFrame(frame);
    }
  }, [mouseX, mouseY, isMobile, reducedMotion, windowSize]);

  /* ── Spotlight CSS derived from motion values ── */

  const spotlightBackground = useTransform(
    [spotlightX, spotlightY],
    ([x, y]) =>
      `radial-gradient(600px circle at ${x}px ${y}px, var(--ocean-abyss-spotlight, rgba(77,184,164,0.12)) 0%, transparent 70%)`
  );

  /* ── Generate elements (deterministic) ── */

  const honu = useMemo(() => generateHonu(isMobile ? 2 : 3), [isMobile]);
  const particles = useMemo(() => generateParticles(isMobile ? 15 : 30), [isMobile]);

  /* ── Reduced motion fallback ── */

  if (reducedMotion) {
    return (
      <div className="absolute inset-0 z-0 overflow-hidden" aria-hidden="true">
        <div className="absolute inset-0 bg-gradient-to-b from-[var(--ocean-abyss-mid,#040e18)] to-[var(--ocean-abyss-dark,#02060e)]" />
        <div className="absolute top-[40%] left-[50%] -translate-x-1/2 -translate-y-1/2 opacity-[0.04]">
          <HonuSVG size={400} color="var(--accent-teal)" />
        </div>
      </div>
    );
  }

  return (
    <div className="absolute inset-0 z-0 overflow-hidden" aria-hidden="true">
      {/* 1. Abyss base gradient */}
      <div className="absolute inset-0 bg-gradient-to-b from-[var(--ocean-abyss-mid,#040e18)] to-[var(--ocean-abyss-dark,#02060e)]" />

      {/* 2. Submarine spotlight — follows mouse / auto-drifts on mobile */}
      <motion.div
        className="absolute inset-0 pointer-events-none"
        style={{ background: spotlightBackground }}
      />

      {/* 3. Secondary ambient glow (very subtle) */}
      <div className="absolute top-[30%] left-[50%] w-[50vw] h-[50vw] -translate-x-1/2 -translate-y-1/2 bg-[var(--accent-teal)]/[0.02] blur-[150px] rounded-full" />

      {/* 4. Deep honu silhouettes */}
      {honu.map((h) => (
        <motion.div
          key={`honu-${h.id}`}
          className="absolute pointer-events-none will-change-transform"
          style={{
            left: `${h.x}%`,
            top: `${h.y}%`,
            filter: `blur(${h.blur}px)`,
            transform: `translate(-50%, -50%) rotate(${h.rotation}deg)`,
          }}
          animate={{
            x: [0, 60, -40, 20, 0],
            y: [0, -30, 20, -10, 0],
            rotate: [h.rotation, h.rotation + 5, h.rotation - 3, h.rotation + 2, h.rotation],
            opacity: [h.opacity, h.opacity * 1.3, h.opacity * 0.7, h.opacity * 1.1, h.opacity],
          }}
          transition={{
            duration: h.driftDuration,
            repeat: Infinity,
            ease: 'easeInOut',
            delay: h.driftDelay,
          }}
        >
          <motion.div
            animate={{
              rotate: [0, 3, -2, 1, 0],
              scale: [1, 1.02, 0.98, 1.01, 1],
            }}
            transition={{
              duration: h.swimDuration,
              repeat: Infinity,
              ease: 'easeInOut',
            }}
          >
            <HonuSVG
              size={h.scale * 80}
              color="var(--accent-teal)"
            />
          </motion.div>
        </motion.div>
      ))}

      {/* 5. Marine snow — bioluminescent particles drifting down */}
      {particles.map((p) => (
        <motion.div
          key={`particle-${p.id}`}
          className="absolute rounded-full bg-[var(--accent-teal)] pointer-events-none will-change-transform"
          style={{
            left: `${p.x}%`,
            width: p.size,
            height: p.size,
            top: '-5%',
          }}
          animate={{
            y: ['0vh', '110vh'],
            x: [0, p.driftX, -p.driftX * 0.5, p.driftX * 0.3, 0],
            opacity: [p.opacity, p.opacity * 2, p.opacity, p.opacity * 1.5, p.opacity],
          }}
          transition={{
            y: { duration: p.fallDuration, repeat: Infinity, ease: 'linear', delay: p.delay },
            x: { duration: p.fallDuration * 0.8, repeat: Infinity, ease: 'easeInOut', delay: p.delay },
            opacity: { duration: 6 + p.id * 0.5, repeat: Infinity, ease: 'easeInOut', delay: p.delay },
          }}
        />
      ))}

      {/* 6. Caustic noise overlay — reuses same SVG turbulence pattern */}
      <div
        className="absolute inset-0 opacity-[0.025] mix-blend-overlay pointer-events-none"
        style={{
          backgroundImage: `url("data:image/svg+xml,%3Csvg viewBox='0 0 200 200' xmlns='http://www.w3.org/2000/svg'%3E%3Cfilter id='noiseFilter'%3E%3CfeTurbulence type='fractalNoise' baseFrequency='0.008' numOctaves='3' stitchTiles='stitch'/%3E%3C/filter%3E%3Crect width='100%25' height='100%25' filter='url(%23noiseFilter)'/%3E%3C/svg%3E")`,
          backgroundRepeat: 'repeat',
        }}
      />

      {/* 7. Deep vignette — heavier than surface backgrounds */}
      <div className="absolute inset-0 bg-[radial-gradient(circle_at_center,transparent_10%,rgba(0,0,0,0.85)_100%)] pointer-events-none" />
    </div>
  );
}
