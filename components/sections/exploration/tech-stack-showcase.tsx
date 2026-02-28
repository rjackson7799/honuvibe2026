'use client';

import { useState, useEffect, useCallback, useRef, useMemo } from 'react';
import { useTranslations } from 'next-intl';
import { motion, useReducedMotion } from 'framer-motion';
import { Section } from '@/components/layout/section';
import { Container } from '@/components/layout/container';
import { SectionHeading } from '@/components/ui';
import { TechIcon } from './tech-icon';
import { techItems } from '@/lib/tech-items';

const scales = [
  'scale-[0.85]', 'scale-100', 'scale-110', 'scale-[0.9]',
  'scale-100', 'scale-[0.85]', 'scale-110', 'scale-[0.9]',
  'scale-100', 'scale-[0.85]', 'scale-100', 'scale-[0.9]',
  'scale-100',
];

const offsets = [0, 18, -8, 12, -4, 22, -12, 8, 4, -16, 14, -6, 10];
const durations = [4, 4.5, 5, 3.5, 4.8, 5.2, 3.8, 4.3, 5.5, 4.1, 3.7, 4.6, 4.2];

export function TechStackShowcase() {
  const t = useTranslations('exploration_page.tech_stack');
  const prefersReducedMotion = useReducedMotion();
  const [activeQueue, setActiveQueue] = useState<number[]>([]);
  const [isHovering, setIsHovering] = useState(false);
  const intervalRef = useRef<ReturnType<typeof setInterval> | null>(null);

  const pickRandom = useCallback(() => {
    setActiveQueue((prev) => {
      let next: number;
      do {
        next = Math.floor(Math.random() * techItems.length);
      } while (prev.includes(next) && techItems.length > 2);
      const updated = [...prev, next];
      return updated.length > 2 ? updated.slice(updated.length - 2) : updated;
    });
  }, []);

  useEffect(() => {
    if (prefersReducedMotion || isHovering) {
      if (intervalRef.current) clearInterval(intervalRef.current);
      intervalRef.current = null;
      if (isHovering) setActiveQueue([]);
      return;
    }

    pickRandom();
    intervalRef.current = setInterval(pickRandom, 3000);
    return () => {
      if (intervalRef.current) clearInterval(intervalRef.current);
    };
  }, [prefersReducedMotion, isHovering, pickRandom]);

  const activeSet = useMemo(() => new Set(activeQueue), [activeQueue]);

  return (
    <Section className="relative overflow-hidden" noReveal>
      {/* Deep water gradient overlay */}
      <div className="absolute inset-0 bg-gradient-to-b from-transparent via-bg-primary/80 to-bg-primary pointer-events-none z-0" />

      <Container size="wide" className="relative z-10">
        <motion.div
          initial={{ opacity: 0, y: -20 }}
          whileInView={{ opacity: 1, y: 0 }}
          viewport={{ once: true, margin: '-50px' }}
          transition={{ duration: 0.8 }}
        >
          <SectionHeading
            overline={t('overline')}
            heading={t('heading')}
            sub={t('sub')}
            centered
          />
        </motion.div>

        {/* Interactive floating icon cluster */}
        <div
          className="mt-12 flex flex-wrap justify-center items-center gap-10 md:gap-16 max-w-[1000px] mx-auto group/container"
          onMouseEnter={() => setIsHovering(true)}
          onMouseLeave={() => setIsHovering(false)}
        >
          {techItems.map(({ key, color }, i) => {
            const isActive = activeSet.has(i);
            return (
              <div
                key={key}
                className={`relative group/icon transition-all duration-700 group-hover/container:opacity-20 hover:!opacity-100 ${scales[i] ?? 'scale-100'} ${isActive && !isHovering ? '!opacity-100' : ''}`}
                style={{ transform: `translateY(${offsets[i] ?? 0}px)` }}
              >
                <motion.div
                  animate={prefersReducedMotion ? {} : { y: [0, -12, 0] }}
                  transition={{
                    duration: durations[i] ?? 4,
                    repeat: Infinity,
                    ease: 'easeInOut',
                    delay: i * 0.15,
                  }}
                  className="relative flex items-center justify-center cursor-pointer w-16 h-16 md:w-20 md:h-20"
                >
                  {/* Glow background */}
                  <div
                    className={`absolute inset-0 rounded-full blur-2xl transition-opacity duration-500 scale-150 ${
                      isActive && !isHovering ? 'opacity-40' : 'opacity-0 group-hover/icon:opacity-40'
                    }`}
                    style={{ backgroundColor: color }}
                  />

                  {/* Icon container */}
                  <div className={`relative z-10 transition-transform duration-500 ${isActive && !isHovering ? 'scale-110' : 'group-hover/icon:scale-110'}`}>
                    {/* Dimmed state */}
                    <div
                      className={`text-fg-secondary/50 transition-opacity duration-500 absolute inset-0 flex items-center justify-center ${
                        isActive && !isHovering ? 'opacity-0' : 'group-hover/icon:opacity-0'
                      }`}
                    >
                      <TechIcon name={key} size={34} />
                    </div>

                    {/* Glowing state */}
                    <div
                      className={`transition-opacity duration-500 flex items-center justify-center ${
                        isActive && !isHovering ? 'opacity-100' : 'opacity-0 group-hover/icon:opacity-100'
                      }`}
                      style={{ color, filter: `drop-shadow(0 0 20px ${color})` }}
                    >
                      <TechIcon name={key} size={34} />
                    </div>
                  </div>

                  {/* Label */}
                  <span
                    className={`absolute -bottom-7 md:-bottom-9 left-1/2 -translate-x-1/2 transition-all duration-500 text-[10px] md:text-xs font-semibold tracking-[0.15em] uppercase whitespace-nowrap ${
                      isActive && !isHovering ? 'opacity-100' : 'opacity-0 group-hover/icon:opacity-100'
                    }`}
                    style={{ color, textShadow: `0 0 12px ${color}` }}
                  >
                    {t(`items.${key}`)}
                  </span>
                </motion.div>
              </div>
            );
          })}
        </div>
      </Container>
    </Section>
  );
}
