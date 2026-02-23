'use client';

import { useRef, useEffect } from 'react';

type OceanCanvasProps = {
  scrollProgress?: number;
  className?: string;
};

function getHawaiiTimeHue(): number {
  const now = new Date();
  const utcHours = now.getUTCHours();
  const hstHours = (utcHours - 10 + 24) % 24;

  if (hstHours >= 5 && hstHours < 7) return 0.08; // dawn — warm gold
  if (hstHours >= 17 && hstHours < 19) return 0.05; // sunset — coral
  if (hstHours >= 19 || hstHours < 5) return -0.02; // night — deeper blue
  return 0; // day — standard
}

/** Parse "rgb(r, g, b)" into [r, g, b] */
function parseRgb(color: string): [number, number, number] {
  const match = color.match(/(\d+)\s*,\s*(\d+)\s*,\s*(\d+)/);
  if (match) return [parseInt(match[1]), parseInt(match[2]), parseInt(match[3])];
  return [8, 24, 48]; // fallback to dark defaults
}

/** Read ocean theme colors from CSS variables */
function readThemeColors() {
  const styles = getComputedStyle(document.documentElement);
  const get = (name: string) => styles.getPropertyValue(name).trim();

  return {
    surface: get('--ocean-surface'),
    deep: get('--ocean-deep'),
    caustic: get('--ocean-caustic'),
    wave: get('--ocean-wave'),
    particle: get('--ocean-particle'),
    surfaceRgb: parseRgb(get('--ocean-surface')),
    deepRgb: parseRgb(get('--ocean-deep')),
  };
}

export function OceanCanvas({ scrollProgress = 0, className }: OceanCanvasProps) {
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const animationRef = useRef<number>(0);
  const themeColorsRef = useRef<ReturnType<typeof readThemeColors> | null>(null);

  useEffect(() => {
    const canvas = canvasRef.current;
    if (!canvas) return;

    const prefersReducedMotion = window.matchMedia('(prefers-reduced-motion: reduce)').matches;
    const ctx = canvas.getContext('2d');
    if (!ctx) return;

    const dpr = Math.min(window.devicePixelRatio || 1, 2);

    const resize = () => {
      const rect = canvas.getBoundingClientRect();
      canvas.width = rect.width * dpr;
      canvas.height = rect.height * dpr;
      ctx.scale(dpr, dpr);
    };
    resize();
    window.addEventListener('resize', resize);

    // Read theme colors from CSS variables
    themeColorsRef.current = readThemeColors();

    // Watch for theme changes via data-theme attribute
    const observer = new MutationObserver(() => {
      themeColorsRef.current = readThemeColors();
      // Re-render static fallback if reduced motion
      if (prefersReducedMotion) {
        const colors = themeColorsRef.current;
        const w = canvas.width / dpr;
        const h = canvas.height / dpr;
        const grad = ctx.createLinearGradient(0, 0, 0, h);
        grad.addColorStop(0, colors.surface);
        grad.addColorStop(1, colors.deep);
        ctx.fillStyle = grad;
        ctx.fillRect(0, 0, w, h);
      }
    });
    observer.observe(document.documentElement, { attributes: true, attributeFilter: ['data-theme'] });

    const timeHue = getHawaiiTimeHue();

    const particles: { x: number; y: number; vx: number; vy: number; r: number; alpha: number }[] = [];
    for (let i = 0; i < 8; i++) {
      particles.push({
        x: Math.random() * canvas.width / dpr,
        y: Math.random() * canvas.height / dpr,
        vx: (Math.random() - 0.5) * 0.3,
        vy: (Math.random() - 0.5) * 0.2,
        r: Math.random() * 2 + 1,
        alpha: Math.random() * 0.08 + 0.02,
      });
    }

    if (prefersReducedMotion) {
      // Static gradient using theme colors
      const colors = themeColorsRef.current;
      const w = canvas.width / dpr;
      const h = canvas.height / dpr;
      const grad = ctx.createLinearGradient(0, 0, 0, h);
      grad.addColorStop(0, colors.surface);
      grad.addColorStop(1, colors.deep);
      ctx.fillStyle = grad;
      ctx.fillRect(0, 0, w, h);
      return () => {
        observer.disconnect();
        window.removeEventListener('resize', resize);
      };
    }

    let frame = 0;
    const render = () => {
      const colors = themeColorsRef.current!;
      const [sr, sg, sb] = colors.surfaceRgb;
      const [dr, dg, db] = colors.deepRgb;
      const w = canvas.width / dpr;
      const h = canvas.height / dpr;

      // Background gradient that shifts with scroll
      const depth = scrollProgress;
      const r1 = Math.round(sr + timeHue * 40 - depth * 4);
      const g1 = Math.round(sg - depth * 12);
      const b1 = Math.round(sb - depth * 20);
      const r2 = Math.round(dr - depth * 2);
      const g2 = Math.round(dg - depth * 6);
      const b2 = Math.round(db - depth * 10);

      const grad = ctx.createLinearGradient(0, 0, 0, h);
      grad.addColorStop(0, `rgb(${Math.max(r1, 0)}, ${Math.max(g1, 0)}, ${Math.max(b1, 0)})`);
      grad.addColorStop(1, `rgb(${Math.max(r2, 0)}, ${Math.max(g2, 0)}, ${Math.max(b2, 0)})`);
      ctx.fillStyle = grad;
      ctx.fillRect(0, 0, w, h);

      // Wave layers
      for (let layer = 0; layer < 3; layer++) {
        const amplitude = 8 - layer * 2;
        const frequency = 0.003 + layer * 0.001;
        const speed = 0.02 + layer * 0.005;
        const yBase = h * 0.3 + layer * h * 0.15;
        const alpha = 0.025 - layer * 0.005;

        ctx.beginPath();
        ctx.moveTo(0, h);
        for (let x = 0; x <= w; x += 2) {
          const y = yBase + Math.sin(x * frequency + frame * speed) * amplitude
                    + Math.sin(x * frequency * 0.5 + frame * speed * 0.7) * amplitude * 0.5;
          ctx.lineTo(x, y);
        }
        ctx.lineTo(w, h);
        ctx.closePath();
        ctx.fillStyle = colors.wave || `rgba(255, 255, 255, ${alpha})`;
        ctx.fill();
      }

      // Caustic spots
      for (let i = 0; i < 4; i++) {
        const cx = w * (0.2 + i * 0.2) + Math.sin(frame * 0.01 + i) * 20;
        const cy = h * (0.2 + i * 0.15) + Math.cos(frame * 0.015 + i) * 15;
        const radius = 40 + Math.sin(frame * 0.02 + i * 2) * 15;

        const causticGrad = ctx.createRadialGradient(cx, cy, 0, cx, cy, radius);
        causticGrad.addColorStop(0, colors.caustic || 'rgba(120, 180, 200, 0.015)');
        causticGrad.addColorStop(1, 'rgba(120, 180, 200, 0)');
        ctx.fillStyle = causticGrad;
        ctx.fillRect(cx - radius, cy - radius, radius * 2, radius * 2);
      }

      // Particles
      for (const p of particles) {
        p.x += p.vx;
        p.y += p.vy;
        if (p.x < 0 || p.x > w) p.vx *= -1;
        if (p.y < 0 || p.y > h) p.vy *= -1;

        ctx.beginPath();
        ctx.arc(p.x, p.y, p.r, 0, Math.PI * 2);
        ctx.fillStyle = colors.particle || `rgba(180, 210, 220, ${p.alpha})`;
        ctx.fill();
      }

      frame++;
      animationRef.current = requestAnimationFrame(render);
    };

    animationRef.current = requestAnimationFrame(render);

    return () => {
      cancelAnimationFrame(animationRef.current);
      observer.disconnect();
      window.removeEventListener('resize', resize);
    };
  }, [scrollProgress]);

  return (
    <canvas
      ref={canvasRef}
      className={className}
      style={{ position: 'absolute', inset: 0, width: '100%', height: '100%', pointerEvents: 'none' }}
    />
  );
}
