'use client';

import { useRef, useEffect } from 'react';
import { motion, useReducedMotion } from 'motion/react';

// Hardcoded dark palette — lighthouse scene is always nocturnal
const BG_BASE = '#02050f';
const SKY_TOP = '#040b16';
const SKY_MID = '#0a1931';
const SKY_BOTTOM = '#152b4a';
const OCEAN_TOP = '#0a1526';
const OCEAN_BOTTOM = '#080c18'; // matches --bg-primary for seamless section transition
const ISLAND_FAR = '#060d1a';
const ISLAND_MID = '#040914';
const ISLAND_NEAR = '#081224';

type Star = {
  x: number;
  y: number;
  radius: number;
  baseAlpha: number;
  twinkleSpeed: number;
  twinklePhase: number;
};

type ShootingStar = {
  x: number;
  y: number;
  vx: number;
  vy: number;
  tailLength: number;
  life: number;
  maxLife: number;
};

function StarCanvas({ reducedMotion }: { reducedMotion: boolean }) {
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const animationRef = useRef<number>(0);

  useEffect(() => {
    const canvas = canvasRef.current;
    if (!canvas) return;

    const ctx = canvas.getContext('2d');
    if (!ctx) return;

    const dpr = Math.min(window.devicePixelRatio || 1, 2);

    const resize = () => {
      const rect = canvas.getBoundingClientRect();
      canvas.width = rect.width * dpr;
      canvas.height = rect.height * dpr;
      ctx.setTransform(dpr, 0, 0, dpr, 0, 0);
    };
    resize();
    window.addEventListener('resize', resize);

    // Initialize 150 stars
    const w = canvas.width / dpr;
    const h = canvas.height / dpr;
    const stars: Star[] = [];
    for (let i = 0; i < 150; i++) {
      stars.push({
        x: Math.random() * w,
        y: Math.random() * h,
        radius: Math.random() * 1.5 + 0.5,
        baseAlpha: Math.random() * 0.6 + 0.2,
        twinkleSpeed: Math.random() * 0.015 + 0.005,
        twinklePhase: Math.random() * Math.PI * 2,
      });
    }

    // Reduced motion: draw static stars and bail
    if (reducedMotion) {
      const rw = canvas.width / dpr;
      const rh = canvas.height / dpr;
      ctx.clearRect(0, 0, rw, rh);
      for (const star of stars) {
        ctx.beginPath();
        ctx.arc(star.x, star.y, star.radius, 0, Math.PI * 2);
        ctx.fillStyle = `rgba(255, 255, 255, ${star.baseAlpha * 0.4})`;
        ctx.fill();
      }
      return () => {
        window.removeEventListener('resize', resize);
      };
    }

    // Shooting stars
    const shootingStars: ShootingStar[] = [];
    let lastSpawnFrame = 0;
    const SPAWN_COOLDOWN = 300; // min frames between spawns (~5s at 60fps)

    function spawnShootingStar(cw: number, ch: number) {
      const angle = (20 + Math.random() * 40) * (Math.PI / 180); // 20-60° downward
      const speed = 4 + Math.random() * 4; // 4-8 px/frame
      const startFromTop = Math.random() > 0.4;
      const x = startFromTop ? Math.random() * cw * 0.8 + cw * 0.1 : cw * 0.7 + Math.random() * cw * 0.3;
      const y = startFromTop ? Math.random() * ch * 0.1 : Math.random() * ch * 0.3;
      shootingStars.push({
        x,
        y,
        vx: Math.cos(angle) * speed,
        vy: Math.sin(angle) * speed,
        tailLength: 80 + Math.random() * 70,
        life: 1,
        maxLife: 60 + Math.random() * 40, // 60-100 frames (~1-1.7s)
      });
    }

    let frame = 0;
    const render = () => {
      const cw = canvas.width / dpr;
      const ch = canvas.height / dpr;
      ctx.clearRect(0, 0, cw, ch);

      for (const star of stars) {
        const alpha = star.baseAlpha * (0.5 + 0.5 * Math.sin(frame * star.twinkleSpeed + star.twinklePhase));
        ctx.beginPath();
        ctx.arc(star.x, star.y, star.radius, 0, Math.PI * 2);
        ctx.fillStyle = `rgba(255, 255, 255, ${alpha})`;
        ctx.fill();
      }

      // Spawn shooting stars randomly (~0.2% chance per frame, with cooldown)
      if (shootingStars.length < 2 && frame - lastSpawnFrame > SPAWN_COOLDOWN && Math.random() < 0.002) {
        spawnShootingStar(cw, ch);
        lastSpawnFrame = frame;
      }

      // Update & render shooting stars
      for (let i = shootingStars.length - 1; i >= 0; i--) {
        const s = shootingStars[i];
        s.x += s.vx;
        s.y += s.vy;
        s.life++;

        const progress = s.life / s.maxLife;
        // Fade in quickly, fade out near end
        const opacity = progress < 0.1 ? progress / 0.1 : progress > 0.7 ? (1 - progress) / 0.3 : 1;

        // Tail end position
        const tailX = s.x - (s.vx / Math.sqrt(s.vx * s.vx + s.vy * s.vy)) * s.tailLength;
        const tailY = s.y - (s.vy / Math.sqrt(s.vx * s.vx + s.vy * s.vy)) * s.tailLength;

        // Draw tail gradient
        const grad = ctx.createLinearGradient(tailX, tailY, s.x, s.y);
        grad.addColorStop(0, `rgba(255, 250, 240, 0)`);
        grad.addColorStop(0.7, `rgba(255, 250, 240, ${opacity * 0.3})`);
        grad.addColorStop(1, `rgba(255, 250, 240, ${opacity * 0.9})`);

        ctx.beginPath();
        ctx.moveTo(tailX, tailY);
        ctx.lineTo(s.x, s.y);
        ctx.strokeStyle = grad;
        ctx.lineWidth = 1.5;
        ctx.stroke();

        // Bright head
        ctx.beginPath();
        ctx.arc(s.x, s.y, 1.5, 0, Math.PI * 2);
        ctx.fillStyle = `rgba(255, 250, 240, ${opacity * 0.9})`;
        ctx.fill();

        // Remove if expired or off-screen
        if (s.life >= s.maxLife || s.x > cw + 50 || s.y > ch + 50 || s.x < -50) {
          shootingStars.splice(i, 1);
        }
      }

      frame++;
      animationRef.current = requestAnimationFrame(render);
    };

    animationRef.current = requestAnimationFrame(render);

    return () => {
      cancelAnimationFrame(animationRef.current);
      window.removeEventListener('resize', resize);
    };
  }, [reducedMotion]);

  return (
    <canvas
      ref={canvasRef}
      style={{
        position: 'absolute',
        inset: 0,
        width: '100%',
        height: '100%',
        pointerEvents: 'none',
      }}
    />
  );
}

export function LighthouseBackground() {
  const prefersReducedMotion = useReducedMotion() ?? false;

  const beamTransition = {
    duration: 12,
    repeat: Infinity,
    ease: 'easeInOut' as const,
  };

  return (
    <div
      className="absolute inset-0"
      aria-hidden="true"
      style={{ backgroundColor: BG_BASE, pointerEvents: 'none' }}
    >
      {/* Sky Gradient */}
      <div
        className="absolute inset-x-0 top-0 h-[60%]"
        style={{
          background: `linear-gradient(to bottom, ${SKY_TOP}, ${SKY_MID}, ${SKY_BOTTOM})`,
        }}
      />

      {/* Star Canvas — covers sky area */}
      <div className="absolute inset-x-0 top-0 h-[60%]">
        <StarCanvas reducedMotion={prefersReducedMotion} />
      </div>

      {/* Hokule'a Guiding Star */}
      <motion.div
        className="absolute top-[15%] left-[70%] h-1.5 w-1.5 rounded-full"
        style={{
          backgroundColor: '#fde68a',
          boxShadow: '0 0 15px rgba(253,230,138,0.8), 0 0 30px rgba(94,170,168,0.3)',
        }}
        animate={prefersReducedMotion ? {} : { scale: [1, 1.3, 1], opacity: [0.7, 1, 0.7] }}
        transition={{ duration: 3, repeat: Infinity, ease: 'easeInOut' }}
      />

      {/* Ocean Gradient */}
      <div
        className="absolute inset-x-0 bottom-0 h-[40%]"
        style={{
          background: `linear-gradient(to bottom, ${OCEAN_TOP}, ${OCEAN_BOTTOM})`,
        }}
      >
        {/* Horizon Glow Line */}
        <div
          className="absolute inset-x-0 top-0 h-px"
          style={{
            backgroundColor: 'rgba(20,184,166,0.2)',
            boxShadow: '0 0 15px rgba(20,184,166,0.4)',
          }}
        />
      </div>

      {/* Island Silhouettes — layered at sky/ocean boundary */}

      {/* Far Island: Full width, gentle rolling Hawaiian ridges */}
      <svg
        className="absolute left-0 w-full pointer-events-none"
        style={{ top: '60%', transform: 'translateY(-99%)', filter: 'blur(1px)' }}
        viewBox="0 0 1440 200"
        preserveAspectRatio="xMidYMax slice"
        fill={ISLAND_FAR}
      >
        <path d="M0,200 C120,185 200,155 320,165 C440,175 500,140 620,130 C740,120 800,150 920,140 C1040,130 1100,155 1220,148 C1340,140 1400,170 1440,160 L1440,200 Z" />
      </svg>

      {/* Mid Island: Right-aligned, volcanic cone (Diamond Head) */}
      <svg
        className="absolute right-[5%] pointer-events-none"
        style={{ top: '60%', transform: 'translateY(-99%)', width: '40vw', height: '12vw' }}
        viewBox="0 0 1000 300"
        preserveAspectRatio="xMidYMax slice"
        fill={ISLAND_MID}
      >
        <path d="M0,300 C80,300 150,270 250,250 C350,230 400,180 480,140 C520,120 540,100 560,95 C580,100 600,120 640,140 C720,180 800,240 900,265 C950,278 1000,295 1000,300 Z" />
      </svg>

      {/* Near Island: Center-right, Mokulua-style twin humps */}
      <svg
        className="absolute right-[22%] pointer-events-none"
        style={{ top: '60%', transform: 'translateY(-99%)', width: '28vw', height: '7vw' }}
        viewBox="0 0 800 200"
        preserveAspectRatio="xMidYMax slice"
        fill={ISLAND_NEAR}
      >
        <path d="M0,200 C40,200 80,185 140,165 C200,145 240,120 280,105 C310,95 330,100 360,115 C390,130 410,125 440,110 C470,95 510,80 540,85 C570,90 600,110 650,140 C700,170 750,195 800,200 Z" />
      </svg>

      {/* Lighthouse & Beam */}
      <div
        className="absolute z-10"
        style={{
          top: '60%',
          left: '8%',
          transform: 'translateY(-100%)',
          perspective: '1000px',
        }}
      >
        {/* Sweeping Beam — wide outer cone */}
        {!prefersReducedMotion && (
          <motion.div
            className="absolute origin-left mix-blend-screen pointer-events-none"
            style={{
              top: '6%',
              left: '1vw',
              width: '150vw',
              height: '60vh',
              translateY: '-50%',
              background:
                'linear-gradient(to right, rgba(253,230,138,0.4) 0%, rgba(20,184,166,0.15) 40%, transparent 100%)',
              clipPath: 'polygon(0 48%, 100% 0%, 100% 100%, 0 52%)',
            }}
            animate={{
              rotateY: [0, 60, 0],
              rotateZ: [-2, 2, -2],
              opacity: [0.3, 0.8, 0.3],
            }}
            transition={beamTransition}
          />
        )}

        {/* Core Bright Beam — narrow inner */}
        {!prefersReducedMotion && (
          <motion.div
            className="absolute origin-left mix-blend-screen pointer-events-none"
            style={{
              top: '6%',
              left: '1vw',
              width: '100vw',
              height: '20vh',
              translateY: '-50%',
              background:
                'linear-gradient(to right, rgba(253,230,138,0.8) 0%, rgba(253,230,138,0.2) 30%, transparent 100%)',
              clipPath: 'polygon(0 49.5%, 100% 30%, 100% 70%, 0 50.5%)',
            }}
            animate={{
              rotateY: [0, 60, 0],
              rotateZ: [-2, 2, -2],
              opacity: [0.5, 1, 0.5],
            }}
            transition={beamTransition}
          />
        )}

        {/* Lens Flare */}
        {!prefersReducedMotion && (
          <motion.div
            className="absolute rounded-full mix-blend-screen pointer-events-none"
            style={{
              top: '6%',
              left: '1vw',
              width: '30vw',
              height: '30vw',
              translateX: '-50%',
              translateY: '-50%',
              backgroundColor: 'rgba(253,230,138,0.2)',
              filter: 'blur(50px)',
            }}
            animate={{ opacity: [0, 0.6, 0], scale: [0.5, 1.5, 0.5] }}
            transition={beamTransition}
          />
        )}

        {/* Lighthouse Structure */}
        <div className="relative flex flex-col items-center" style={{ width: '1.5vw', height: '6vw' }}>
          {/* Tower */}
          <div className="h-full rounded-t-md" style={{ width: '50%', backgroundColor: '#010308' }} />
          {/* Lantern Room */}
          <div
            className="absolute top-0 rounded-sm"
            style={{ width: '80%', height: '15%', backgroundColor: '#010308' }}
          />
          {/* Light Source */}
          <div
            className="absolute rounded-full"
            style={{
              top: '2%',
              width: '40%',
              height: '10%',
              backgroundColor: '#fde68a',
              boxShadow: '0 0 20px rgba(253,230,138,1)',
            }}
          />
        </div>
      </div>

      {/* Vignette */}
      <div
        className="absolute inset-0 pointer-events-none"
        style={{
          background: 'radial-gradient(circle at center, transparent 10%, rgba(0,0,0,0.7) 100%)',
        }}
      />

      {/* Bottom fade for smooth transition into next section */}
      <div
        className="absolute inset-x-0 bottom-0 pointer-events-none"
        style={{
          height: '150px',
          background: `linear-gradient(to bottom, transparent, ${OCEAN_BOTTOM})`,
          zIndex: 10,
        }}
      />
    </div>
  );
}
