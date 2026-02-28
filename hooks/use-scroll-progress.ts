'use client';

import { useState, useEffect, useRef } from 'react';

export function useScrollProgress() {
  const [progress, setProgress] = useState(0);
  const docHeightRef = useRef(0);
  const lastProgressRef = useRef(0);

  useEffect(() => {
    let ticking = false;

    const updateDocHeight = () => {
      docHeightRef.current = document.documentElement.scrollHeight - window.innerHeight;
    };

    updateDocHeight();

    const handleScroll = () => {
      if (!ticking) {
        requestAnimationFrame(() => {
          const docHeight = docHeightRef.current;
          const scrollProgress = docHeight > 0 ? Math.min(window.scrollY / docHeight, 1) : 0;
          // Only update state if value changed meaningfully (avoid re-renders)
          if (Math.abs(scrollProgress - lastProgressRef.current) > 0.001) {
            lastProgressRef.current = scrollProgress;
            setProgress(scrollProgress);
          }
          ticking = false;
        });
        ticking = true;
      }
    };

    window.addEventListener('scroll', handleScroll, { passive: true });
    window.addEventListener('resize', updateDocHeight, { passive: true });
    return () => {
      window.removeEventListener('scroll', handleScroll);
      window.removeEventListener('resize', updateDocHeight);
    };
  }, []);

  return progress;
}
