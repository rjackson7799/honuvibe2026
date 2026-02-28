'use client';

import { useEffect, useState } from 'react';
import { useScrollProgress } from '@/hooks/use-scroll-progress';
import { HonuMark } from './honu-mark';
import { createClient } from '@/lib/supabase/client';

export function HonuCompanion() {
  const scrollProgress = useScrollProgress();
  const [reducedMotion, setReducedMotion] = useState(false);
  const [isAuthenticated, setIsAuthenticated] = useState(false);

  // Derive visibility from scroll progress instead of a separate scroll listener
  const visible = scrollProgress > 0.01;

  useEffect(() => {
    setReducedMotion(window.matchMedia('(prefers-reduced-motion: reduce)').matches);
  }, []);

  useEffect(() => {
    const supabase = createClient();

    async function checkAuth() {
      const { data: { session } } = await supabase.auth.getSession();
      setIsAuthenticated(!!session?.user);
    }
    checkAuth();

    const { data: { subscription } } = supabase.auth.onAuthStateChange(
      (_event, session) => {
        setIsAuthenticated(!!session?.user);
      }
    );

    return () => subscription.unsubscribe();
  }, []);

  if (reducedMotion) return null;
  if (isAuthenticated) return null;

  const rotation = Math.sin(scrollProgress * Math.PI * 4) * 12;
  const yPosition = 10 + scrollProgress * 70; // 10% to 80% of viewport
  const opacity = visible ? (scrollProgress > 0.95 ? 1 - (scrollProgress - 0.95) * 20 : 1) : 0;

  return (
    <div
      className="fixed right-4 md:right-5 z-[100] pointer-events-none transition-opacity duration-500"
      style={{
        top: `${yPosition}%`,
        opacity,
        transform: `rotate(${rotation}deg)`,
      }}
    >
      <div className="drop-shadow-[0_0_8px_var(--accent-teal)]">
        <HonuMark size={28} className="md:w-8 md:h-8" />
      </div>
    </div>
  );
}
